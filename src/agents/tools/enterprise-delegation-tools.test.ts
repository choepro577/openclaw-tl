import { describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import {
  markGatewayRequestScopedRuntimeConfig,
  readGatewayRequestRuntimeMetadata,
} from "../../gateway/request-runtime-config.js";
import { applyToolAvailabilityDescriptions } from "../agent-tools.deferred-followup.js";
import { withEnterpriseDelegationRuntime } from "../enterprise-delegation-runtime.js";
import { jsonResult } from "./common.js";
import { createEnterpriseDelegationTools } from "./enterprise-delegation-tools.js";

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
