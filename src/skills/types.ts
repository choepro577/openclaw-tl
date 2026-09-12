// Skill types expose the shared skill contracts used by discovery, loading, and runtime flows.
import type { Skill } from "./loading/skill-contract.js";

export type SkillInstallSpec = {
  id?: string;
  kind: "brew" | "node" | "go" | "uv" | "download";
  label?: string;
  bins?: string[];
  os?: string[];
  formula?: string;
  package?: string;
  module?: string;
  url?: string;
  archive?: string;
  extract?: boolean;
  stripComponents?: number;
  targetDir?: string;
};

export type SkillScriptRisk = "read" | "write";

export type SkillScriptEntrypoint = {
  path: string;
  timeoutMs?: number;
} & (
  | { kind: "fixed"; risk: SkillScriptRisk }
  | {
      kind: "operation";
      routerOperation?: string;
      routerBypassOperations?: string[];
      authExemptOperations?: string[];
      readOperations?: string[];
      writeOperations?: string[];
      unknownRisk: "approval";
    }
);

export type SkillScriptAuth = {
  mode: "login-token";
  loginEntrypoint: string;
  loginOperation: string;
  fields: Array<{
    id: string;
    label: string;
    argument: string;
    type: "text" | "password";
  }>;
  tokenPaths: string[];
  injectArgument: string;
  ttlSeconds: number;
};

export type SkillScriptRuntime = {
  entrypoints: Record<string, SkillScriptEntrypoint>;
  auth?: SkillScriptAuth;
};

export type OpenClawSkillMetadata = {
  always?: boolean;
  skillKey?: string;
  primaryEnv?: string;
  emoji?: string;
  homepage?: string;
  os?: string[];
  requires?: {
    bins?: string[];
    anyBins?: string[];
    env?: string[];
    config?: string[];
  };
  install?: SkillInstallSpec[];
  scriptRuntime?: SkillScriptRuntime;
};

export type SkillInvocationPolicy = {
  userInvocable: boolean;
  disableModelInvocation: boolean;
};

type SkillCommandDispatchSpec = {
  kind: "tool";
  /** Name of the tool to invoke (AnyAgentTool.name). */
  toolName: string;
  /**
   * How to forward user-provided args to the tool.
   * - raw: forward the raw args string (no core parsing).
   */
  argMode?: "raw";
};

export type SkillTelemetrySource = "bundled" | "unknown" | "workspace";

export type SkillUsagePath = {
  /** Path visible to the tool runtime when it reads SKILL.md. */
  readPath: string;
  /** Canonical source SKILL.md path used as the lifecycle identity. */
  skillFile: string;
  skillName: string;
  skillSource: SkillTelemetrySource;
};

export type ExplicitSkillSelection = {
  name: string;
  path: string;
};

export type SkillCommandSpec = {
  name: string;
  /** Human-readable skill title for display surfaces. */
  displayName?: string;
  /** Canonical SKILL.md path for file-scoped usage accounting. */
  skillFile?: string;
  skillName: string;
  description: string;
  /** Whether the model can resolve this skill from its available-skills prompt. */
  modelVisible?: boolean;
  /** Bounded source label used for diagnostics. */
  skillSource?: SkillTelemetrySource;
  /** Localized descriptions for native command surfaces that support them. */
  descriptionLocalizations?: Record<string, string>;
  /** Optional deterministic dispatch behavior for this command. */
  dispatch?: SkillCommandDispatchSpec;
  /** Native prompt template used by Claude-bundle command markdown files. */
  promptTemplate?: string;
  /** Source markdown path for bundle-backed commands. */
  sourceFilePath?: string;
};

export type SkillsInstallPreferences = {
  preferBrew: boolean;
  nodeManager: "npm" | "pnpm" | "yarn" | "bun";
};

export type ParsedSkillFrontmatter = Record<string, string>;

type SkillExposure = {
  includeInRuntimeRegistry: boolean;
  includeInAvailableSkillsPrompt: boolean;
  userInvocable: boolean;
};

export type SkillEntry = {
  skill: Skill;
  frontmatter: ParsedSkillFrontmatter;
  metadata?: OpenClawSkillMetadata;
  invocation?: SkillInvocationPolicy;
  exposure?: SkillExposure;
  syncSourceDir?: string;
  syncDirName?: string;
  disableCommandDispatch?: boolean;
};

export type SkillEligibilityContext = {
  nodeSkills?: {
    canExec: boolean;
    node?: string;
  };
  remote?: {
    platforms: string[];
    hasBin: (bin: string) => boolean;
    hasAnyBin: (bins: string[]) => boolean;
    note?: string;
  };
};

export const WORKSPACE_SKILLS_PROMPT_FORMAT_VERSION = 4;

export type SkillSnapshot = {
  prompt: string;
  /** Complete eligible sync identities, including skills hidden from the model prompt. */
  skills: Array<{
    name: string;
    /** Config key can differ from the prompt-facing skill name. */
    skillKey?: string;
    /** Discovery source used to bind Enterprise grants to the published skill. */
    source?: string;
    primaryEnv?: string;
    requiredEnv?: string[];
    /** Host-only runtime data for administrator-granted skill scripts. */
    baseDir?: string;
    scriptRuntime?: SkillScriptRuntime;
  }>;
  /** Normalized agent-level filter used to build this snapshot; undefined means unrestricted. */
  skillFilter?: string[];
  /** Sparse per-session overlay applied after the agent-level filter. */
  skillOverrides?: Record<string, boolean>;
  /** Effective node-exec eligibility used to select connected node-hosted skills. */
  nodeSkillsEligibility?: SkillEligibilityContext["nodeSkills"];
  resolvedSkills?: Skill[];
  /** Present only when a session merges skills from distinct agent and execution roots. */
  skillRoots?: {
    agentWorkspaceDir: string;
    executionSkillsDir: string;
  };
  /** Enterprise capability revision used to invalidate a session on the next turn. */
  capabilityRevision?: string;
  version?: number;
  promptFormatVersion?: number;
};
