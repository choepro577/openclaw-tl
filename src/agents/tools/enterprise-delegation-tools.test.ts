import { afterEach, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import {
  ENTERPRISE_AGENT_FIRST_EXPERIMENT_ENV,
  rememberEnterpriseDelegationAgentFirstContext,
} from "../../enterprise/delegation/delegation-agent-first.js";
import {
  markGatewayRequestScopedRuntimeConfig,
  readGatewayRequestRuntimeMetadata,
} from "../../gateway/request-runtime-config.js";
import { applyToolAvailabilityDescriptions } from "../agent-tools.deferred-followup.js";
import { withEnterpriseDelegationRuntime } from "../enterprise-delegation-runtime.js";
import { jsonResult } from "./common.js";
import { createEnterpriseDelegationTools } from "./enterprise-delegation-tools.js";

afterEach(() => vi.unstubAllEnvs());

function scopedConfig(params?: { effective?: boolean; withDecision?: boolean }): OpenClawConfig {
  return markGatewayRequestScopedRuntimeConfig(
    { agents: { entries: { personal: {}, contracts: {} } } },
    {
      enterpriseDelegation: {
        request: { sessionKey: "parent-session", parentRunId: "parent-run" },
        accountId: "account-a",
        personalAgentId: "personal",
        specialists: [
          {
            agentId: "contracts",
            name: "Contract Agent",
            description: "Reviews contract terms and obligations.",
            assigned: true,
            effective: params?.effective ?? true,
            routable: params?.effective ?? true,
            effectiveMode: "auto_when_certain",
            reasonCodes: [],
          },
        ],
        ...(params?.withDecision
          ? {
              turn: {
                decisionId: "decision-123456789",
                outcome: "delegate" as const,
                source: "rule" as const,
                agentNames: ["Contract Agent"],
                instruction: "Use the managed delegation decision.",
                reasonCode: "route_ready",
              },
            }
          : {}),
      },
    },
  );
}

describe("Enterprise delegation discovery tools", () => {
  it("keeps the default tool contract free of agent-first routing fields", async () => {
    vi.stubEnv(ENTERPRISE_AGENT_FIRST_EXPERIMENT_ENV, "");
    await withEnterpriseDelegationRuntime(
      {
        agentId: "personal",
        sessionKey: "parent-session",
        runId: "parent-run",
        assertActive: () => {},
        execute: vi.fn(),
      },
      async () => {
        const tool = createEnterpriseDelegationTools({
          config: scopedConfig(),
          agentId: "personal",
          runSessionKey: "parent-session",
          runId: "parent-run",
        }).find((item) => item.name === "enterprise_delegate");

        expect(tool).toBeDefined();
        expect(JSON.stringify(tool?.parameters)).not.toContain('"routing"');
        expect(JSON.stringify(tool?.parameters)).toContain('"minItems":1');
        expect(tool?.description).not.toContain("structured routing object");
      },
    );
  });

  it("exposes recovery routing only for the prepared current turn without an experiment flag", async () => {
    vi.stubEnv(ENTERPRISE_AGENT_FIRST_EXPERIMENT_ENV, "");
    const config = scopedConfig();
    rememberEnterpriseDelegationAgentFirstContext(config, {
      accountId: "account-a",
      personalAgentId: "personal",
      sessionKey: "parent-session",
      parentRunId: "parent-run",
      prompt: "Review the contract",
      conversationInputs: [],
      conversationResults: [],
      previousDelegationContext: [],
      candidates: [],
      explicitAgentIds: [],
      policy: {
        maxDelegatesPerTurn: 3,
        autoThreshold: 0.9,
        clarifyThreshold: 0.7,
        minimumMargin: 0.15,
        revision: 1,
      },
    });
    for (const runId of ["parent-run", "other-run"]) {
      await withEnterpriseDelegationRuntime(
        {
          agentId: "personal",
          sessionKey: "parent-session",
          runId,
          assertActive: () => {},
          execute: vi.fn(),
        },
        async () => {
          const tool = createEnterpriseDelegationTools({
            config,
            agentId: "personal",
            runSessionKey: "parent-session",
            runId,
          }).find((item) => item.name === "enterprise_delegate");
          if (runId === "parent-run") {
            expect(JSON.stringify(tool?.parameters)).toContain('"routing"');
          } else {
            expect(JSON.stringify(tool?.parameters) ?? "").not.toContain('"routing"');
          }
        },
      );
    }
  });

  it("allows an opted-in empty assignment lifecycle decision", async () => {
    vi.stubEnv(ENTERPRISE_AGENT_FIRST_EXPERIMENT_ENV, "1");
    const execute = vi.fn().mockResolvedValue(jsonResult({ status: "local" }));
    await withEnterpriseDelegationRuntime(
      {
        agentId: "personal",
        sessionKey: "parent-session",
        runId: "parent-run",
        assertActive: () => {},
        execute,
      },
      async () => {
        const tool = createEnterpriseDelegationTools({
          config: scopedConfig(),
          agentId: "personal",
          runSessionKey: "parent-session",
          runId: "parent-run",
        }).find((item) => item.name === "enterprise_delegate");
        expect(tool).toBeDefined();
        expect(JSON.stringify(tool?.parameters)).toContain('"routing"');
        expect(JSON.stringify(tool?.parameters)).toContain('"minItems":0');
        await tool!.execute("cancel", {
          assignments: [],
          routing: {
            outcome: "local",
            handling: "direct",
            continuation: "cancel",
            handoffConsent: "denied",
            confidence: 1,
            secondConfidence: 0,
            independent: false,
            question: "",
            routes: [],
          },
        });
        expect(execute).toHaveBeenCalledWith(
          "cancel",
          [],
          expect.objectContaining({ continuation: "cancel", handoffConsent: "denied" }),
        );
      },
    );
  });

  it("exposes dynamic assignments only to the matching admitted Personal Agent and checks targets", async () => {
    const execute = vi.fn().mockResolvedValue(jsonResult({ status: "accepted" }));
    let active = true;
    await withEnterpriseDelegationRuntime(
      {
        agentId: "personal",
        sessionKey: "parent-session",
        runId: "parent-run",
        assertActive: () => {
          if (!active) {
            throw new Error("closed");
          }
        },
        execute,
      },
      async () => {
        const config = scopedConfig();
        const options = {
          config,
          agentId: "personal",
          runSessionKey: "parent-session",
          runId: "parent-run",
        };
        const tool = createEnterpriseDelegationTools(options).find(
          (item) => item.name === "enterprise_delegate",
        )!;
        expect(tool).toBeDefined();
        const [withoutYield] = applyToolAvailabilityDescriptions([tool]);
        expect(withoutYield?.description).not.toContain("sessions_yield");
        expect(withoutYield?.description).toContain("end this turn");
        const [withYield] = applyToolAvailabilityDescriptions([
          tool,
          { ...tool, name: "sessions_yield" },
        ]);
        expect(withYield?.description).toContain("call sessions_yield at that dependency barrier");
        expect(
          createEnterpriseDelegationTools({ ...options, runId: "different-run" }).some(
            (item) => item.name === "enterprise_delegate",
          ),
        ).toBe(false);
        await tool.execute("work", {
          assignments: [{ agentId: "contracts", task: "Review cancellation risk" }],
        });
        expect(execute).toHaveBeenCalledOnce();
        expect(
          (
            await tool.execute("forbidden", {
              assignments: [{ agentId: "unassigned", task: "Read private data" }],
            })
          ).details,
        ).toMatchObject({ status: "forbidden" });
        expect(execute).toHaveBeenCalledOnce();
        active = false;
        await expect(
          tool.execute("late", { assignments: [{ agentId: "contracts", task: "Review" }] }),
        ).rejects.toThrow("closed");
      },
    );
  });
  it("registers only the narrow specialist list for an eligible Personal Agent", async () => {
    const tools = createEnterpriseDelegationTools({ config: scopedConfig(), agentId: "personal" });
    expect(tools.map((tool) => tool.name)).toEqual(["enterprise_specialists_list"]);

    const result = await tools[0]!.execute("list-specialists", {});
    expect(result.details).toEqual({
      status: "ok",
      specialists: [
        {
          agentId: "contracts",
          name: "Contract Agent",
          description: "Reviews contract terms and obligations.",
          ready: true,
          handlingMode: "auto_when_certain",
        },
      ],
    });
    expect(JSON.stringify(result.details)).not.toContain("model");
    expect(JSON.stringify(result.details)).not.toContain("runtime");
  });

  it("does not register capabilities for Shared Agents or accounts without an effective candidate", () => {
    expect(
      createEnterpriseDelegationTools({ config: scopedConfig(), agentId: "contracts" }),
    ).toEqual([]);
    expect(
      createEnterpriseDelegationTools({
        config: scopedConfig({ effective: false }),
        agentId: "personal",
      }),
    ).toEqual([]);
    expect(createEnterpriseDelegationTools({ config: {}, agentId: "personal" })).toEqual([]);
  });

  it.each([undefined, "parent-run", "observer-run", "next-turn"])(
    "never offers a model-driven spawn path, including an approved plan (run: %s)",
    (runId) => {
      const config = scopedConfig({ withDecision: true });
      const tools = createEnterpriseDelegationTools({
        config,
        agentId: "personal",
        runSessionKey: "parent-session",
        runId,
      });
      expect(tools.map((tool) => tool.name)).toEqual(["enterprise_specialists_list"]);
      expect(JSON.stringify(tools.map((tool) => tool.parameters))).not.toContain("decisionId");
    },
  );

  it("rechecks Personal Agent scope when a retained discovery tool executes", async () => {
    const config = scopedConfig();
    const tool = createEnterpriseDelegationTools({ config, agentId: "personal" })[0]!;
    readGatewayRequestRuntimeMetadata(config)!.enterpriseDelegation!.personalAgentId =
      "another-personal";
    expect((await tool.execute("retained-list", {})).details).toEqual({
      status: "forbidden",
      reasonCode: "personal_agent_required",
    });
  });
});
