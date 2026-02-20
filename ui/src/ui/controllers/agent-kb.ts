import type { GatewayBrowserClient } from "../gateway.ts";
import type {
  AgentsKbDeleteResult,
  AgentsKbExtraPathRow,
  AgentsKbExtraPathsGetResult,
  AgentsKbExtraPathsSetResult,
  AgentsKbFileGetResult,
  AgentsKbFileSetResult,
  AgentsKbMkdirResult,
  AgentsKbSyncAllStartResult,
  AgentsKbSyncAllStatusResult,
  AgentsKbSyncResult,
  AgentsKbTreeResult,
} from "../types.ts";

const KB_SYNC_ALL_POLL_MS = 1500;
const syncAllPollTimers = new WeakMap<AgentKbState, number>();

export type AgentKbState = {
  client: GatewayBrowserClient | null;
  connected: boolean;
  kbLoading: boolean;
  kbError: string | null;
  kbTree: AgentsKbTreeResult | null;
  kbSelectedPath: string | null;
  kbSelectedType: "dir" | "file" | null;
  kbFileContent: string;
  kbFileDraft: string;
  kbSaving: boolean;
  kbDeleting: boolean;
  kbSyncing: boolean;
  kbSyncResult: AgentsKbSyncResult | null;
  kbExtraPathsLoading: boolean;
  kbExtraPathsSaving: boolean;
  kbExtraPathsRows: AgentsKbExtraPathRow[];
  kbExtraPathsKbPath: string | null;
  kbSyncAllStarting: boolean;
  kbSyncAllJobId: string | null;
  kbSyncAllStatus: AgentsKbSyncAllStatusResult | null;
};

function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function hasKbPath(state: AgentKbState, path: string): boolean {
  return state.kbTree?.entries.some((entry) => entry.path === path) ?? false;
}

function clearSyncAllPoll(state: AgentKbState): void {
  if (typeof window === "undefined") {
    return;
  }
  const timer = syncAllPollTimers.get(state);
  if (timer) {
    window.clearTimeout(timer);
    syncAllPollTimers.delete(state);
  }
}

function scheduleSyncAllPoll(state: AgentKbState, fn: () => Promise<void>): void {
  if (typeof window === "undefined") {
    return;
  }
  clearSyncAllPoll(state);
  const timer = window.setTimeout(() => {
    void fn();
  }, KB_SYNC_ALL_POLL_MS);
  syncAllPollTimers.set(state, timer);
}

export async function loadKbTree(state: AgentKbState, agentId: string, path = "") {
  if (!state.client || !state.connected || state.kbLoading) {
    return;
  }
  state.kbLoading = true;
  state.kbError = null;
  try {
    const res = await state.client.request<AgentsKbTreeResult | null>("agents.kb.tree", {
      agentId,
      path,
    });
    if (!res) {
      return;
    }
    state.kbTree = res;
    if (state.kbSelectedPath && !hasKbPath(state, state.kbSelectedPath)) {
      state.kbSelectedPath = null;
      state.kbSelectedType = null;
      state.kbFileContent = "";
      state.kbFileDraft = "";
    }
  } catch (err) {
    state.kbError = toErrorMessage(err);
  } finally {
    state.kbLoading = false;
  }
}

export async function openKbPath(
  state: AgentKbState,
  agentId: string,
  opts: { path: string; type: "dir" | "file" },
) {
  if (!state.client || !state.connected) {
    return;
  }
  state.kbError = null;

  if (opts.type === "dir") {
    state.kbSelectedPath = opts.path;
    state.kbSelectedType = "dir";
    state.kbFileContent = "";
    state.kbFileDraft = "";
    return;
  }

  state.kbLoading = true;
  try {
    const res = await state.client.request<AgentsKbFileGetResult | null>("agents.kb.file.get", {
      agentId,
      path: opts.path,
    });
    if (!res?.file) {
      return;
    }
    const content = res.file.content ?? "";
    state.kbSelectedPath = res.file.path;
    state.kbSelectedType = "file";
    state.kbFileContent = content;
    state.kbFileDraft = content;
  } catch (err) {
    state.kbError = toErrorMessage(err);
  } finally {
    state.kbLoading = false;
  }
}

export async function mkdirKbFolder(
  state: AgentKbState,
  agentId: string,
  params: { parentPath: string; name: string },
) {
  if (!state.client || !state.connected || state.kbSaving) {
    return;
  }
  state.kbSaving = true;
  state.kbError = null;
  try {
    await state.client.request<AgentsKbMkdirResult | null>("agents.kb.mkdir", {
      agentId,
      parentPath: params.parentPath,
      name: params.name,
    });
    await loadKbTree(state, agentId);
  } catch (err) {
    state.kbError = toErrorMessage(err);
  } finally {
    state.kbSaving = false;
  }
}

