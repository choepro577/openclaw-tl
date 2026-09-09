import { html, nothing } from "lit";
import { icons } from "../../../components/icons.ts";
import { eaa } from "../../../i18n/enterprise-admin-agents.ts";
import { ea } from "../../../i18n/enterprise-admin.ts";
import { formatDate } from "../utils.ts";

type RecordValue = Record<string, unknown>;

function unavailableReason(payload: RecordValue, fallback: string): string {
  return payload.reason === "PERSONAL_RUNTIME_SCOPE_UNAVAILABLE"
    ? eaa(
        "Chưa mở thao tác này cho personal agent vì runtime chưa có khóa ownership riêng theo tài khoản.",
      )
    : fallback;
}

export function renderAgentChannelsPanel(data: RecordValue) {
  const payload =
    data.channels && typeof data.channels === "object" ? (data.channels as RecordValue) : {};
  const accountsByChannel =
    payload.channelAccounts && typeof payload.channelAccounts === "object"
      ? (payload.channelAccounts as RecordValue)
      : {};
  const entries = Object.entries(accountsByChannel);
  if (payload.available === false) {
    return html`<div class="ea-empty ea-card">
      ${unavailableReason(payload, eaa("Gateway runtime chưa sẵn sàng."))}
    </div>`;
  }
  return html`
    <div class="ea-card ea-table-wrap">
      <table class="ea-table" style="min-width: 720px">
        <thead>
          <tr>
            <th>${eaa("Channel")}</th>
            <th>${eaa("Account")}</th>
            <th>${ea("Cấu hình")}</th>
            <th>${eaa("Runtime")}</th>
            <th>${eaa("Lỗi gần nhất")}</th>
          </tr>
        </thead>
        <tbody>
          ${entries.flatMap(([channel, rawAccounts]) =>
            (Array.isArray(rawAccounts) ? rawAccounts : []).map((raw) => {
              const account = raw as RecordValue;
              const running = account.running === true || account.connected === true;
              return html`<tr>
                <td><strong>${channel}</strong></td>
                <td>${String(account.name ?? account.accountId ?? "default")}</td>
                <td>${account.configured ? ea("Đã cấu hình") : ea("Chưa cấu hình")}</td>
                <td>
                  <span class="ea-badge ${running ? "ea-badge--good" : "ea-badge--warn"}"
                    >${running
                      ? eaa("Connected")
                      : account.enabled
                        ? eaa("Stopped")
                        : ea("Disabled")}</span
                  >
                </td>
                <td>${String(account.lastError ?? "—")}</td>
              </tr>`;
            }),
          )}
        </tbody>
      </table>
      ${entries.length === 0
        ? html`<div class="ea-empty">${eaa("Chưa có channel account nào được cấu hình.")}</div>`
        : nothing}
    </div>
  `;
}

export function formatCronSchedule(job: RecordValue): string {
  const schedule =
    job.schedule && typeof job.schedule === "object" ? (job.schedule as RecordValue) : {};
  if (schedule.kind === "at") {
    return eaa("Một lần · {at}", { at: String(schedule.at ?? "—") });
  }
  if (schedule.kind === "every") {
    return eaa("Mỗi {minutes} phút", {
      minutes: String(Math.round(Number(schedule.everyMs ?? 0) / 60_000)),
    });
  }
  if (schedule.kind === "cron") {
    return `${String(schedule.expr ?? "—")}${schedule.tz ? ` · ${schedule.tz}` : ""}`;
  }
  return String(schedule.kind ?? "—");
}

