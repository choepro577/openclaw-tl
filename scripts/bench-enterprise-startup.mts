#!/usr/bin/env node

/**
 * Production-boundary Enterprise startup benchmark and quality gate.
 *
 * The default invocation is deliberately offline and only prints the execution plan. With
 * --execute this script starts the QA Lab child Gateway, authenticates an Enterprise employee,
 * and drives the same WebSocket chat.send -> agent.wait path used by the browser. It records
 * timings and counters without retaining prompts, replies, cookies, or provider payloads.
 *
 * Examples:
 *   node scripts/bench-enterprise-startup.mts --help
 *   node scripts/bench-enterprise-startup.mts --json --output /tmp/enterprise-plan.json
 *   node scripts/bench-enterprise-startup.mts --execute --mode performance --samples 100
 *   node scripts/bench-enterprise-startup.mts --execute --mode quality --provider-mode live-frontier
 */

import { execFile as execFileCallback } from "node:child_process";
import { createHash, generateKeyPairSync, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { WebSocket, type RawData } from "ws";
import { buildDeviceAuthPayload } from "../packages/gateway-client/src/device-auth.js";
import {
  GATEWAY_CLIENT_IDS,
  GATEWAY_CLIENT_MODES,
} from "../packages/gateway-protocol/src/client-info.js";
import {
  MIN_CLIENT_PROTOCOL_VERSION,
  PROTOCOL_VERSION,
} from "../packages/gateway-protocol/src/version.js";
import type { OpenClawConfig } from "../src/config/types.js";
import {
  deriveDeviceIdFromPublicKey,
  publicKeyRawBase64UrlFromPem,
  signDevicePayload,
} from "../src/infra/device-identity.js";
import {
  ENTERPRISE_QUALITY_CASES,
  enterpriseQualityExpectationForTurn,
  evaluateEnterpriseQualityExpectation,
  type EnterpriseBenchmarkStrategy,
  type EnterpriseQualityCase,
  type QualityEvaluation,
  type QualityObservation,
  type QualityToolCall,
} from "./lib/enterprise-benchmark-fixtures.mts";

const SCRIPT_SCHEMA_VERSION = "enterprise.startup.v1";
const DEFAULT_MODEL = "mock-openai/gpt-5.6-luna";
const DEFAULT_ALTERNATE_MODEL = "mock-openai/gpt-5.6-luna-alt";
const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_SAMPLES = 100;
const DEFAULT_QUALITY_CASES = 60;
const DEFAULT_QUALITY_REPEATS = 3;
const QUALITY_GATE_STRATEGIES = ["baseline", "personal-agent-first"] as const;
const QUALITY_GATE_CASE_IDS = ENTERPRISE_QUALITY_CASES.map((testCase) => testCase.id);
const PERFORMANCE_SCENARIOS = ["cold", "warm", "prewarmed", "resumed"] as const;
const PERFORMANCE_CONCURRENCIES = [1, 5, 10] as const;
const PERFORMANCE_THRESHOLDS = {
  warmServerToProviderP50Ms: 100,
  warmServerToProviderP95Ms: 300,
  prewarmedServerToProviderP95Ms: 500,
} as const;
const execFileAsync = promisify(execFileCallback);

type PerformanceScenario = (typeof PERFORMANCE_SCENARIOS)[number];
type BenchmarkMode = "performance" | "quality" | "all";
type ProviderMode = "mock-openai" | "live-frontier";

export type BenchmarkOptions = {
  execute: boolean;
  json: boolean;
  keepTemp: boolean;
  mode: BenchmarkMode;
  model: string;
  alternateModel: string;
  output?: string;
  baseline?: string;
  providerMode: ProviderMode;
  qualityCases: number;
  qualityRepeats: number;
  repoRoot: string;
  samples: number;
  scenarios: PerformanceScenario[];
  strategies: EnterpriseBenchmarkStrategy[];
  concurrencies: number[];
  timeoutMs: number;
};

type TimelineAttribute = string | number | boolean | null;
type TimelineEvent = {
  type?: string;
  name?: string;
  timestamp?: string;
  /** Process-local monotonic timestamp emitted by the production diagnostics writer. */
  monotonicMs?: number;
  durationMs?: number;
  runId?: string;
  spanId?: string;
  parentSpanId?: string;
  phase?: string;
  attributes?: Record<string, TimelineAttribute>;
  /** Local receipt time; added by the harness and never written by the Gateway. */
  receivedAtMs?: number;
};

type TimelineSpan = {
  name: string;
  durationMs: number;
  startMs?: number;
  endMs?: number;
  parentSpanId?: string;
  phase?: string;
};

type GatewayFrame = {
  type?: string;
  id?: string;
  ok?: boolean;
  event?: string;
  payload?: unknown;
  error?: { message?: string; code?: string; details?: unknown };
  /** Monotonic client receipt time, only used for local terminal/first-output timing. */
  receivedAtMs?: number;
};

type RawGatewayDevice = {
  deviceId: string;
  publicKey: string;
  privateKeyPem: string;
};

type RawGatewayClient = {
  socket: WebSocket;
  frames: GatewayFrame[];
  device: RawGatewayDevice;
  connectNonce: string;
};

type ProviderLedgerEntry = {
  cursor?: number;
  model?: string;
  requestKind?: string;
  providerVariant?: string;
  plannedToolName?: string;
  plannedToolArgs?: Record<string, unknown>;
  outcome?: string;
};

type ProviderProbe = {
  cursor: number;
  entries: ProviderLedgerEntry[];
  observedAtMs?: number;
};

type Waterfall = {
  /** Unknown when the timeline has no spans or spans lack a shared clock. */
  criticalPathMs: number | null;
  spanSumMs: number | null;
  overlapMs: number | null;
  spans: Array<{
    name: string;
    durationMs: number;
    startMs?: number;
    endMs?: number;
    parentSpanId?: string;
    phase?: string;
  }>;
};

type TimingSample = {
  id: string;
  /** One batch is one requested sample cell; c5/c10 contain multiple requests. */
  batchId: string;
  requestIndex: number;
  scenario: PerformanceScenario;
  strategy: EnterpriseBenchmarkStrategy;
  concurrency: number;
  status: "ok" | "error";
  error?: string;
  timings: {
    gatewayStartupMs: number | null;
    wsConnectMs: number | null;
    sendToAckMs: number | null;
    sendToProviderObservedMs: number | null;
    sendToTerminalMs: number | null;
    sendToHistoryMs: number | null;
    historyMessages: number | null;
    serverReceivedToAckMs: number | null;
    queueWaitMs: number | null;
    providerSubmissionMs: number | null;
    routerProviderSubmissionMs: number | null;
    personalAgentProviderSubmissionMs: number | null;
    firstOutputMs: number | null;
  };
  calls: {
    llmRequests: number | null;
    routerCalls: number | null;
    specialistCalls: number | null;
    providerSubmissionRequests: number | null;
    providerLedgerRequests: number | null;
    source: "provider-submit-marker" | "diagnostics" | "provider-ledger" | "unavailable";
  };
  stages: Record<string, number>;
  waterfall: Waterfall;
  diagnostics: {
    timelineEvents: number;
    missingStages: string[];
  };
};

type TimingGroup = {
  scenario: PerformanceScenario;
  strategy: EnterpriseBenchmarkStrategy;
  concurrency: number;
  count: number;
  requestCount: number;
  statusCounts: Record<"ok" | "error", number>;
  timings: Record<string, NumberSummary | null>;
  calls: Record<string, NumberSummary | null>;
  stages: Record<string, NumberSummary>;
  waterfall: {
    criticalPathMs: NumberSummary | null;
    spanSumMs: NumberSummary | null;
    overlapMs: NumberSummary | null;
  };
};

type NumberSummary = { count: number; min: number; p50: number; p95: number; max: number };

type QualityReceiptStatus = "verified" | "unsupported" | "unknown";

type QualityRecordEvidence = {
  /** A verified admission/delegation receipt; timeline hints are not sufficient. */
  authorityReceipt: QualityReceiptStatus;
  /** A verified tool execution receipt; a provider proposal is not sufficient. */
  toolReceipts: QualityReceiptStatus;
  /** The model configured for this quality lane. */
  configuredModel: string;
  /** Distinct models reported by complete provider receipts. */
  observedModels: string[];
  /** False when at least one provider request/model is not observable. */
  modelComplete: boolean;
};

export type QualityRecord = {
  caseId: string;
  strategy: EnterpriseBenchmarkStrategy;
  repetition: number;
  turns: Array<{
    evaluation: QualityEvaluation;
    responseLength: number | null;
    providerRequests: number | null;
  }>;
  passed: boolean;
  diagnosticsAvailable: boolean;
  /** Evidence required by the acceptance gate, kept separate from prose evaluation. */
  evidence: QualityRecordEvidence;
  error?: string;
};

export type QualityNegativeCheckResult = {
  strategy: EnterpriseBenchmarkStrategy;
  check: "permission-revocation" | "idempotency-replay";
  status: "passed" | "failed" | "unknown";
  providerRequestsBefore?: number;
  providerRequestsAfter?: number;
  error?: string;
};

type BenchmarkReport = {
  schemaVersion: typeof SCRIPT_SCHEMA_VERSION;
  generatedAt: string;
  dryRun: boolean;
  execution: {
    repoRoot: string;
    providerMode: ProviderMode;
    model: string;
    alternateModel: string;
    mode: BenchmarkMode;
    strategies: EnterpriseBenchmarkStrategy[];
    samplesPerCell: number;
    scenarios: PerformanceScenario[];
    concurrencies: number[];
    qualityCases: number;
    qualityRepeats: number;
    errors: string[];
  };
  baseline: { path: string | null; sha256: string | null; head: string | null };
  performance: {
    samples: TimingSample[];
    groups: TimingGroup[];
    thresholds: typeof PERFORMANCE_THRESHOLDS;
    callCounts: Record<string, number>;
  };
  quality: {
    casesCount: number;
    repetitions: number;
    records: QualityRecord[];
    negativeChecks: QualityNegativeCheckResult[];
    dimensionSummary: Record<string, { passed: number; failed: number; unknown: number }>;
    regressions: string[];
    gatePassed: boolean;
    gateStatus: "accepted" | "not-accepted" | "unknown";
    gateReasons: string[];
  };
};

function usage(): string {
  return [
    "Enterprise startup benchmark (default is offline dry-run)",
    "",
    "Usage:",
    "  node scripts/bench-enterprise-startup.mts [options]",
    "",
    "Execution:",
    "  --execute                    Start the QA child Gateway and drive the real WS RPC path.",
    "  --mode MODE                 performance, quality, or all (default: all).",
    "  --provider-mode MODE        mock-openai or live-frontier (default: mock-openai).",
    "  --model REF                 Primary provider model reference.",
    "  --alternate-model REF       Alternate provider model reference.",
    "  --repo-root PATH            Repository used by the QA Gateway child.",
    "  --timeout-ms N              Per RPC/sample timeout (default: 120000).",
    "  --keep-temp                 Keep QA temporary state for local inspection.",
    "",
    "Performance:",
    "  --samples N                 Request observations per scenario/strategy/concurrency cell (default: 100).",
    "  --scenario LIST             cold,warm,prewarmed,resumed (default: all).",
    "  --concurrency LIST          1,5,10 (default: all).",
    "  --strategy VALUE            baseline, personal-agent-first, or both (default: both).",
    "",
    "Quality:",
    "  --quality-cases N           Cases from the fixed 60-case fixture (default: 60).",
    "  --quality-repeats N         Repetitions per case/strategy (default: 3).",
    "",
    "Evidence:",
    "  --baseline PATH             Baseline manifest/report to checksum.",
    "  --output PATH               Write the JSON report to PATH.",
    "  --json                      Print JSON instead of the human summary.",
    "  --help                      Show this help.",
    "",
    "The execute path uses startQaLiveLaneGateway plus an Enterprise cookie-authenticated",
    "WebSocket. It measures chat.send ACK, queue/admission, provider observation, terminal",
    "chat events, one post-terminal history read, diagnostics spans, overlap, and provider",
    "request counts. Provider submission is reported both for the first provider call (which",
    "may be the router) and for the Personal Agent lineage. It never stores message",
    "text, provider bodies, cookies, or credentials. Mock-provider request timestamps are",
    "observation times from the debug ledger; diagnostics spans are preferred when available.",
  ].join("\n");
}

function parseBoundedInteger(raw: string, flag: string, min: number, max: number): number {
  if (!/^\d+$/u.test(raw)) {
    throw new Error(`${flag} must be an integer`);
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${flag} must be between ${min} and ${max}`);
  }
  return value;
}

function parseList<T extends string | number>(
  raw: string,
  flag: string,
  parse: (value: string) => T,
): T[] {
  const values = raw.split(",").map((item) => item.trim());
  if (values.some((value) => value.length === 0)) {
    throw new Error(`${flag} must be a comma-separated list`);
  }
  const parsed = values.map(parse);
  if (new Set(parsed).size !== parsed.length) {
    throw new Error(`${flag} contains duplicate values`);
  }
  return parsed;
}

function parseStrategies(raw: string): EnterpriseBenchmarkStrategy[] {
  const selection = parseList(raw, "--strategy", (value) => value);
  if (selection.length === 1 && selection[0] === "both") {
    return ["baseline", "personal-agent-first"];
  }
  if (
    selection.length === 0 ||
    selection.some((value) => value !== "baseline" && value !== "personal-agent-first")
  ) {
    throw new Error("--strategy must be baseline, personal-agent-first, or both");
  }
  return selection as EnterpriseBenchmarkStrategy[];
}

function parseScenarios(raw: string): PerformanceScenario[] {
  const values = parseList(raw, "--scenario", (value) => value);
  if (values.some((value) => !(PERFORMANCE_SCENARIOS as readonly string[]).includes(value))) {
    throw new Error(`--scenario must contain only ${PERFORMANCE_SCENARIOS.join(",")}`);
  }
  return values as PerformanceScenario[];
}

function parseOptions(argv = process.argv.slice(2)): BenchmarkOptions {
  const defaults: BenchmarkOptions = {
    execute: false,
    json: false,
    keepTemp: false,
    mode: "all",
    model: DEFAULT_MODEL,
    alternateModel: DEFAULT_ALTERNATE_MODEL,
    providerMode: "mock-openai",
    qualityCases: DEFAULT_QUALITY_CASES,
    qualityRepeats: DEFAULT_QUALITY_REPEATS,
    repoRoot: process.cwd(),
    samples: DEFAULT_SAMPLES,
    scenarios: [...PERFORMANCE_SCENARIOS],
    strategies: ["baseline", "personal-agent-first"],
    concurrencies: [...PERFORMANCE_CONCURRENCIES],
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };
  const options = { ...defaults };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--help" || flag === "-h") {
      console.log(usage());
      process.exit(0);
    }
    if (flag === "--execute") {
      options.execute = true;
      continue;
    }
    if (flag === "--json") {
      options.json = true;
      continue;
    }
    if (flag === "--keep-temp") {
      options.keepTemp = true;
      continue;
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${flag} requires a value`);
    }
    index += 1;
    switch (flag) {
      case "--mode":
        if (value !== "performance" && value !== "quality" && value !== "all") {
          throw new Error("--mode must be performance, quality, or all");
        }
        options.mode = value;
        break;
      case "--provider-mode":
        if (value !== "mock-openai" && value !== "live-frontier") {
          throw new Error("--provider-mode must be mock-openai or live-frontier");
        }
        options.providerMode = value;
        break;
      case "--model":
        options.model = value;
        break;
      case "--alternate-model":
        options.alternateModel = value;
        break;
      case "--repo-root":
        options.repoRoot = path.resolve(value);
        break;
      case "--output":
        options.output = path.resolve(value);
        break;
      case "--baseline":
        options.baseline = path.resolve(value);
        break;
      case "--samples":
        options.samples = parseBoundedInteger(value, flag, 1, 100);
        break;
      case "--quality-cases":
        options.qualityCases = parseBoundedInteger(value, flag, 1, DEFAULT_QUALITY_CASES);
        break;
      case "--quality-repeats":
        options.qualityRepeats = parseBoundedInteger(value, flag, 1, DEFAULT_QUALITY_REPEATS);
        break;
      case "--timeout-ms":
        options.timeoutMs = parseBoundedInteger(value, flag, 1_000, 600_000);
        break;
      case "--scenario":
        options.scenarios = parseScenarios(value);
        break;
      case "--concurrency":
        options.concurrencies = parseList(value, flag, (item) =>
          parseBoundedInteger(item, flag, 1, 10),
        );
        break;
      case "--strategy":
        options.strategies = parseStrategies(value);
        break;
      default:
        throw new Error(`Unknown argument: ${flag}`);
    }
  }
  return options;
}

export function percentile(values: readonly number[], ratio: number): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = values.toSorted((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * ratio) - 1)] ?? 0;
}

export function summarizeNumbers(values: readonly number[]): NumberSummary | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = values.toSorted((left, right) => left - right);
  return {
    count: sorted.length,
    min: sorted[0] ?? 0,
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    max: sorted.at(-1) ?? 0,
  };
}

/** Split a cell's requested observations into bounded concurrent batches. */
export function requestBatchSizes(samples: number, concurrency: number): number[] {
  if (!Number.isSafeInteger(samples) || samples < 1) {
    throw new Error("samples must be a positive integer");
  }
  if (!Number.isSafeInteger(concurrency) || concurrency < 1) {
    throw new Error("concurrency must be a positive integer");
  }
  const batches: number[] = [];
  for (let remaining = samples; remaining > 0; remaining -= concurrency) {
    batches.push(Math.min(concurrency, remaining));
  }
  return batches;
}

function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/\s+/gu, " ").slice(0, 240);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rawDataText(data: RawData): string {
  if (Array.isArray(data)) {
    return Buffer.concat(data.map((chunk) => Buffer.from(chunk))).toString("utf8");
  }
  if (Buffer.isBuffer(data)) {
    return data.toString("utf8");
  }
  return Buffer.from(data).toString("utf8");
}

