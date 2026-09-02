import { eu } from "../../../i18n/enterprise-user.ts";
import type {
  PersonalAgentKnowledgeItem,
  PersonalAgentProfile,
} from "../contracts/personal-agent.ts";
import {
  EnterpriseApiError,
  listPersonalAgentKnowledge,
  loadPersonalAgentProfile,
  resetPersonalAgentProfile,
  savePersonalAgentProfile,
} from "../services/user-enterprise-api.ts";

const DRAFT_KEY = "openclaw.enterprise.user.personal-agent-draft.v2";

export type PersonalAgentEditorState =
  | { phase: "idle" }
  | { phase: "loading" }
  | {
      phase: "ready";
      source: PersonalAgentProfile;
      draft: PersonalAgentProfile;
      knowledge: PersonalAgentKnowledgeItem[];
      busy: boolean;
      conflictRevision: number | null;
      error: string | null;
    }
  | { phase: "error"; message: string };

function loadLocalDraft(source: PersonalAgentProfile): PersonalAgentProfile {
  try {
    const raw = globalThis.sessionStorage?.getItem(DRAFT_KEY);
    if (!raw) {
      return { ...source };
    }
    const candidate = JSON.parse(raw) as Partial<PersonalAgentProfile>;
    return candidate.revision === source.revision ? { ...source, ...candidate } : { ...source };
  } catch {
    return { ...source };
  }
}

export class PersonalAgentEditorStore {
  state: PersonalAgentEditorState = { phase: "idle" };
  private readonly listeners = new Set<() => void>();

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private publish(state: PersonalAgentEditorState): void {
    this.state = state;
    for (const listener of this.listeners) {
      listener();
    }
  }

  async load(): Promise<void> {
    this.publish({ phase: "loading" });
    try {
      const [source, knowledge] = await Promise.all([
        loadPersonalAgentProfile(),
        listPersonalAgentKnowledge(),
      ]);
      this.publish({
        phase: "ready",
        source,
        draft: loadLocalDraft(source),
        knowledge,
        busy: false,
        conflictRevision: null,
        error: null,
      });
    } catch (error) {
      this.publish({
        phase: "error",
        message: error instanceof Error ? error.message : eu("personalAgentLoadFailed"),
      });
    }
  }

  update(patch: Partial<PersonalAgentProfile>): void {
    if (this.state.phase !== "ready") {
      return;
    }
    const draft = { ...this.state.draft, ...patch };
    this.publish({ ...this.state, draft, error: null });
    try {
      globalThis.sessionStorage?.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // A blocked storage API must not prevent editing in memory.
    }
  }

  setError(message: string | null): void {
    if (this.state.phase === "ready") {
      this.publish({ ...this.state, error: message });
    }
  }

  async save(): Promise<void> {
    if (this.state.phase !== "ready" || this.state.busy) {
      return;
    }
    const retainedDraft = this.state.draft;
    this.publish({ ...this.state, busy: true, error: null });
    try {
      const source = await savePersonalAgentProfile(retainedDraft);
      globalThis.sessionStorage?.removeItem(DRAFT_KEY);
      this.publish({
        ...this.state,
        source,
        draft: { ...source },
        busy: false,
        conflictRevision: null,
        error: null,
      });
    } catch (error) {
      if (error instanceof EnterpriseApiError && error.status === 409) {
        const latest = await loadPersonalAgentProfile().catch(() => null);
        this.publish({
          ...this.state,
          source: latest ?? this.state.source,
          draft: retainedDraft,
          busy: false,
          conflictRevision:
            typeof error.payload?.currentRevision === "number"
              ? error.payload.currentRevision
              : (latest?.revision ?? null),
          error: error.message,
        });
        return;
      }
      this.publish({
        ...this.state,
        draft: retainedDraft,
        busy: false,
        error: error instanceof Error ? error.message : eu("personalAgentSaveFailed"),
      });
    }
  }

  reloadLatest(): void {
    if (this.state.phase !== "ready") {
      return;
    }
    globalThis.sessionStorage?.removeItem(DRAFT_KEY);
    this.publish({
      ...this.state,
      draft: { ...this.state.source },
      conflictRevision: null,
      error: null,
    });
  }

  rebaseDraft(): void {
    if (this.state.phase !== "ready") {
      return;
    }
    this.update({ revision: this.state.source.revision });
    this.publish({ ...this.state, conflictRevision: null, error: null });
  }

  async reset(): Promise<void> {
    if (this.state.phase !== "ready" || this.state.busy) {
      return;
    }
    this.publish({ ...this.state, busy: true, error: null });
    try {
      const source = await resetPersonalAgentProfile(this.state.source.revision);
      globalThis.sessionStorage?.removeItem(DRAFT_KEY);
      this.publish({
        ...this.state,
        source,
        draft: { ...source },
        knowledge: [],
        busy: false,
        conflictRevision: null,
        error: null,
      });
    } catch (error) {
      this.publish({
        ...this.state,
        busy: false,
        error: error instanceof Error ? error.message : eu("personalAgentResetFailed"),
      });
    }
  }

  setKnowledge(knowledge: PersonalAgentKnowledgeItem[]): void {
    if (this.state.phase === "ready") {
      this.publish({ ...this.state, knowledge });
    }
  }

  async refreshKnowledge(): Promise<void> {
    if (this.state.phase !== "ready") {
      return;
    }
    try {
      this.setKnowledge(await listPersonalAgentKnowledge());
    } catch (error) {
      this.publish({
        ...this.state,
        error: error instanceof Error ? error.message : eu("knowledgeLoadFailed"),
      });
    }
  }
}

export const personalAgentEditorStore = new PersonalAgentEditorStore();
