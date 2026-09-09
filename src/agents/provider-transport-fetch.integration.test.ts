import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { getAiTransportHost } from "@openclaw/ai";
import { createBoundaryAwareStreamFnForModel } from "@openclaw/ai/transports";
import OpenAI from "openai";
import type { Model } from "openclaw/plugin-sdk/llm";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  onTrustedInternalDiagnosticEvent,
  waitForDiagnosticEventsDrained,
} from "../infra/diagnostic-events.js";
import { createDiagnosticTraceContext } from "../infra/diagnostic-trace-context.js";
import { runWithPrivateRunObservationScope } from "../infra/private-run-observations.js";
import { redactSensitiveText } from "../logging/redact.js";
import { resetSecretRedactionRegistryForTest } from "../logging/secret-redaction-registry.test-support.js";
import { mintSecretSentinel } from "../secrets/sentinel.js";
import "./ai-transport-runtime-host.js";
import { wrapStreamFnWithDiagnosticModelCallEvents } from "./embedded-agent-runner/run/attempt.model-diagnostic-events.js";
import { wrapStreamFnWithPrivateModelContext } from "./private-model-context.js";
import { buildGuardedModelFetch } from "./provider-transport-fetch.js";
import type { StreamFn } from "./runtime/index.js";
import { makeProviderModelFixture } from "./test-helpers/provider-model-fixture.js";

