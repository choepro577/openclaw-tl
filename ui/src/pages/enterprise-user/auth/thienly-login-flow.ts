import { html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { eu, type EnterpriseUserCopyKey } from "../../../i18n/enterprise-user.ts";
import { OpenClawLightDomElement } from "../../../lit/openclaw-element.ts";
import { getSafeSessionStorage } from "../../../local-storage.ts";
import {
  EnterpriseApiError,
  type EnterpriseUserAuthAccount,
} from "../services/user-enterprise-api.ts";
import {
  cancelThienlyAttempt,
  completeThienlyAttempt,
  isThienlyTerminalPhase,
  linkThienlyAttempt,
  loadThienlyAttempt,
  startThienlyLogin,
  THIENLY_ATTEMPT_STORAGE_KEY,
  THIENLY_SUCCESS_DEADLINE_STORAGE_KEY,
  thienlyAttemptEventsUrl,
  type ThienlyAttempt,
  type ThienlyPhase,
} from "../services/user-thienly-auth.ts";
import "../styles/thienly-auth.css";

// Keep the WindowProxy so the synchronous blank popup can navigate after /start.
// noopener/noreferrer makes window.open return null, even when opening succeeds.
const POPUP_FEATURES = "popup,width=560,height=760";
const POLL_INTERVAL_MS = 5_000;
const POPUP_CHECK_INTERVAL_MS = 500;

function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function isThienlyPhase(value: unknown): value is ThienlyPhase {
  return (
    value === "waiting" ||
    value === "verifying" ||
    value === "account" ||
    value === "link_required" ||
    value === "agent" ||
    value === "ready" ||
    value === "completed" ||
    value === "cancelled" ||
    value === "failed" ||
    value === "expired"
  );
}

function readAttempt(value: unknown): ThienlyAttempt | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.id !== "string" || !isThienlyPhase(candidate.phase)) {
    return null;
  }
  const events = Array.isArray(candidate.events)
    ? candidate.events.filter((event): event is ThienlyAttempt["events"][number] => {
        if (!event || typeof event !== "object") {
          return false;
        }
        const item = event as Record<string, unknown>;
        return (
          typeof item.sequence === "number" &&
          isThienlyPhase(item.phase) &&
          (typeof item.at === "number" || typeof item.at === "string")
        );
      })
    : [];
  return {
    id: candidate.id,
    phase: candidate.phase,
    events,
    expiresAt:
      typeof candidate.expiresAt === "number" || typeof candidate.expiresAt === "string"
        ? candidate.expiresAt
        : "",
    ...(candidate.account && typeof candidate.account === "object"
      ? {
          account: {
            username: String((candidate.account as Record<string, unknown>).username ?? ""),
            displayName: String((candidate.account as Record<string, unknown>).displayName ?? ""),
          },
        }
      : {}),
    ...(candidate.error && typeof candidate.error === "object"
      ? {
          error: {
            code: String((candidate.error as Record<string, unknown>).code ?? ""),
            message: String((candidate.error as Record<string, unknown>).message ?? ""),
          },
        }
      : {}),
  };
}

function phaseLabel(phase: ThienlyPhase): string {
  switch (phase) {
    case "waiting":
      return eu("thienlyStepWaiting");
    case "verifying":
      return eu("thienlyStepVerifying");
    case "account":
      return eu("thienlyStepAccount");
    case "link_required":
      return eu("thienlyStepLinkRequired");
    case "agent":
      return eu("thienlyStepAgent");
    case "ready":
      return eu("thienlyStepReady");
    case "completed":
      return eu("thienlyStepCompleted");
    case "cancelled":
      return eu("thienlyStepCancelled");
    case "failed":
      return eu("thienlyStepFailed");
    case "expired":
      return eu("thienlyStepExpired");
  }
}