async function waitFor<T>(params: {
  label: string;
  read: () => T | undefined | Promise<T | undefined>;
  timeoutMs: number;
  intervalMs?: number;
}): Promise<T> {
  const deadline = Date.now() + params.timeoutMs;
  while (Date.now() < deadline) {
    const value = await params.read();
    if (value !== undefined) {
      return value;
    }
    await sleep(params.intervalMs ?? 25);
  }
  throw new Error(`timed out waiting for ${params.label}`);
}

async function openRawGatewayClient(
  wsUrl: string,
  params: { cookie: string; origin: string; timeoutMs: number },
): Promise<RawGatewayClient> {
  const socket = new WebSocket(wsUrl, {
    headers: { Cookie: params.cookie, Origin: params.origin },
  });
  const client: RawGatewayClient = {
    socket,
    frames: [],
    // Filled with the challenge-bound device immediately below before the client is used.
    device: { deviceId: "", publicKey: "", privateKeyPem: "" },
    connectNonce: "",
  };
  socket.on("message", (data) => {
    try {
      const parsed = JSON.parse(rawDataText(data)) as unknown;
      if (isRecord(parsed)) {
        client.frames.push({ ...(parsed as GatewayFrame), receivedAtMs: performance.now() });
      }
    } catch {
      // A malformed frame is surfaced by the request timeout; its body is never retained.
    }
  });
  await new Promise<void>((resolve, reject) => {
    const onOpen = () => {
      socket.off("error", onError);
      resolve();
    };
    const onError = (error: Error) => {
      socket.off("open", onOpen);
      reject(error);
    };
    socket.once("open", onOpen);
    socket.once("error", onError);
  });
  const challenge = await waitFor<GatewayFrame>({
    label: "Gateway connect.challenge",
    timeoutMs: params.timeoutMs,
    read: () =>
      client.frames.find((frame) => frame.type === "event" && frame.event === "connect.challenge"),
  });
  const nonce = isRecord(challenge.payload) ? challenge.payload.nonce : undefined;
  if (typeof nonce !== "string" || nonce.trim().length === 0) {
    throw new Error("Gateway connect.challenge did not include a nonce");
  }
  const keyPair = generateKeyPairSync("ed25519");
  const publicKeyPem = keyPair.publicKey.export({ type: "spki", format: "pem" });
  const privateKeyPem = keyPair.privateKey.export({ type: "pkcs8", format: "pem" });
  const publicKey = publicKeyRawBase64UrlFromPem(publicKeyPem);
  const deviceId = deriveDeviceIdFromPublicKey(publicKey);
  if (!deviceId) {
    throw new Error("failed to derive benchmark device id");
  }
  client.device = { deviceId, publicKey, privateKeyPem };
  client.connectNonce = nonce;
  return client;
}

async function closeRawGatewayClient(client: RawGatewayClient): Promise<void> {
  if (client.socket.readyState === WebSocket.CLOSED) {
    return;
  }
  const closed = new Promise<void>((resolve) => {
    client.socket.once("close", () => resolve());
  });
  if (client.socket.readyState === WebSocket.OPEN) {
    client.socket.close();
  }
  await Promise.race([closed, sleep(1_000)]);
  if ((client.socket.readyState as number) !== WebSocket.CLOSED) {
    client.socket.terminate();
  }
}

async function gatewayRequest<T>(
  client: RawGatewayClient,
  method: string,
  params: Record<string, unknown>,
  timeoutMs: number,
): Promise<T> {
  const id = randomUUID();
  const frameCount = client.frames.length;
  const response = waitFor<GatewayFrame>({
    label: `${method} response`,
    timeoutMs,
    read: () =>
      client.frames.slice(frameCount).find((frame) => frame.type === "res" && frame.id === id),
  });
  client.socket.send(JSON.stringify({ type: "req", id, method, params }));
  const frame = await response;
  if (frame.ok !== true) {
    const reason = isRecord(frame.error?.details) ? frame.error.details.reason : undefined;
    throw new Error(
      `${method} failed: ${frame.error?.code ?? "RPC_ERROR"}${
        frame.error?.message ? ` (${frame.error.message})` : ""
      }${typeof reason === "string" ? ` reason=${reason}` : ""}`,
    );
  }
  return frame.payload as T;
}

async function connectEnterpriseClient(
  client: RawGatewayClient,
  timeoutMs: number,
  buildId: string,
): Promise<void> {
  const scopes = [
    "operator.admin",
    "operator.read",
    "operator.write",
    "operator.approvals",
    "operator.questions",
    "operator.pairing",
  ];
  const signedAtMs = Date.now();
  const deviceAuthPayload = buildDeviceAuthPayload({
    deviceId: client.device.deviceId,
    clientId: GATEWAY_CLIENT_IDS.CONTROL_UI,
    clientMode: GATEWAY_CLIENT_MODES.WEBCHAT,
    role: "operator",
    scopes,
    signedAtMs,
    nonce: client.connectNonce,
  });
  const signature = signDevicePayload(client.device.privateKeyPem, deviceAuthPayload);
  const hello = await gatewayRequest<Record<string, unknown>>(
    client,
    "connect",
    {
      minProtocol: MIN_CLIENT_PROTOCOL_VERSION,
      maxProtocol: PROTOCOL_VERSION,
      client: {
        id: GATEWAY_CLIENT_IDS.CONTROL_UI,
        displayName: "Enterprise startup benchmark",
        version: "benchmark",
        buildId,
        platform: process.platform,
        // Enterprise employee browser sessions use the WebChat connect mode. In
        // this mode the accounts cookie is the shared authentication proof and
        // the requested user scopes are retained without a device pairing row.
        // Native Control UI mode would clear unbound scopes before the account
        // projection and make the real chat.send path fail with missing
        // operator.write, even though the same cookie is valid.
        mode: GATEWAY_CLIENT_MODES.WEBCHAT,
      },
      caps: [],
      role: "operator",
      scopes,
      device: {
        id: client.device.deviceId,
        publicKey: client.device.publicKey,
        signature,
        signedAt: signedAtMs,
        nonce: client.connectNonce,
      },
      auth: {},
    },
    timeoutMs,
  );
  if (hello.type !== "hello-ok") {
    throw new Error("Gateway accounts connect did not return hello-ok");
  }
}

async function readGatewayBuildId(repoRoot: string): Promise<string> {
  const buildInfoPath = path.join(repoRoot, "dist", "build-info.json");
  try {
    const parsed = JSON.parse(await fs.readFile(buildInfoPath, "utf8")) as { buildId?: unknown };
    if (typeof parsed.buildId === "string" && parsed.buildId.trim().length > 0) {
      return parsed.buildId.trim();
    }
  } catch {
    // The QA child should already fail clearly when its dist entry is absent. Keep
    // the handshake compatible with source/dev builds when build metadata is not
    // emitted by the selected repository.
  }
  return "dev";
}

async function readProviderCursor(baseUrl: string): Promise<number> {
  const response = await fetch(`${baseUrl}/debug/request-cursor`);
  if (!response.ok) {
    throw new Error(`provider cursor failed (${response.status})`);
  }
  const body = (await response.json()) as { cursor?: unknown };
  return typeof body.cursor === "number" ? body.cursor : 0;
}

async function readProviderEntries(
  baseUrl: string,
  cursor: number,
): Promise<ProviderLedgerEntry[]> {
  const response = await fetch(
    `${baseUrl}/debug/requests?after=${encodeURIComponent(String(cursor))}`,
  );
  if (!response.ok) {
    throw new Error(`provider ledger failed (${response.status})`);
  }
  const body = (await response.json()) as unknown;
  if (!Array.isArray(body)) {
    return [];
  }
  return body.filter(isRecord).map((entry) => ({
    cursor: typeof entry.cursor === "number" ? entry.cursor : undefined,
    model: typeof entry.model === "string" ? entry.model : undefined,
    requestKind: typeof entry.requestKind === "string" ? entry.requestKind : undefined,
    providerVariant: typeof entry.providerVariant === "string" ? entry.providerVariant : undefined,
    plannedToolName: typeof entry.plannedToolName === "string" ? entry.plannedToolName : undefined,
    plannedToolArgs: isRecord(entry.plannedToolArgs) ? entry.plannedToolArgs : undefined,
    outcome: typeof entry.outcome === "string" ? entry.outcome : undefined,
  }));
}

function timelineTimestamp(event: TimelineEvent): number | undefined {
  if (typeof event.monotonicMs === "number" && Number.isFinite(event.monotonicMs)) {
    return event.monotonicMs;
  }
  if (!event.timestamp) {
    return undefined;
  }
  const value = Date.parse(event.timestamp);
  return Number.isFinite(value) ? value : undefined;
}

async function readTimeline(timelinePath: string): Promise<TimelineEvent[]> {
  try {
    const text = await fs.readFile(timelinePath, "utf8");
    const events: TimelineEvent[] = [];
    for (const line of text.split(/\r?\n/u)) {
      if (!line.trim()) {
        continue;
      }
      try {
        const value = JSON.parse(line) as unknown;
        if (isRecord(value)) {
          events.push(value as TimelineEvent);
        }
      } catch {
        // Keep malformed diagnostic lines out of the report; the missing-stage marker explains it.
      }
    }
    return events;
  } catch {
    return [];
  }
}

function eventRunId(event: TimelineEvent): string | undefined {
  const attrRunId = event.attributes?.runId;
  return event.runId ?? (typeof attrRunId === "string" ? attrRunId : undefined);
}

function providerModelsFromTimeline(
  events: readonly TimelineEvent[],
  runId: string | undefined,
): string[] {
  if (!runId) {
    return [];
  }
  return events
    .filter((event) => eventRunId(event) === runId && event.name === "provider.http.submit")
    .map((event) => event.attributes?.model)
    .filter((model): model is string => typeof model === "string" && model.length > 0);
}

function timelineSpans(events: readonly TimelineEvent[], runId?: string): TimelineSpan[] {
  const matching = runId ? events.filter((event) => eventRunId(event) === runId) : [...events];
  const spans = new Map<
    string,
    {
      name: string;
      startMs?: number;
      endMs?: number;
      durationMs?: number;
      parentSpanId?: string;
      phase?: string;
    }
  >();
  const result: TimelineSpan[] = [];
  for (const event of matching) {
    const name = typeof event.name === "string" && event.name.length > 0 ? event.name : undefined;
    if (!name) {
      continue;
    }
    const timestamp = timelineTimestamp(event);
    const key = event.spanId ?? `${name}:${result.length}`;
    const current = spans.get(key) ?? { name };
    current.phase = typeof event.phase === "string" ? event.phase : current.phase;
    current.parentSpanId =
      typeof event.parentSpanId === "string" ? event.parentSpanId : current.parentSpanId;
    if (event.type?.toLowerCase().includes("start")) {
      current.startMs = timestamp;
    }
    if (event.type?.toLowerCase().includes("end")) {
      current.endMs = timestamp;
    }
    if (
      typeof event.durationMs === "number" &&
      Number.isFinite(event.durationMs) &&
      event.durationMs >= 0
    ) {
      current.durationMs = event.durationMs;
    }
    spans.set(key, current);
  }
  for (const span of spans.values()) {
    const duration =
      span.durationMs ??
      (span.startMs !== undefined && span.endMs !== undefined
        ? Math.max(0, span.endMs - span.startMs)
        : undefined);
    if (duration !== undefined) {
      result.push({
        name: span.name,
        durationMs: duration,
        startMs: span.startMs,
        endMs: span.endMs,
        parentSpanId: span.parentSpanId,
        phase: span.phase,
      });
    }
  }
  return result;
}

export function summarizeWaterfall(spans: readonly TimelineSpan[]): Waterfall {
  if (spans.length === 0) {
    return { criticalPathMs: null, spanSumMs: null, overlapMs: null, spans: [] };
  }
  const timed = spans.filter((span) => span.startMs !== undefined && span.endMs !== undefined);
  const spanSumMs = spans.reduce((total, span) => total + span.durationMs, 0);
  // A duration-only span cannot establish overlap. Keep the sum as a useful lower-level
  // diagnostic but leave critical path/overlap unknown instead of subtracting an incomplete
  // clock range from the total and reporting a false overlap.
  const criticalPathMs =
    timed.length === spans.length && timed.length > 0
      ? Math.max(
          0,
          Math.max(...timed.map((span) => span.endMs!)) -
            Math.min(...timed.map((span) => span.startMs!)),
        )
      : null;
  return {
    criticalPathMs,
    spanSumMs,
    overlapMs: criticalPathMs === null ? null : Math.max(0, spanSumMs - criticalPathMs),
    spans: spans.map((span) => ({
      name: span.name,
      durationMs: span.durationMs,
      startMs: span.startMs,
      endMs: span.endMs,
      parentSpanId: span.parentSpanId,
      phase: span.phase,
    })),
  };
}

function diagnosticsForSample(
  events: readonly TimelineEvent[],
  runId: string | undefined,
): {
  spans: TimelineSpan[];
  stages: Record<string, number>;
  calls: {
    llm: number | null;
    router: number | null;
    specialist: number | null;
    provider: number | null;
  };
} {
  const spans = timelineSpans(events, runId);
  const stages: Record<string, number> = {};
  for (const span of spans) {
    stages[span.name] = (stages[span.name] ?? 0) + span.durationMs;
  }
  const named = spans.map((span) => span.name.toLowerCase());
  const count = (predicate: (name: string) => boolean): number | null => {
    const value = named.filter(predicate).length;
    return value > 0 ? value : null;
  };
  return {
    spans,
    stages,
    calls: {
      llm: count((name) => /provider|model|llm|sampling/u.test(name)),
      router: count((name) => /router/u.test(name) && /provider|model|llm|sampling/u.test(name)),
      specialist: count(
        (name) =>
          /specialist|child|delegate/u.test(name) && /provider|model|llm|sampling/u.test(name),
      ),
      provider: count((name) => /provider|submission/u.test(name)),
    },
  };
}

function extractTerminalText(value: unknown): string {
  if (!isRecord(value)) {
    return "";
  }
  const candidates: unknown[] = [value.text, value.message, value.result];
  if (Array.isArray(value.payloads)) {
    candidates.push(...value.payloads);
  }
  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      return candidate;
    }
    if (isRecord(candidate)) {
      const nested = extractTerminalText(candidate);
      if (nested) {
        return nested;
      }
    }
  }
  return "";
}

function normalizeList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.filter((entry): entry is string => typeof entry === "string");
}

type QualityReceiptSnapshot = {
  authorityReceipt: QualityReceiptStatus;
  toolReceipts: QualityReceiptStatus;
  routeAgents?: string[];
  outcome?: string;
  toolCalls?: QualityToolCall[];
  delegateCalls?: number;
  businessWrites?: number;
};

type QualityDelegationRow = {
  sharedAgentIds: string[];
  childRunIds: string[];
  outcome: string;
  reasonCode: string;
  createdAt: number;
};

type QualityAuditToolEvent = {
  action: string;
  status: string;
  toolName: string;
  toolCallId?: string;
  runId: string;
};

const NON_BUSINESS_QUALITY_TOOLS = new Set([
  "enterprise_knowledge_search",
  "enterprise_knowledge_get",
  "enterprise_specialists_list",
  "enterprise_delegate",
  "sessions_yield",
]);

function parseJsonStringArray(value: unknown): string[] | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  try {
    return normalizeList(JSON.parse(value));
  } catch {
    return undefined;
  }
}

function parseQualityDelegationRow(value: unknown): QualityDelegationRow | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const sharedAgentIds = parseJsonStringArray(value.shared_agent_ids_json);
  const childRunIds = parseJsonStringArray(value.child_run_ids_json);
  if (
    !sharedAgentIds ||
    !childRunIds ||
    typeof value.outcome !== "string" ||
    typeof value.reason_code !== "string" ||
    typeof value.created_at !== "number"
  ) {
    return undefined;
  }
  return {
    sharedAgentIds,
    childRunIds,
    outcome: value.outcome,
    reasonCode: value.reason_code,
    createdAt: value.created_at,
  };
}

function parseQualityAuditToolEvent(value: unknown): QualityAuditToolEvent | undefined {
  if (
    !isRecord(value) ||
    value.kind !== "tool_action" ||
    typeof value.action !== "string" ||
    typeof value.status !== "string" ||
    typeof value.toolName !== "string" ||
    value.toolName.length === 0 ||
    typeof value.runId !== "string" ||
    value.runId.length === 0
  ) {
    return undefined;
  }
  return {
    action: value.action,
    status: value.status,
    toolName: value.toolName,
    ...(typeof value.toolCallId === "string" && value.toolCallId.length > 0
      ? { toolCallId: value.toolCallId }
      : {}),
    runId: value.runId,
  };
}

function qualityOutcomeAliases(outcome: EnterpriseQualityCase["expected"]["outcome"]): Set<string> {
  switch (outcome) {
    case "delegated":
    case "hybrid":
      return new Set(["delegated"]);
    case "clarify":
      return new Set(["clarified"]);
    case "cancelled":
      return new Set(["cancelled"]);
    case "local":
      return new Set(["local"]);
    default:
      throw new Error("unsupported quality outcome");
  }
}

type DynamicSqliteDatabase = {
  db: {
    prepare: (sql: string) => {
      all: (...parameters: unknown[]) => unknown;
    };
  };
};

