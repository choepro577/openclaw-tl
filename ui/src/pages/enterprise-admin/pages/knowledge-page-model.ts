import type {
  EnterpriseKnowledgeGraphSettings,
  EnterpriseKnowledgeZone,
  EnterpriseKnowledgeZoneRole,
} from "../../enterprise/services/enterprise-knowledge-api.ts";

export type KnowledgeTab =
  | "overview"
  | "settings"
  | "sources"
  | "graph"
  | "agents"
  | "members"
  | "search"
  | "activity";

export type UploadProgress = {
  id: string;
  name: string;
  uploaded: number;
  total: number;
  state: string;
  error?: string;
};

export type KnowledgeZoneDraft = {
  name: string;
  slug: string;
  description: string;
  egressPolicy: "local_only" | "external_allowed";
  graphEnabled: boolean;
  graphEnrichmentEnabled: boolean;
  graphAutoApprovalThreshold: number;
  agentResourceKeys: string[];
};

export type KnowledgeZoneFormErrors = Partial<
  Record<"name" | "slug" | "description" | "graphAutoApprovalThreshold" | "form", string>
>;

export function emptyKnowledgeZoneDraft(): KnowledgeZoneDraft {
  return {
    name: "",
    slug: "",
    description: "",
    egressPolicy: "local_only",
    graphEnabled: false,
    graphEnrichmentEnabled: true,
    graphAutoApprovalThreshold: 0.92,
    agentResourceKeys: [],
  };
}

export function draftFromKnowledgeZone(
  zone: EnterpriseKnowledgeZone,
  graphSettings?: EnterpriseKnowledgeGraphSettings,
): KnowledgeZoneDraft {
  return {
    name: zone.name,
    slug: zone.slug,
    description: zone.description,
    egressPolicy: zone.egressPolicy,
    graphEnabled: graphSettings?.enabled ?? false,
    graphEnrichmentEnabled: graphSettings?.enrichmentEnabled ?? true,
    graphAutoApprovalThreshold: graphSettings?.autoApprovalThreshold ?? 0.92,
    agentResourceKeys: [],
  };
}

export function createKnowledgeZoneSlug(value: string): string {
  return value
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .replaceAll(/[đĐ]/g, "d")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function validateKnowledgeZoneDraft(draft: KnowledgeZoneDraft): KnowledgeZoneFormErrors {
  const errors: KnowledgeZoneFormErrors = {};
  const name = draft.name.trim();
  if (!name) {
    errors.name = "Nhập tên vùng tri thức.";
  } else if (new TextEncoder().encode(name).byteLength > 160) {
    errors.name = "Tên không được vượt quá 160 byte.";
  }
  if (!/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(draft.slug.trim())) {
    errors.slug = "Slug phải có 3–64 ký tự thường, số hoặc dấu gạch ngang.";
  }
  if (draft.description.length > 4_000) {
    errors.description = "Mô tả không được vượt quá 4.000 ký tự.";
  }
  if (
    !Number.isFinite(draft.graphAutoApprovalThreshold) ||
    draft.graphAutoApprovalThreshold < 0.92 ||
    draft.graphAutoApprovalThreshold > 1
  ) {
    errors.graphAutoApprovalThreshold = "Ngưỡng tự duyệt phải nằm trong khoảng 0,92–1,00.";
  }
  return errors;
}

export function sameStringSet(left: readonly string[], right: readonly string[]): boolean {
  const sortedLeft = left.toSorted();
  const sortedRight = right.toSorted();
  return (
    sortedLeft.length === sortedRight.length &&
    sortedLeft.every((value, index) => value === sortedRight[index])
  );
}

export function memberRoleDraft(
  members: Array<{ accountId: string; role: EnterpriseKnowledgeZoneRole }>,
): Record<string, EnterpriseKnowledgeZoneRole | "none"> {
  return Object.fromEntries(members.map((member) => [member.accountId, member.role]));
}

export function sameMemberRoles(
  members: Array<{ accountId: string; role: EnterpriseKnowledgeZoneRole }>,
  draft: Record<string, EnterpriseKnowledgeZoneRole | "none">,
): boolean {
  const normalizedDraft = Object.entries(draft).filter(([, role]) => role !== "none");
  if (members.length !== normalizedDraft.length) {
    return false;
  }
  return members.every((member) => draft[member.accountId] === member.role);
}
