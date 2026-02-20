import { html, nothing } from "lit";
import type {
  AgentsKbExtraPathRow,
  AgentsKbSyncAllStatusResult,
  AgentsKbSyncResult,
  AgentsListResult,
  AgentKbEntry,
} from "../types.ts";
import { formatRelativeTimestamp } from "../format.ts";

export type KbProps = {
  loading: boolean;
  saving: boolean;
  deleting: boolean;
  syncing: boolean;
  syncAllStarting: boolean;
  extraPathsLoading: boolean;
  extraPathsSaving: boolean;
  error: string | null;
  tree: { kbRoot: string; entries: AgentKbEntry[] } | null;
  expandedDirs: Record<string, boolean>;
  agentsList: AgentsListResult | null;
  selectedAgentId: string | null;
  selectedPath: string | null;
  selectedType: "dir" | "file" | null;
  fileDraft: string;
  fileContent: string;
  syncResult: AgentsKbSyncResult | null;
  syncAllStatus: AgentsKbSyncAllStatusResult | null;
  extraPathsRows: AgentsKbExtraPathRow[];
  kbPath: string | null;
  onSelectAgent: (agentId: string) => void;
  onRefresh: () => void;
  onSelectEntry: (path: string, type: "dir" | "file") => void;
  onCreateFolder: (parentPath: string, name: string) => void;
  onCreateFile: (path: string, content: string) => void;
  onUploadFile: (parentPath: string, file: File) => void;
  onSaveFile: (path: string, content: string) => void;
  onDeletePath: (path: string, recursive: boolean) => void;
  onDraftChange: (value: string) => void;
  onSyncAgent: () => void;
  onSyncAll: () => void;
  onToggleDir: (path: string) => void;
  onExpandAllDirs: () => void;
  onCollapseAllDirs: () => void;
  onReloadExtraPaths: () => void;
  onSetExtraPaths: (paths: string[]) => void;
};

type VisibleTreeEntry = {
  entry: AgentKbEntry;
  depth: number;
};

function resolveCurrentFolder(props: KbProps): string {
  if (!props.selectedPath || !props.selectedType) {
    return "";
  }
  if (props.selectedType === "dir") {
    return props.selectedPath;
  }
  const parts = props.selectedPath.split("/");
  parts.pop();
  return parts.join("/");
}

function isAbsolutePathInput(value: string): boolean {
  if (value.startsWith("/")) {
    return true;
  }
  return /^[a-zA-Z]:[\\/]/.test(value);
}

function buildTreeIndex(entries: AgentKbEntry[]): Map<string, AgentKbEntry[]> {
  const index = new Map<string, AgentKbEntry[]>();
  for (const entry of entries) {
    const parent = entry.parentPath || "";
    const bucket = index.get(parent) ?? [];
    bucket.push(entry);
    index.set(parent, bucket);
  }

  for (const [, bucket] of index) {
    bucket.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "dir" ? -1 : 1;
      }
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
  }

  return index;
}

function getVisibleEntries(
  index: Map<string, AgentKbEntry[]>,
  expandedDirs: Record<string, boolean>,
  parentPath = "",
  depth = 0,
): VisibleTreeEntry[] {
  const out: VisibleTreeEntry[] = [];
  const children = index.get(parentPath) ?? [];

  for (const entry of children) {
    out.push({ entry, depth });
    if (entry.type === "dir" && expandedDirs[entry.path]) {
      out.push(...getVisibleEntries(index, expandedDirs, entry.path, depth + 1));
    }
  }

  return out;
}

function formatTreeMeta(entry: AgentKbEntry, index: Map<string, AgentKbEntry[]>): string {
  if (entry.type === "dir") {
    const childCount = index.get(entry.path)?.length ?? 0;
    return `${childCount} item${childCount === 1 ? "" : "s"}`;
  }
  const size = entry.size ?? 0;
  const updated = formatRelativeTimestamp(entry.updatedAtMs ?? null);
  return `${size} B · ${updated}`;
}