async function readQualityReceipts(params: {
  lane: EnterpriseLane;
  runId: string;
  expected: EnterpriseQualityCase["expected"];
}): Promise<QualityReceiptSnapshot> {
  const stateOptions: StateDatabaseOptions = { env: params.lane.harness.gateway.runtimeEnv };
  let delegationRows: QualityDelegationRow[] = [];
  let authorityQuerySucceeded = false;
  try {
    const [stateDb, delegationStore] = await Promise.all([
      importRepoModule<{
        openOpenClawStateDatabase: (options?: StateDatabaseOptions) => DynamicSqliteDatabase;
      }>(params.lane.repoRoot, "src/state/openclaw-state-db.ts"),
      importRepoModule<{
        hashEnterpriseDelegationValue: (value: string) => string;
      }>(params.lane.repoRoot, "src/enterprise/delegation/delegation-store.ts"),
    ]);
    const rawRows = stateDb
      .openOpenClawStateDatabase(stateOptions)
      .db.prepare(
        `SELECT shared_agent_ids_json, child_run_ids_json, outcome, reason_code, created_at
           FROM enterprise_delegation_events
          WHERE account_id = ? AND personal_agent_id = ? AND parent_run_id_hash = ?
          ORDER BY created_at ASC`,
      )
      .all(
        params.lane.accountId,
        params.lane.personalAgentId,
        delegationStore.hashEnterpriseDelegationValue(params.runId),
      );
    if (!Array.isArray(rawRows)) {
      throw new Error("delegation receipt query returned a non-array result");
    }
    const parsedRows = rawRows.map(parseQualityDelegationRow);
    if (parsedRows.some((row) => row === undefined)) {
      throw new Error("delegation receipt query returned malformed metadata");
    }
    delegationRows = parsedRows.filter((row): row is QualityDelegationRow => row !== undefined);
    authorityQuerySucceeded = true;
  } catch {
    // A missing/locked state database is evidence-unavailable. Leave every dependent value
    // unknown so a transient read cannot become a false quality pass.
  }

  const routeAgents = authorityQuerySucceeded
    ? [...new Set(delegationRows.flatMap((row) => row.sharedAgentIds))]
    : undefined;
  const childRunIds = authorityQuerySucceeded
    ? [...new Set(delegationRows.flatMap((row) => row.childRunIds))]
    : [];
  const expectedOutcomes = qualityOutcomeAliases(params.expected.outcome);
  const authorityVerified =
    authorityQuerySucceeded &&
    delegationRows.some((row) => {
      const routesMatch = params.expected.routeAgents.every((agentId) =>
        row.sharedAgentIds.includes(agentId),
      );
      if (params.expected.outcome === "delegated" || params.expected.outcome === "hybrid") {
        // A routing proposal has childRunIds=[] and is not proof that the server accepted or
        // started work. Require the post-admission spawn receipt and its accepted child identity.
        return (
          routesMatch &&
          row.childRunIds.length > 0 &&
          /^delegate_(?:started|partial_failure)$/u.test(row.reasonCode)
        );
      }
      return expectedOutcomes.has(row.outcome) && routesMatch;
    });
  const latestDelegationRow = delegationRows.at(-1);
  const outcome = latestDelegationRow
    ? latestDelegationRow.outcome === "delegated" ||
      latestDelegationRow.outcome === "clarified" ||
      latestDelegationRow.outcome === "local" ||
      latestDelegationRow.outcome === "cancelled"
      ? latestDelegationRow.outcome
      : undefined
    : undefined;
  const delegateCalls = authorityQuerySucceeded ? childRunIds.length : undefined;

  let auditQuerySucceeded = false;
  let auditMalformed = false;
  const auditEvents: QualityAuditToolEvent[] = [];
  try {
    const auditStore = await importRepoModule<{
      listAuditEvents: (params: Record<string, unknown>) => { events: unknown[] };
    }>(params.lane.repoRoot, "src/audit/audit-event-store.ts");
    const auditRunIds = [...new Set([params.runId, ...childRunIds])];
    for (const auditRunId of auditRunIds) {
      const page = auditStore.listAuditEvents({
        filters: { runId: auditRunId, kind: "tool_action" },
        limit: 500,
        database: stateOptions,
      });
      if (!Array.isArray(page.events)) {
        throw new Error("tool audit query returned a non-array result");
      }
      for (const event of page.events) {
        const parsed = parseQualityAuditToolEvent(event);
        if (!parsed) {
          auditMalformed = true;
        } else {
          auditEvents.push(parsed);
        }
      }
    }
    auditQuerySucceeded = true;
  } catch {
    // Keep the receipt status unknown; the oracle must not infer tool completion from the model's
    // planned tool name or from the absence of a timeline hint.
  }

  const lifecycleByCall = new Map<string, { started: number; finished: number }>();
  for (const event of auditEvents) {
    const callKey = event.toolCallId ?? `${event.runId}:${event.toolName}`;
    const lifecycle = lifecycleByCall.get(callKey) ?? { started: 0, finished: 0 };
    if (event.action === "tool.action.started" && event.status === "started") {
      lifecycle.started += 1;
    } else if (event.action === "tool.action.finished") {
      lifecycle.finished += 1;
    } else {
      auditMalformed = true;
    }
    lifecycleByCall.set(callKey, lifecycle);
  }
  const terminalEvents = auditEvents.filter((event) => event.action === "tool.action.finished");
  const requiresToolReceipt =
    (params.expected.allowedTools?.length ?? 0) > 0 || params.expected.routeAgents.length > 0;
  const lifecycleComplete =
    [...lifecycleByCall.values()].every(
      (lifecycle) => lifecycle.started > 0 && lifecycle.started === lifecycle.finished,
    ) &&
    terminalEvents.every((event) => event.status !== "unknown") &&
    (!requiresToolReceipt || terminalEvents.length > 0);
  const toolCalls = auditQuerySucceeded
    ? terminalEvents.map((event) => ({
        name: event.toolName,
        sideEffect: NON_BUSINESS_QUALITY_TOOLS.has(event.toolName)
          ? ("read" as const)
          : ("unknown" as const),
      }))
    : undefined;
  const toolReceipts: QualityReceiptStatus =
    auditQuerySucceeded && !auditMalformed && lifecycleComplete ? "verified" : "unknown";
  const businessWrites =
    auditQuerySucceeded &&
    !auditMalformed &&
    lifecycleComplete &&
    terminalEvents.every((event) => NON_BUSINESS_QUALITY_TOOLS.has(event.toolName))
      ? 0
      : undefined;

  return {
    authorityReceipt: authorityVerified ? "verified" : "unknown",
    toolReceipts,
    routeAgents,
    outcome,
    toolCalls,
    delegateCalls,
    businessWrites,
  };
}

function observationFromRun(params: {
  text: string;
  events: readonly TimelineEvent[];
  runId?: string;
  providerEntries: readonly ProviderLedgerEntry[];
  receipts?: QualityReceiptSnapshot;
}): QualityObservation {
  const related = params.events.filter(
    (event) => !params.runId || eventRunId(event) === params.runId,
  );
  const attributes = related.flatMap((event) => (event.attributes ? [event.attributes] : []));
  const readAttribute = (key: string): unknown =>
    attributes.find((entry) => entry[key] !== undefined)?.[key];
  const timelineRouteAgents =
    normalizeList(readAttribute("routeAgents")) ?? normalizeList(readAttribute("sharedAgentIds"));
  const requiredInputIds = normalizeList(readAttribute("requiredInputIds"));
  const missingInputIds = normalizeList(readAttribute("missingInputIds"));
  const sourceTags =
    normalizeList(readAttribute("sourceTags")) ?? normalizeList(readAttribute("sources"));
  const timelineOutcome =
    typeof readAttribute("outcome") === "string" ? String(readAttribute("outcome")) : undefined;
  const toolCalls: QualityToolCall[] = related
    .filter((event) => /tool[._-](?:call|execute|result|completed)/u.test(event.name ?? ""))
    .map((event) => {
      const name = event.attributes?.toolName;
      const sideEffect = event.attributes?.sideEffect;
      const normalizedSideEffect: QualityToolCall["sideEffect"] =
        sideEffect === "read" || sideEffect === "write" || sideEffect === "unknown"
          ? sideEffect
          : "unknown";
      return typeof name === "string"
        ? {
            name,
            sideEffect: normalizedSideEffect,
          }
        : undefined;
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined);
  const delegateAttribute = readAttribute("delegateCalls");
  const writesAttribute = readAttribute("businessWrites");
  const delegateCalls = typeof delegateAttribute === "number" ? delegateAttribute : undefined;
  const businessWrites = typeof writesAttribute === "number" ? writesAttribute : undefined;
  return {
    text: params.text,
    outcome: params.receipts?.outcome ?? timelineOutcome,
    facts: normalizeList(readAttribute("facts")),
    sourceTags,
    routeAgents: params.receipts?.routeAgents ?? timelineRouteAgents,
    requiredInputIds,
    missingInputIds,
    toolCalls: params.receipts?.toolCalls ?? (related.length > 0 ? toolCalls : undefined),
    // A provider's plannedToolName is only a proposal. The safety gate needs explicit execution
    // diagnostics or a committed tool ledger, so absent counters remain unknown.
    delegateCalls: params.receipts?.delegateCalls ?? delegateCalls,
    businessWrites: params.receipts?.businessWrites ?? businessWrites,
  };
}

export const testing = {
  parseOptions,
  performanceCallCounts,
  percentile,
  requestBatchSizes,
  summarizeNumbers,
  summarizeWaterfall,
  summarizeQuality,
  timelineSpans,
};

type QaGateway = {
  baseUrl: string;
  wsUrl: string;
  configPath: string;
  tempRoot: string;
  runtimeEnv: NodeJS.ProcessEnv;
  restart: (signal?: NodeJS.Signals) => Promise<void>;
  stop: (options?: { keepTemp?: boolean }) => Promise<void>;
};

type QaProvider = { baseUrl: string; stop: () => Promise<void> };

type QaHarness = {
  gateway: QaGateway;
  mock: QaProvider | null;
  stop: (options?: { keepTemp?: boolean }) => Promise<void>;
};

type StateDatabaseOptions = { env: NodeJS.ProcessEnv };
type BenchmarkKnowledgeArtifact =
  import("../src/enterprise/knowledge/knowledge-types.js").NormalizedKnowledgeArtifact;

/**
 * Published, FTS-only KnowledgeZone data used by the quality lane. The workspace markdown seed is
 * retained for startup parity, but it is not treated as evidence: every source below goes through
 * the same source-version, artifact, generation, and publication owners as production data.
 */
const BENCHMARK_KNOWLEDGE_SOURCES: Readonly<Record<string, string>> = Object.freeze({
  "hr-directory-2026-09":
    "Nguồn hr-directory-2026-09. Chi nhánh A có Nguyễn An và Trần Bình, đều đang làm việc; tổng cộng 2 nhân viên. Chi nhánh B có 3 nhân viên chính thức. Chi phí tuyển dụng quý 3 được đối chiếu với kế hoạch nhân sự.",
  "finance-ledger-2026-08":
    "Nguồn finance-ledger-2026-08. Tháng 8 thu 2.400 triệu đồng, chi cố định 800 triệu đồng, chi biến đổi 600 triệu đồng, tiền đầu kỳ 1.000 triệu đồng. Dòng tiền ròng là 1.000 triệu đồng và tiền cuối kỳ là 2.000 triệu đồng.",
  "finance-product-cost-2026":
    "Nguồn finance-product-cost-2026. Giá bán 1.200.000 đồng, giá vốn 720.000 đồng, sản lượng 1.500 sản phẩm. Biên đơn vị 480.000 đồng, tỷ lệ biên 40%, lợi nhuận gộp 720 triệu đồng.",
  "hr-policy-leave-v4":
    "Nguồn hr-policy-leave-v4. Theo chính sách hiện hành, nhân viên mới có tối đa 12 ngày phép năm.",
  "finance-policy-expense-v3":
    "Nguồn finance-policy-expense-v3. Ngân sách marketing được phê duyệt là 450 triệu đồng và yêu cầu rà soát theo chính sách chi phí.",
  "incident-log-2026-09-12":
    "Nguồn incident-log-2026-09-12. Sự cố dịch vụ ngày 12/09 ảnh hưởng người dùng và được phân loại SEV-2.",
  "procurement-quotes-2026-09":
    "Nguồn procurement-quotes-2026-09. Khối lượng mua dự kiến là 4.000 đơn; hồ sơ nhà cung cấp phải nêu rõ SLA.",
  "legal-contract-template-v2":
    "Nguồn legal-contract-template-v2. Điều khoản chấm dứt cần được luật sư rà soát trước khi sử dụng.",
  "sales-forecast-q3-2026":
    "Nguồn sales-forecast-q3-2026. Mục tiêu quý 3 là 7.200 triệu đồng và khoản dự phòng là 300 triệu đồng.",
  "payroll-leave-ledger-2026":
    "Nguồn payroll-leave-ledger-2026. Bảng lương lưu số dư phép năm của nhân viên; đối chiếu cùng chính sách nghỉ phép hiện hành.",
  "product-issues-2026-09":
    "Nguồn product-issues-2026-09. Sản phẩm X có 18 báo cáo lỗi và được đánh dấu mức độ cao.",
  "conversation-user-input":
    "Nguồn conversation-user-input. Người dùng đã nêu yêu cầu tài chính và câu xác nhận: Đồng ý, làm giúp tôi.",
  "delegation-result-current":
    "Nguồn delegation-result-current. Đây là kết quả chuyên gia hiện tại đã được hệ thống giao và ghi nhận cho phần dòng tiền; khi tiếp tục phải dùng đúng kết quả đã nhận, không tự nhận là đã chạy lại.",
});

export type EnterpriseLane = {
  harness: QaHarness;
  client: RawGatewayClient;
  repoRoot: string;
  strategy: EnterpriseBenchmarkStrategy;
  /** UI-driver fields are returned only to an importing harness; they are never serialized. */
  baseUrl: string;
  wsUrl: string;
  username: string;
  password: string;
  wsConnectMs: number;
  accountId: string;
  personalAgentId: string;
  timelinePath: string;
  providerBaseUrl?: string;
  sessionPrefix: string;
  knowledgeZoneSlug?: string;
};

const ENTERPRISE_AGENT_FIRST_EXPERIMENT_ENV = "OPENCLAW_EXPERIMENT_ENTERPRISE_AGENT_FIRST";
const BENCHMARK_PASSWORD = "enterprise-benchmark-password";
const ENTERPRISE_AGENT_IDS = [
  "finance",
  "hr",
  "it",
  "procurement",
  "legal",
  "sales",
  "product",
] as const;

function enterpriseAgentEntry(agentId: string, model: string): Record<string, unknown> {
  return {
    name: `Benchmark ${agentId}`,
    description: `Deterministic Enterprise benchmark specialist for ${agentId}.`,
    model: { primary: model },
    delegationTarget: {
      status: "active",
      aliases: [`chuyên gia ${agentId}`, `benchmark ${agentId}`],
      handlingMode: "auto_when_certain",
      useWhen: [`yêu cầu ${agentId}`, `benchmark ${agentId}`],
      avoidWhen: ["không được ghi dữ liệu", "chỉ hỏi thông tin"],
      requiredInputs: [],
    },
  };
}

function addEnterpriseBenchmarkConfig(
  config: Record<string, unknown>,
  model: string,
  params: { qualityEvidence?: boolean; controlUiEnabled?: boolean } = {},
): Record<string, unknown> {
  const existingAgents = isRecord(config.agents) ? config.agents : {};
  const existingEntries = isRecord(existingAgents.entries) ? existingAgents.entries : {};
  const existingEnterprise = isRecord(config.enterprise) ? config.enterprise : {};
  const existingPersonalAgent = isRecord(existingEnterprise.personalAgent)
    ? existingEnterprise.personalAgent
    : {};
  const existingUserPortal = isRecord(existingEnterprise.userPortal)
    ? existingEnterprise.userPortal
    : {};
  const existingLogging = isRecord(config.logging) ? config.logging : {};
  const existingAudit = isRecord(existingLogging.audit) ? existingLogging.audit : {};
  const entries: Record<string, unknown> = {
    ...existingEntries,
    ...Object.fromEntries(
      ENTERPRISE_AGENT_IDS.map((agentId) => [agentId, enterpriseAgentEntry(agentId, model)]),
    ),
  };
  return {
    ...config,
    enterprise: {
      ...existingEnterprise,
      enabled: true,
      ...(params.controlUiEnabled === true
        ? { userPortal: { ...existingUserPortal, version: "v2" } }
        : {}),
      personalAgent: {
        ...existingPersonalAgent,
        templateAgentId: "qa",
      },
    },
    agents: { ...existingAgents, ownership: "explicit", entries },
    // The audit projection is deliberately enabled only for the quality lane. Performance
    // samples should measure the production send path without adding a quality-only writer, while
    // quality samples need the trusted tool_action lifecycle for an acceptance decision.
    logging: {
      ...existingLogging,
      audit: {
        ...existingAudit,
        enabled: params.qualityEvidence === true,
      },
    },
  };
}

function setTemporaryEnvironment(values: Record<string, string>): () => void {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(values)) {
    previous.set(key, process.env[key]);
    process.env[key] = value;
  }
  return () => {
    for (const [key, value] of previous) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };
}

async function seedBenchmarkWorkspace(
  account: { profileId: string },
  personalAgentId: string,
  stateEnv: NodeJS.ProcessEnv,
  repoRoot: string,
): Promise<void> {
  const { resolveEnterpriseWorkspacePath } = await importRepoModule<{
    resolveEnterpriseWorkspacePath: (
      profileId: string,
      agentId: string,
      env: NodeJS.ProcessEnv,
    ) => string;
  }>(repoRoot, "src/enterprise/personal-agent/personal-workspace.ts");
  const workspace = resolveEnterpriseWorkspacePath(account.profileId, personalAgentId, stateEnv);
  await fs.mkdir(workspace, { recursive: true });
  await fs.writeFile(
    path.join(workspace, "ENTERPRISE_BENCHMARK_SEED.md"),
    [
      "# Enterprise benchmark seed (read-only)",
      "",
      "## Sources",
      "- hr-directory-2026-09: branch A has Nguyễn An and Trần Bình (2 active employees); branch B has 3 full-time employees.",
      "- finance-ledger-2026-08: revenue 2.400 million, fixed cost 800 million, variable cost 600 million, opening cash 1.000 million; net cash 1.000 million and ending cash 2.000 million.",
      "- finance-product-cost-2026: price 1.200.000 VND, cost 720.000 VND, volume 1.500 units; unit margin 480.000 VND, margin rate 40%, gross profit 720 million VND.",
      "- hr-policy-leave-v4: new employees have a maximum of 12 days under the current policy.",
      "- incident-log-2026-09-12: the service incident is SEV-2.",
      "- product-issues-2026-09: product X has 18 reports and high severity.",
      "",
      "The benchmark never authorizes a business write. Cite the source id when returning a completed answer.",
      "",
    ].join("\n"),
    { encoding: "utf8", mode: 0o600 },
  );
}