const THIENLY_ERROR_COPY: Partial<Record<string, EnterpriseUserCopyKey>> = {
  EMPLOYEE_CODE_REQUIRED: "thienlyEmployeeCodeRequired",
  EMPLOYEE_CODE_INVALID: "thienlyEmployeeCodeInvalid",
  EMPLOYEE_CODE_CHANGED: "thienlyEmployeeCodeChanged",
  THIENLY_IDENTITY_CONFLICT: "thienlyIdentityConflict",
  THIENLY_ACCOUNT_UNAVAILABLE: "thienlyAccountUnavailable",
  THIENLY_AGENT_NOT_READY: "thienlyAgentNotReady",
  THIENLY_UNAVAILABLE: "thienlyUnavailable",
  THIENLY_CONFIG_INVALID: "thienlyConfigInvalid",
  THIENLY_CONFIG_CHANGED: "thienlyConfigChanged",
  THIENLY_VERIFICATION_FAILED: "thienlyVerificationFailed",
  THIENLY_IDENTITY_INVALID: "thienlyIdentityInvalid",
  THIENLY_ATTEMPT_NOT_FOUND: "thienlyAttemptNotFound",
  THIENLY_ATTEMPT_STATE: "thienlyAttemptState",
  THIENLY_ATTEMPT_EXPIRED: "thienlyAttemptExpired",
  THIENLY_INTERRUPTED: "thienlyInterrupted",
  THIENLY_LINK_RATE_LIMITED: "thienlyLinkRateLimited",
  THIENLY_RATE_LIMITED: "thienlyRateLimited",
  INVALID_CREDENTIALS: "thienlyInvalidCredentials",
  ORIGIN_DENIED: "thienlyOriginDenied",
};

function thienlyErrorCopyKey(code: unknown): EnterpriseUserCopyKey | undefined {
  if (typeof code !== "string" || !code) {
    return undefined;
  }
  const exact = THIENLY_ERROR_COPY[code];
  if (exact) {
    return exact;
  }
  if (code.startsWith("EMPLOYEE_CODE_")) {
    return "thienlyEmployeeCodeInvalid";
  }
  if (code.startsWith("THIENLY_")) {
    return "thienlyFlowFailed";
  }
  return undefined;
}