function renderSyncResult(result: AgentsKbSyncResult) {
  const syncClass = result.index.ok ? "success" : "danger";
  const syncMessage = result.index.ok
    ? `Indexed successfully (${result.index.files ?? 0} files, ${result.index.chunks ?? 0} chunks).`
    : `Index failed: ${result.index.error ?? "unknown error"}`;
  return html`
    <div class="callout ${syncClass}" style="margin-top: 12px;">
      <div><strong>extraPaths:</strong> ${result.extraPaths.after.join(", ") || "(empty)"}</div>
      <div><strong>Reindex:</strong> ${syncMessage}</div>
    </div>
  `;
}

function renderSyncAllStatus(status: AgentsKbSyncAllStatusResult) {
  const failedResults = status.results.filter((entry) => !entry.indexOk);
  const hasFailures = failedResults.length > 0;
  const klass =
    status.state === "failed" || hasFailures
      ? "danger"
      : status.state === "done"
        ? "success"
        : "info";

  return html`
    <div class="callout ${klass}" style="margin-top: 12px;">
      <div><strong>Sync-all:</strong> ${status.state}</div>
      <div>
        <strong>Progress:</strong>
        ${status.progress.doneAgents}/${status.progress.totalAgents}
        ${
          status.progress.currentAgentId
            ? html`(current: <span class="mono">${status.progress.currentAgentId}</span>)`
            : nothing
        }
      </div>
      <div><strong>KB path:</strong> <span class="mono">${status.kbPath}</span></div>
      <div><strong>Failed agents:</strong> ${failedResults.length}</div>
      ${
        failedResults.length > 0
          ? html`
              <div style="margin-top: 6px;">
                ${failedResults.slice(0, 3).map(
                  (entry) =>
                    html`<div>
                      <span class="mono">${entry.agentId}</span>: ${entry.error ?? "index failed"}
                    </div>`,
                )}
              </div>
            `
          : nothing
      }
      ${status.error ? html`<div><strong>Error:</strong> ${status.error}</div>` : nothing}
    </div>
  `;
}

function renderExtraPaths(
  props: KbProps,
  params: {
    resolvedAgentId: string | null;
    agentOptions: Array<{ id: string; name?: string }>;
  },
) {
  const rows = props.extraPathsRows;
  const currentPaths = rows.map((row) => row.path);
  const canEdit =
    Boolean(params.resolvedAgentId) && !props.extraPathsLoading && !props.extraPathsSaving;

  return html`
    <section class="card" style="margin-top: 14px;">
      <div class="kb-extra-header">
        <div>
          <div class="card-title">Extra Paths (${params.resolvedAgentId ?? "-"})</div>
          <div class="card-sub">
            Absolute paths only. These paths are per-agent and used for memory indexing.
          </div>
          ${
            props.kbPath
              ? html`<div class="muted" style="margin-top: 6px;">
                Profile KB: <span class="mono">${props.kbPath}</span>
              </div>`
              : nothing
          }
        </div>

        <div class="row" style="gap: 8px; flex-wrap: wrap; align-items: end;">
          <label class="field kb-extra-agent" style="margin: 0; min-width: 220px;">
            <span>Agent</span>
            <select
              .value=${params.resolvedAgentId ?? ""}
              @change=${(event: Event) => {
                const value = (event.currentTarget as HTMLSelectElement).value;
                if (value) {
                  props.onSelectAgent(value);
                }
              }}
            >
              ${params.agentOptions.map(
                (agent) =>
                  html`<option value=${agent.id}>${agent.name?.trim() || agent.id}</option>`,
              )}
            </select>
          </label>

          <button
            class="btn"
            ?disabled=${!params.resolvedAgentId || props.syncing || props.loading}
            @click=${props.onSyncAgent}
          >
            ${props.syncing ? "Syncing..." : "Sync selected agent"}
          </button>

          <button class="btn" ?disabled=${!canEdit} @click=${props.onReloadExtraPaths}>
            Refresh paths
          </button>
        </div>
      </div>

      <div class="row" style="gap: 8px; margin-top: 10px; flex-wrap: wrap;">
        <button
          class="btn"
          ?disabled=${!canEdit}
          @click=${() => {
            const input = window.prompt("Absolute path");
            if (!input) {
              return;
            }
            const trimmed = input.trim();
            if (!trimmed) {
              return;
            }
            if (!isAbsolutePathInput(trimmed)) {
              window.alert("Path must be absolute.");
              return;
            }
            props.onSetExtraPaths([...currentPaths, trimmed]);
          }}
        >
          Add path
        </button>
      </div>

      <div style="margin-top: 10px; display: grid; gap: 8px;">
        ${
          rows.length === 0
            ? html`
                <div class="muted">No extra paths configured for this agent.</div>
              `
            : rows.map(
                (row) => html`
                <div class="list-item kb-extra-path-row">
                  <div class="list-main">
                    <div class="list-title mono">${row.path}</div>
                    <div class="list-sub">${row.exists ? "exists" : "missing"}${
                      row.isKb ? " · profile KB" : ""
                    }</div>
                  </div>
                  <button
                    class="btn"
                    ?disabled=${!canEdit}
                    @click=${() => {
                      props.onSetExtraPaths(currentPaths.filter((entry) => entry !== row.path));
                    }}
                  >
                    Remove
                  </button>
                </div>
              `,
              )
        }
      </div>

      ${props.syncResult ? renderSyncResult(props.syncResult) : nothing}
    </section>
  `;
}