export function renderAgentCronPanel(props: {
  data: RecordValue;
  saving: boolean;
  renderEditor: () => unknown;
  onRefresh: () => void;
  onCreate: () => void;
  onEdit: (job: RecordValue) => void;
  onAction: (action: "run" | "remove" | "update", job: RecordValue) => void;
}) {
  const cron =
    props.data.cron && typeof props.data.cron === "object" ? (props.data.cron as RecordValue) : {};
  const status = cron.status && typeof cron.status === "object" ? (cron.status as RecordValue) : {};
  const jobs = Array.isArray(cron.jobs) ? (cron.jobs as Array<RecordValue>) : [];
  if (cron.available === false) {
    return html`<div class="ea-empty ea-card">
      ${unavailableReason(cron, eaa("Gateway scheduler chưa sẵn sàng."))}
    </div>`;
  }
  return html`
    <div class="ea-kpis">
      <div class="ea-kpi">
        <span class="ea-muted">${eaa("Scheduler")}</span
        ><strong>${status.enabled ? eaa("On") : eaa("Off")}</strong>
      </div>
      <div class="ea-kpi">
        <span class="ea-muted">${eaa("Jobs")}</span><strong>${jobs.length}</strong>
      </div>
      <div class="ea-kpi">
        <span class="ea-muted">${eaa("Triggers")}</span
        ><strong>${status.triggersEnabled ? eaa("On") : eaa("Off")}</strong>
      </div>
      <div class="ea-kpi">
        <span class="ea-muted">${eaa("Lần chạy kế")}</span>
        <strong class="ea-kpi__small"
          >${status.nextWakeAtMs ? formatDate(Number(status.nextWakeAtMs)) : "—"}</strong
        >
      </div>
    </div>
    <div class="ea-toolbar">
      <button class="ea-button" type="button" @click=${props.onRefresh}>${ea("Làm mới")}</button>
      <span class="ea-spacer"></span>
      <button class="ea-button ea-button--primary" type="button" @click=${props.onCreate}>
        ${icons.plus} ${eaa("Tạo lịch")}
      </button>
    </div>
    <div class="ea-card ea-table-wrap">
      <table class="ea-table" style="min-width: 780px">
        <thead>
          <tr>
            <th>${ea("Tên")}</th>
            <th>${eaa("Lịch")}</th>
            <th>${eaa("Payload")}</th>
            <th>${ea("Trạng thái")}</th>
            <th>${eaa("Chạy gần nhất")}</th>
            <th>${ea("Thao tác")}</th>
          </tr>
        </thead>
        <tbody>
          ${jobs.map((job) => {
            const payload = job.payload as RecordValue | undefined;
            const state = job.state as RecordValue | undefined;
            return html`<tr>
              <td>
                <strong>${String(job.name ?? "—")}</strong>
                <div class="ea-muted">${String(job.description ?? "")}</div>
              </td>
              <td>${formatCronSchedule(job)}</td>
              <td>${String(payload?.kind ?? "—")}</td>
              <td>
                <span class="ea-badge ${job.enabled ? "ea-badge--good" : "ea-badge--warn"}"
                  >${job.enabled ? eaa("Enabled") : eaa("Paused")}</span
                >
              </td>
              <td>${state?.lastRunAtMs ? formatDate(Number(state.lastRunAtMs)) : "—"}</td>
              <td>
                <div class="ea-row-actions">
                  <button class="ea-button" type="button" @click=${() => props.onEdit(job)}>
                    ${ea("Sửa")}
                  </button>
                  <button
                    class="ea-button"
                    type="button"
                    @click=${() => props.onAction("update", job)}
                  >
                    ${job.enabled ? ea("Tạm dừng") : ea("Bật")}
                  </button>
                  <button
                    class="ea-button"
                    type="button"
                    ?disabled=${!job.enabled || props.saving}
                    @click=${() => props.onAction("run", job)}
                  >
                    ${eaa("Chạy ngay")}
                  </button>
                  <button
                    class="ea-button ea-button--danger"
                    type="button"
                    ?disabled=${props.saving}
                    @click=${() => props.onAction("remove", job)}
                  >
                    ${ea("Xóa")}
                  </button>
                </div>
              </td>
            </tr>`;
          })}
        </tbody>
      </table>
      ${jobs.length === 0
        ? html`<div class="ea-empty">${eaa("Agent chưa có cron job.")}</div>`
        : nothing}
    </div>
    ${props.renderEditor()}
  `;
}

