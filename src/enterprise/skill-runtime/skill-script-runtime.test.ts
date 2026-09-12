import { randomBytes } from "node:crypto";
import { chmod, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createOpenClawCodingTools } from "../../agents/agent-tools.js";
import { createOpenClawTools } from "../../agents/openclaw-tools.js";
import { resolveSandboxToolPolicyForAgent } from "../../agents/sandbox/tool-policy.js";
import { createAgentToolsSandboxContext } from "../../agents/test-helpers/agent-tools-sandbox-context.js";
import { createContainerWorkspaceSandboxFsBridge } from "../../agents/test-helpers/host-sandbox-fs-bridge.js";
import { createEnterpriseSkillScriptTools } from "../../agents/tools/enterprise-skill-script-tool.js";
import { wrapToolWithGatewayCallerIdentity } from "../../agents/tools/gateway-caller-context.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { markGatewayRequestScopedRuntimeConfig } from "../../gateway/request-runtime-config.js";
import type { SkillSnapshot } from "../../skills/types.js";
import {
  closeOpenClawStateDatabaseForTest,
  openOpenClawStateDatabase,
} from "../../state/openclaw-state-db.js";
import { withOpenClawTestState } from "../../test-utils/openclaw-test-state.js";
import { createEnterpriseAccount } from "../accounts/account-store.js";
import { listEnterpriseDelegationCandidates } from "../delegation/delegation-candidates.js";
import {
  registerEnterpriseDelegationChildAuthority,
  revokeEnterpriseDelegationChildAuthority,
} from "../delegation/delegation-mutation-guard.js";
import { writeEnterpriseDelegationPolicy } from "../delegation/delegation-store.js";
import { replaceEnterpriseEntitlements } from "../entitlements/entitlement-store.js";
import { sharedAgentResourceKey } from "../entitlements/resource-keys.js";
import { resolveEnterpriseSharedAgentCapabilities } from "../isolation/enterprise-agent-capabilities.js";
import { projectEnterpriseRuntimeConfig } from "../isolation/enterprise-gateway-policy.js";
import {
  onEnterpriseSkillAuthRequired,
  resetEnterpriseSkillAuthRequestsForTest,
  resolveEnterpriseSkillAuthRequest,
} from "./skill-auth-request.js";
import {
  enterpriseSkillAuthStatus,
  loginEnterpriseSkill,
  runEnterpriseSkillScript,
  skillScriptRisk,
} from "./skill-script-runtime.js";

const SKILL_KEY = "test-script-skill";

function runtimeMetadata(scriptPath = "scripts/call") {
  return {
    entrypoints: {
      call: {
        path: scriptPath,
        kind: "operation" as const,
        routerOperation: "router_tool_search",
        authExemptOperations: ["router_tool_search"],
        readOperations: ["router_tool_search", "get_data"],
        writeOperations: ["set_data"],
        unknownRisk: "approval" as const,
        timeoutMs: 2_000,
      },
    },
    auth: {
      mode: "login-token" as const,
      loginEntrypoint: "call",
      loginOperation: "employee_login",
      fields: [
        { id: "username", label: "User", argument: "userName", type: "text" as const },
        { id: "password", label: "Password", argument: "password", type: "password" as const },
      ],
      tokenPaths: ["data.authorization"],
      injectArgument: "authorization",
      ttlSeconds: 3_600,
    },
  };
}