function renderTreeAndEditor(
  props: KbProps,
  params: {
    entries: AgentKbEntry[];
    selectedEntry: AgentKbEntry | null;
    canSaveFile: boolean;
  },
) {
  const treeIndex = buildTreeIndex(params.entries);
  const visibleEntries = getVisibleEntries(treeIndex, props.expandedDirs);
  const folderCount = params.entries.filter((entry) => entry.type === "dir").length;
  const fileCount = params.entries.length - folderCount;

  return html`
    <section class="card" style="margin-top: 14px;">
      <div class="kb-layout">
        <div class="kb-tree-panel">
          <div class="kb-tree-toolbar">
            <div>
              <div class="card-title">Tree</div>
              <div class="card-sub">${folderCount} folders · ${fileCount} files</div>
            </div>
            <div class="row" style="gap: 8px; flex-wrap: wrap;">
              <button
                class="btn btn--sm"
                ?disabled=${props.loading || folderCount === 0}
                @click=${props.onExpandAllDirs}
              >
                Expand all
              </button>
              <button
                class="btn btn--sm"
                ?disabled=${props.loading || folderCount === 0}
                @click=${props.onCollapseAllDirs}
              >
                Collapse all
              </button>
            </div>
          </div>

          <div class="kb-tree-scroll">
            <div
              class="kb-tree-node kb-tree-node--root ${
                props.selectedPath === "" && props.selectedType === "dir"
                  ? "kb-tree-node--selected"
                  : ""
              }"
              style=${"--kb-depth:0"}
              @click=${() => props.onSelectEntry("", "dir")}
            >
              <div class="kb-tree-main">
                <span class="kb-tree-chevron kb-tree-chevron--spacer" aria-hidden="true"></span>
                <span class="kb-tree-kind mono">ROOT</span>
                <div class="kb-tree-copy">
                  <div class="kb-tree-name">${props.tree?.kbRoot ?? "KB"}/</div>
                  <div class="kb-tree-path mono">/</div>
                </div>
              </div>
              <div class="kb-tree-meta">${folderCount} folders · ${fileCount} files</div>
            </div>

            ${
              params.entries.length === 0
                ? html`
                    <div class="kb-tree-empty callout info">
                      KB is empty. Create a folder first, then add markdown files inside it.
                    </div>
                  `
                : visibleEntries.map(({ entry, depth }) => {
                    const selected = props.selectedPath === entry.path;
                    const isDir = entry.type === "dir";
                    const childCount = treeIndex.get(entry.path)?.length ?? 0;
                    const isExpanded = isDir ? Boolean(props.expandedDirs[entry.path]) : false;
                    const showChevron = isDir && childCount > 0;

                    return html`
                      <div
                        class="kb-tree-node ${selected ? "kb-tree-node--selected" : ""}"
                        style=${`--kb-depth:${depth + 1}`}
                        @click=${() => props.onSelectEntry(entry.path, entry.type)}
                      >
                        <div class="kb-tree-main">
                          ${
                            showChevron
                              ? html`
                                <button
                                  type="button"
                                  class="kb-tree-chevron"
                                  title=${isExpanded ? "Collapse" : "Expand"}
                                  @click=${(event: Event) => {
                                    event.stopPropagation();
                                    props.onToggleDir(entry.path);
                                  }}
                                >
                                  ${isExpanded ? "▾" : "▸"}
                                </button>
                              `
                              : html`
                                  <span class="kb-tree-chevron kb-tree-chevron--spacer" aria-hidden="true"></span>
                                `
                          }
                          <span class="kb-tree-kind mono">${isDir ? "DIR" : "MD"}</span>
                          <div class="kb-tree-copy">
                            <div class="kb-tree-name">${entry.name}</div>
                            <div class="kb-tree-path mono">${entry.path}</div>
                          </div>
                        </div>
                        <div class="kb-tree-meta">${formatTreeMeta(entry, treeIndex)}</div>
                      </div>
                    `;
                  })
            }
          </div>
        </div>

        <div class="kb-editor-panel">
          <div class="row" style="justify-content: space-between; gap: 8px; margin-bottom: 10px; align-items: center;">
            <div>
              <div class="card-title">Editor</div>
              <div class="card-sub">
                ${
                  props.selectedPath
                    ? html`Selected: <span class="mono">${props.selectedPath}</span>`
                    : html`
                        Select a markdown file to edit.
                      `
                }
              </div>
            </div>
            <button
              class="btn primary"
              ?disabled=${!params.canSaveFile || props.saving || !props.selectedPath}
              @click=${() => {
                if (!props.selectedPath) {
                  return;
                }
                props.onSaveFile(props.selectedPath, props.fileDraft);
              }}
            >
              ${props.saving ? "Saving..." : "Save"}
            </button>
          </div>

          ${
            props.selectedType !== "file"
              ? html`
                  <div class="callout info">
                    ${
                      params.selectedEntry?.type === "dir"
                        ? "Directory selected. Create or upload markdown files inside this folder."
                        : "No markdown file selected."
                    }
                  </div>
                `
              : html`
                  <label class="field full" style="margin: 0;">
                    <span>Markdown content</span>
                    <textarea
                      rows="20"
                      .value=${props.fileDraft}
                      @input=${(event: Event) =>
                        props.onDraftChange((event.currentTarget as HTMLTextAreaElement).value)}
                    ></textarea>
                  </label>
                `
          }
        </div>
      </div>
    </section>
  `;
}