export function renderAgentCronEditor(props: {
  open: boolean;
  editing?: RecordValue;
  scheduleKind: "at" | "every" | "cron";
  saving: boolean;
  error: string;
  onClose: () => void;
  onScheduleKind: (kind: "at" | "every" | "cron") => void;
  onSubmit: (event: SubmitEvent) => void;
}) {
  if (!props.open) {
    return nothing;
  }
  const job = props.editing ?? {};
  const schedule = (job.schedule ?? {}) as RecordValue;
  const payload = (job.payload ?? {}) as RecordValue;
  const delivery = (job.delivery ?? {}) as RecordValue;
  const everyMinutes = Math.max(1, Math.round(Number(schedule.everyMs ?? 1_800_000) / 60_000));
  const scheduleAt =
    typeof schedule.at === "string" ? new Date(schedule.at).toISOString().slice(0, 16) : "";
  return html`<openclaw-enterprise-admin-dialog
    .open=${true}
    .wide=${true}
    .heading=${props.editing ? eaa("Sửa cron job") : eaa("Tạo cron job")}
    .description=${eaa("Lịch chạy được khóa theo đúng agent đang quản lý")}
    .onClose=${props.onClose}
  >
    <form class="ea-form-grid" @submit=${props.onSubmit}>
      <label class="ea-field"
        >${ea("Tên")}<input class="ea-input" name="name" required .value=${String(job.name ?? "")}
      /></label>
      <label class="ea-field"
        >${ea("Mô tả")}<input
          class="ea-input"
          name="description"
          .value=${String(job.description ?? "")}
      /></label>
      <label class="ea-field"
        >${eaa("Kiểu lịch")}<select
          class="ea-select"
          name="scheduleKind"
          .value=${props.scheduleKind}
          @change=${(event: Event) =>
            props.onScheduleKind(
              (event.currentTarget as HTMLSelectElement).value as "at" | "every" | "cron",
            )}
        >
          <option value="every">${eaa("Lặp theo khoảng")}</option>
          <option value="cron">${eaa("Cron expression")}</option>
          <option value="at">${eaa("Chạy một lần")}</option>
        </select></label
      >
      ${props.scheduleKind === "every"
        ? html`<label class="ea-field"
            >${eaa("Khoảng lặp")}
            <div class="ea-inline-controls">
              <input
                class="ea-input"
                type="number"
                name="everyAmount"
                min="1"
                .value=${String(everyMinutes)}
                required
              /><select class="ea-select" name="everyUnit">
                <option value="minutes">${eaa("Phút")}</option>
                <option value="hours">${eaa("Giờ")}</option>
              </select>
            </div></label
          >`
        : props.scheduleKind === "cron"
          ? html`<label class="ea-field"
                >${eaa("Cron expression")}<input
                  class="ea-input"
                  name="cronExpr"
                  required
                  .value=${String(schedule.expr ?? "0 7 * * *")} /></label
              ><label class="ea-field"
                >${eaa("Timezone")}<input
                  class="ea-input"
                  name="cronTz"
                  .value=${String(schedule.tz ?? "")}
                  placeholder="Asia/Ho_Chi_Minh"
              /></label>`
          : html`<label class="ea-field"
              >${eaa("Thời điểm")}<input
                class="ea-input"
                type="datetime-local"
                name="scheduleAt"
                required
                .value=${scheduleAt}
            /></label>`}
      <label class="ea-field"
        >${eaa("Session")}<select
          class="ea-select"
          name="sessionTarget"
          .value=${String(job.sessionTarget ?? "isolated")}
        >
          <option value="isolated">${eaa("Isolated")}</option>
          <option value="main">${eaa("Main")}</option>
          <option value="current">${eaa("Current")}</option>
        </select></label
      >
      <label class="ea-field"
        >${eaa("Wake mode")}<select
          class="ea-select"
          name="wakeMode"
          .value=${String(job.wakeMode ?? "now")}
        >
          <option value="now">${eaa("Now")}</option>
          <option value="next-heartbeat">${eaa("Next heartbeat")}</option>
        </select></label
      >
      <label class="ea-field"
        >${eaa("Payload")}<select
          class="ea-select"
          name="payloadKind"
          .value=${String(payload.kind ?? "agentTurn")}
        >
          <option value="agentTurn">${eaa("Agent turn")}</option>
          <option value="systemEvent">${eaa("System event")}</option>
        </select></label
      >
      <label class="ea-field"
        >${eaa("Model")}<input
          class="ea-input"
          name="model"
          .value=${String(payload.model ?? "")}
          placeholder=${eaa("Kế thừa agent")}
      /></label>
      <label class="ea-field ea-form-grid__full"
        >${ea("Nội dung")}<textarea
          class="ea-textarea ea-textarea--compact"
          name="payloadText"
          required
          .value=${String(payload.message ?? payload.text ?? "")}
        ></textarea>
      </label>
      <label class="ea-field"
        >${eaa("Delivery")}<select
          class="ea-select"
          name="deliveryMode"
          .value=${String(delivery.mode ?? "none")}
        >
          <option value="none">${eaa("Không gửi")}</option>
          <option value="announce">${eaa("Thông báo channel")}</option>
          <option value="webhook">${eaa("Webhook")}</option>
        </select></label
      >
      <label class="ea-field"
        >${eaa("Đích delivery")}<input
          class="ea-input"
          name="deliveryTo"
          .value=${String(delivery.to ?? "")}
          placeholder=${eaa("Channel/chat hoặc webhook URL")}
      /></label>
      <label class="ea-toggle-label ea-form-grid__full"
        ><input type="checkbox" name="enabled" .checked=${job.enabled !== false} /><span
          >${eaa("Kích hoạt job")}</span
        ></label
      >
      ${props.error ? html`<p class="ea-error ea-form-grid__full">${props.error}</p>` : nothing}
      <div class="ea-form-actions ea-form-grid__full">
        <button class="ea-button" type="button" @click=${props.onClose}>${ea("Hủy")}</button
        ><button class="ea-button ea-button--primary" type="submit" ?disabled=${props.saving}>
          ${props.saving ? ea("Đang lưu…") : eaa("Lưu cron job")}
        </button>
      </div>
    </form>
  </openclaw-enterprise-admin-dialog>`;
}