async function fixture(scriptPath = "scripts/call") {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "openclaw-skill-script-"));
  await mkdir(path.join(baseDir, "scripts"));
  await writeFile(
    path.join(baseDir, "SKILL.md"),
    `---\nname: ${SKILL_KEY}\ndescription: Test Enterprise skill runtime.\nmetadata: ${JSON.stringify({ openclaw: { scriptRuntime: runtimeMetadata(scriptPath) } })}\n---\n\n# Test skill\n`,
  );
  const executable = path.join(baseDir, "scripts", "call");
  await writeFile(
    executable,
    `#!/usr/bin/env node
let input = "";
process.stdin.on("data", chunk => input += chunk);
process.stdin.on("end", () => {
  const operation = process.argv[2];
  const payload = JSON.parse(input);
  if (operation === "employee_login") {
    process.stdout.write(JSON.stringify({data:{authorization:"Bearer encrypted-test-token"}}));
  } else if (operation === "router_tool_search") {
    process.stdout.write(JSON.stringify({results:[{tool_name:"get_data"}]}));
  } else {
    process.stdout.write(JSON.stringify({operation, arguments:payload.arguments, configured:process.env.TEST_SKILL_ENV, leaked:process.env.UNRELATED_GATEWAY_SECRET}));
  }
});
`,
  );
  await chmod(executable, 0o755);
  const snapshot: SkillSnapshot = {
    prompt: "",
    skills: [
      {
        name: SKILL_KEY,
        skillKey: SKILL_KEY,
        source: "openclaw-bundled",
        baseDir,
        scriptRuntime: runtimeMetadata(scriptPath),
      },
    ],
  };
  const config: OpenClawConfig = {
    agents: { entries: { specialist: { skills: [SKILL_KEY] } } },
    skills: { load: { extraDirs: [baseDir] } },
  };
  return { baseDir, executable, snapshot, config };
}

afterEach(() => {
  delete process.env.OPENCLAW_ENTERPRISE_SKILL_TOKEN_KEY;
  delete process.env.UNRELATED_GATEWAY_SECRET;
  resetEnterpriseSkillAuthRequestsForTest();
  revokeEnterpriseDelegationChildAuthority("child-session");
  closeOpenClawStateDatabaseForTest();
});