function renderSyncCard(props: KbProps) {
  return html`
    <section class="card kb-sync-card" style="margin-top: 14px;">
      <div class="row" style="justify-content: space-between; gap: 8px; align-items: center; flex-wrap: wrap;">
        <div>
          <div class="card-title">Sync Controls</div>
          <div class="card-sub">Global sync merges valid union paths and reindexes all agents.</div>
        </div>
        <button class="btn primary" ?disabled=${props.syncAllStarting || props.loading} @click=${props.onSyncAll}>
          ${props.syncAllStarting ? "Starting..." : "Sync all agents"}
        </button>
      </div>
      ${
        props.syncAllStatus
          ? renderSyncAllStatus(props.syncAllStatus)
          : html`
              <div class="muted" style="margin-top: 10px">No sync-all job started yet.</div>
            `
      }
    </section>
  `;
}

export function renderKb(props: KbProps) {
  const agentOptions = props.agentsList?.agents ?? [];
  const resolvedAgentId =
    props.selectedAgentId ??
    props.agentsList?.defaultId ??
    props.agentsList?.agents?.[0]?.id ??
    null;
  const entries = props.tree?.entries ?? [];
  const selectedEntry = entries.find((entry) => entry.path === props.selectedPath) ?? null;
  const currentFolder = resolveCurrentFolder(props);
  const canCreateOrUploadFile = Boolean(currentFolder);
  const canSaveFile =
    props.selectedType === "file" &&
    Boolean(props.selectedPath) &&
    props.fileDraft !== props.fileContent;
  const canDelete = Boolean(props.selectedPath && props.selectedType);

  return html`
    <section class="card">
      <div class="row" style="justify-content: space-between; gap: 12px; align-items: flex-end; flex-wrap: wrap;">
        <div>
          <div class="card-title">Knowledge Base (Global)</div>
          <div class="card-sub">
            Manage markdown-only KB under profile root <span class="mono">KB/</span>.
          </div>
        </div>
        <button class="btn" ?disabled=${props.loading || !resolvedAgentId} @click=${props.onRefresh}>
          ${props.loading ? "Loading..." : "Refresh"}
        </button>
      </div>
      ${props.error ? html`<div class="callout danger" style="margin-top: 12px;">${props.error}</div>` : nothing}
    </section>

    <section class="card" style="margin-top: 14px;">
      <div class="row" style="justify-content: space-between; gap: 8px; flex-wrap: wrap;">
        <div class="row" style="gap: 8px; flex-wrap: wrap;">
          <button
            class="btn"
            ?disabled=${props.saving || props.loading || !resolvedAgentId}
            @click=${() => {
              const name = window.prompt("Folder name");
              if (!name || !resolvedAgentId) {
                return;
              }
              props.onCreateFolder(currentFolder, name);
            }}
          >
            Create folder
          </button>

          <button
            class="btn"
            ?disabled=${props.saving || props.loading || !resolvedAgentId || !canCreateOrUploadFile}
            @click=${() => {
              if (!resolvedAgentId) {
                return;
              }
              const nameRaw = window.prompt("Markdown file name (.md)");
              if (!nameRaw) {
                return;
              }
              const trimmed = nameRaw.trim();
              if (!trimmed) {
                return;
              }
              const fileName = trimmed.toLowerCase().endsWith(".md") ? trimmed : `${trimmed}.md`;
              props.onCreateFile(`${currentFolder}/${fileName}`, "");
            }}
          >
            Create file .md
          </button>

          <button
            class="btn"
            ?disabled=${props.saving || props.loading || !resolvedAgentId || !canCreateOrUploadFile}
            @click=${() => {
              const input = document.getElementById("kb-upload-input") as HTMLInputElement | null;
              input?.click();
            }}
          >
            Upload .md
          </button>

          <input
            id="kb-upload-input"
            type="file"
            accept=".md,text/markdown"
            style="display:none"
            @change=${(event: Event) => {
              const input = event.currentTarget as HTMLInputElement;
              const file = input.files?.[0];
              if (!file) {
                return;
              }
              props.onUploadFile(currentFolder, file);
              input.value = "";
            }}
          />

          <button
            class="btn ${canDelete ? "danger" : ""}"
            ?disabled=${props.deleting || props.loading || !resolvedAgentId || !canDelete}
            @click=${() => {
              if (!resolvedAgentId || !props.selectedPath || !props.selectedType) {
                return;
              }
              const isDir = props.selectedType === "dir";
              const confirmed = window.confirm(
                isDir
                  ? `Delete folder ${props.selectedPath} and all nested entries?`
                  : `Delete file ${props.selectedPath}?`,
              );
              if (!confirmed) {
                return;
              }
              props.onDeletePath(props.selectedPath, isDir);
            }}
          >
            ${props.deleting ? "Deleting..." : "Delete selected"}
          </button>
        </div>
      </div>
      <div class="muted" style="margin-top: 10px;">
        Root policy: files cannot be created at <span class="mono">KB/</span>; create/select a folder first.
      </div>
    </section>

    ${renderTreeAndEditor(props, {
      entries,
      selectedEntry,
      canSaveFile,
    })}

    ${renderExtraPaths(props, { resolvedAgentId, agentOptions })}

    ${renderSyncCard(props)}

    <section class="card" style="margin-top: 14px;">
      <div class="muted">Note: legacy per-agent KB folders are not auto-migrated.</div>
    </section>
  `;
}