async function seedPublishedKnowledgeFixture(
  account: { id: string },
  stateOptions: StateDatabaseOptions,
  stateEnv: NodeJS.ProcessEnv,
  repoRoot: string,
): Promise<{ slug: string; sourceTags: string[] }> {
  const [knowledgeStore, artifactStore, indexStore, resourceKeys] = await Promise.all([
    importRepoModule<typeof import("../src/enterprise/knowledge/knowledge-store.js")>(
      repoRoot,
      "src/enterprise/knowledge/knowledge-store.ts",
    ),
    importRepoModule<typeof import("../src/enterprise/knowledge/artifact-store.js")>(
      repoRoot,
      "src/enterprise/knowledge/artifact-store.ts",
    ),
    importRepoModule<typeof import("../src/enterprise/knowledge/index-store.js")>(
      repoRoot,
      "src/enterprise/knowledge/index-store.ts",
    ),
    importRepoModule<typeof import("../src/enterprise/entitlements/resource-keys.js")>(
      repoRoot,
      "src/enterprise/entitlements/resource-keys.ts",
    ),
  ]);
  const slug = `enterprise-benchmark-${createHash("sha256")
    .update(account.id)
    .digest("hex")
    .slice(0, 16)}`;
  let zone = knowledgeStore.createKnowledgeZone(
    {
      slug,
      name: "Enterprise benchmark published facts",
      description: "Isolated read-only sources for the quality harness.",
      egressPolicy: "local_only",
      graph: { enabled: false },
    },
    account.id,
    stateOptions,
  );
  zone = knowledgeStore.replaceKnowledgeAgentBindings(
    zone.id,
    [resourceKeys.personalAgentResourceKey(account.id)],
    zone.revision,
    account.id,
    stateOptions,
  );

  const artifacts: BenchmarkKnowledgeArtifact[] = [];
  for (const [sourceTag, content] of Object.entries(BENCHMARK_KNOWLEDGE_SOURCES)) {
    const contentHash = createHash("sha256").update(content).digest("hex");
    const created = knowledgeStore.createKnowledgeSourceWithVersion(
      {
        zoneId: zone.id,
        kind: "note",
        title: sourceTag,
        mimeType: "text/markdown",
        contentHash,
        blobHash: contentHash,
        byteSize: Buffer.byteLength(content, "utf8"),
      },
      account.id,
      stateOptions,
    );
    const artifact: BenchmarkKnowledgeArtifact = {
      schemaVersion: 1,
      sourceId: created.source.id,
      sourceVersionId: created.version.id,
      sourceVersion: 1,
      title: sourceTag,
      mimeType: "text/markdown",
      createdAt: Date.now(),
      parserProvenance: { parser: "enterprise-benchmark-fixture", version: 1 },
      segments: [
        {
          id: `${sourceTag}-segment`,
          text: content,
          normalizedText: content,
          locator: { kind: "text", section: "fixture" },
          ordinal: 0,
        },
      ],
    };
    const stored = await artifactStore.putNormalizedKnowledgeArtifact(artifact, stateEnv);
    knowledgeStore.completeKnowledgeSourceVersion(
      {
        versionId: created.version.id,
        pipelineGeneration: created.version.pipelineGeneration,
        processingStatus: "ready",
        normalizedArtifactHash: stored.hash,
        segmentCount: artifact.segments.length,
        vectorStatus: "unavailable",
        parserProvenance: artifact.parserProvenance,
      },
      stateOptions,
    );
    artifacts.push(artifact);
  }

  const current = knowledgeStore.getKnowledgeZone(zone.id, stateOptions);
  if (!current) {
    throw new Error("benchmark KnowledgeZone disappeared before publication");
  }
  const generation = knowledgeStore.createKnowledgeGeneration(
    zone.id,
    current.sourceSetRevision,
    current.buildRevision,
    stateOptions,
  );
  const built = await indexStore.buildKnowledgeGenerationIndex({
    zoneId: zone.id,
    generationId: generation.id,
    sourceSetRevision: current.sourceSetRevision,
    buildRevision: current.buildRevision,
    artifacts,
    env: stateEnv,
  });
  knowledgeStore.finishKnowledgeGeneration(
    generation.id,
    { lexicalStatus: "ready", vectorStatus: "unavailable", artifactChecksum: built.checksum },
    stateOptions,
  );
  knowledgeStore.publishKnowledgeCandidate(
    {
      zoneId: zone.id,
      baseRevision: current.revision,
      generationId: generation.id,
      degradedReason: "Benchmark fixture intentionally uses the local FTS index.",
      actorAccountId: account.id,
    },
    stateOptions,
  );
  return { slug: zone.slug, sourceTags: Object.keys(BENCHMARK_KNOWLEDGE_SOURCES) };
}

async function importRepoModule<T>(repoRoot: string, relativePath: string): Promise<T> {
  const sourcePath = path.join(repoRoot, relativePath);
  return (await import(pathToFileURL(sourcePath).href)) as T;
}