describe("Enterprise skill script runtime", () => {
  it("distinguishes a skill grant revocation from an unknown entrypoint", () => {
    const snapshot: SkillSnapshot = {
      prompt: "",
      skills: [
        {
          name: SKILL_KEY,
          skillKey: SKILL_KEY,
          source: "openclaw-bundled",
          baseDir: "/tmp/enterprise-skill",
          scriptRuntime: runtimeMetadata(),
        },
      ],
    };

    expect(() =>
      skillScriptRisk({
        snapshot,
        skillKey: "revoked-skill",
        entrypointName: "call",
      }),
    ).toThrowError(expect.objectContaining({ code: "SKILL_NOT_GRANTED" }));
    expect(() =>
      skillScriptRisk({
        snapshot,
        skillKey: SKILL_KEY,
        entrypointName: "missing",
      }),
    ).toThrowError(expect.objectContaining({ code: "SKILL_ENTRYPOINT_INVALID" }));
  });

  it("keeps auth out of argv, environment, audit, and plaintext database storage", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      const { baseDir, snapshot, config } = await fixture();
      try {
        process.env.OPENCLAW_ENTERPRISE_SKILL_TOKEN_KEY = randomBytes(32).toString("base64");
        process.env.UNRELATED_GATEWAY_SECRET = "must-not-leak";
        const account = createEnterpriseAccount({
          username: "skill.user",
          displayName: "Skill User",
          passwordHash: "test-only-hash",
          role: "employee",
          mustChangePassword: false,
        });
        replaceEnterpriseEntitlements(account.id, [
          {
            resourceType: "agent",
            resourceId: sharedAgentResourceKey("specialist"),
            effect: "allow",
          },
        ]);
        config.skills!.entries = { [SKILL_KEY]: { enabled: true, env: { TEST_SKILL_ENV: "ok" } } };
        await loginEnterpriseSkill({
          config,
          snapshot,
          accountId: account.id,
          sessionId: "enterprise-session",
          agentId: "specialist",
          skillKey: SKILL_KEY,
          fields: { username: "different-user", password: "not-stored" },
        });
        expect(enterpriseSkillAuthStatus(account.id, SKILL_KEY).connected).toBe(true);
        const result = await runEnterpriseSkillScript({
          config,
          snapshot,
          accountId: account.id,
          sessionId: "enterprise-session-2",
          agentId: "specialist",
          skillKey: SKILL_KEY,
          entrypointName: "call",
          operation: "get_data",
          arguments: { id: 7 },
        });
        expect(result).toEqual({
          operation: "get_data",
          arguments: { id: 7, authorization: "<redacted>" },
          configured: "ok",
        });
        const db = openOpenClawStateDatabase().db;
        const stored = db
          .prepare("SELECT ciphertext FROM enterprise_skill_tokens WHERE account_id = ?")
          .get(account.id) as { ciphertext: string };
        expect(stored.ciphertext).not.toContain("encrypted-test-token");
        const databaseBytes = await readFile(openOpenClawStateDatabase().path);
        expect(databaseBytes.includes(Buffer.from("not-stored"))).toBe(false);
        expect(databaseBytes.includes(Buffer.from("encrypted-test-token"))).toBe(false);

        replaceEnterpriseEntitlements(account.id, []);
        await expect(
          runEnterpriseSkillScript({
            config,
            snapshot,
            accountId: account.id,
            agentId: "specialist",
            skillKey: SKILL_KEY,
            entrypointName: "call",
            operation: "get_data",
            arguments: {},
          }),
        ).rejects.toMatchObject({ code: "SKILL_NOT_GRANTED" });
        // Agent authorization is independent from the user's business login.
      } finally {
        await rm(baseDir, { recursive: true, force: true });
      }
    });
  });

  it("enforces router-first and rejects secret arguments", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      const { baseDir, snapshot, config } = await fixture();
      try {
        process.env.OPENCLAW_ENTERPRISE_SKILL_TOKEN_KEY = randomBytes(32).toString("base64");
        const account = createEnterpriseAccount({
          username: "router.user",
          displayName: "Router User",
          passwordHash: "test-only-hash",
          role: "employee",
          mustChangePassword: false,
        });
        replaceEnterpriseEntitlements(account.id, [
          {
            resourceType: "agent",
            resourceId: sharedAgentResourceKey("specialist"),
            effect: "allow",
          },
        ]);
        const [tool] = createEnterpriseSkillScriptTools({
          config,
          snapshot,
          agentId: "specialist",
          accountId: account.id,
          delegatedChild: true,
        });
        expect(
          (
            await tool!.execute("before-router", {
              skill: SKILL_KEY,
              entrypoint: "call",
              operation: "get_data",
              arguments: {},
            })
          ).details,
        ).toMatchObject({ code: "SKILL_ROUTER_REQUIRED" });
        await tool!.execute("router", {
          skill: SKILL_KEY,
          entrypoint: "call",
          operation: "router_tool_search",
          arguments: { query: "get data" },
        });
        expect(
          (
            await tool!.execute("auth-required", {
              skill: SKILL_KEY,
              entrypoint: "call",
              operation: "get_data",
              arguments: {},
            })
          ).details,
        ).toMatchObject({
          code: "SKILL_AUTH_REQUIRED",
        });
        expect(
          (
            await tool!.execute("secret", {
              skill: SKILL_KEY,
              entrypoint: "call",
              operation: "get_data",
              arguments: { nested: { password: "forbidden" } },
            })
          ).details,
        ).toMatchObject({ code: "SKILL_SECRET_ARGUMENT_FORBIDDEN" });
        await expect(
          runEnterpriseSkillScript({
            config,
            snapshot,
            accountId: account.id,
            agentId: "specialist",
            skillKey: SKILL_KEY,
            entrypointName: "call",
            operation: "employee_login",
            arguments: {},
          }),
        ).rejects.toMatchObject({
          code: "SKILL_LOGIN_FORBIDDEN",
        });
      } finally {
        await rm(baseDir, { recursive: true, force: true });
      }
    });
  });

  it.each([false, true])(
    "runs the assigned skill when sandbox hides its snapshot (delegated=%s)",
    async (delegatedChild) => {
      await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
        const { baseDir, config } = await fixture();
        try {
          const account = createEnterpriseAccount({
            username: "sandbox.user",
            displayName: "Sandbox User",
            passwordHash: "test-only-hash",
            role: "employee",
            mustChangePassword: false,
          });
          replaceEnterpriseEntitlements(account.id, [
            {
              resourceType: "agent",
              resourceId: sharedAgentResourceKey("specialist"),
              effect: "allow",
            },
          ]);

          const tools = createEnterpriseSkillScriptTools({
            config,
            snapshot: undefined,
            agentId: "specialist",
            accountId: account.id,
            delegatedChild,
          });

          expect(tools.map((tool) => tool.name)).toEqual(["skill_script"]);
          await expect(
            tools[0]!.execute("router", {
              skill: SKILL_KEY,
              entrypoint: "call",
              operation: "router_tool_search",
              arguments: { query: "get data" },
            }),
          ).resolves.toMatchObject({ details: { results: [{ tool_name: "get_data" }] } });
          config.agents!.entries!.specialist!.skills = [];
          await expect(
            tools[0]!.execute("stale-router", {
              skill: SKILL_KEY,
              entrypoint: "call",
              operation: "router_tool_search",
              arguments: {},
            }),
          ).resolves.toMatchObject({ details: { code: "SKILL_CAPABILITY_CHANGED" } });
          expect(
            createEnterpriseSkillScriptTools({
              config,
              agentId: "specialist",
              accountId: account.id,
              delegatedChild,
            }),
          ).toEqual([]);
          config.agents!.entries!.specialist!.skills = [SKILL_KEY];
          const [renewed] = createEnterpriseSkillScriptTools({
            config,
            agentId: "specialist",
            accountId: account.id,
            delegatedChild,
          });
          await expect(
            renewed!.execute("renewed-router", {
              skill: SKILL_KEY,
              entrypoint: "call",
              operation: "router_tool_search",
              arguments: {},
            }),
          ).resolves.toMatchObject({ details: { results: [{ tool_name: "get_data" }] } });
        } finally {
          await rm(baseDir, { recursive: true, force: true });
        }
      });
    },
  );

  it("binds and executes the reader and runner through the minimal sandbox policy", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      const { baseDir, config } = await fixture();
      try {
        config.agents!.entries!.main = {
          default: true,
          skills: [],
          tools: { deny: ["read", "skill_script"] },
        };
        config.agents!.entries!.specialist!.tools = { profile: "minimal" };
        const account = createEnterpriseAccount({
          username: "catalog.user",
          displayName: "Catalog",
          passwordHash: "test",
          role: "employee",
          mustChangePassword: false,
          personalAgentEnabled: false,
        });
        replaceEnterpriseEntitlements(account.id, [
          {
            resourceType: "agent",
            resourceId: sharedAgentResourceKey("specialist"),
            effect: "allow",
          },
        ]);
        const projected = markGatewayRequestScopedRuntimeConfig(
          projectEnterpriseRuntimeConfig(config, account, { userAudience: true }),
          {
            enterpriseUser: {
              accountId: account.id,
              username: account.username,
              displayName: account.displayName,
              personalAgentId: "personal",
              personalAgentTemplateId: "main",
            },
            enterpriseCapabilities: {
              resolve: (agentId) =>
                resolveEnterpriseSharedAgentCapabilities({ config, account, agentId }),
            },
          },
        );
        const stages: Array<{ stage: string; afterNames: string[] }> = [];
        const tools = createOpenClawCodingTools({
          config: projected,
          agentId: "specialist",
          sessionKey: "agent:specialist:dashboard:catalog",
          workspaceDir: baseDir,
          wrapBeforeToolCallHook: false,
          sandbox: createAgentToolsSandboxContext({
            workspaceDir: baseDir,
            fsBridge: createContainerWorkspaceSandboxFsBridge(baseDir),
            tools: resolveSandboxToolPolicyForAgent(projected, "specialist"),
          }),
          onToolSurfaceFilter: (stage) => stages.push(stage),
        });
        expect(
          tools.map((tool) => tool.name),
          JSON.stringify(stages),
        ).toEqual(expect.arrayContaining(["read", "skill_script"]));
        const read = await tools
          .find((tool) => tool.name === "read")!
          .execute("read", { path: "/workspace/SKILL.md" });
        expect(JSON.stringify(read)).toContain("Test skill");
        await expect(
          tools
            .find((tool) => tool.name === "skill_script")!
            .execute("router", {
              skill: SKILL_KEY,
              entrypoint: "call",
              operation: "router_tool_search",
              arguments: {},
            }),
        ).resolves.toMatchObject({ details: { results: [{ tool_name: "get_data" }] } });
      } finally {
        await rm(baseDir, { recursive: true, force: true });
      }
    });
  });

  it("materializes skill_script from child authority when request metadata is unavailable", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      const { baseDir, config } = await fixture();
      try {
        const account = createEnterpriseAccount({
          username: "authority.user",
          displayName: "Authority User",
          passwordHash: "test-only-hash",
          role: "employee",
          mustChangePassword: false,
        });
        replaceEnterpriseEntitlements(account.id, [
          {
            resourceType: "agent",
            resourceId: sharedAgentResourceKey("specialist"),
            effect: "allow",
          },
        ]);
        registerEnterpriseDelegationChildAuthority({
          childSessionKey: "child-session",
          childRunId: "child-run",
          accountId: account.id,
          personalAgentId: "personal",
          parentSessionKey: "parent-session",
          parentRunId: "parent-run",
          childAgentId: "specialist",
          childAgentName: "Specialist",
          policyRevision: 1,
          profileRevision: "profile-revision",
        });

        const tools = createOpenClawTools({
          config,
          agentSessionKey: "sandbox-session",
          runSessionKey: "child-session",
          runId: "child-run",
          requesterAgentIdOverride: "specialist",
        });

        expect(tools.map((tool) => tool.name)).toContain("skill_script");
      } finally {
        await rm(baseDir, { recursive: true, force: true });
      }
    });
  });

  it.each([false, true])(
    "emits auth and resumes the exact call once (delegated=%s)",
    async (delegatedChild) => {
      await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
        const { baseDir, snapshot, config } = await fixture();
        try {
          process.env.OPENCLAW_ENTERPRISE_SKILL_TOKEN_KEY = randomBytes(32).toString("base64");
          const account = createEnterpriseAccount({
            username: "resume.user",
            displayName: "Resume User",
            passwordHash: "test-only-hash",
            role: "employee",
            mustChangePassword: false,
          });
          replaceEnterpriseEntitlements(account.id, [
            {
              resourceType: "agent",
              resourceId: sharedAgentResourceKey("specialist"),
              effect: "allow",
            },
          ]);
          config.agents!.entries!.specialist!.delegationTarget = {
            status: "active",
            aliases: [],
            handlingMode: "auto_when_certain",
            useWhen: ["Test skill"],
            avoidWhen: [],
            requiredInputs: [],
          };
          const policy = writeEnterpriseDelegationPolicy(0, {
            rollout: "on",
            routerModel: "test/router-model",
            autoThreshold: 0.9,
            clarifyThreshold: 0.7,
            minimumMargin: 0.15,
            maxDelegatesPerTurn: 1,
            eventRetentionDays: 30,
          });
          const candidate = listEnterpriseDelegationCandidates(config, account)[0]!;
          registerEnterpriseDelegationChildAuthority({
            childSessionKey: "child-session",
            childRunId: "child-run",
            accountId: account.id,
            personalAgentId: "personal",
            parentSessionKey: "parent-session",
            parentRunId: "parent-run",
            childAgentId: "specialist",
            childAgentName: "Specialist",
            policyRevision: policy.revision,
            profileRevision: candidate.profileRevision,
          });
          const [rawTool] = createEnterpriseSkillScriptTools({
            config,
            snapshot,
            agentId: "specialist",
            accountId: account.id,
            delegatedChild,
            childSessionKey: "child-session",
            childRunId: "child-run",
          });
          const tool = wrapToolWithGatewayCallerIdentity(rawTool!, {
            agentId: "specialist",
            sessionKey: "child-session",
            receiptAuthority: () => true,
          });
          await tool!.execute("router", {
            skill: SKILL_KEY,
            entrypoint: "call",
            operation: "router_tool_search",
            arguments: { query: "get data" },
          });
          let authEvent:
            | Parameters<Parameters<typeof onEnterpriseSkillAuthRequired>[0]>[0]
            | undefined;
          const unsubscribe = onEnterpriseSkillAuthRequired((event) => {
            authEvent = event;
          });
          const pendingResult = tool!.execute("exact-call", {
            skill: SKILL_KEY,
            entrypoint: "call",
            operation: "get_data",
            arguments: { id: 42 },
          });
          await vi.waitFor(() => expect(authEvent).toBeDefined());
          expect(authEvent).toMatchObject({
            parentSessionKey: delegatedChild ? "parent-session" : "child-session",
            agentId: "specialist",
            skillKey: SKILL_KEY,
            fields: [{ id: "username" }, { id: "password", type: "password" }],
          });
          expect(JSON.stringify(authEvent)).not.toContain("id: 42");
          await loginEnterpriseSkill({
            config,
            snapshot,
            accountId: account.id,
            agentId: "specialist",
            skillKey: SKILL_KEY,
            fields: { username: "user", password: "secret" },
          });
          resolveEnterpriseSkillAuthRequest(authEvent!.requestId);
          await expect(pendingResult).resolves.toMatchObject({
            details: { operation: "get_data", arguments: { id: 42, authorization: "<redacted>" } },
          });
          unsubscribe();
        } finally {
          await rm(baseDir, { recursive: true, force: true });
        }
      });
    },
  );

  it("runs a granted no-auth skill without credentials", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      const { baseDir, snapshot, config } = await fixture();
      try {
        delete snapshot.skills[0]!.scriptRuntime!.auth;
        await writeFile(
          path.join(baseDir, "SKILL.md"),
          `---\nname: ${SKILL_KEY}\ndescription: Test skill.\nmetadata: ${JSON.stringify({ openclaw: { scriptRuntime: snapshot.skills[0]!.scriptRuntime } })}\n---\n`,
        );
        const account = createEnterpriseAccount({
          username: "no-auth.user",
          displayName: "No Auth User",
          passwordHash: "test-only-hash",
          role: "employee",
          mustChangePassword: false,
        });
        replaceEnterpriseEntitlements(account.id, [
          {
            resourceType: "agent",
            resourceId: sharedAgentResourceKey("specialist"),
            effect: "allow",
          },
        ]);
        await expect(
          runEnterpriseSkillScript({
            config,
            snapshot,
            accountId: account.id,
            agentId: "specialist",
            skillKey: SKILL_KEY,
            entrypointName: "call",
            operation: "get_data",
            arguments: { id: 1 },
          }),
        ).resolves.toMatchObject({ operation: "get_data", arguments: { id: 1 } });

        config.agents!.entries!.specialist!.skills = [];
        await expect(
          runEnterpriseSkillScript({
            config,
            snapshot,
            accountId: account.id,
            agentId: "specialist",
            skillKey: SKILL_KEY,
            entrypointName: "call",
            operation: "get_data",
            arguments: {},
          }),
        ).rejects.toMatchObject({
          code: "SKILL_NOT_GRANTED",
        });
      } finally {
        await rm(baseDir, { recursive: true, force: true });
      }
    });
  });

  it("does not execute a replayed write twice across tool reconstruction in the same run", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      const { baseDir, executable, config } = await fixture();
      try {
        await writeFile(
          path.join(baseDir, "SKILL.md"),
          `---\nname: ${SKILL_KEY}\ndescription: Test write.\nmetadata: ${JSON.stringify({ openclaw: { scriptRuntime: { entrypoints: { call: { path: "scripts/call", kind: "fixed", risk: "write" } } } } })}\n---\n`,
        );
        await writeFile(
          executable,
          `#!/usr/bin/env node\nconst fs = require("node:fs"); fs.appendFileSync(${JSON.stringify(baseDir + ".count")}, "1"); process.stdout.write(JSON.stringify({written:true}));\n`,
        );
        const account = createEnterpriseAccount({
          username: "replay.user",
          displayName: "Replay",
          passwordHash: "test",
          role: "employee",
          mustChangePassword: false,
        });
        replaceEnterpriseEntitlements(account.id, [
          {
            resourceType: "agent",
            resourceId: sharedAgentResourceKey("specialist"),
            effect: "allow",
          },
        ]);
        let active = true;
        const identity = {
          agentId: "specialist",
          sessionKey: "session-replay",
          receiptAuthority: () => active,
          operationalRunInstance: { runId: "run-replay", instanceId: "instance-replay" },
        };
        const createTool = () =>
          wrapToolWithGatewayCallerIdentity(
            createEnterpriseSkillScriptTools({
              config,
              agentId: "specialist",
              accountId: account.id,
              delegatedChild: false,
              childRunId: "run-replay",
              childSessionKey: "session-replay",
            })[0]!,
            identity,
          );
        const args = { skill: SKILL_KEY, entrypoint: "call", arguments: { id: 1 } };
        await expect(createTool().execute("same-call", args)).resolves.toMatchObject({
          details: { written: true },
        });
        await expect(
          createTool().execute("same-call", { ...args, arguments: { id: 2 } }),
        ).resolves.toMatchObject({
          details: { code: "SKILL_CALL_REPLAY_MISMATCH" },
        });
        await expect(createTool().execute("same-call", args)).resolves.toMatchObject({
          details: { written: true },
        });
        active = false;
        await expect(createTool().execute("closed-call", args)).resolves.toMatchObject({
          details: { code: "SKILL_RUN_NOT_ADMITTED" },
        });
        expect(await readFile(baseDir + ".count", "utf8")).toBe("1");
      } finally {
        await rm(baseDir, { recursive: true, force: true });
        await rm(baseDir + ".count", { force: true });
      }
    });
  });

  it("rejects symlinked entrypoints", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      const { baseDir, snapshot, config } = await fixture("scripts/link");
      try {
        await symlink(path.join(baseDir, "scripts", "call"), path.join(baseDir, "scripts", "link"));
        const account = createEnterpriseAccount({
          username: "link.user",
          displayName: "Link User",
          passwordHash: "test-only-hash",
          role: "employee",
          mustChangePassword: false,
        });
        replaceEnterpriseEntitlements(account.id, [
          {
            resourceType: "agent",
            resourceId: sharedAgentResourceKey("specialist"),
            effect: "allow",
          },
        ]);
        await expect(
          runEnterpriseSkillScript({
            config,
            snapshot,
            accountId: account.id,
            agentId: "specialist",
            skillKey: SKILL_KEY,
            entrypointName: "call",
            operation: "router_tool_search",
            arguments: {},
          }),
        ).rejects.toMatchObject({
          code: "SKILL_ENTRYPOINT_INVALID",
        });
      } finally {
        await rm(baseDir, { recursive: true, force: true });
      }
    });
  });

  it("kills scripts that exceed the output or time limit", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      const { baseDir, executable, snapshot, config } = await fixture();
      try {
        const account = createEnterpriseAccount({
          username: "limits.user",
          displayName: "Limits User",
          passwordHash: "test-only-hash",
          role: "employee",
          mustChangePassword: false,
        });
        replaceEnterpriseEntitlements(account.id, [
          {
            resourceType: "agent",
            resourceId: sharedAgentResourceKey("specialist"),
            effect: "allow",
          },
        ]);
        const run = () =>
          runEnterpriseSkillScript({
            config,
            snapshot,
            accountId: account.id,
            agentId: "specialist",
            skillKey: SKILL_KEY,
            entrypointName: "call",
            operation: "router_tool_search",
            arguments: {},
          });

        await writeFile(
          executable,
          '#!/usr/bin/env node\nprocess.stdin.resume(); process.stdin.on("end", () => process.stdout.write("x".repeat(1048577)));\n',
        );
        await expect(run()).rejects.toMatchObject({
          code: "SKILL_OUTPUT_LIMIT",
        });

        snapshot.skills[0]!.scriptRuntime!.entrypoints.call!.timeoutMs = 20;
        await writeFile(
          path.join(baseDir, "SKILL.md"),
          `---\nname: ${SKILL_KEY}\ndescription: Test skill.\nmetadata: ${JSON.stringify({ openclaw: { scriptRuntime: snapshot.skills[0]!.scriptRuntime } })}\n---\n`,
        );
        await writeFile(
          executable,
          '#!/usr/bin/env node\nprocess.stdin.resume(); process.stdin.on("end", () => setTimeout(() => {}, 60000));\n',
        );
        await expect(run()).rejects.toMatchObject({
          code: "SKILL_SCRIPT_TIMEOUT",
        });
      } finally {
        await rm(baseDir, { recursive: true, force: true });
      }
    });
  });
});
