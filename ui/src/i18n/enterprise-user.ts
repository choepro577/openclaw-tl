import { brandProductCopy } from "../branding/display-brand.ts";
import { enterpriseUserEn } from "./enterprise-user-en.ts";
import { enterpriseUserVi } from "./enterprise-user-vi.ts";
import { i18n } from "./index.ts";

export type EnterpriseUserCopyKey = keyof typeof enterpriseUserEn;

const KNOWLEDGE_VALUE_COPY: Partial<Record<string, EnterpriseUserCopyKey>> = {
  viewer: "knowledgeRoleViewer",
  curator: "knowledgeRoleCurator",
  manager: "knowledgeRoleManager",
  active: "knowledgeValueActive",
  archived: "knowledgeValueArchived",
  staged_remove: "knowledgeValueStagedRemove",
  note: "knowledgeValueNote",
  url: "knowledgeValueUrl",
  file: "knowledgeValueFile",
  source_ingest: "knowledgeValueSourceIngest",
  zone_build: "knowledgeValueZoneBuild",
  artifact_gc: "knowledgeValueArtifactGc",
  index_gc: "knowledgeValueIndexGc",
  checking: "knowledgeValueChecking",
  parsing: "knowledgeValueParsing",
  normalizing: "knowledgeValueNormalizing",
  structural_graph: "knowledgeValueStructuralGraph",
  ai_read: "knowledgeValueAiRead",
  embedding: "knowledgeValueEmbedding",
  graph_build: "knowledgeValueGraphBuild",
  validating: "knowledgeValueValidating",
  queued: "knowledgeValueQueued",
  running: "knowledgeValueRunning",
  retry_wait: "knowledgeValueRetryWait",
  pending: "knowledgeValuePending",
  not_requested: "knowledgeValueNotRequested",
  ready: "knowledgeValueReady",
  succeeded: "knowledgeValueSucceeded",
  completed: "knowledgeValueCompleted",
  degraded: "knowledgeValueDegraded",
  failed: "knowledgeValueFailed",
  cancelled: "knowledgeValueCancelled",
  superseded: "knowledgeValueSuperseded",
  error: "knowledgeValueError",
};

export function euKnowledgeValue(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  const key = KNOWLEDGE_VALUE_COPY[value];
  return key ? eu(key) : value;
}

export function eu(key: EnterpriseUserCopyKey, params?: Record<string, string>): string {
  const source = i18n.getLocale() === "vi" ? enterpriseUserVi : enterpriseUserEn;
  const value = brandProductCopy(source[key]);
  return params
    ? value.replace(/\{(\w+)\}/gu, (_, name: string) => params[name] ?? `{${name}}`)
    : value;
}