describe("guarded model fetch secret sentinel integration", () => {
  afterEach(() => {
    resetSecretRedactionRegistryForTest();
  });

  it("injects the real header only at local HTTP egress and redacts the resolved value", async () => {
    let receivedAuthorization: string | undefined;
    const server = createServer((request, response) => {
      receivedAuthorization = request.headers.authorization;
      response.writeHead(200, { "content-type": "application/json" });
      response.end('{"ok":true}');
    });
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });

    try {
      const port = (server.address() as AddressInfo).port;
      const baseUrl = `http://127.0.0.1:${port}/v1`;
      const model = {
        id: "integration-model",
        provider: "sentinel-integration",
        api: "openai-responses",
        baseUrl,
      } as unknown as Model<"openai-responses">;
      const secret = "integration-provider-secret";
      const sentinel = mintSecretSentinel(secret, { label: "model-auth:integration" });

      const response = await buildGuardedModelFetch(model)(`${baseUrl}/responses`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sentinel}` },
        body: "{}",
      });
      await response.text();

      expect(receivedAuthorization).toBe(`Bearer ${secret}`);
      expect(redactSensitiveText(`upstream used ${secret}`, { mode: "off" })).toBe(
        "upstream used integr…cret",
      );
    } finally {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
  });
});

describe("private preparation at real HTTP egress", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("rejects capture-enabled preparation before sending and keeps uncaptured transport working", async () => {
    const received: string[] = [];
    const server = createServer(async (request, response) => {
      let body = "";
      for await (const chunk of request) body += String(chunk);
      received.push(body);
      response.writeHead(200, { "content-type": "application/json" });
      response.end('{"ok":true}');
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;
      const model = makeProviderModelFixture({
        id: "private-preparation",
        provider: "private-preparation-fixture",
        api: "openai-responses",
        baseUrl,
      });
      const fetchModel = buildGuardedModelFetch(model);
      vi.stubEnv("OPENCLAW_DEBUG_PROXY_ENABLED", "1");
      await expect(
        runWithPrivateRunObservationScope(() =>
          fetchModel(`${baseUrl}/responses`, {
            method: "POST",
            body: "PRIVATE-PREPARATION-MARKER",
          }),
        ),
      ).rejects.toThrow("PRIVATE_PREPARATION_CAPTURE_UNAVAILABLE");
      expect(received).toEqual([]);
      vi.stubEnv("OPENCLAW_DEBUG_PROXY_ENABLED", "0");
      await runWithPrivateRunObservationScope(async () => {
        const response = await fetchModel(`${baseUrl}/responses`, {
          method: "POST",
          body: "uncaptured-private-request",
        });
        await response.text();
      });
      expect(received).toEqual(["uncaptured-private-request"]);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});

describe("private model context at real HTTP egress", () => {
  it.each([
    { api: "openai-responses", outcome: "completed" },
    { api: "openai-responses", outcome: "error" },
    { api: "openai-responses", outcome: "failed" },
    { api: "openai-responses", outcome: "error-tail" },
    { api: "openai-responses", outcome: "malformed" },
    { api: "openai-responses", outcome: "html" },
    { api: "openai-responses", outcome: "json-error" },
    { api: "openai-responses", outcome: "incomplete-unknown" },
    { api: "openai-responses", outcome: "status-unknown" },
    { api: "openai-completions", outcome: "error" },
    { api: "anthropic-messages", outcome: "error" },
  ] as const)(
    "keeps native $api $outcome output and diagnostics free of echoed private input",
    async ({ api, outcome }) => {
      const received: string[] = [];
      const diagnostics: unknown[] = [];
      const transportLogs: unknown[] = [];
      vi.stubEnv("OPENCLAW_DEBUG_SSE", "peek");
      const logInfo = vi
        .spyOn(getAiTransportHost(), "logInfo")
        .mockImplementation((...args) => transportLogs.push(args));
      const stop = onTrustedInternalDiagnosticEvent((event, _metadata, data) => {
        if ("runId" in event && event.runId === "private-wire") diagnostics.push({ event, data });
      });
      const server = createServer(async (request, response) => {
        let body = "";
        for await (const chunk of request) body += String(chunk);
        received.push(body);
        if (outcome === "html" || outcome === "json-error") {
          response.writeHead(200, {
            "content-type": outcome === "html" ? "text/html" : "application/json",
          });
          response.end(
            outcome === "html"
              ? `<html>${body}</html>`
              : JSON.stringify({ error: { message: body } }),
          );
          return;
        }
        response.writeHead(200, { "content-type": "text/event-stream" });
        if (outcome === "malformed") {
          response.end(`data: {"error": ${body}\n\n`);
          return;
        }
        if (outcome === "incomplete-unknown" || outcome === "status-unknown") {
          response.end(
            `data: ${JSON.stringify({
              type: outcome === "incomplete-unknown" ? "response.incomplete" : "response.completed",
              response: {
                status: outcome === "incomplete-unknown" ? "incomplete" : body,
                incomplete_details: { reason: body },
                output: [],
                usage: { input_tokens: 5, output_tokens: 2, total_tokens: 7 },
              },
            })}\n\n`,
          );
          return;
        }
        if (outcome !== "completed") {
          const event =
            outcome === "failed"
              ? {
                  type: "response.failed",
                  response: {
                    id: "response-fixture",
                    status: "failed",
                    error: { code: "server_error", message: body },
                    output: [],
                    usage: { input_tokens: 5, output_tokens: 2, total_tokens: 7 },
                  },
                }
              : {
                  type: "error",
                  code: "server_error",
                  message: body,
                  error: { type: "api_error", message: body },
                };
          response.end(
            `event: ${event.type}\ndata: ${JSON.stringify(event)}${outcome === "error-tail" ? "\n" : "\n\n"}`,
          );
          return;
        }
        response.end(
          `data: ${JSON.stringify({
            type: "response.completed",
            response: {
              id: "response-fixture",
              status: "completed",
              output: [
                {
                  type: "message",
                  id: "message-fixture",
                  role: "assistant",
                  status: "completed",
                  content: [{ type: "output_text", text: "Review complete", annotations: [] }],
                },
              ],
              usage: { input_tokens: 5, output_tokens: 2, total_tokens: 7 },
            },
          })}\n\n`,
        );
      });
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
      try {
        const model = makeProviderModelFixture({
          id: "fixture",
          provider: "private-native-fixture",
          api,
          baseUrl: `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`,
        });
        const native = createBoundaryAwareStreamFnForModel(model);
        if (!native) throw new Error("missing built-in native transport");
        const resolve = vi.fn(async () => "EXACT PRIVATE EXCERPT");
        const capturedPayloads: unknown[] = [];
        const context = {
          systemPrompt: "Summarize accurately",
          messages: [{ role: "user" as const, content: "Review the totals", timestamp: 1 }],
        };
        const wrapped = wrapStreamFnWithDiagnosticModelCallEvents(
          wrapStreamFnWithPrivateModelContext({
            streamFn: native,
            resolve,
            assertActive: () => {},
            streamStrategy: `boundary-aware:${api}`,
          }),
          {
            runId: "private-wire",
            provider: model.provider,
            model: model.id,
            trace: createDiagnosticTraceContext(),
            nextCallId: () => "private-wire:1",
            contentCapture: {
              anyModelContent: true,
              inputMessages: true,
              outputMessages: true,
              systemPrompt: true,
              toolDefinitions: true,
              toolInputs: true,
              toolOutputs: true,
            },
          },
        );
        const stream = await wrapped(model, context, {
          apiKey: "fixture",
          transport: "sse",
          onPayload: (payload) => {
            capturedPayloads.push(structuredClone(payload));
          },
        });
        const result = await stream.result();
        expect(result.stopReason).toBe(outcome === "completed" ? "stop" : "error");
        if (outcome === "completed") {
          expect(result.content).toEqual([
            expect.objectContaining({ type: "text", text: "Review complete" }),
          ]);
        }
        if (
          outcome === "completed" ||
          outcome === "failed" ||
          outcome === "incomplete-unknown" ||
          outcome === "status-unknown"
        )
          expect(result.usage).toMatchObject({ input: 5, output: 2, totalTokens: 7 });
        // Invalid HTTP-200 HTML fails during fetch normalization, so the SDK's
        // normal connection-error retry policy runs. Every send must reauthorize.
        expect(received).toHaveLength(outcome === "html" ? 3 : 1);
        expect(received.every((body) => body.includes("EXACT PRIVATE EXCERPT"))).toBe(true);
        expect(resolve).toHaveBeenCalledTimes(received.length);
        await waitForDiagnosticEventsDrained();
        expect(diagnostics.length).toBeGreaterThan(0);
        expect(capturedPayloads.length).toBeGreaterThan(0);
        if (
          outcome === "completed" ||
          outcome === "incomplete-unknown" ||
          outcome === "status-unknown"
        )
          expect(transportLogs.some((entry) => JSON.stringify(entry).includes("event_peek"))).toBe(
            true,
          );
        expect(
          JSON.stringify({ result, context, capturedPayloads, diagnostics, transportLogs }),
        ).not.toContain("EXACT PRIVATE EXCERPT");
      } finally {
        logInfo.mockRestore();
        vi.unstubAllEnvs();
        stop();
        server.closeAllConnections();
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    },
  );

  it.each([false, true])("rechecks an SDK retry; revoked=%s", async (revokeAfterFirst) => {
    const received: string[] = [];
    let active = true;
    const server = createServer(async (request, response) => {
      let body = "";
      for await (const chunk of request) body += String(chunk);
      received.push(body);
      if (received.length === 1) {
        if (revokeAfterFirst) active = false;
        response.writeHead(429, { "content-type": "application/json", "retry-after-ms": "1" });
        response.end('{"error":{"message":"retry","type":"rate_limit_error"}}');
      } else {
        response.writeHead(200, { "content-type": "application/json" });
        response.end('{"id":"reply","output":[]}');
      }
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;
      const model = {
        id: "fixture",
        provider: "private-fixture",
        api: "openai-responses",
        baseUrl,
      } as Model;
      const client = new OpenAI({
        apiKey: "fixture",
        baseURL: baseUrl,
        fetch: buildGuardedModelFetch(model),
        maxRetries: 1,
      });
      const context = {
        messages: [{ role: "user" as const, content: "Review the totals", timestamp: 1 }],
      };
      const resolve = vi.fn(async () => "EXACT PRIVATE EXCERPT");
      const wire = wrapStreamFnWithPrivateModelContext({
        streamStrategy: "boundary-aware:openai-responses",
        assertActive: () => {
          if (!active) throw new Error("revoked private path");
        },
        resolve,
        streamFn: (async () =>
          await client.responses.create({
            model: model.id,
            input: [{ role: "user", content: "Review the totals" }],
          })) as unknown as StreamFn,
      });
      if (revokeAfterFirst) {
        await expect(wire(model, context, { transport: "sse" })).rejects.toMatchObject({
          cause: expect.objectContaining({
            message: expect.stringContaining("PRIVATE_MODEL_CONTEXT_UNAVAILABLE"),
          }),
        });
        expect(received).toHaveLength(1);
        expect(resolve).toHaveBeenCalledTimes(1);
      } else {
        await wire(model, context, { transport: "sse" });
        expect(received).toHaveLength(2);
        expect(resolve).toHaveBeenCalledTimes(2);
        expect(resolve).toHaveBeenLastCalledWith({
          provider: model.provider,
          model: model.id,
          api: model.api,
          baseUrl,
          requestUrl: `${baseUrl}/responses`,
          transport: "http",
        });
      }
      for (const body of received) {
        expect(JSON.parse(body)).toMatchObject({
          store: false,
          input: [
            expect.anything(),
            { role: "user", content: expect.stringContaining("EXACT PRIVATE EXCERPT") },
          ],
        });
      }
      expect(JSON.stringify(context)).not.toContain("PRIVATE EXCERPT");
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