export async function saveKbFile(
  state: AgentKbState,
  agentId: string,
  params: { path: string; content: string; createIfMissing?: boolean },
) {
  if (!state.client || !state.connected || state.kbSaving) {
    return;
  }
  state.kbSaving = true;
  state.kbError = null;
  try {
    const res = await state.client.request<AgentsKbFileSetResult | null>("agents.kb.file.set", {
      agentId,
      path: params.path,
      content: params.content,
      createIfMissing: params.createIfMissing !== false,
    });
    if (res?.file) {
      const content = res.file.content ?? params.content;
      state.kbSelectedPath = res.file.path;
      state.kbSelectedType = "file";
      state.kbFileContent = content;
      state.kbFileDraft = content;
    }
    await loadKbTree(state, agentId);
  } catch (err) {
    state.kbError = toErrorMessage(err);
  } finally {
    state.kbSaving = false;
  }
}

export async function deleteKbPath(
  state: AgentKbState,
  agentId: string,
  params: { path: string; recursive: boolean },
) {
  if (!state.client || !state.connected || state.kbDeleting) {
    return;
  }
  state.kbDeleting = true;
  state.kbError = null;
  try {
    const res = await state.client.request<AgentsKbDeleteResult | null>("agents.kb.delete", {
      agentId,
      path: params.path,
      recursive: params.recursive,
    });
    if (res?.deleted && state.kbSelectedPath === params.path) {
      state.kbSelectedPath = null;
      state.kbSelectedType = null;
      state.kbFileContent = "";
      state.kbFileDraft = "";
    }
    await loadKbTree(state, agentId);
  } catch (err) {
    state.kbError = toErrorMessage(err);
  } finally {
    state.kbDeleting = false;
  }
}

export async function loadKbExtraPaths(state: AgentKbState, agentId: string) {
  if (!state.client || !state.connected || state.kbExtraPathsLoading) {
    return;
  }
  state.kbExtraPathsLoading = true;
  state.kbError = null;
  try {
    const res = await state.client.request<AgentsKbExtraPathsGetResult | null>(
      "agents.kb.extraPaths.get",
      { agentId },
    );
    if (!res) {
      return;
    }
    state.kbExtraPathsRows = res.paths;
    state.kbExtraPathsKbPath = res.kbPath;
  } catch (err) {
    state.kbError = toErrorMessage(err);
  } finally {
    state.kbExtraPathsLoading = false;
  }
}

export async function saveKbExtraPaths(state: AgentKbState, agentId: string, paths: string[]) {
  if (!state.client || !state.connected || state.kbExtraPathsSaving) {
    return;
  }
  state.kbExtraPathsSaving = true;
  state.kbError = null;
  try {
    const res = await state.client.request<AgentsKbExtraPathsSetResult | null>(
      "agents.kb.extraPaths.set",
      {
        agentId,
        paths,
      },
    );
    if (!res) {
      return;
    }
    await loadKbExtraPaths(state, agentId);
  } catch (err) {
    state.kbError = toErrorMessage(err);
  } finally {
    state.kbExtraPathsSaving = false;
  }
}

export async function syncKbAgent(state: AgentKbState, agentId: string) {
  if (!state.client || !state.connected || state.kbSyncing) {
    return;
  }
  state.kbSyncing = true;
  state.kbError = null;
  try {
    const res = await state.client.request<AgentsKbSyncResult | null>("agents.kb.sync", {
      agentId,
      forceReindex: true,
    });
    state.kbSyncResult = res;
  } catch (err) {
    state.kbError = toErrorMessage(err);
  } finally {
    state.kbSyncing = false;
  }
}

export async function pollKbSyncAllStatus(state: AgentKbState, jobId: string) {
  if (!state.client || !state.connected) {
    return;
  }

  try {
    const res = await state.client.request<AgentsKbSyncAllStatusResult | null>(
      "agents.kb.syncAll.status",
      {
        jobId,
      },
    );
    if (!res) {
      return;
    }

    state.kbSyncAllStatus = res;
    state.kbSyncAllJobId = res.jobId;

    if (res.state === "queued" || res.state === "running") {
      scheduleSyncAllPoll(state, async () => {
        await pollKbSyncAllStatus(state, jobId);
      });
    } else {
      clearSyncAllPoll(state);
    }
  } catch (err) {
    clearSyncAllPoll(state);
    state.kbError = toErrorMessage(err);
  }
}

export async function startKbSyncAll(state: AgentKbState) {
  if (!state.client || !state.connected || state.kbSyncAllStarting) {
    return;
  }

  state.kbSyncAllStarting = true;
  state.kbError = null;
  clearSyncAllPoll(state);

  try {
    const res = await state.client.request<AgentsKbSyncAllStartResult | null>(
      "agents.kb.syncAll.start",
      {
        forceReindex: true,
      },
    );
    if (!res) {
      return;
    }

    state.kbSyncAllJobId = res.jobId;
    await pollKbSyncAllStatus(state, res.jobId);
  } catch (err) {
    state.kbError = toErrorMessage(err);
  } finally {
    state.kbSyncAllStarting = false;
  }
}