export function renderAgentMemoryPanel(props: {
  data: RecordValue;
  busyAction: string;
  onAction: (
    action:
      | "backfillDreamDiary"
      | "resetDreamDiary"
      | "resetGroundedShortTerm"
      | "repairDreamingArtifacts"
      | "dedupeDreamDiary",
  ) => void;
}) {
  const memory =
    props.data.memory && typeof props.data.memory === "object"
      ? (props.data.memory as RecordValue)
      : {};
  const status =
    memory.status && typeof memory.status === "object" ? (memory.status as RecordValue) : {};
  const embedding =
    status.embedding && typeof status.embedding === "object"
      ? (status.embedding as RecordValue)
      : {};
  const dreaming =
    status.dreaming && typeof status.dreaming === "object" ? (status.dreaming as RecordValue) : {};
  const diary =
    memory.diary && typeof memory.diary === "object" ? (memory.diary as RecordValue) : {};
  if (memory.available === false) {
    return html`<div class="ea-empty ea-card">
      ${unavailableReason(memory, eaa("Memory runtime chưa sẵn sàng."))}
    </div>`;
  }
  const disabled = Boolean(props.busyAction);
  return html`
    <div class="ea-kpis">
      <div class="ea-kpi">
        <span class="ea-muted">${eaa("Provider")}</span
        ><strong class="ea-kpi__small">${String(status.provider ?? "—")}</strong>
      </div>
      <div class="ea-kpi">
        <span class="ea-muted">${eaa("Embedding")}</span
        ><strong>${embedding.ok ? eaa("ReadyStatus") : eaa("Unavailable")}</strong>
      </div>
      <div class="ea-kpi">
        <span class="ea-muted">${eaa("Short-term")}</span
        ><strong>${Number(dreaming.shortTermCount ?? 0)}</strong>
      </div>
      <div class="ea-kpi">
        <span class="ea-muted">${eaa("Promoted")}</span
        ><strong>${Number(dreaming.promotedTotal ?? 0)}</strong>
      </div>
    </div>
    ${embedding.error ? html`<div class="ea-banner">${String(embedding.error)}</div>` : nothing}
    <section class="ea-card ea-panel-editor">
      <div class="ea-toolbar">
        <div>
          <h3>${eaa("Dream diary")}</h3>
          <p class="ea-muted">${String(diary.path ?? eaa("Chưa có file"))}</p>
        </div>
        <span class="ea-spacer"></span
        ><span class="ea-badge ${diary.found ? "ea-badge--good" : "ea-badge--warn"}"
          >${diary.found ? eaa("ReadyStatus") : eaa("missing")}</span
        >
      </div>
      <div class="ea-code ea-memory-preview">
        ${String(diary.content ?? eaa("Chưa có nội dung dream diary."))}
      </div>
    </section>
    <section class="ea-card ea-panel-editor">
      <h3>${eaa("Thao tác bảo trì")}</h3>
      <p class="ea-muted">
        ${eaa("Dùng cùng doctor memory service với UI gốc; mọi thao tác được audit.")}
      </p>
      <div class="ea-row-actions">
        <button
          class="ea-button"
          type="button"
          ?disabled=${disabled}
          @click=${() => props.onAction("backfillDreamDiary")}
        >
          ${eaa("Backfill diary")}
        </button>
        <button
          class="ea-button"
          type="button"
          ?disabled=${disabled}
          @click=${() => props.onAction("dedupeDreamDiary")}
        >
          ${eaa("Dedupe diary")}
        </button>
        <button
          class="ea-button"
          type="button"
          ?disabled=${disabled}
          @click=${() => props.onAction("repairDreamingArtifacts")}
        >
          ${eaa("Repair artifacts")}
        </button>
        <button
          class="ea-button ea-button--danger"
          type="button"
          ?disabled=${disabled}
          @click=${() => props.onAction("resetDreamDiary")}
        >
          ${eaa("Reset diary")}
        </button>
        <button
          class="ea-button ea-button--danger"
          type="button"
          ?disabled=${disabled}
          @click=${() => props.onAction("resetGroundedShortTerm")}
        >
          ${eaa("Reset short-term")}
        </button>
      </div>
    </section>
  `;
}