function localizedThienlyError(error: unknown, fallback: EnterpriseUserCopyKey): string {
  const code = error instanceof EnterpriseApiError ? error.code : undefined;
  const key = thienlyErrorCopyKey(code);
  if (key) {
    return eu(key);
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return eu(fallback);
}

function localizedThienlyAttemptError(error: ThienlyAttempt["error"] | undefined): string {
  if (!error) {
    return "";
  }
  const key = thienlyErrorCopyKey(error.code);
  return key ? eu(key) : error.message || eu("thienlyFlowFailed");
}

export class EnterpriseUserThienlyLoginFlow extends OpenClawLightDomElement {
  @property({ attribute: false }) onAuthenticated?: (account: EnterpriseUserAuthAccount) => void;
  @state() private attempt: ThienlyAttempt | null = null;
  @state() private busy = false;
  @state() private linkBusy = false;
  @state() private cancelBusy = false;
  @state() private error = "";
  @state() private popupNotice = "";
  @state() private countdown: number | null = null;

  private attemptId: string | null = null;
  private authorizationUrl: string | null = null;
  private popup: Window | null = null;
  private eventSource: EventSource | null = null;
  private pollTimer: ReturnType<typeof globalThis.setInterval> | null = null;
  private popupCheckTimer: ReturnType<typeof globalThis.setInterval> | null = null;
  private countdownTimer: ReturnType<typeof globalThis.setInterval> | null = null;
  private completeRequestedId: string | null = null;
  private completedAccount: EnterpriseUserAuthAccount | null = null;
  private statusRequestActive = false;
  private resumeStarted = false;
  private handoffStarted = false;

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.resumeStarted) {
      this.resumeStarted = true;
      void this.resumeStoredAttempt();
    }
  }

  override disconnectedCallback(): void {
    this.closeLiveConnections();
    this.resumeStarted = false;
    super.disconnectedCallback();
  }

  private storage(): Storage | null {
    return getSafeSessionStorage();
  }

  private persistAttempt(id: string): void {
    try {
      this.storage()?.setItem(THIENLY_ATTEMPT_STORAGE_KEY, id);
    } catch {
      // Private browsing and blocked storage do not prevent the active flow.
    }
  }

  private clearPersistedAttempt(): void {
    try {
      const storage = this.storage();
      storage?.removeItem(THIENLY_ATTEMPT_STORAGE_KEY);
      storage?.removeItem(THIENLY_SUCCESS_DEADLINE_STORAGE_KEY);
    } catch {
      // Private browsing and blocked storage do not prevent the active flow.
    }
  }

  private persistSuccessDeadline(deadline: number): void {
    try {
      this.storage()?.setItem(THIENLY_SUCCESS_DEADLINE_STORAGE_KEY, String(deadline));
    } catch {
      // Private browsing and blocked storage do not prevent the active flow.
    }
  }

  private storedSuccessDeadline(): number | null {
    try {
      const value = Number(this.storage()?.getItem(THIENLY_SUCCESS_DEADLINE_STORAGE_KEY));
      return Number.isFinite(value) && value > Date.now() ? value : null;
    } catch {
      return null;
    }
  }

  private storedAttemptId(): string | null {
    try {
      return this.storage()?.getItem(THIENLY_ATTEMPT_STORAGE_KEY)?.trim() || null;
    } catch {
      return null;
    }
  }

  private async resumeStoredAttempt(): Promise<void> {
    const storedId = this.storedAttemptId();
    if (!storedId) {
      return;
    }
    this.attemptId = storedId;
    try {
      const result = await loadThienlyAttempt(storedId);
      if (!this.isConnected || this.attemptId !== storedId) {
        return;
      }
      this.applyAttempt(result.attempt);
      this.startLiveConnections(storedId);
    } catch (error) {
      if (!this.isConnected || this.attemptId !== storedId) {
        return;
      }
      this.clearPersistedAttempt();
      this.attemptId = null;
      this.error = localizedThienlyError(error, "thienlyResumeFailed");
    }
  }

  private openPopup(): Window | null {
    return globalThis.open?.("about:blank", "_blank", POPUP_FEATURES) ?? null;
  }

  private navigatePopup(url: string, popup: Window | null): boolean {
    const safeUrl = safeHttpUrl(url);
    if (!safeUrl) {
      return false;
    }
    try {
      if (popup && !popup.closed) {
        popup.location.href = safeUrl;
        return true;
      }
      const reopened = globalThis.open?.(safeUrl, "_blank", POPUP_FEATURES) ?? null;
      if (reopened) {
        this.popup = reopened;
        this.popupNotice = "";
        return true;
      }
    } catch {
      // The visible notice below gives the user a retry action if navigation is blocked.
    }
    return false;
  }

  private async start(event: Event): Promise<void> {
    event.preventDefault();
    if (this.busy || this.linkBusy || this.cancelBusy || this.countdown !== null) {
      return;
    }
    this.closeLiveConnections();
    this.popup = this.openPopup();
    this.popupNotice = this.popup ? "" : eu("thienlyPopupBlocked");
    this.attempt = null;
    this.attemptId = null;
    this.authorizationUrl = null;
    this.completedAccount = null;
    this.completeRequestedId = null;
    this.error = "";
    this.busy = true;
    try {
      const result = await startThienlyLogin();
      const authorizationUrl = safeHttpUrl(result.authorizationUrl);
      if (!authorizationUrl) {
        throw new Error(eu("thienlyStartFailed"));
      }
      this.authorizationUrl = authorizationUrl;
      this.attemptId = result.attempt.id;
      this.persistAttempt(result.attempt.id);
      this.applyAttempt(result.attempt);
      if (!this.navigatePopup(authorizationUrl, this.popup)) {
        this.popupNotice = eu("thienlyPopupBlocked");
      }
      this.startLiveConnections(result.attempt.id);
    } catch (error) {
      if (this.popup && !this.popup.closed) {
        this.popup.close();
      }
      this.popup = null;
      this.attempt = null;
      this.attemptId = null;
      this.clearPersistedAttempt();
      this.error = localizedThienlyError(error, "thienlyStartFailed");
    } finally {
      this.busy = false;
    }
  }

  private startLiveConnections(attemptId: string): void {
    this.closeLiveConnections();
    if (this.attempt && isThienlyTerminalPhase(this.attempt.phase)) {
      return;
    }
    if (typeof EventSource === "function") {
      try {
        const source = new EventSource(thienlyAttemptEventsUrl(attemptId), {
          withCredentials: true,
        });
        this.eventSource = source;
        source.addEventListener("progress", (event) => {
          this.handleProgressEvent(event as MessageEvent<string>);
        });
        source.addEventListener("error", () => {
          void this.recoverAttempt(attemptId);
        });
      } catch {
        this.eventSource = null;
      }
    }
    this.pollTimer = globalThis.setInterval(() => {
      void this.recoverAttempt(attemptId);
    }, POLL_INTERVAL_MS);
    this.popupCheckTimer = globalThis.setInterval(() => {
      void this.checkPopup(attemptId);
    }, POPUP_CHECK_INTERVAL_MS);
  }

  private closeLiveConnections(): void {
    this.eventSource?.close();
    this.eventSource = null;
    if (this.pollTimer !== null) {
      globalThis.clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.popupCheckTimer !== null) {
      globalThis.clearInterval(this.popupCheckTimer);
      this.popupCheckTimer = null;
    }
  }

  private async checkPopup(attemptId: string): Promise<void> {
    if (this.attemptId !== attemptId || !this.popup || !this.popup.closed) {
      return;
    }
    this.popup = null;
    if (this.attempt?.phase === "waiting") {
      this.popupNotice = eu("thienlyPopupClosed");
    }
    // A callback window may close immediately after it updates the server. Always
    // read the attempt before deciding whether this was an actual failure.
    await this.recoverAttempt(attemptId);
  }

  private handleProgressEvent(event: MessageEvent<string>): void {
    if (!event.data) {
      return;
    }
    try {
      const payload = JSON.parse(event.data) as { attempt?: unknown };
      const attempt = readAttempt(payload.attempt);
      if (attempt && attempt.id === this.attemptId) {
        this.applyAttempt(attempt);
      }
    } catch {
      // A malformed event is ignored; polling remains the recovery source.
    }
  }

  private async recoverAttempt(attemptId: string): Promise<void> {
    if (this.statusRequestActive || this.attemptId !== attemptId) {
      return;
    }
    this.statusRequestActive = true;
    try {
      const result = await loadThienlyAttempt(attemptId);
      if (this.attemptId === attemptId) {
        this.applyAttempt(result.attempt);
      }
    } catch {
      // Keep the last known state visible while SSE or the API reconnects.
    } finally {
      this.statusRequestActive = false;
    }
  }

  private applyAttempt(attempt: ThienlyAttempt): void {
    this.attempt = attempt;
    this.attemptId = attempt.id;
    this.persistAttempt(attempt.id);
    this.error = localizedThienlyAttemptError(attempt.error);
    if (attempt.phase !== "waiting") {
      this.popupNotice = "";
    }
    if (attempt.phase === "ready" || attempt.phase === "completed") {
      void this.complete(attempt.id);
    } else if (isThienlyTerminalPhase(attempt.phase)) {
      this.closeLiveConnections();
      this.clearPersistedAttempt();
    }
    this.requestUpdate();
  }

  private async complete(attemptId: string): Promise<void> {
    if (
      this.completeRequestedId === attemptId ||
      this.handoffStarted ||
      this.attemptId !== attemptId
    ) {
      return;
    }
    this.completeRequestedId = attemptId;
    try {
      const result = await completeThienlyAttempt(attemptId);
      if (this.attemptId !== attemptId) {
        return;
      }
      this.completedAccount = result.account;
      this.attempt = this.attempt
        ? {
            ...this.attempt,
            phase: "completed",
            account: {
              username: result.account.username,
              displayName: result.account.displayName,
            },
          }
        : null;
      this.closeLiveConnections();
      this.startSuccessCountdown();
    } catch (error) {
      this.completeRequestedId = null;
      this.error = localizedThienlyError(error, "thienlyCompleteFailed");
    }
  }

  private startSuccessCountdown(): void {
    if (this.countdown !== null || !this.completedAccount) {
      return;
    }
    const deadline = this.storedSuccessDeadline() ?? Date.now() + 3_000;
    this.persistSuccessDeadline(deadline);
    this.countdown = Math.max(1, Math.ceil((deadline - Date.now()) / 1_000));
    this.countdownTimer = globalThis.setInterval(() => {
      const remaining = deadline - Date.now();
      if (remaining > 0) {
        this.countdown = Math.max(1, Math.ceil(remaining / 1_000));
        return;
      }
      if (this.countdownTimer !== null) {
        globalThis.clearInterval(this.countdownTimer);
        this.countdownTimer = null;
      }
      const account = this.completedAccount;
      if (!account || this.handoffStarted) {
        return;
      }
      this.handoffStarted = true;
      this.clearPersistedAttempt();
      this.onAuthenticated?.(account);
    }, 1_000);
  }

  private async submitLink(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const attemptId = this.attemptId;
    if (!attemptId || this.linkBusy) {
      return;
    }
    const data = new FormData(event.currentTarget as HTMLFormElement);
    const password = String(data.get("password") ?? "");
    if (!password) {
      return;
    }
    this.linkBusy = true;
    this.error = "";
    try {
      const result = await linkThienlyAttempt(attemptId, password);
      this.applyAttempt(result.attempt);
      this.startLiveConnections(attemptId);
    } catch (error) {
      this.error = localizedThienlyError(error, "thienlyLinkFailed");
    } finally {
      this.linkBusy = false;
    }
  }

  private async cancel(): Promise<void> {
    const attemptId = this.attemptId;
    if (!attemptId || this.cancelBusy || this.countdown !== null) {
      return;
    }
    this.cancelBusy = true;
    this.error = "";
    try {
      const result = await cancelThienlyAttempt(attemptId);
      this.applyAttempt(result.attempt);
    } catch (error) {
      this.error = localizedThienlyError(error, "thienlyCancelFailed");
    } finally {
      this.cancelBusy = false;
    }
  }

  private reopen(): void {
    if (!this.authorizationUrl) {
      return;
    }
    if (this.navigatePopup(this.authorizationUrl, null)) {
      this.popupNotice = "";
      if (this.attemptId) {
        this.startLiveConnections(this.attemptId);
      }
    } else {
      this.popupNotice = eu("thienlyPopupBlocked");
    }
  }

  private renderTimeline() {
    const events = [...(this.attempt?.events ?? [])].toSorted(
      (left, right) => left.sequence - right.sequence,
    );
    const phases: ThienlyPhase[] = [];
    for (const event of events) {
      if (!phases.includes(event.phase)) {
        phases.push(event.phase);
      }
    }
    if (this.attempt && !phases.includes(this.attempt.phase)) {
      phases.push(this.attempt.phase);
    }
    return html`<ol class="eu-thienly-timeline" aria-live="polite">
      ${phases.map((phase) => {
        const current = phase === this.attempt?.phase;
        const reached = phases.indexOf(phase) < phases.indexOf(this.attempt?.phase ?? phase);
        return html`<li class=${current ? "is-current" : reached ? "is-complete" : ""}>
          <span class="eu-thienly-timeline__marker" aria-hidden="true"></span>
          <span aria-current=${current ? "step" : nothing}>${phaseLabel(phase)}</span>
        </li>`;
      })}
    </ol>`;
  }

  private renderActiveFlow() {
    const phase = this.attempt?.phase;
    const isTerminal = phase ? isThienlyTerminalPhase(phase) : false;
    const showLink = phase === "link_required";
    const showSuccess = this.countdown !== null && this.completedAccount;
    return html`<section class="eu-thienly-flow" aria-labelledby="eu-thienly-flow-title">
      <div class="eu-thienly-flow__header">
        <h2 id="eu-thienly-flow-title">${eu("thienlyFlowTitle")}</h2>
        <p>${eu("thienlyFlowDescription")}</p>
      </div>
      ${this.attempt?.account
        ? html`<p class="eu-thienly-account">
            <strong>${this.attempt.account.displayName}</strong>
            <span>${this.attempt.account.username}</span>
          </p>`
        : nothing}
      ${this.renderTimeline()}
      ${showLink
        ? html`<form class="stack eu-thienly-link-form" @submit=${this.submitLink}>
            <div>
              <h3>${eu("thienlyLinkTitle")}</h3>
              <p class="eu-muted">${eu("thienlyLinkDescription")}</p>
            </div>
            <label class="field">
              <span>${eu("thienlyExistingPassword")}</span>
              <input
                class="input"
                name="password"
                type="password"
                autocomplete="current-password"
                required
                autofocus
              />
            </label>
            <button class="btn primary" type="submit" ?disabled=${this.linkBusy}>
              ${this.linkBusy ? eu("thienlyLinkBusy") : eu("thienlyLink")}
            </button>
          </form>`
        : nothing}
      ${this.popupNotice && phase === "waiting"
        ? html`<div class="callout warn eu-thienly-flow__notice" role="alert">
            <span>${this.popupNotice}</span>
            ${this.authorizationUrl
              ? html`<button class="btn btn--sm" type="button" @click=${this.reopen}>
                  ${eu("thienlyReopen")}
                </button>`
              : nothing}
          </div>`
        : nothing}
      ${this.error ? html`<div class="callout danger" role="alert">${this.error}</div>` : nothing}
      ${showSuccess
        ? html`<div class="callout success eu-thienly-success" role="status" aria-live="polite">
            <strong
              >${eu("thienlySuccess", { name: this.completedAccount?.displayName ?? "" })}</strong
            >
            <span>${eu("thienlyRedirecting", { seconds: String(this.countdown) })}</span>
          </div>`
        : nothing}
      ${!showSuccess && !isTerminal
        ? html`<button
            class="btn btn--ghost eu-thienly-cancel"
            type="button"
            @click=${() => void this.cancel()}
            ?disabled=${this.cancelBusy || this.linkBusy}
          >
            ${this.cancelBusy ? eu("thienlyCancelBusy") : eu("thienlyCancel")}
          </button>`
        : nothing}
      ${isTerminal && this.countdown === null
        ? phase === "completed" && this.attemptId
          ? html`<button
              class="btn primary"
              type="button"
              @click=${() => void this.complete(this.attemptId!)}
            >
              ${eu("thienlyRetry")}
            </button>`
          : phase !== "completed"
            ? html`<button
                class="btn primary"
                type="button"
                @click=${(event: Event) => void this.start(event)}
              >
                ${eu("thienlyRetry")}
              </button>`
            : nothing
        : nothing}
    </section>`;
  }

  override render() {
    if (!this.attempt) {
      return html`<div class="eu-thienly-entry">
        <div class="eu-thienly-divider" aria-hidden="true"><span>${eu("thienlyOr")}</span></div>
        <button
          class="btn eu-thienly-login"
          type="button"
          @click=${(event: Event) => void this.start(event)}
          ?disabled=${this.busy}
        >
          ${this.busy ? eu("thienlyLoginBusy") : eu("thienlyLogin")}
        </button>
        ${this.error ? html`<div class="callout danger" role="alert">${this.error}</div>` : nothing}
      </div>`;
    }
    return this.renderActiveFlow();
  }
}

if (!customElements.get("openclaw-enterprise-user-thienly-login-flow")) {
  customElements.define(
    "openclaw-enterprise-user-thienly-login-flow",
    EnterpriseUserThienlyLoginFlow,
  );
}
