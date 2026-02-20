import { Type } from "@sinclair/typebox";
import { NonEmptyString } from "./primitives.js";

export const ModelChoiceSchema = Type.Object(
  {
    id: NonEmptyString,
    name: NonEmptyString,
    provider: NonEmptyString,
    contextWindow: Type.Optional(Type.Integer({ minimum: 1 })),
    reasoning: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);

export const AgentSummarySchema = Type.Object(
  {
    id: NonEmptyString,
    name: Type.Optional(NonEmptyString),
    identity: Type.Optional(
      Type.Object(
        {
          name: Type.Optional(NonEmptyString),
          theme: Type.Optional(NonEmptyString),
          emoji: Type.Optional(NonEmptyString),
          avatar: Type.Optional(NonEmptyString),
          avatarUrl: Type.Optional(NonEmptyString),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);

export const AgentsListParamsSchema = Type.Object({}, { additionalProperties: false });

export const AgentsListResultSchema = Type.Object(
  {
    defaultId: NonEmptyString,
    mainKey: NonEmptyString,
    scope: Type.Union([Type.Literal("per-sender"), Type.Literal("global")]),
    agents: Type.Array(AgentSummarySchema),
  },
  { additionalProperties: false },
);

export const AgentsCreateParamsSchema = Type.Object(
  {
    name: NonEmptyString,
    workspace: NonEmptyString,
    emoji: Type.Optional(Type.String()),
    avatar: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

export const AgentsCreateResultSchema = Type.Object(
  {
    ok: Type.Literal(true),
    agentId: NonEmptyString,
    name: NonEmptyString,
    workspace: NonEmptyString,
  },
  { additionalProperties: false },
);

export const AgentsUpdateParamsSchema = Type.Object(
  {
    agentId: NonEmptyString,
    name: Type.Optional(NonEmptyString),
    workspace: Type.Optional(NonEmptyString),
    model: Type.Optional(NonEmptyString),
    avatar: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

export const AgentsUpdateResultSchema = Type.Object(
  {
    ok: Type.Literal(true),
    agentId: NonEmptyString,
  },
  { additionalProperties: false },
);

export const AgentsDeleteParamsSchema = Type.Object(
  {
    agentId: NonEmptyString,
    deleteFiles: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);

export const AgentsDeleteResultSchema = Type.Object(
  {
    ok: Type.Literal(true),
    agentId: NonEmptyString,
    removedBindings: Type.Integer({ minimum: 0 }),
  },
  { additionalProperties: false },
);

export const AgentsFileEntrySchema = Type.Object(
  {
    name: NonEmptyString,
    path: NonEmptyString,
    missing: Type.Boolean(),
    size: Type.Optional(Type.Integer({ minimum: 0 })),
    updatedAtMs: Type.Optional(Type.Integer({ minimum: 0 })),
    content: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

export const AgentsFilesListParamsSchema = Type.Object(
  {
    agentId: NonEmptyString,
  },
  { additionalProperties: false },
);

export const AgentsFilesListResultSchema = Type.Object(
  {
    agentId: NonEmptyString,
    workspace: NonEmptyString,
    files: Type.Array(AgentsFileEntrySchema),
  },
  { additionalProperties: false },
);

export const AgentsFilesGetParamsSchema = Type.Object(
  {
    agentId: NonEmptyString,
    name: NonEmptyString,
  },
  { additionalProperties: false },
);

export const AgentsFilesGetResultSchema = Type.Object(
  {
    agentId: NonEmptyString,
    workspace: NonEmptyString,
    file: AgentsFileEntrySchema,
  },
  { additionalProperties: false },
);

export const AgentsFilesSetParamsSchema = Type.Object(
  {
    agentId: NonEmptyString,
    name: NonEmptyString,
    content: Type.String(),
  },
  { additionalProperties: false },
);

export const AgentsFilesSetResultSchema = Type.Object(
  {
    ok: Type.Literal(true),
    agentId: NonEmptyString,
    workspace: NonEmptyString,
    file: AgentsFileEntrySchema,
  },
  { additionalProperties: false },
);

export const AgentsKbTreeEntrySchema = Type.Object(
  {
    type: Type.Union([Type.Literal("dir"), Type.Literal("file")]),
    name: NonEmptyString,
    path: Type.String(),
    parentPath: Type.String(),
    size: Type.Optional(Type.Integer({ minimum: 0 })),
    updatedAtMs: Type.Optional(Type.Integer({ minimum: 0 })),
  },
  { additionalProperties: false },
);

export const AgentsKbFileSchema = Type.Object(
  {
    name: NonEmptyString,
    path: NonEmptyString,
    parentPath: Type.String(),
    size: Type.Optional(Type.Integer({ minimum: 0 })),
    updatedAtMs: Type.Optional(Type.Integer({ minimum: 0 })),
    content: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

export const AgentsKbTreeParamsSchema = Type.Object(
  {
    agentId: NonEmptyString,
    path: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

export const AgentsKbTreeResultSchema = Type.Object(
  {
    agentId: NonEmptyString,
    workspace: NonEmptyString,
    kbRoot: NonEmptyString,
    kbRootAbs: Type.Optional(NonEmptyString),
    entries: Type.Array(AgentsKbTreeEntrySchema),
  },
  { additionalProperties: false },
);

export const AgentsKbMkdirParamsSchema = Type.Object(
  {
    agentId: NonEmptyString,
    parentPath: Type.String(),
    name: NonEmptyString,
  },
  { additionalProperties: false },
);

export const AgentsKbMkdirResultSchema = Type.Object(
  {
    ok: Type.Literal(true),
    agentId: NonEmptyString,
    kbRoot: NonEmptyString,
    kbRootAbs: Type.Optional(NonEmptyString),
    path: NonEmptyString,
    created: Type.Boolean(),
  },
  { additionalProperties: false },
);

export const AgentsKbFileGetParamsSchema = Type.Object(
  {
    agentId: NonEmptyString,
    path: NonEmptyString,
  },
  { additionalProperties: false },
);

export const AgentsKbFileGetResultSchema = Type.Object(
  {
    agentId: NonEmptyString,
    workspace: NonEmptyString,
    kbRoot: NonEmptyString,
    kbRootAbs: Type.Optional(NonEmptyString),
    file: AgentsKbFileSchema,
  },
  { additionalProperties: false },
);

export const AgentsKbFileSetParamsSchema = Type.Object(
  {
    agentId: NonEmptyString,
    path: NonEmptyString,
    content: Type.String(),
    createIfMissing: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);

export const AgentsKbFileSetResultSchema = Type.Object(
  {
    ok: Type.Literal(true),
    agentId: NonEmptyString,
    workspace: NonEmptyString,
    kbRoot: NonEmptyString,
    kbRootAbs: Type.Optional(NonEmptyString),
    file: AgentsKbFileSchema,
  },
  { additionalProperties: false },
);

export const AgentsKbDeleteParamsSchema = Type.Object(
  {
    agentId: NonEmptyString,
    path: NonEmptyString,
    recursive: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);

export const AgentsKbDeleteResultSchema = Type.Object(
  {
    ok: Type.Literal(true),
    agentId: NonEmptyString,
    kbRoot: NonEmptyString,
    kbRootAbs: Type.Optional(NonEmptyString),
    path: NonEmptyString,
    deleted: Type.Boolean(),
    type: Type.Optional(Type.Union([Type.Literal("file"), Type.Literal("dir")])),
  },
  { additionalProperties: false },
);

export const AgentsKbSyncParamsSchema = Type.Object(
  {
    agentId: NonEmptyString,
    forceReindex: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);

export const AgentsKbSyncResultSchema = Type.Object(
  {
    ok: Type.Literal(true),
    agentId: NonEmptyString,
    kbRootAbs: NonEmptyString,
    extraPaths: Type.Object(
      {
        before: Type.Array(Type.String()),
        after: Type.Array(Type.String()),
        added: Type.Boolean(),
      },
      { additionalProperties: false },
    ),
    index: Type.Object(
      {
        attempted: Type.Boolean(),
        ok: Type.Boolean(),
        backend: Type.Optional(Type.String()),
        files: Type.Optional(Type.Integer({ minimum: 0 })),
        chunks: Type.Optional(Type.Integer({ minimum: 0 })),
        error: Type.Optional(Type.String()),
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);

export const AgentsKbExtraPathEntrySchema = Type.Object(
  {
    path: NonEmptyString,
    exists: Type.Boolean(),
    isKb: Type.Boolean(),
  },
  { additionalProperties: false },
);

export const AgentsKbExtraPathsGetParamsSchema = Type.Object(
  {
    agentId: NonEmptyString,
  },
  { additionalProperties: false },
);

export const AgentsKbExtraPathsGetResultSchema = Type.Object(
  {
    agentId: NonEmptyString,
    kbPath: NonEmptyString,
    paths: Type.Array(AgentsKbExtraPathEntrySchema),
  },
  { additionalProperties: false },
);

export const AgentsKbExtraPathsSetParamsSchema = Type.Object(
  {
    agentId: NonEmptyString,
    paths: Type.Array(NonEmptyString),
  },
  { additionalProperties: false },
);

export const AgentsKbExtraPathsSetResultSchema = Type.Object(
  {
    ok: Type.Literal(true),
    agentId: NonEmptyString,
    before: Type.Array(Type.String()),
    after: Type.Array(Type.String()),
    added: Type.Array(Type.String()),
    removed: Type.Array(Type.String()),
  },
  { additionalProperties: false },
);

export const AgentsKbSyncAllStartParamsSchema = Type.Object(
  {
    forceReindex: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);

export const AgentsKbSyncAllStartResultSchema = Type.Object(
  {
    ok: Type.Literal(true),
    jobId: NonEmptyString,
    state: Type.Union([Type.Literal("queued"), Type.Literal("running")]),
  },
  { additionalProperties: false },
);

export const AgentsKbSyncAllStatusParamsSchema = Type.Object(
  {
    jobId: NonEmptyString,
  },
  { additionalProperties: false },
);

export const AgentsKbSyncAllAgentResultSchema = Type.Object(
  {
    agentId: NonEmptyString,
    indexOk: Type.Boolean(),
    files: Type.Optional(Type.Integer({ minimum: 0 })),
    chunks: Type.Optional(Type.Integer({ minimum: 0 })),
    error: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

export const AgentsKbSyncAllStatusResultSchema = Type.Object(
  {
    ok: Type.Literal(true),
    jobId: NonEmptyString,
    state: Type.Union([
      Type.Literal("queued"),
      Type.Literal("running"),
      Type.Literal("done"),
      Type.Literal("failed"),
    ]),
    progress: Type.Object(
      {
        totalAgents: Type.Integer({ minimum: 0 }),
        doneAgents: Type.Integer({ minimum: 0 }),
        currentAgentId: Type.Union([Type.String(), Type.Null()]),
      },
      { additionalProperties: false },
    ),
    kbPath: NonEmptyString,
    unionPaths: Type.Array(Type.String()),
    results: Type.Array(AgentsKbSyncAllAgentResultSchema),
    error: Type.Optional(Type.String()),
    startedAtMs: Type.Optional(Type.Integer({ minimum: 0 })),
    finishedAtMs: Type.Optional(Type.Integer({ minimum: 0 })),
  },
  { additionalProperties: false },
);

export const ModelsListParamsSchema = Type.Object({}, { additionalProperties: false });

export const ModelsListResultSchema = Type.Object(
  {
    models: Type.Array(ModelChoiceSchema),
  },
  { additionalProperties: false },
);

export const SkillsStatusParamsSchema = Type.Object(
  {
    agentId: Type.Optional(NonEmptyString),
  },
  { additionalProperties: false },
);

export const SkillsBinsParamsSchema = Type.Object({}, { additionalProperties: false });

export const SkillsBinsResultSchema = Type.Object(
  {
    bins: Type.Array(NonEmptyString),
  },
  { additionalProperties: false },
);

export const SkillsInstallParamsSchema = Type.Object(
  {
    name: NonEmptyString,
    installId: NonEmptyString,
    timeoutMs: Type.Optional(Type.Integer({ minimum: 1000 })),
  },
  { additionalProperties: false },
);

export const SkillsUpdateParamsSchema = Type.Object(
  {
    skillKey: NonEmptyString,
    enabled: Type.Optional(Type.Boolean()),
    apiKey: Type.Optional(Type.String()),
    env: Type.Optional(Type.Record(NonEmptyString, Type.String())),
  },
  { additionalProperties: false },
);