export async function startEnterpriseLane(params: {
  options: BenchmarkOptions;
  strategy: EnterpriseBenchmarkStrategy;
  timelinePath: string;
  controlUiEnabled?: boolean;
  qualityEvidence?: boolean;
}): Promise<EnterpriseLane> {
  const restoreEnv = setTemporaryEnvironment({
    [ENTERPRISE_AGENT_FIRST_EXPERIMENT_ENV]: params.strategy === "personal-agent-first" ? "1" : "0",
    OPENCLAW_DIAGNOSTICS: "timeline",
    OPENCLAW_DIAGNOSTICS_ENV: "enterprise-startup-benchmark",
    OPENCLAW_DIAGNOSTICS_TIMELINE_PATH: params.timelinePath,
    ...(params.options.keepTemp ? { OPENCLAW_QA_KEEP_TEMP: "1" } : {}),
  });
  let harness: QaHarness | undefined;
  let harnessStartupError: unknown;
  try {
    const { startQaLiveLaneGateway } = await importRepoModule<
      typeof import("../extensions/qa-lab/runtime-api.js")
    >(params.options.repoRoot, "extensions/qa-lab/runtime-api.ts");
    harness = (await startQaLiveLaneGateway({
      repoRoot: params.options.repoRoot,
      providerMode: params.options.providerMode,
      primaryModel: params.options.model,
      alternateModel: params.options.alternateModel,
      transport: { requiredPluginIds: [], createGatewayConfig: () => ({}) },
      transportBaseUrl: "http://127.0.0.1",
      controlUiEnabled: params.controlUiEnabled ?? false,
      mutateConfig: (cfg: OpenClawConfig) =>
        addEnterpriseBenchmarkConfig(
          cfg as unknown as Record<string, unknown>,
          params.options.model,
          {
            qualityEvidence: params.qualityEvidence,
            controlUiEnabled: params.controlUiEnabled,
          },
        ) as unknown as OpenClawConfig,
    })) as unknown as QaHarness;
  } catch (error) {
    harnessStartupError = error;
  } finally {
    restoreEnv();
  }
  if (!harness) {
    throw harnessStartupError instanceof Error
      ? harnessStartupError
      : new Error("QA Gateway harness did not start", { cause: harnessStartupError });
  }

  let client: RawGatewayClient | undefined;
  try {
    const [
      { createEnterpriseAccount },
      { hashEnterprisePassword },
      { loginEnterpriseAccount },
      { createEnterpriseAuthCookie },
      { writeEnterpriseDelegationPolicy },
      { sharedAgentResourceKey },
      { resolveEnterprisePersonalAgentId },
    ] = await Promise.all([
      importRepoModule<typeof import("../src/enterprise/accounts/account-store.js")>(
        params.options.repoRoot,
        "src/enterprise/accounts/account-store.ts",
      ),
      importRepoModule<typeof import("../src/enterprise/auth/password.js")>(
        params.options.repoRoot,
        "src/enterprise/auth/password.ts",
      ),
      importRepoModule<typeof import("../src/enterprise/auth/auth-service.js")>(
        params.options.repoRoot,
        "src/enterprise/auth/auth-service.ts",
      ),
      importRepoModule<typeof import("../src/enterprise/auth/cookie.js")>(
        params.options.repoRoot,
        "src/enterprise/auth/cookie.ts",
      ),
      importRepoModule<typeof import("../src/enterprise/delegation/delegation-store.js")>(
        params.options.repoRoot,
        "src/enterprise/delegation/delegation-store.ts",
      ),
      importRepoModule<typeof import("../src/enterprise/entitlements/resource-keys.js")>(
        params.options.repoRoot,
        "src/enterprise/entitlements/resource-keys.ts",
      ),
      importRepoModule<typeof import("../src/enterprise/personal-agent/personal-agent-config.js")>(
        params.options.repoRoot,
        "src/enterprise/personal-agent/personal-agent-config.ts",
      ),
    ]);
    const username = `bench-${randomUUID().replaceAll("-", "").slice(0, 20)}`;
    const stateOptions = { env: harness.gateway.runtimeEnv };
    const config = JSON.parse(await fs.readFile(harness.gateway.configPath, "utf8")) as Record<
      string,
      unknown
    >;
    const account = createEnterpriseAccount(
      {
        username,
        displayName: "Enterprise startup benchmark",
        passwordHash: await hashEnterprisePassword(BENCHMARK_PASSWORD),
        role: "employee",
        mustChangePassword: false,
        personalAgentEnabled: true,
        config,
        initialEntitlements: ENTERPRISE_AGENT_IDS.map((agentId) => ({
          resourceType: "agent" as const,
          resourceId: sharedAgentResourceKey(agentId),
          effect: "allow" as const,
        })),
      },
      stateOptions,
    );
    if (params.controlUiEnabled === true) {
      // The v2 User Portal refuses to serve an unbootstrapped Enterprise state.
      // Seed a separate administrator only as that isolated bootstrap marker;
      // the benchmark itself continues to authenticate as the employee above.
      // Deliberately discard the random password so this account cannot become a
      // hidden second benchmark actor or leak credentials into the report.
      createEnterpriseAccount(
        {
          username: `bench-bootstrap-${randomUUID().replaceAll("-", "").slice(0, 20)}`,
          displayName: "Enterprise benchmark UI bootstrap",
          passwordHash: await hashEnterprisePassword(randomUUID()),
          role: "administrator",
          mustChangePassword: true,
          personalAgentEnabled: false,
          config,
        },
        stateOptions,
      );
    }
    writeEnterpriseDelegationPolicy(
      0,
      {
        rollout: "on",
        routerModel: params.options.model,
        autoThreshold: 0.9,
        clarifyThreshold: 0.7,
        minimumMargin: 0.15,
        maxDelegatesPerTurn: 2,
        eventRetentionDays: 1,
      },
      stateOptions,
    );
    const personalAgentId = resolveEnterprisePersonalAgentId(config as never, account);
    await seedBenchmarkWorkspace(
      account,
      personalAgentId,
      harness.gateway.runtimeEnv,
      params.options.repoRoot,
    );
    const knowledgeFixture =
      params.qualityEvidence === true
        ? await seedPublishedKnowledgeFixture(
            account,
            stateOptions,
            harness.gateway.runtimeEnv,
            params.options.repoRoot,
          )
        : undefined;
    const login = await loginEnterpriseAccount(username, BENCHMARK_PASSWORD, stateOptions, "user");
    const cookie = createEnterpriseAuthCookie(login.token, "user").split(";", 1)[0]!;

    const existingGateway = isRecord(config.gateway) ? config.gateway : {};
    const existingGatewayAuth = isRecord(existingGateway.auth) ? existingGateway.auth : {};
    const nextConfig = {
      ...config,
      gateway: {
        ...existingGateway,
        auth: {
          ...existingGatewayAuth,
          mode: "accounts",
        },
      },
    };
    await fs.writeFile(harness.gateway.configPath, `${JSON.stringify(nextConfig, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    await harness.gateway.restart();
    const wsConnectStartedAt = performance.now();
    client = await openRawGatewayClient(harness.gateway.wsUrl, {
      cookie,
      origin: harness.gateway.baseUrl,
      timeoutMs: params.options.timeoutMs,
    });
    await connectEnterpriseClient(
      client,
      params.options.timeoutMs,
      await readGatewayBuildId(params.options.repoRoot),
    );
    // The Control UI subscribes once after connect and then consumes chat terminal
    // events. Reuse that public subscription boundary so waiting never polls
    // chat.history while the server is still preparing a routed turn.
    await gatewayRequest(client, "sessions.subscribe", {}, params.options.timeoutMs);
    return {
      harness,
      client,
      repoRoot: params.options.repoRoot,
      strategy: params.strategy,
      baseUrl: harness.gateway.baseUrl,
      wsUrl: harness.gateway.wsUrl,
      username,
      password: BENCHMARK_PASSWORD,
      wsConnectMs: Math.max(0, performance.now() - wsConnectStartedAt),
      accountId: account.id,
      personalAgentId,
      timelinePath: params.timelinePath,
      providerBaseUrl: harness.mock?.baseUrl,
      sessionPrefix: `enterprise-personal-${personalAgentId}-${randomUUID()}`,
      ...(knowledgeFixture ? { knowledgeZoneSlug: knowledgeFixture.slug } : {}),
    };
  } catch (error) {
    if (client) {
      await closeRawGatewayClient(client).catch(() => undefined);
    }
    await harness.stop({ keepTemp: params.options.keepTemp }).catch(() => undefined);
    throw error;
  }
}

type SandboxRegistryCleanupEntry = {
  containerName: string;
  sessionKey: string;
  backendId?: string;
};

type SandboxContainerInspection = {
  labels: Record<string, string>;
  mounts: Array<{ type?: string; source?: string; destination?: string }>;
};

function sandboxEngineCommand(entry: SandboxRegistryCleanupEntry): "docker" | "podman" {
  return entry.backendId === "podman" ? "podman" : "docker";
}

function parseInspectionJson(value: string, label: string): unknown {
  try {
    return JSON.parse(value.trim()) as unknown;
  } catch (error) {
    throw new Error(`sandbox inspect returned invalid ${label} JSON`, { cause: error });
  }
}

async function inspectSandboxContainer(
  entry: SandboxRegistryCleanupEntry,
): Promise<SandboxContainerInspection> {
  const command = sandboxEngineCommand(entry);
  const inspect = async (format: string): Promise<string> => {
    const result = await execFileAsync(
      command,
      ["inspect", `--format=${format}`, entry.containerName],
      { encoding: "utf8", maxBuffer: 1_000_000 },
    );
    const stdout = (result as { stdout?: unknown }).stdout;
    return typeof stdout === "string" ? stdout : "";
  };
  const [labelsText, mountsText] = await Promise.all([
    inspect("{{json .Config.Labels}}"),
    inspect("{{json .Mounts}}"),
  ]);
  const labelsValue = parseInspectionJson(labelsText, "labels");
  const mountsValue = parseInspectionJson(mountsText, "mounts");
  const labels = isRecord(labelsValue)
    ? Object.fromEntries(
        Object.entries(labelsValue).filter(
          (labelEntry): labelEntry is [string, string] =>
            typeof labelEntry[0] === "string" && typeof labelEntry[1] === "string",
        ),
      )
    : {};
  const mounts = Array.isArray(mountsValue)
    ? mountsValue.filter(isRecord).map((mount) => {
        const normalized: { type?: string; source?: string; destination?: string } = {};
        if (typeof mount.Type === "string") {
          normalized.type = mount.Type;
        }
        if (typeof mount.Source === "string") {
          normalized.source = mount.Source;
        }
        if (typeof mount.Destination === "string") {
          normalized.destination = mount.Destination;
        }
        return normalized;
      })
    : [];
  return { labels, mounts };
}

function isPathWithin(root: string, candidate: string): boolean {
  const resolvedRoot = path.resolve(root);
  const resolvedCandidate = path.resolve(candidate);
  return (
    resolvedCandidate === resolvedRoot || resolvedCandidate.startsWith(`${resolvedRoot}${path.sep}`)
  );
}

function assertSandboxContainerOwnership(
  lane: EnterpriseLane,
  entry: SandboxRegistryCleanupEntry,
  inspection: SandboxContainerInspection,
): void {
  const expectedPrefix = `agent:${lane.personalAgentId}:`;
  if (!entry.sessionKey.startsWith(expectedPrefix)) {
    throw new Error(
      `refusing to remove sandbox ${entry.containerName}: registry session is outside this lane`,
    );
  }
  if (inspection.labels["openclaw.sandbox"] !== "1") {
    throw new Error(`refusing to remove sandbox ${entry.containerName}: sandbox label is missing`);
  }
  if (inspection.labels["openclaw.sessionKey"] !== entry.sessionKey) {
    throw new Error(
      `refusing to remove sandbox ${entry.containerName}: session label does not match registry`,
    );
  }
  const bindSources = inspection.mounts
    .filter((mount) => mount.type === "bind")
    .map((mount) => mount.source)
    .filter((source): source is string => Boolean(source));
  if (
    bindSources.length === 0 ||
    bindSources.some((source) => !isPathWithin(lane.harness.gateway.tempRoot, source))
  ) {
    throw new Error(
      `refusing to remove sandbox ${entry.containerName}: bind mount is not owned by ${lane.harness.gateway.tempRoot}`,
    );
  }
}

export async function cleanupOwnedSandboxRuntimes(lane: EnterpriseLane): Promise<string[]> {
  // Enterprise projection intentionally exercises the Docker sandbox. Stop only entries
  // created for this lane, and prove both the registry identity and Docker mount ownership
  // before removing anything. Never invoke a global prune: unrelated developer and QA
  // containers are out of scope.
  const envValues = Object.fromEntries(
    Object.entries(lane.harness.gateway.runtimeEnv).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
  const restoreEnv = setTemporaryEnvironment(envValues);
  try {
    const [{ readRegistry }, { removeSandboxContainer }] = await Promise.all([
      importRepoModule<{
        readRegistry: () => Promise<{ entries: SandboxRegistryCleanupEntry[] }>;
      }>(lane.repoRoot, "src/agents/sandbox/registry.ts"),
      importRepoModule<{ removeSandboxContainer: (containerName: string) => Promise<void> }>(
        lane.repoRoot,
        "src/agents/sandbox/manage.ts",
      ),
    ]);
    const prefix = `agent:${lane.personalAgentId}:`;
    const entries = (await readRegistry()).entries.filter((entry) =>
      entry.sessionKey.startsWith(prefix),
    );
    const removed: string[] = [];
    for (const entry of entries) {
      const inspection = await inspectSandboxContainer(entry);
      assertSandboxContainerOwnership(lane, entry, inspection);
      await removeSandboxContainer(entry.containerName);
      removed.push(entry.containerName);
    }
    return removed;
  } finally {
    restoreEnv();
  }
}

export async function stopEnterpriseLane(lane: EnterpriseLane, keepTemp: boolean): Promise<void> {
  await closeRawGatewayClient(lane.client).catch(() => undefined);
  const cleanupErrors: unknown[] = [];
  let gatewayStopped = false;
  // Keep the QA temp root until the Gateway and provider have stopped. This gives the
  // cleanup pass a stable registry/config root and prevents a timeout path from deleting
  // a runtime that may still be serving an active turn.
  try {
    await lane.harness.stop({ keepTemp: true });
    gatewayStopped = true;
  } catch (error) {
    cleanupErrors.push(error);
  }
  if (gatewayStopped) {
    try {
      await cleanupOwnedSandboxRuntimes(lane);
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (gatewayStopped && cleanupErrors.length === 0 && !keepTemp) {
    try {
      await fs.rm(lane.harness.gateway.tempRoot, { recursive: true, force: true });
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (cleanupErrors.length === 1) {
    throw cleanupErrors[0];
  }
  if (cleanupErrors.length > 1) {
    throw new AggregateError(cleanupErrors, "Enterprise benchmark lane cleanup failed");
  }
}

async function waitForProviderCount(params: {
  baseUrl?: string;
  cursor: number;
  minimum: number;
  timeoutMs: number;
}): Promise<ProviderProbe> {
  if (!params.baseUrl) {
    return { cursor: params.cursor, entries: [] };
  }
  const started = performance.now();
  return await waitFor({
    label: "provider request receipt",
    timeoutMs: params.timeoutMs,
    read: async () => {
      const entries = await readProviderEntries(params.baseUrl!, params.cursor);
      if (entries.length < params.minimum) {
        return undefined;
      }
      return { cursor: params.cursor, entries, observedAtMs: performance.now() - started };
    },
    intervalMs: 20,
  });
}

function firstNumber(record: unknown, keys: readonly string[]): number | null {
  if (!isRecord(record)) {
    return null;
  }
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      return value;
    }
  }
  return null;
}

function firstStage(stages: Record<string, number>, patterns: readonly RegExp[]): number | null {
  const values = Object.entries(stages)
    .filter(([name]) => patterns.some((pattern) => pattern.test(name)))
    .map(([, duration]) => duration)
    .filter((duration) => Number.isFinite(duration) && duration >= 0);
  return values.length > 0 ? values.reduce((total, value) => total + value, 0) : null;
}

function eventMonotonicMs(event: TimelineEvent): number | undefined {
  return typeof event.monotonicMs === "number" && Number.isFinite(event.monotonicMs)
    ? event.monotonicMs
    : undefined;
}

function earliestGatewayReceivedMarker(
  events: readonly TimelineEvent[],
  runId: string | undefined,
): number | undefined {
  const values = events
    .filter((event) => eventRunId(event) === runId && event.name === "gateway.chat_send.received")
    .map(eventMonotonicMs)
    .filter((value): value is number => value !== undefined);
  return values.length > 0 ? Math.min(...values) : undefined;
}

function gatewayReceivedToAckDelta(
  events: readonly TimelineEvent[],
  runId: string | undefined,
  receivedAtMs: number | undefined,
): number | null {
  if (receivedAtMs === undefined || runId === undefined) {
    return null;
  }
  const ackValues = events
    .filter((event) => eventRunId(event) === runId && event.name === "gateway.chat_send.ack_ready")
    .map(eventMonotonicMs)
    .filter((value): value is number => value !== undefined && value >= receivedAtMs);
  return ackValues.length > 0 ? Math.max(0, Math.min(...ackValues) - receivedAtMs) : null;
}

function providerSubmissionDeltas(
  events: readonly TimelineEvent[],
  runId: string | undefined,
  receivedAtMs: number | undefined,
): {
  count: number | null;
  firstMs: number | null;
  routerMs: number | null;
  personalAgentMs: number | null;
} {
  const unknown = { count: null, firstMs: null, routerMs: null, personalAgentMs: null } as const;
  if (receivedAtMs === undefined || runId === undefined) {
    return unknown;
  }
  const matching = events.filter((event) => eventRunId(event) === runId);
  const spanNames = new Map<string, string>();
  const spanParents = new Map<string, string | undefined>();
  for (const event of matching) {
    if (event.spanId && typeof event.name === "string") {
      spanNames.set(event.spanId, event.name);
      spanParents.set(event.spanId, event.parentSpanId);
    }
  }
  const lineage = (spanId: string | undefined): string[] => {
    const names: string[] = [];
    const seen = new Set<string>();
    let current = spanId;
    while (current && !seen.has(current)) {
      seen.add(current);
      const name = spanNames.get(current);
      if (name) {
        names.push(name);
      }
      current = spanParents.get(current);
    }
    return names;
  };
  const submissionEvents = matching
    .filter((event) => event.name === "provider.http.submit")
    .filter((event) => {
      const redirectCount = event.attributes?.redirectCount;
      // A redirect is one HTTP transport sequence, not another LLM submission.
      return redirectCount === undefined || redirectCount === 0;
    });
  const submissions = submissionEvents
    .map(eventMonotonicMs)
    .filter((value): value is number => value !== undefined && value >= receivedAtMs);
  if (submissions.length === 0) {
    return unknown;
  }
  const delta = (
    predicate: (event: TimelineEvent, names: readonly string[]) => boolean,
  ): number | null => {
    const values = submissionEvents
      .filter((event) => predicate(event, lineage(event.parentSpanId)))
      .map(eventMonotonicMs)
      .filter((value): value is number => value !== undefined && value >= receivedAtMs);
    return values.length > 0 ? Math.max(0, Math.min(...values) - receivedAtMs) : null;
  };
  return {
    count: submissions.length,
    firstMs: Math.max(0, Math.min(...submissions) - receivedAtMs),
    routerMs: delta((_event, names) => names.some((name) => /router/iu.test(name))),
    personalAgentMs: delta((_event, names) => {
      if (names.some((name) => /router|specialist|child|delegate/iu.test(name))) {
        return false;
      }
      return names.some((name) => /reply\.run_agent_turn|agent[._-]/iu.test(name));
    }),
  };
}

function benchmarkMessage(scenario: PerformanceScenario, marker: string): string {
  switch (scenario) {
    case "cold":
      return `Benchmark cold Enterprise startup. Reply with a short acknowledgement for ${marker}; do not call business tools.`;
    case "prewarmed":
      return `Benchmark prewarmed Enterprise startup. Reply with a short acknowledgement for ${marker}; do not call business tools.`;
    case "resumed":
      return `Benchmark resumed Enterprise turn. Reply with a short acknowledgement for ${marker}; do not call business tools.`;
    case "warm":
      return `Benchmark warm Enterprise startup. Reply with a short acknowledgement for ${marker}; do not call business tools.`;
    default:
      throw new Error("unsupported performance scenario");
  }
}

type StartedResponse = { runId: string; serverTiming?: unknown };

function isStartedResponse(value: unknown): value is StartedResponse {
  return isRecord(value) && value.status === "started" && typeof value.runId === "string";
}

async function waitForAgentRun(
  client: RawGatewayClient,
  runId: string,
  timeoutMs: number,
): Promise<unknown> {
  const deadline = Date.now() + timeoutMs;
  try {
    return await gatewayRequest<unknown>(
      client,
      "agent.wait",
      { runId, timeoutMs },
      timeoutMs + 5_000,
    );
  } catch (error) {
    // Enterprise routing can acknowledge before the ordinary agent-run registry
    // publishes a child run. Callers that have a chat terminal event or persisted
    // history must handle this as a bounded publication race, rather than retrying
    // agent.wait indefinitely and adding control-plane traffic to the measurement.
    if (!safeError(error).includes("agent run was not found")) {
      throw error;
    }
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      throw error;
    }
    throw new Error(`agent run was not found before terminal fallback for ${runId}`, {
      cause: error,
    });
  }
}

const CHAT_TERMINAL_STATES = new Set(["final", "error", "aborted"]);

function chatPayload(frame: GatewayFrame): Record<string, unknown> | undefined {
  if (frame.type !== "event" || frame.event !== "chat" || !isRecord(frame.payload)) {
    return undefined;
  }
  return frame.payload;
}

function findChatTerminalFrame(client: RawGatewayClient, runId: string): GatewayFrame | undefined {
  return client.frames.find((frame) => {
    const payload = chatPayload(frame);
    return (
      payload?.runId === runId &&
      typeof payload.state === "string" &&
      CHAT_TERMINAL_STATES.has(payload.state)
    );
  });
}

function findChatFirstOutputFrame(
  client: RawGatewayClient,
  runId: string,
): GatewayFrame | undefined {
  return client.frames.find((frame) => {
    const payload = chatPayload(frame);
    if (payload?.runId !== runId) {
      return false;
    }
    if (payload.state === "delta") {
      return typeof payload.deltaText === "string" && payload.deltaText.length > 0;
    }
    return payload?.state === "final" && payload.message !== undefined;
  });
}

async function waitForChatHistory(params: {
  client: RawGatewayClient;
  sessionKey: string;
  timeoutMs: number;
}): Promise<{ value: unknown; observedAtMs: number; polls: number }> {
  // The browser reads history once after it receives the terminal chat event. Repeated
  // history polling while a router is active blocks the same event loop being measured.
  const value = await gatewayRequest<unknown>(
    params.client,
    "chat.history",
    { sessionKey: params.sessionKey, limit: 100 },
    params.timeoutMs,
  );
  return { value, observedAtMs: performance.now(), polls: 1 };
}

type RunCompletion = {
  terminal: unknown;
  terminalAtMs: number;
  firstOutputAtMs: number | null;
  source: "chat-event" | "agent.wait";
};

async function waitForChatTerminal(params: {
  client: RawGatewayClient;
  runId: string;
  timeoutMs: number;
}): Promise<RunCompletion> {
  const deadline = Date.now() + params.timeoutMs;
  let agentWaitState: { value: unknown } | { error: unknown } | undefined;
  let agentWaitStarted = false;
  // The public chat subscription is the primary completion boundary. This covers routed
  // clarification/finalization runs that never create a visible ordinary agent run.
  while (Date.now() < deadline) {
    const terminalFrame = findChatTerminalFrame(params.client, params.runId);
    if (terminalFrame) {
      const firstOutputFrame = findChatFirstOutputFrame(params.client, params.runId);
      return {
        terminal: chatPayload(terminalFrame),
        terminalAtMs: terminalFrame.receivedAtMs ?? performance.now(),
        firstOutputAtMs: firstOutputFrame?.receivedAtMs ?? null,
        source: "chat-event",
      };
    }

    // Use the existing agent.wait API at most once as a compatibility fallback. Its
    // publication race is observed in the background while the chat stream remains
    // authoritative, so a not-found result never starts a history polling loop.
    if (!agentWaitStarted && Date.now() + 250 < deadline) {
      agentWaitStarted = true;
      const remaining = deadline - Date.now();
      void waitForAgentRun(params.client, params.runId, remaining).then(
        (value) => {
          agentWaitState = { value };
        },
        (error: unknown) => {
          agentWaitState = { error };
        },
      );
    }
    if (agentWaitState && "value" in agentWaitState) {
      const fallbackTerminalFrame = findChatTerminalFrame(params.client, params.runId);
      const firstOutputFrame = findChatFirstOutputFrame(params.client, params.runId);
      return {
        terminal: agentWaitState.value,
        terminalAtMs: fallbackTerminalFrame?.receivedAtMs ?? performance.now(),
        firstOutputAtMs: firstOutputFrame?.receivedAtMs ?? null,
        source: "agent.wait",
      };
    }
    if (agentWaitState && "error" in agentWaitState) {
      const message = safeError(agentWaitState.error);
      if (!message.includes("agent run was not found")) {
        throw agentWaitState.error;
      }
      // Leave the chat event loop running. Routed clarification and direct local
      // replies may complete without an ordinary run registry entry.
      agentWaitState = { error: new Error(message) };
    }
    await sleep(Math.min(25, Math.max(1, deadline - Date.now())));
  }
  throw new Error(`timed out waiting for chat terminal event ${params.runId}`);
}

async function runMeasuredTurn(params: {
  lane: EnterpriseLane;
  sampleId: string;
  scenario: PerformanceScenario;
  strategy: EnterpriseBenchmarkStrategy;
  concurrency: number;
  timeoutMs: number;
  messages: readonly string[];
  sessionKeys: readonly string[];
}): Promise<TimingSample[]> {
  const requestCount = params.messages.length;
  const providerCursor = params.lane.providerBaseUrl
    ? await readProviderCursor(params.lane.providerBaseUrl)
    : 0;
  const startedAt = performance.now();
  const providerPromise = params.lane.providerBaseUrl
    ? waitForProviderCount({
        baseUrl: params.lane.providerBaseUrl,
        cursor: providerCursor,
        minimum: requestCount,
        timeoutMs: params.timeoutMs,
      })
    : Promise.resolve<ProviderProbe>({ cursor: providerCursor, entries: [] });
  const runResults = await Promise.all(
    params.messages.map(async (message, index) => {
      const sessionKey = params.sessionKeys[index]!;
      const sendStartedAt = performance.now();
      try {
        const ackValue = await gatewayRequest<unknown>(
          params.lane.client,
          "chat.send",
          {
            sessionKey,
            agentId: params.lane.personalAgentId,
            message,
            deliver: false,
            suppressCommandInterpretation: true,
            idempotencyKey: randomUUID(),
          },
          params.timeoutMs,
        );
        const ackAt = performance.now();
        if (!isStartedResponse(ackValue)) {
          throw new Error("chat.send did not return a started run");
        }
        const completion = await waitForChatTerminal({
          client: params.lane.client,
          runId: ackValue.runId,
          timeoutMs: params.timeoutMs,
        });
        const historyResult = await waitForChatHistory({
          client: params.lane.client,
          sessionKey,
          timeoutMs: params.timeoutMs,
        });
        return {
          ackValue,
          terminal: completion.terminal,
          history: historyResult.value,
          runId: ackValue.runId,
          sendStartedAt,
          ackAt,
          terminalAt: completion.terminalAtMs,
          historyAt: historyResult.observedAtMs,
          firstOutputAt: completion.firstOutputAtMs,
          completionSource: completion.source,
          historyPolls: historyResult.polls,
          index,
        };
      } catch (error) {
        return { error: safeError(error), sendStartedAt, index };
      }
    }),
  );
  let provider: ProviderProbe;
  try {
    provider = await providerPromise;
  } catch {
    provider = {
      cursor: providerCursor,
      entries: params.lane.providerBaseUrl
        ? await readProviderEntries(params.lane.providerBaseUrl, providerCursor).catch(() => [])
        : [],
    };
  }
  // The first provider receipt is only a readiness signal for the concurrent batch.
  // Read once more after all terminal events so counters include late requests and
  // never mistake an in-flight prefix for the batch total.
  if (params.lane.providerBaseUrl) {
    const completedEntries = await readProviderEntries(
      params.lane.providerBaseUrl,
      providerCursor,
    ).catch(() => []);
    if (completedEntries.length >= provider.entries.length) {
      provider = { ...provider, entries: completedEntries };
    }
  }
  const events = await readTimeline(params.lane.timelinePath);
  const diagnosticsByRun = new Map<string, ReturnType<typeof diagnosticsForSample>>();
  for (const result of runResults) {
    if ("runId" in result && typeof result.runId === "string") {
      diagnosticsByRun.set(result.runId, diagnosticsForSample(events, result.runId));
    }
  }
  return runResults.map((result) => {
    const resultId = `${params.sampleId}-${params.concurrency}-${result.index}`;
    if ("error" in result) {
      return {
        id: resultId,
        batchId: params.sampleId,
        requestIndex: result.index,
        scenario: params.scenario,
        strategy: params.strategy,
        concurrency: params.concurrency,
        status: "error",
        error: result.error,
        timings: {
          gatewayStartupMs: null,
          wsConnectMs: null,
          sendToAckMs: null,
          sendToProviderObservedMs: null,
          sendToTerminalMs: null,
          sendToHistoryMs: null,
          historyMessages: null,
          serverReceivedToAckMs: null,
          queueWaitMs: null,
          providerSubmissionMs: null,
          routerProviderSubmissionMs: null,
          personalAgentProviderSubmissionMs: null,
          firstOutputMs: null,
        },
        calls: {
          llmRequests: null,
          routerCalls: null,
          specialistCalls: null,
          providerSubmissionRequests: null,
          providerLedgerRequests: null,
          source: "unavailable",
        },
        stages: {},
        waterfall: summarizeWaterfall([]),
        diagnostics: { timelineEvents: events.length, missingStages: ["all"] },
      } satisfies TimingSample;
    }
    const diagnostics =
      diagnosticsByRun.get(result.runId) ?? diagnosticsForSample(events, result.runId);
    const serverTiming = isRecord(result.ackValue) ? result.ackValue.serverTiming : undefined;
    const providerObservedMs =
      provider.observedAtMs === undefined
        ? null
        : Math.max(0, provider.observedAtMs - (result.sendStartedAt - startedAt));
    const providerLedgerRequests = provider.entries.length > 0 ? provider.entries.length : null;
    const receivedAtMs = earliestGatewayReceivedMarker(events, result.runId);
    const providerSubmission = providerSubmissionDeltas(events, result.runId, receivedAtMs);
    // A provider submit marker is emitted immediately before the real fetch and is the
    // per-run call-attempt boundary. Diagnostics model/provider spans may represent one
    // request twice (for example router.model + provider.request), so they are fallback
    // counters. The mock receipt ledger remains visible separately as accepted receipts.
    const llmRequests = providerSubmission.count ?? diagnostics.calls.llm ?? providerLedgerRequests;
    const source =
      providerSubmission.count !== null
        ? "provider-submit-marker"
        : diagnostics.calls.llm !== null
          ? "diagnostics"
          : providerLedgerRequests !== null
            ? "provider-ledger"
            : "unavailable";
    const stages = diagnostics.stages;
    const receivedToAckMs =
      firstNumber(serverTiming, ["receivedToAckMs"]) ??
      gatewayReceivedToAckDelta(events, result.runId, receivedAtMs);
    const firstOutputAt =
      "firstOutputAt" in result && typeof result.firstOutputAt === "number"
        ? result.firstOutputAt
        : null;
    const missingStages = [
      ...(diagnostics.spans.length === 0 ? ["diagnostics.timeline"] : []),
      ...(receivedToAckMs === null ? ["gateway.ack"] : []),
      ...(providerObservedMs === null &&
      providerSubmission.firstMs === null &&
      diagnostics.calls.provider === null
        ? ["provider.received"]
        : []),
      ...(firstOutputAt === null ? ["first.output"] : []),
    ];
    const waterfall = summarizeWaterfall(diagnostics.spans);
    return {
      id: resultId,
      batchId: params.sampleId,
      requestIndex: result.index,
      scenario: params.scenario,
      strategy: params.strategy,
      concurrency: params.concurrency,
      status: "ok",
      timings: {
        gatewayStartupMs: null,
        wsConnectMs: null,
        sendToAckMs: Math.max(0, result.ackAt - result.sendStartedAt),
        sendToProviderObservedMs: providerObservedMs,
        sendToTerminalMs: Math.max(0, result.terminalAt - result.sendStartedAt),
        sendToHistoryMs: Math.max(0, result.historyAt - result.sendStartedAt),
        historyMessages: historyMessageCount(result.history),
        serverReceivedToAckMs: receivedToAckMs,
        queueWaitMs: firstStage(stages, [/queue|admission\.wait/iu]),
        providerSubmissionMs: providerSubmission.firstMs,
        routerProviderSubmissionMs: providerSubmission.routerMs,
        personalAgentProviderSubmissionMs: providerSubmission.personalAgentMs,
        firstOutputMs:
          firstOutputAt === null ? null : Math.max(0, firstOutputAt - result.sendStartedAt),
      },
      calls: {
        llmRequests,
        routerCalls: diagnostics.calls.router,
        specialistCalls: diagnostics.calls.specialist,
        providerSubmissionRequests: providerSubmission.count,
        providerLedgerRequests,
        source,
      },
      stages,
      waterfall,
      diagnostics: { timelineEvents: events.length, missingStages },
    } satisfies TimingSample;
  });
}

async function runUnmeasuredTurn(
  lane: EnterpriseLane,
  message: string,
  sessionKey: string,
  timeoutMs: number,
): Promise<void> {
  const started = await gatewayRequest<unknown>(
    lane.client,
    "chat.send",
    {
      sessionKey,
      agentId: lane.personalAgentId,
      message,
      deliver: false,
      suppressCommandInterpretation: true,
      idempotencyKey: randomUUID(),
    },
    timeoutMs,
  );
  if (!isStartedResponse(started)) {
    throw new Error("preparation chat.send did not start a run");
  }
  await waitForChatTerminal({
    client: lane.client,
    runId: started.runId,
    timeoutMs,
  });
}

async function prewarmSessions(
  lane: EnterpriseLane,
  sessionKeys: readonly string[],
  timeoutMs: number,
): Promise<void> {
  // The Enterprise prewarm hook is attached to the messages subscription. The generic
  // chat.startup method only loads metadata and does not exercise that production hook.
  // Creating a session and subscribing it is still side-effect free with respect to the
  // business domain and must never submit an LLM request.
  const timelineBefore = await readTimeline(lane.timelinePath);
  const providerCursor = lane.providerBaseUrl ? await readProviderCursor(lane.providerBaseUrl) : 0;
  const createdKeys = await Promise.all(
    sessionKeys.map(async (sessionKey) => {
      const created = await gatewayRequest<unknown>(
        lane.client,
        "sessions.create",
        { key: sessionKey, agentId: lane.personalAgentId, idempotencyKey: randomUUID() },
        timeoutMs,
      );
      const createdKey =
        isRecord(created) && typeof created.key === "string" ? created.key : sessionKey;
      await gatewayRequest(
        lane.client,
        "sessions.messages.subscribe",
        { key: createdKey, agentId: lane.personalAgentId },
        timeoutMs,
      );
      return createdKey;
    }),
  );
  await Promise.all(
    createdKeys.map((sessionKey) => waitForSessionPrewarm(lane, sessionKey, timeoutMs)),
  );
  const timelineAfter = await readTimeline(lane.timelinePath);
  const unexpectedProviderSubmissions = timelineAfter
    .slice(timelineBefore.length)
    .filter((event) => event.name === "provider.http.submit");
  if (unexpectedProviderSubmissions.length > 0) {
    throw new Error("Enterprise session prewarm submitted an unexpected provider request");
  }
  if (lane.providerBaseUrl) {
    const providerEntries = await readProviderEntries(lane.providerBaseUrl, providerCursor);
    if (providerEntries.length > 0) {
      throw new Error("Enterprise session prewarm submitted an unexpected provider request");
    }
  }
}

async function readLaneSandboxRegistry(
  lane: EnterpriseLane,
): Promise<SandboxRegistryCleanupEntry[]> {
  const envValues = Object.fromEntries(
    Object.entries(lane.harness.gateway.runtimeEnv).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
  const restoreEnv = setTemporaryEnvironment(envValues);
  try {
    const { readRegistry } = await importRepoModule<{
      readRegistry: () => Promise<{ entries: SandboxRegistryCleanupEntry[] }>;
    }>(lane.repoRoot, "src/agents/sandbox/registry.ts");
    return (await readRegistry()).entries;
  } finally {
    restoreEnv();
  }
}

async function waitForSessionPrewarm(
  lane: EnterpriseLane,
  sessionKey: string,
  timeoutMs: number,
): Promise<void> {
  const sessionPrefix = `${sessionKey}:`;
  await waitFor({
    label: `Enterprise session prewarm ${sessionKey}`,
    timeoutMs,
    intervalMs: 50,
    read: async () => {
      const events = await readTimeline(lane.timelinePath);
      const marker = events.find((event) => {
        if (event.name !== "enterprise.prewarm.ready") {
          return false;
        }
        const markerSessionKey = event.attributes?.sessionKey;
        return (
          typeof markerSessionKey === "string" &&
          (markerSessionKey === sessionKey || markerSessionKey.startsWith(sessionPrefix))
        );
      });
      if (marker && lane.strategy === "personal-agent-first") {
        return marker;
      }
      if (lane.strategy === "personal-agent-first") {
        const failure = events.find((event) => {
          if (event.name !== "enterprise.prewarm.failure") {
            return false;
          }
          const failureSessionKey = event.attributes?.sessionKey;
          return (
            typeof failureSessionKey === "string" &&
            (failureSessionKey === sessionKey || failureSessionKey.startsWith(sessionPrefix))
          );
        });
        if (failure) {
          const reasonCode = failure.attributes?.reasonCode;
          throw new Error(
            `Enterprise session prewarm failed${typeof reasonCode === "string" ? ` (${reasonCode})` : ""}`,
          );
        }
      }
      // The baseline does not emit enterprise.prewarm.ready yet. Its registry write is
      // the only durable readiness proxy: it is committed after runtime acquisition and
      // before the first user turn, and this fallback is intentionally baseline-only.
      if (lane.strategy !== "baseline") {
        return undefined;
      }
      try {
        const entries = await readLaneSandboxRegistry(lane);
        return entries.find(
          (entry) => entry.sessionKey === sessionKey || entry.sessionKey.startsWith(sessionPrefix),
        );
      } catch {
        // The Gateway can hold the state DB writer briefly while the prewarm commits its
        // registry row. Retry the read; the timeout remains the authoritative failure.
        return undefined;
      }
    },
  });
}

function sessionKeysFor(lane: EnterpriseLane, sampleId: string, concurrency: number): string[] {
  return Array.from(
    { length: concurrency },
    (_, index) => `agent:${lane.personalAgentId}:bench-${sampleId}-${index}-${randomUUID()}`,
  );
}

function withStartupTimings(
  samples: TimingSample[],
  startupMs: number | null,
  wsConnectMs: number | null,
): TimingSample[] {
  return samples.map((sample) => ({
    ...sample,
    timings: { ...sample.timings, gatewayStartupMs: startupMs, wsConnectMs },
  }));
}

function failedTimingSample(params: {
  id: string;
  batchId?: string;
  requestIndex?: number;
  scenario: PerformanceScenario;
  strategy: EnterpriseBenchmarkStrategy;
  concurrency: number;
  error: unknown;
  startupMs?: number | null;
}): TimingSample {
  return {
    id: params.id,
    batchId: params.batchId ?? params.id,
    requestIndex: params.requestIndex ?? 0,
    scenario: params.scenario,
    strategy: params.strategy,
    concurrency: params.concurrency,
    status: "error",
    error: safeError(params.error),
    timings: {
      gatewayStartupMs: params.startupMs ?? null,
      wsConnectMs: null,
      sendToAckMs: null,
      sendToProviderObservedMs: null,
      sendToTerminalMs: null,
      sendToHistoryMs: null,
      historyMessages: null,
      serverReceivedToAckMs: null,
      queueWaitMs: null,
      providerSubmissionMs: null,
      routerProviderSubmissionMs: null,
      personalAgentProviderSubmissionMs: null,
      firstOutputMs: null,
    },
    calls: {
      llmRequests: null,
      routerCalls: null,
      specialistCalls: null,
      providerSubmissionRequests: null,
      providerLedgerRequests: null,
      source: "unavailable",
    },
    stages: {},
    waterfall: summarizeWaterfall([]),
    diagnostics: { timelineEvents: 0, missingStages: ["all"] },
  };
}

async function createTimedLane(params: {
  options: BenchmarkOptions;
  strategy: EnterpriseBenchmarkStrategy;
  qualityEvidence?: boolean;
}): Promise<{ lane: EnterpriseLane; startupMs: number }> {
  const timelineDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-enterprise-bench-"));
  const timelinePath = path.join(timelineDir, "timeline.jsonl");
  const startedAt = performance.now();
  try {
    const lane = await startEnterpriseLane({
      options: params.options,
      strategy: params.strategy,
      timelinePath,
      ...(params.qualityEvidence === true ? { qualityEvidence: true } : {}),
    });
    return { lane, startupMs: Math.max(0, performance.now() - startedAt) };
  } catch (error) {
    await fs.rm(timelineDir, { recursive: true, force: true }).catch(() => undefined);
    throw error;
  }
}

async function removeTimeline(lane: EnterpriseLane, keepTemp: boolean): Promise<void> {
  if (keepTemp) {
    return;
  }
  await fs
    .rm(path.dirname(lane.timelinePath), { recursive: true, force: true })
    .catch(() => undefined);
}

async function runPerformance(options: BenchmarkOptions): Promise<TimingSample[]> {
  const samples: TimingSample[] = [];
  for (const strategy of options.strategies) {
    for (const scenario of options.scenarios) {
      for (const concurrency of options.concurrencies) {
        let persistent: { lane: EnterpriseLane; startupMs: number } | undefined;
        let persistentSessionKeys: string[] | undefined;
        let resumedPrepared = false;
        let warmPrepared = false;
        const batchSizes = requestBatchSizes(options.samples, concurrency);
        const batchCount = batchSizes.length;
        if (scenario !== "cold") {
          try {
            persistent = await createTimedLane({ options, strategy });
          } catch (error) {
            for (let iteration = 0; iteration < batchCount; iteration += 1) {
              const requestCount = batchSizes[iteration]!;
              const batchId = `${strategy}-${scenario}-${concurrency}-${iteration}`;
              for (let requestIndex = 0; requestIndex < requestCount; requestIndex += 1) {
                samples.push(
                  failedTimingSample({
                    id: `${batchId}-${requestIndex}`,
                    batchId,
                    requestIndex,
                    scenario,
                    strategy,
                    concurrency,
                    error,
                  }),
                );
              }
            }
            continue;
          }
        }
        try {
          for (let iteration = 0; iteration < batchCount; iteration += 1) {
            const sampleId = `${strategy}-${scenario}-${concurrency}-${iteration}`;
            const requestCount = batchSizes[iteration]!;
            let current = persistent;
            let ownsLane = false;
            try {
              if (!current) {
                current = await createTimedLane({ options, strategy });
                ownsLane = true;
              }
              const sessionKeys =
                scenario === "prewarmed"
                  ? sessionKeysFor(current.lane, sampleId, requestCount)
                  : current.lane === persistent?.lane
                    ? (persistentSessionKeys ??= sessionKeysFor(
                        current.lane,
                        `${strategy}-${scenario}-${concurrency}`,
                        requestCount,
                      ))
                    : sessionKeysFor(current.lane, sampleId, requestCount);
              if (scenario === "prewarmed") {
                await prewarmSessions(current.lane, sessionKeys, options.timeoutMs);
              } else if (scenario === "warm" && !warmPrepared) {
                await Promise.all(
                  sessionKeys.map((sessionKey) =>
                    runUnmeasuredTurn(
                      current!.lane,
                      `Benchmark warmup ${sampleId}; acknowledge without business tools.`,
                      sessionKey,
                      options.timeoutMs,
                    ),
                  ),
                );
                warmPrepared = true;
                if (!options.json) {
                  process.stderr.write(
                    `[enterprise-bench] ${strategy}/${scenario}/c${concurrency} warmup excluded from samples\n`,
                  );
                }
              } else if (scenario === "resumed" && !resumedPrepared) {
                await Promise.all(
                  sessionKeys.map((sessionKey) =>
                    runUnmeasuredTurn(
                      current!.lane,
                      `Benchmark resume seed ${sampleId}; acknowledge without business tools.`,
                      sessionKey,
                      options.timeoutMs,
                    ),
                  ),
                );
                resumedPrepared = true;
                if (!options.json) {
                  process.stderr.write(
                    `[enterprise-bench] ${strategy}/${scenario}/c${concurrency} resume seed excluded from samples\n`,
                  );
                }
              }
              const messages = sessionKeys.map((_, index) =>
                benchmarkMessage(scenario, `ENTERPRISE_BENCH_${sampleId}_${index}`),
              );
              const measured = await runMeasuredTurn({
                lane: current.lane,
                sampleId,
                scenario,
                strategy,
                concurrency,
                timeoutMs: options.timeoutMs,
                messages,
                sessionKeys,
              });
              samples.push(
                ...withStartupTimings(
                  measured,
                  scenario === "cold" ? current.startupMs : null,
                  current.lane.wsConnectMs,
                ),
              );
            } catch (error) {
              for (let requestIndex = 0; requestIndex < requestCount; requestIndex += 1) {
                samples.push(
                  failedTimingSample({
                    id: `${sampleId}-${requestIndex}`,
                    batchId: sampleId,
                    requestIndex,
                    scenario,
                    strategy,
                    concurrency,
                    error,
                    startupMs: scenario === "cold" ? current?.startupMs : null,
                  }),
                );
              }
            } finally {
              if (ownsLane && current) {
                await stopEnterpriseLane(current.lane, options.keepTemp);
                await removeTimeline(current.lane, options.keepTemp);
              }
            }
            if (!options.json) {
              process.stderr.write(
                `[enterprise-bench] ${strategy}/${scenario}/c${concurrency} batch ${iteration + 1}/${batchCount} ` +
                  `(requests ${Math.min(options.samples, (iteration + 1) * concurrency)}/${options.samples})\n`,
              );
            }
          }
        } finally {
          if (persistent) {
            await stopEnterpriseLane(persistent.lane, options.keepTemp);
            await removeTimeline(persistent.lane, options.keepTemp);
          }
        }
      }
    }
  }
  return samples;
}

function extractHistoryAssistantText(value: unknown): string {
  if (!isRecord(value) || !Array.isArray(value.messages)) {
    return "";
  }
  const messages = value.messages.filter(isRecord);
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]!;
    if (message.role !== "assistant") {
      continue;
    }
    const text = extractTerminalText(message.content ?? message.text ?? message);
    if (text) {
      return text;
    }
  }
  return "";
}

function historyMessageCount(value: unknown): number | null {
  if (!isRecord(value) || !Array.isArray(value.messages)) {
    return null;
  }
  return value.messages.length;
}

function missingQualityObservation(): QualityObservation {
  // Do not manufacture zero counters when a run failed before diagnostics were emitted.
  return {};
}

function qualityEvidenceFromReceipts(
  configuredModel: string,
  observedModels: readonly string[] = [],
  modelComplete = false,
  receipts?: Pick<QualityReceiptSnapshot, "authorityReceipt" | "toolReceipts">,
): QualityRecordEvidence {
  return {
    authorityReceipt: receipts?.authorityReceipt ?? "unknown",
    toolReceipts: receipts?.toolReceipts ?? "unknown",
    configuredModel,
    observedModels: [...new Set(observedModels)],
    modelComplete,
  };
}

function mergeQualityReceiptStatus(
  current: QualityReceiptStatus,
  next: QualityReceiptStatus,
): QualityReceiptStatus {
  if (current === "unknown" || next === "unknown") {
    return "unknown";
  }
  if (current === "unsupported" || next === "unsupported") {
    return "unsupported";
  }
  return "verified";
}

async function runQualityCase(
  lane: EnterpriseLane,
  testCase: EnterpriseQualityCase,
  repetition: number,
  options: BenchmarkOptions,
): Promise<QualityRecord> {
  const sessionKey = `agent:${lane.personalAgentId}:quality-${testCase.id}-${repetition}-${randomUUID()}`;
  const turns: QualityRecord["turns"] = [];
  let error: string | undefined;
  const observedModels = new Set<string>();
  // Mock lanes expose a receipt ledger; live lanes use the production
  // provider.http.submit marker's redacted model attribute. Either source is
  // sufficient when every turn has a complete model observation.
  let modelComplete = true;
  let authorityReceipt: QualityReceiptStatus = "verified";
  let toolReceipts: QualityReceiptStatus = "verified";
  for (let turnIndex = 0; turnIndex < testCase.turns.length; turnIndex += 1) {
    const turn = testCase.turns[turnIndex]!;
    const expected = enterpriseQualityExpectationForTurn(testCase, turnIndex as 0 | 1);
    const cursor = lane.providerBaseUrl ? await readProviderCursor(lane.providerBaseUrl) : 0;
    let terminal: unknown;
    let history: unknown;
    let runId: string | undefined;
    let providerEntries: ProviderLedgerEntry[] = [];
    try {
      const started = await gatewayRequest<unknown>(
        lane.client,
        "chat.send",
        {
          sessionKey,
          agentId: lane.personalAgentId,
          message: turn.message,
          deliver: false,
          suppressCommandInterpretation: true,
          idempotencyKey: randomUUID(),
        },
        options.timeoutMs,
      );
      if (!isStartedResponse(started)) {
        throw new Error("quality chat.send did not start a run");
      }
      runId = started.runId;
      const completion = await waitForChatTerminal({
        client: lane.client,
        runId,
        timeoutMs: options.timeoutMs,
      });
      terminal = completion.terminal;
      history = (
        await waitForChatHistory({
          client: lane.client,
          sessionKey,
          timeoutMs: options.timeoutMs,
        })
      ).value;
      if (lane.providerBaseUrl) {
        providerEntries = await readProviderEntries(lane.providerBaseUrl, cursor);
      }
    } catch (runError) {
      error = error ?? safeError(runError);
    }
    const events = await readTimeline(lane.timelinePath);
    const timelineModels = providerModelsFromTimeline(events, runId);
    if (providerEntries.length === 0 && timelineModels.length === 0) {
      modelComplete = false;
    }
    for (const entry of providerEntries) {
      if (typeof entry.model === "string" && entry.model.length > 0) {
        observedModels.add(entry.model);
      } else {
        modelComplete = false;
      }
    }
    for (const model of timelineModels) {
      observedModels.add(model);
    }
    const text = extractTerminalText(terminal) || extractHistoryAssistantText(history);
    const receipts = runId ? await readQualityReceipts({ lane, runId, expected }) : undefined;
    authorityReceipt = mergeQualityReceiptStatus(
      authorityReceipt,
      receipts?.authorityReceipt ?? "unknown",
    );
    toolReceipts = mergeQualityReceiptStatus(toolReceipts, receipts?.toolReceipts ?? "unknown");
    const observation = runId
      ? observationFromRun({ text, events, runId, providerEntries, receipts })
      : missingQualityObservation();
    const evaluation = evaluateEnterpriseQualityExpectation(expected, observation);
    turns.push({
      evaluation,
      responseLength: text ? text.length : null,
      providerRequests: lane.providerBaseUrl ? providerEntries.length : null,
    });
  }
  return {
    caseId: testCase.id,
    strategy: "baseline",
    repetition,
    turns,
    passed: !error && turns.every((turn) => turn.evaluation.passed),
    diagnosticsAvailable: turns.some(
      (turn) =>
        !turn.evaluation.sideEffects.missing.some((item) => item.endsWith("telemetry_missing")) &&
        !turn.evaluation.requiredInputs.missing.some((item) => item.endsWith("telemetry_missing")),
    ),
    evidence: qualityEvidenceFromReceipts(
      options.model,
      [...observedModels],
      modelComplete && observedModels.size > 0,
      { authorityReceipt, toolReceipts },
    ),
    ...(error ? { error } : {}),
  };
}

function negativeCheckResult(
  strategy: EnterpriseBenchmarkStrategy,
  check: QualityNegativeCheckResult["check"],
  status: QualityNegativeCheckResult["status"],
  params: {
    providerRequestsBefore?: number;
    providerRequestsAfter?: number;
    error?: unknown;
  } = {},
): QualityNegativeCheckResult {
  return {
    strategy,
    check,
    status,
    ...(params.providerRequestsBefore === undefined
      ? {}
      : { providerRequestsBefore: params.providerRequestsBefore }),
    ...(params.providerRequestsAfter === undefined
      ? {}
      : { providerRequestsAfter: params.providerRequestsAfter }),
    ...(params.error === undefined ? {} : { error: safeError(params.error) }),
  };
}

async function providerRequestCountSince(
  lane: EnterpriseLane,
  cursor: number,
): Promise<number | undefined> {
  if (!lane.providerBaseUrl) {
    return undefined;
  }
  return (await readProviderEntries(lane.providerBaseUrl, cursor)).length;
}

async function runQualityPermissionCheck(
  lane: EnterpriseLane,
  strategy: EnterpriseBenchmarkStrategy,
  options: BenchmarkOptions,
): Promise<QualityNegativeCheckResult> {
  const providerCursor = lane.providerBaseUrl ? await readProviderCursor(lane.providerBaseUrl) : 0;
  const stateOptions: StateDatabaseOptions = { env: lane.harness.gateway.runtimeEnv };
  let updateEnterpriseAccount:
    | ((
        accountId: string,
        patch: { personalAgentEnabled?: boolean },
        options: StateDatabaseOptions,
      ) => unknown)
    | undefined;
  try {
    const accountStore = await importRepoModule<{
      updateEnterpriseAccount: (
        accountId: string,
        patch: { personalAgentEnabled?: boolean },
        options: StateDatabaseOptions,
      ) => unknown;
    }>(lane.repoRoot, "src/enterprise/accounts/account-store.ts");
    updateEnterpriseAccount = accountStore.updateEnterpriseAccount;
    updateEnterpriseAccount(lane.accountId, { personalAgentEnabled: false }, stateOptions);
    let rejected = false;
    let rejection: unknown;
    try {
      await gatewayRequest(
        lane.client,
        "chat.send",
        {
          sessionKey: `agent:${lane.personalAgentId}:quality-permission-${randomUUID()}`,
          agentId: lane.personalAgentId,
          message: "Benchmark permission probe; this request must be rejected before the model.",
          deliver: false,
          suppressCommandInterpretation: true,
          idempotencyKey: randomUUID(),
        },
        options.timeoutMs,
      );
    } catch (error) {
      rejected = /PERSONAL_AGENT_DISABLED|AGENT_ACCESS_REVOKED|ACCESS_DENIED|FORBIDDEN/iu.test(
        safeError(error),
      );
      rejection = error;
    }
    if (!rejected) {
      return negativeCheckResult(strategy, "permission-revocation", "failed", {
        providerRequestsBefore: 0,
        providerRequestsAfter: await providerRequestCountSince(lane, providerCursor),
        error: rejection ?? new Error("permission probe was accepted"),
      });
    }
    const providerRequestsAfter = await providerRequestCountSince(lane, providerCursor);
    if (providerRequestsAfter === undefined) {
      return negativeCheckResult(strategy, "permission-revocation", "unknown", {
        error: new Error("provider receipt unavailable for permission probe"),
      });
    }
    return negativeCheckResult(
      strategy,
      "permission-revocation",
      providerRequestsAfter === 0 ? "passed" : "failed",
      { providerRequestsBefore: 0, providerRequestsAfter },
    );
  } catch (error) {
    return negativeCheckResult(strategy, "permission-revocation", "unknown", { error });
  } finally {
    if (updateEnterpriseAccount) {
      try {
        updateEnterpriseAccount(lane.accountId, { personalAgentEnabled: true }, stateOptions);
      } catch {
        // The lane is discarded after the check; retain the original check status without
        // masking it with fixture cleanup noise.
      }
    }
  }
}

async function runQualityReplayCheck(
  lane: EnterpriseLane,
  strategy: EnterpriseBenchmarkStrategy,
  options: BenchmarkOptions,
): Promise<QualityNegativeCheckResult> {
  const providerCursor = lane.providerBaseUrl ? await readProviderCursor(lane.providerBaseUrl) : 0;
  const sessionKey = `agent:${lane.personalAgentId}:quality-replay-${randomUUID()}`;
  const idempotencyKey = randomUUID();
  const message = "Benchmark idempotency replay probe; acknowledge without business tools.";
  let firstRunId: string | undefined;
  try {
    const first = await gatewayRequest<unknown>(
      lane.client,
      "chat.send",
      {
        sessionKey,
        agentId: lane.personalAgentId,
        message,
        deliver: false,
        suppressCommandInterpretation: true,
        idempotencyKey,
      },
      options.timeoutMs,
    );
    if (!isStartedResponse(first)) {
      throw new Error("idempotency first request did not start a run");
    }
    firstRunId = first.runId;
    await waitForChatTerminal({
      client: lane.client,
      runId: first.runId,
      timeoutMs: options.timeoutMs,
    });
    // Let the provider receipt writer settle before comparing the replay boundary.
    await sleep(50);
    const providerRequestsBefore = await providerRequestCountSince(lane, providerCursor);
    if (providerRequestsBefore === undefined) {
      return negativeCheckResult(strategy, "idempotency-replay", "unknown", {
        error: new Error("provider receipt unavailable for replay probe"),
      });
    }
    let replayError: unknown;
    let replayStarted: StartedResponse | undefined;
    try {
      const replay = await gatewayRequest<unknown>(
        lane.client,
        "chat.send",
        {
          sessionKey,
          agentId: lane.personalAgentId,
          message,
          deliver: false,
          suppressCommandInterpretation: true,
          idempotencyKey,
        },
        options.timeoutMs,
      );
      if (isStartedResponse(replay)) {
        replayStarted = replay;
      } else {
        replayError = new Error("idempotency replay returned an invalid response");
      }
    } catch (error) {
      replayError = error;
    }
    await sleep(50);
    const providerRequestsAfter = await providerRequestCountSince(lane, providerCursor);
    const sameRun = replayStarted?.runId === firstRunId;
    const explicitReplayRejection =
      replayError !== undefined &&
      /DUPLICATE|IDEMPOTEN|REPLAY|ALREADY|CONFLICT/iu.test(safeError(replayError));
    const passed =
      (sameRun || explicitReplayRejection) && providerRequestsAfter === providerRequestsBefore;
    return negativeCheckResult(strategy, "idempotency-replay", passed ? "passed" : "failed", {
      providerRequestsBefore,
      providerRequestsAfter,
      ...(passed
        ? {}
        : { error: replayError ?? new Error("idempotency replay started a new run") }),
    });
  } catch (error) {
    return negativeCheckResult(strategy, "idempotency-replay", "unknown", { error });
  }
}

async function runQualityNegativeChecks(
  lane: EnterpriseLane,
  strategy: EnterpriseBenchmarkStrategy,
  options: BenchmarkOptions,
): Promise<QualityNegativeCheckResult[]> {
  // These probes are bounded to one permission and one replay action per strategy. They reuse
  // the authenticated lane, existing account policy, and chat.send idempotency key; no business
  // API, fake message, or parallel receipt service is introduced.
  return [
    await runQualityPermissionCheck(lane, strategy, options),
    await runQualityReplayCheck(lane, strategy, options),
  ];
}

type QualityRunResult = {
  records: QualityRecord[];
  negativeChecks: QualityNegativeCheckResult[];
};

async function runQuality(options: BenchmarkOptions): Promise<QualityRunResult> {
  const records: QualityRecord[] = [];
  const negativeChecks: QualityNegativeCheckResult[] = [];
  // Each strategy receives its own isolated state and Gateway process. A repeated case therefore
  // cannot reuse a plan, session, or provider ledger from another strategy.
  for (const strategy of options.strategies) {
    let timed: { lane: EnterpriseLane; startupMs: number } | undefined;
    try {
      timed = await createTimedLane({ options, strategy, qualityEvidence: true });
      for (const testCase of ENTERPRISE_QUALITY_CASES.slice(0, options.qualityCases)) {
        for (let repetition = 0; repetition < options.qualityRepeats; repetition += 1) {
          const result = await runQualityCase(timed.lane, testCase, repetition, options);
          records.push({ ...result, strategy });
          if (!options.json) {
            process.stderr.write(
              `[enterprise-quality] ${strategy}/${testCase.id} ${repetition + 1}/${options.qualityRepeats}\n`,
            );
          }
        }
      }
      negativeChecks.push(...(await runQualityNegativeChecks(timed.lane, strategy, options)));
    } catch (error) {
      const reason = safeError(error);
      for (const testCase of ENTERPRISE_QUALITY_CASES.slice(0, options.qualityCases)) {
        for (let repetition = 0; repetition < options.qualityRepeats; repetition += 1) {
          const turns = testCase.turns.map((_, turnIndex) => ({
            evaluation: evaluateEnterpriseQualityExpectation(
              enterpriseQualityExpectationForTurn(testCase, turnIndex as 0 | 1),
              missingQualityObservation(),
            ),
            responseLength: null,
            providerRequests: null,
          }));
          records.push({
            caseId: testCase.id,
            strategy,
            repetition,
            turns,
            passed: false,
            diagnosticsAvailable: false,
            evidence: qualityEvidenceFromReceipts(options.model),
            error: reason,
          });
        }
      }
      negativeChecks.push(
        negativeCheckResult(strategy, "permission-revocation", "unknown", { error }),
        negativeCheckResult(strategy, "idempotency-replay", "unknown", { error }),
      );
    } finally {
      if (timed) {
        await stopEnterpriseLane(timed.lane, options.keepTemp);
        await removeTimeline(timed.lane, options.keepTemp);
      }
    }
  }
  return { records, negativeChecks };
}

function groupTimingSamples(samples: readonly TimingSample[]): TimingGroup[] {
  const groups = new Map<string, TimingSample[]>();
  for (const sample of samples) {
    const key = `${sample.strategy}\0${sample.scenario}\0${sample.concurrency}`;
    const values = groups.get(key) ?? [];
    values.push(sample);
    groups.set(key, values);
  }
  const timingKeys = [
    "gatewayStartupMs",
    "wsConnectMs",
    "sendToAckMs",
    "sendToProviderObservedMs",
    "sendToTerminalMs",
    "sendToHistoryMs",
    "historyMessages",
    "serverReceivedToAckMs",
    "queueWaitMs",
    "providerSubmissionMs",
    "routerProviderSubmissionMs",
    "personalAgentProviderSubmissionMs",
    "firstOutputMs",
  ] as const;
  const callKeys = [
    "llmRequests",
    "routerCalls",
    "specialistCalls",
    "providerSubmissionRequests",
    "providerLedgerRequests",
  ] as const;
  return [...groups.entries()].map(([key, values]) => {
    const [strategy, scenario, concurrencyRaw] = key.split("\0");
    const successful = values.filter((sample) => sample.status === "ok");
    const batches = new Map<string, TimingSample[]>();
    for (const sample of values) {
      const batch = batches.get(sample.batchId) ?? [];
      batch.push(sample);
      batches.set(sample.batchId, batch);
    }
    const successfulBatchRepresentatives: TimingSample[] = [];
    for (const batch of batches.values()) {
      const representative = batch.find((sample) => sample.status === "ok");
      if (representative) {
        successfulBatchRepresentatives.push(representative);
      }
    }
    const timings = Object.fromEntries(
      timingKeys.map((timingKey) => [
        timingKey,
        summarizeNumbers(
          successful
            .map((sample) => sample.timings[timingKey])
            .filter((value): value is number => value !== null),
        ),
      ]),
    ) as Record<string, NumberSummary | null>;
    const calls = Object.fromEntries(
      callKeys.map((callKey) => [
        callKey,
        summarizeNumbers(
          successfulBatchRepresentatives
            .map((sample) => sample.calls[callKey])
            .filter((value): value is number => value !== null),
        ),
      ]),
    ) as Record<string, NumberSummary | null>;
    const stageValues = new Map<string, number[]>();
    for (const sample of successful) {
      for (const [stage, duration] of Object.entries(sample.stages)) {
        const valuesForStage = stageValues.get(stage) ?? [];
        valuesForStage.push(duration);
        stageValues.set(stage, valuesForStage);
      }
    }
    return {
      scenario: scenario as PerformanceScenario,
      strategy: strategy as EnterpriseBenchmarkStrategy,
      concurrency: Number(concurrencyRaw),
      count: batches.size,
      requestCount: values.length,
      statusCounts: {
        ok: [...batches.values()].filter((batch) => batch.every((sample) => sample.status === "ok"))
          .length,
        error: [...batches.values()].filter((batch) =>
          batch.some((sample) => sample.status === "error"),
        ).length,
      },
      timings,
      calls,
      stages: Object.fromEntries(
        [...stageValues.entries()].map(([stage, stageValuesForSummary]) => [
          stage,
          summarizeNumbers(stageValuesForSummary)!,
        ]),
      ),
      waterfall: {
        criticalPathMs: summarizeNumbers(
          successful
            .map((sample) => sample.waterfall.criticalPathMs)
            .filter((value): value is number => value !== null),
        ),
        spanSumMs: summarizeNumbers(
          successful
            .map((sample) => sample.waterfall.spanSumMs)
            .filter((value): value is number => value !== null),
        ),
        overlapMs: summarizeNumbers(
          successful
            .map((sample) => sample.waterfall.overlapMs)
            .filter((value): value is number => value !== null),
        ),
      },
    };
  });
}

async function readBaselineIdentity(
  repoRoot: string,
  requestedPath?: string,
): Promise<BenchmarkReport["baseline"]> {
  const candidates = requestedPath
    ? [path.resolve(requestedPath)]
    : [
        path.resolve(repoRoot, "..", "baseline-manifest.json"),
        path.resolve(
          repoRoot,
          "..",
          "output",
          "agent-startup-performance-20260912",
          "baseline-manifest.json",
        ),
        path.resolve(
          repoRoot,
          "..",
          "..",
          "output",
          "agent-startup-performance-20260912",
          "baseline-manifest.json",
        ),
        path.resolve(
          process.cwd(),
          "..",
          "output",
          "agent-startup-performance-20260912",
          "baseline-manifest.json",
        ),
      ];
  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate);
      const manifestPath = stat.isDirectory()
        ? path.join(candidate, "baseline-manifest.json")
        : candidate;
      const content = await fs.readFile(manifestPath);
      const parsed = JSON.parse(content.toString("utf8")) as { head?: unknown };
      return {
        path: manifestPath,
        sha256: createHash("sha256").update(content).digest("hex"),
        head: typeof parsed.head === "string" ? parsed.head : null,
      };
    } catch {
      // Try the next conventional sibling location.
    }
  }
  return { path: candidates[0] ?? null, sha256: null, head: null };
}

function emptyDimensionSummary(): Record<
  string,
  { passed: number; failed: number; unknown: number }
> {
  return {};
}

function isUnknownDimension(dimension: {
  missing: readonly string[];
  evidence: readonly string[];
}): boolean {
  return (
    dimension.missing.some((item) => item.includes("telemetry_missing")) ||
    dimension.evidence.some((item) => /telemetry\s+missing|unknown/iu.test(item))
  );
}

type QualityGateOptions = {
  /** The configured model is the only caller-controlled comparison value. */
  model?: string;
};

export type QualityGateSummary = {
  dimensionSummary: Record<string, { passed: number; failed: number; unknown: number }>;
  regressions: string[];
  gatePassed: boolean;
  gateStatus: "accepted" | "not-accepted" | "unknown";
  gateReasons: string[];
};

function summarizeQuality(
  records: readonly QualityRecord[],
  options: QualityGateOptions = {},
): QualityGateSummary {
  // Keep the acceptance matrix immutable. A caller may run a smaller exploratory sample, but
  // it must never be able to relabel that subset as an accepted quality gate.
  const expectedCaseIds = QUALITY_GATE_CASE_IDS;
  const expectedRepetitions = DEFAULT_QUALITY_REPEATS;
  const expectedStrategies = QUALITY_GATE_STRATEGIES;
  const expectedModel = options.model ?? DEFAULT_MODEL;
  const dimensionSummary = emptyDimensionSummary();
  const dimensions = ["outcome", "factual", "provenance", "sideEffects", "requiredInputs"] as const;
  let unknownDimensionCount = 0;
  for (const record of records) {
    record.turns.forEach((turn, turnIndex) => {
      for (const dimension of dimensions) {
        const key = `turn${turnIndex}.${dimension}`;
        const current = dimensionSummary[key] ?? { passed: 0, failed: 0, unknown: 0 };
        const result = turn.evaluation[dimension];
        if (result.passed) {
          current.passed += 1;
        } else if (isUnknownDimension(result)) {
          current.unknown += 1;
          unknownDimensionCount += 1;
        } else {
          current.failed += 1;
        }
        dimensionSummary[key] = current;
      }
    });
  }
  const baseline = new Map<string, QualityRecord>();
  const first = new Map<string, QualityRecord>();
  for (const record of records) {
    const key = `${record.caseId}\0${record.repetition}`;
    if (record.strategy === "baseline") {
      baseline.set(key, record);
    } else if (record.strategy === "personal-agent-first") {
      first.set(key, record);
    }
  }
  const regressions: string[] = [];
  for (const [key, baselineRecord] of baseline) {
    const firstRecord = first.get(key);
    if (!firstRecord) {
      continue;
    }
    baselineRecord.turns.forEach((turn, turnIndex) => {
      const firstTurn = firstRecord.turns[turnIndex];
      if (!firstTurn) {
        regressions.push(`${key}:turn${turnIndex}:missing`);
        return;
      }
      for (const dimension of dimensions) {
        if (turn.evaluation[dimension].passed && !firstTurn.evaluation[dimension].passed) {
          regressions.push(`${key}:turn${turnIndex}:${dimension}`);
        }
      }
    });
  }

  const gateReasons: string[] = [];
  const addReason = (reason: string): void => {
    if (!gateReasons.includes(reason)) {
      gateReasons.push(reason);
    }
  };
  const expectedCaseSet = new Set(expectedCaseIds);
  const expectedStrategySet = new Set(expectedStrategies);
  const expectedKeys = new Set<string>();
  for (const strategy of expectedStrategies) {
    for (const caseId of expectedCaseIds) {
      for (let repetition = 0; repetition < expectedRepetitions; repetition += 1) {
        expectedKeys.add(`${strategy}\0${caseId}\0${repetition}`);
      }
    }
  }
  const actualKeys = new Set<string>();
  const duplicateKeys = new Set<string>();
  const unexpectedKeys = new Set<string>();
  for (const record of records) {
    const key = `${record.strategy}\0${record.caseId}\0${record.repetition}`;
    if (
      !expectedStrategySet.has(record.strategy) ||
      !expectedCaseSet.has(record.caseId) ||
      !Number.isInteger(record.repetition) ||
      record.repetition < 0 ||
      record.repetition >= expectedRepetitions
    ) {
      unexpectedKeys.add(key);
    } else if (actualKeys.has(key)) {
      duplicateKeys.add(key);
    } else {
      actualKeys.add(key);
    }
  }
  const missingKeys = [...expectedKeys].filter((key) => !actualKeys.has(key));
  const expectedRecordCount = expectedKeys.size;
  if (expectedCaseSet.size !== expectedCaseIds.length) {
    addReason(
      `matrix_expected_cases_not_distinct:${expectedCaseIds.length}/${expectedCaseSet.size}`,
    );
  }
  if (expectedStrategySet.size !== expectedStrategies.length) {
    addReason(
      `matrix_expected_strategies_not_distinct:${expectedStrategies.length}/${expectedStrategySet.size}`,
    );
  }
  if (records.length !== expectedRecordCount) {
    addReason(`matrix_incomplete:records=${records.length}/${expectedRecordCount}`);
  }
  if (missingKeys.length > 0) {
    addReason(`matrix_missing_records:${missingKeys.length}`);
  }
  if (duplicateKeys.size > 0) {
    addReason(`matrix_duplicate_records:${duplicateKeys.size}`);
  }
  if (unexpectedKeys.size > 0) {
    addReason(`matrix_unexpected_records:${unexpectedKeys.size}`);
  }
  for (const strategy of expectedStrategies) {
    const actualCases = new Set(
      records
        .filter((record) => record.strategy === strategy && expectedCaseSet.has(record.caseId))
        .map((record) => record.caseId),
    );
    const missingCases = expectedCaseIds.filter((caseId) => !actualCases.has(caseId));
    if (missingCases.length > 0) {
      addReason(
        `matrix_missing_cases:${strategy}:${missingCases.length}/${expectedCaseIds.length}`,
      );
    }
  }

  let failedRecordCount = 0;
  let authorityReceiptMissingCount = 0;
  let toolReceiptMissingCount = 0;
  let modelUnknownCount = 0;
  let modelMismatchCount = 0;
  for (const record of records) {
    if (!record.passed) {
      failedRecordCount += 1;
    }
    if (record.turns.length !== 2) {
      addReason(`turn_count_invalid:${record.strategy}/${record.caseId}/${record.repetition}`);
    }
    if (
      record.turns.some((turn) =>
        dimensions.some((dimension) => isUnknownDimension(turn.evaluation[dimension])),
      )
    ) {
      // Counted separately from dimensionSummary so the acceptance reason remains explicit even
      // when one record has several unknown dimensions.
      addReason("quality_dimensions_unknown");
    }
    const evidence = record.evidence;
    if (evidence.authorityReceipt !== "verified") {
      authorityReceiptMissingCount += 1;
    }
    if (evidence.toolReceipts !== "verified") {
      toolReceiptMissingCount += 1;
    }
    const observedModels = new Set(evidence.observedModels);
    if (!evidence.modelComplete || observedModels.size === 0) {
      modelUnknownCount += 1;
    } else if (
      evidence.configuredModel !== expectedModel ||
      observedModels.size !== 1 ||
      !observedModels.has(expectedModel)
    ) {
      modelMismatchCount += 1;
    }
  }
  if (unknownDimensionCount > 0) {
    addReason(`quality_dimensions_unknown:${unknownDimensionCount}`);
  }
  if (failedRecordCount > 0) {
    addReason(`quality_records_failed:${failedRecordCount}`);
  }
  if (authorityReceiptMissingCount > 0) {
    addReason(`authority_receipts_unverified:${authorityReceiptMissingCount}/${records.length}`);
  }
  if (toolReceiptMissingCount > 0) {
    addReason(`tool_receipts_unverified:${toolReceiptMissingCount}/${records.length}`);
  }
  if (modelUnknownCount > 0) {
    addReason(`observed_model_unknown:${modelUnknownCount}/${records.length}`);
  }
  if (modelMismatchCount > 0) {
    addReason(`observed_model_changed_or_mismatched:${modelMismatchCount}/${records.length}`);
  }
  if (regressions.length > 0) {
    addReason(`quality_regressions:${regressions.length}`);
  }
  const matrixComplete =
    expectedCaseSet.size === expectedCaseIds.length &&
    expectedStrategySet.size === expectedStrategies.length &&
    records.length === expectedRecordCount &&
    missingKeys.length === 0 &&
    duplicateKeys.size === 0 &&
    unexpectedKeys.size === 0;
  const allEvaluationsPassed = records.length > 0 && records.every((record) => record.passed);
  const evidenceComplete =
    authorityReceiptMissingCount === 0 &&
    toolReceiptMissingCount === 0 &&
    modelUnknownCount === 0 &&
    modelMismatchCount === 0 &&
    unknownDimensionCount === 0;
  const gatePassed =
    matrixComplete && allEvaluationsPassed && evidenceComplete && regressions.length === 0;
  const unknownEvidence =
    !matrixComplete ||
    authorityReceiptMissingCount > 0 ||
    toolReceiptMissingCount > 0 ||
    modelUnknownCount > 0 ||
    unknownDimensionCount > 0;
  const gateStatus = gatePassed ? "accepted" : unknownEvidence ? "unknown" : "not-accepted";
  return {
    dimensionSummary,
    regressions,
    gatePassed,
    gateStatus,
    gateReasons,
  };
}

type PerformanceCallCountSample = Pick<TimingSample, "batchId" | "status" | "calls">;

function performanceCallCounts(
  samples: readonly PerformanceCallCountSample[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  const seenLedgerBatches = new Set<string>();
  for (const sample of samples) {
    for (const [key, value] of Object.entries(sample.calls)) {
      if (typeof value !== "number") {
        continue;
      }
      // Request-level counters are recorded once per request, including failed requests. The provider
      // ledger is read once per concurrent batch and copied onto each request row, so
      // count that field only from one row per batch.
      if (key === "providerLedgerRequests") {
        if (seenLedgerBatches.has(sample.batchId)) {
          continue;
        }
        seenLedgerBatches.add(sample.batchId);
      }
      counts[key] = (counts[key] ?? 0) + value;
    }
  }
  return counts;
}

async function buildReport(options: BenchmarkOptions): Promise<BenchmarkReport> {
  const baseline = await readBaselineIdentity(options.repoRoot, options.baseline);
  if (!options.execute) {
    return {
      schemaVersion: SCRIPT_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      dryRun: true,
      execution: {
        repoRoot: options.repoRoot,
        providerMode: options.providerMode,
        model: options.model,
        alternateModel: options.alternateModel,
        mode: options.mode,
        strategies: options.strategies,
        samplesPerCell: options.samples,
        scenarios: options.scenarios,
        concurrencies: options.concurrencies,
        qualityCases: options.qualityCases,
        qualityRepeats: options.qualityRepeats,
        errors: [],
      },
      baseline,
      performance: { samples: [], groups: [], thresholds: PERFORMANCE_THRESHOLDS, callCounts: {} },
      quality: {
        casesCount: options.qualityCases,
        repetitions: options.qualityRepeats,
        records: [],
        negativeChecks: [],
        dimensionSummary: {},
        regressions: [],
        gatePassed: false,
        gateStatus: "unknown",
        gateReasons: ["quality_not_executed"],
      },
    };
  }
  if (ENTERPRISE_QUALITY_CASES.length !== DEFAULT_QUALITY_CASES) {
    throw new Error(`quality fixture must contain exactly ${DEFAULT_QUALITY_CASES} cases`);
  }
  const performanceSamples = options.mode === "quality" ? [] : await runPerformance(options);
  const qualityRun: QualityRunResult =
    options.mode === "performance"
      ? { records: [], negativeChecks: [] }
      : await runQuality(options);
  const qualityRecords = qualityRun.records;
  const qualitySummary = summarizeQuality(qualityRecords, { model: options.model });
  const executionErrors = [
    ...performanceSamples
      .filter((sample) => sample.status === "error" && sample.error)
      .map((sample) => sample.error!),
    ...qualityRecords.filter((record) => record.error).map((record) => record.error!),
  ];
  const uniqueExecutionErrors = [...new Set(executionErrors)].slice(0, 100);
  return {
    schemaVersion: SCRIPT_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    dryRun: false,
    execution: {
      repoRoot: options.repoRoot,
      providerMode: options.providerMode,
      model: options.model,
      alternateModel: options.alternateModel,
      mode: options.mode,
      strategies: options.strategies,
      samplesPerCell: options.samples,
      scenarios: options.scenarios,
      concurrencies: options.concurrencies,
      qualityCases: options.qualityCases,
      qualityRepeats: options.qualityRepeats,
      errors: uniqueExecutionErrors,
    },
    baseline,
    performance: {
      samples: performanceSamples,
      groups: groupTimingSamples(performanceSamples),
      thresholds: PERFORMANCE_THRESHOLDS,
      callCounts: performanceCallCounts(performanceSamples),
    },
    quality: {
      casesCount: Math.min(options.qualityCases, ENTERPRISE_QUALITY_CASES.length),
      repetitions: options.qualityRepeats,
      records: qualityRecords,
      negativeChecks: qualityRun.negativeChecks,
      ...qualitySummary,
    },
  };
}

function humanSummary(report: BenchmarkReport): string[] {
  const lines = [
    `enterprise startup benchmark ${report.dryRun ? "dry-run" : "executed"}`,
    `provider=${report.execution.providerMode} mode=${report.execution.mode} strategies=${report.execution.strategies.join(",")}`,
    `baseline=${report.baseline.sha256 ?? "unavailable"}`,
  ];
  if (report.dryRun) {
    lines.push(
      "No Gateway, provider, LLM, or business API was called. Use --execute to run the isolated harness.",
    );
    lines.push(
      `planned performance cells=${report.execution.scenarios.length * report.execution.concurrencies.length * report.execution.strategies.length}`,
    );
    lines.push(
      `planned quality runs=${report.execution.qualityCases * report.execution.qualityRepeats * report.execution.strategies.length}`,
    );
    return lines;
  }
  for (const group of report.performance.groups) {
    lines.push(
      `${group.strategy}/${group.scenario}/c${group.concurrency} batches=${group.count} requests=${group.requestCount} ` +
        `ack.p50=${group.timings.sendToAckMs?.p50 ?? "n/a"}ms ` +
        `provider.p95=${group.timings.sendToProviderObservedMs?.p95 ?? "n/a"}ms ` +
        `agentProvider.p95=${group.timings.personalAgentProviderSubmissionMs?.p95 ?? "n/a"}ms ` +
        `terminal.p95=${group.timings.sendToTerminalMs?.p95 ?? "n/a"}ms ` +
        `overlap.p50=${group.waterfall.overlapMs?.p50 ?? "n/a"}ms`,
    );
  }
  lines.push(
    `quality records=${report.quality.records.length} gate=${report.quality.gateStatus} regressions=${report.quality.regressions.length}`,
  );
  if (report.quality.gateReasons.length > 0) {
    lines.push(`quality gate reasons=${report.quality.gateReasons.join(",")}`);
  }
  if (report.execution.errors.length > 0) {
    lines.push(`execution errors=${report.execution.errors.length}`);
  }
  return lines;
}

async function main(): Promise<void> {
  const options = parseOptions();
  const report = await buildReport(options);
  const json = `${JSON.stringify(report, null, 2)}\n`;
  if (options.output) {
    await fs.mkdir(path.dirname(options.output), { recursive: true });
    await fs.writeFile(options.output, json, { encoding: "utf8", mode: 0o600 });
  }
  process.stdout.write(options.json ? json : `${humanSummary(report).join("\n")}\n`);
  if (!report.dryRun && report.execution.errors.length > 0) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    process.stderr.write(`${safeError(error)}\n`);
    process.exitCode = 1;
  });
}
