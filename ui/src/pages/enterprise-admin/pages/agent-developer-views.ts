import { html, nothing } from "lit";
import type {
  EnterpriseDeveloperIntegration,
  EnterpriseDeveloperPanel,
  EnterpriseDeveloperResponse,
} from "../../enterprise/services/enterprise-api.ts";
import { formatDate } from "../utils.ts";

export type DeveloperSecretReveal = {
  apiKey: string;
  webhookSecret?: string;
};

const responseStatusLabels: Record<EnterpriseDeveloperResponse["status"], string> = {
  queued: "Đang chờ",
  in_progress: "Đang xử lý",
  completed: "Hoàn thành",
  failed: "Thất bại",
  incomplete: "Chưa hoàn tất",
};

type Props = {
  panel: EnterpriseDeveloperPanel;
  origin: string;
  busy: boolean;
  error: string;
  notice: string;
  reveal?: DeveloperSecretReveal;
  responseDetail?: {
    response: EnterpriseDeveloperResponse;
    transcript: { messages: unknown[]; events: unknown[]; totalMessages: number };
  };
  onCopy: (value: string) => void;
  onDismissReveal: () => void;
  onCreate: (event: SubmitEvent) => void;
  onSave: (integration: EnterpriseDeveloperIntegration, event: SubmitEvent) => void;
  onRotate: (integration: EnterpriseDeveloperIntegration) => void;
  onRevokePreviousKey: (integration: EnterpriseDeveloperIntegration) => void;
  onTest: (integration: EnterpriseDeveloperIntegration) => void;
  onStatus: (
    integration: EnterpriseDeveloperIntegration,
    status: "active" | "disabled" | "revoked",
  ) => void;
  onOpenResponse: (response: EnterpriseDeveloperResponse) => void;
  onFilter: (event: SubmitEvent) => void;
  onLoadMore: () => void;
};

function outputText(response: EnterpriseDeveloperResponse): string {
  const output = response.response?.output;
  if (!Array.isArray(output)) {
    return "—";
  }
  return (
    (output as unknown[])
      .flatMap((item: unknown) => {
        if (
          !item ||
          typeof item !== "object" ||
          !("content" in item) ||
          !Array.isArray(item.content)
        ) {
          return [];
        }
        return item.content.flatMap((part: unknown) =>
          part && typeof part === "object" && "text" in part && typeof part.text === "string"
            ? [part.text]
            : [],
        );
      })
      .join("\n") || "—"
  );
}

function renderQuickStart(
  panel: EnterpriseDeveloperPanel,
  origin: string,
  onCopy: Props["onCopy"],
) {
  const baseUrl = `${origin}${panel.basePath}`;
  const curlSse = `curl -N ${baseUrl}/responses \\
  -H "Authorization: Bearer $OPENCLAW_DEVELOPER_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify({ model: panel.agentId, input: "Xin chào", stream: true, metadata: { external_conversation_id: "ticket-8421" } }, null, 2)}'`;
  const curlBackground = `curl ${baseUrl}/responses \\
  -H "Authorization: Bearer $OPENCLAW_DEVELOPER_API_KEY" \\
  -H "Idempotency-Key: ticket-8421-message-7" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify({ model: panel.agentId, input: "Tổng hợp lịch sử khiếu nại", background: true, metadata: { external_conversation_id: "ticket-8421" } }, null, 2)}'`;
  const verify = `const signed = \`${"${webhookTimestamp}.${webhookId}.${rawBody}"}\`;
const expected = crypto.createHmac("sha256", webhookSecret).update(signed).digest("hex");
const received = webhookSignature.replace(/^v1=/, "");
if (!crypto.timingSafeEqual(Buffer.from(received, "hex"), Buffer.from(expected, "hex"))) {
  throw new Error("invalid webhook signature");
}`;
  return html`
    <section class="ea-card ea-panel-editor ea-developer-section">
      <div class="ea-developer-heading">
        <span class="ea-developer-step">2</span>
        <h3>Gọi Agent từ backend của bạn</h3>
      </div>
      <div class="ea-form-grid ea-developer-values">
        <div class="ea-field">
          <span>Base URL</span>
          <div class="ea-code">${baseUrl}</div>
        </div>
        <div class="ea-field">
          <span>Agent ID / model</span>
          <div class="ea-code">${panel.agentId}</div>
        </div>
      </div>
      <div class="ea-banner ea-banner--warning" role="note">
        Trình duyệt chỉ gọi backend của bạn. Giữ API key trong backend, không đặt trong JavaScript
        của trình duyệt.
      </div>
      <div class="ea-developer-required">
        <strong>Bắt buộc cho cả hai kiểu gọi</strong>
        <ul>
          <li><code>Authorization: Bearer</code> — API key của kết nối đã tạo.</li>
          <li><code>Content-Type: application/json</code> — gửi body dạng JSON.</li>
          <li><code>model</code> — Agent ID ở trên, phải khớp với kết nối.</li>
          <li><code>input</code> — câu hỏi hoặc nội dung gửi cho Agent.</li>
          <li>
            <code>metadata.external_conversation_id</code> — ID hội thoại của ứng dụng bạn; dùng lại
            ID này để tiếp tục hội thoại.
          </li>
        </ul>
      </div>
      <div class="ea-developer-example-grid">
        <div class="ea-developer-example-group">
          <h4>Trả lời trực tiếp (SSE)</h4>
          <p><code>stream: true</code> để nhận câu trả lời theo thời gian thực.</p>
          ${renderExamples([["cURL", curlSse]], onCopy)}
        </div>
        <div class="ea-developer-example-group">
          <h4>Xử lý nền</h4>
          <p>
            <code>background: true</code> và header <code>Idempotency-Key</code> cho mỗi yêu cầu,
            tránh chạy trùng khi gửi lại.
          </p>
          ${renderExamples([["cURL", curlBackground]], onCopy)}
        </div>
      </div>
      <div class="ea-developer-example-group">
        <h4>Xác thực webhook</h4>
        ${renderExamples([["Node.js", verify]], onCopy)}
      </div>
    </section>
  `;
}

function renderExamples(examples: [string, string][], onCopy: Props["onCopy"]) {
  return examples.map(
    ([title, code]) => html`
      <details class="ea-developer-example">
        <summary>${title}</summary>
        <div class="ea-developer-example__body">
          <pre class="ea-code">${code}</pre>
          <button class="ea-button" type="button" @click=${() => onCopy(code)}>
            Sao chép code
          </button>
        </div>
      </details>
    `,
  );
}

function renderIntegrationCard(integration: EnterpriseDeveloperIntegration, props: Props) {
  return html`
    <article class="ea-card ea-developer-integration">
      <div class="ea-developer-integration__header">
        <div>
          <h4>${integration.name}</h4>
          <span class="muted">Key: ocdev_${integration.keyPrefix}_…</span>
        </div>
        <span
          class="ea-badge ${integration.status === "active"
            ? "ea-badge--good"
            : integration.status === "revoked"
              ? "ea-badge--bad"
              : "ea-badge--warn"}"
        >
          ${integration.status === "active"
            ? "Đang hoạt động"
            : integration.status === "disabled"
              ? "Đã tắt"
              : "Đã thu hồi"}
        </span>
      </div>
      <form @submit=${(event: SubmitEvent) => props.onSave(integration, event)}>
        <div class="ea-form-grid">
          <label class="ea-field"
            ><span>Tên kết nối</span>
            <input
              class="ea-input"
              name="name"
              .value=${integration.name}
              maxlength="128"
              required
            />
          </label>
          <label class="ea-field"
            ><span>Webhook URL (không bắt buộc)</span>
            <input
              class="ea-input"
              name="webhookUrl"
              type="url"
              .value=${integration.webhookUrl ?? ""}
              placeholder="https://cskh.example.com/webhooks/openclaw"
            />
          </label>
          <label class="ea-field"
            ><span>Cho phép tải lên</span>
            <select class="ea-select" name="uploadPolicy" .value=${integration.uploadPolicy}>
              <option value="disabled">Tắt</option>
              <option value="images">Chỉ ảnh</option>
              <option value="images_and_documents">Ảnh + tài liệu</option>
            </select>
          </label>
          <label class="ea-field"
            ><span>Dung lượng tối đa/request (MB)</span>
            <input
              class="ea-input"
              name="maxUploadMb"
              type="number"
              min="1"
              max="20"
              .value=${String(Math.round(integration.maxUploadBytes / 1024 / 1024))}
            />
          </label>
        </div>
        <div class="ea-developer-integration__actions">
          <button class="ea-button ea-button--primary" type="submit" ?disabled=${props.busy}>
            Lưu thay đổi
          </button>
          <button
            class="ea-button"
            type="button"
            ?disabled=${props.busy || !integration.webhookUrl}
            @click=${() => props.onTest(integration)}
          >
            Thử webhook
          </button>
        </div>
      </form>
      <div class="ea-developer-integration__usage">
        ${integration.requestCount} lượt gọi · ${integration.errorCount} lỗi ·
        ${integration.runningCount} đang chạy
        <span>Dùng gần nhất: ${formatDate(integration.lastUsedAt)}</span>
        <span
          >Webhook: ${integration.lastWebhookStatus ?? "Chưa có callback"} ·
          ${formatDate(integration.lastWebhookAt)}</span
        >
      </div>
      <details class="ea-developer-management">
        <summary>Quản lý API key và trạng thái</summary>
        <div class="ea-developer-management__actions">
          <button
            class="ea-button"
            type="button"
            ?disabled=${props.busy || integration.status === "revoked"}
            @click=${() => props.onRotate(integration)}
          >
            Tạo API key mới
          </button>
          ${integration.previousKeyExpiresAt && integration.previousKeyExpiresAt > Date.now()
            ? html`<button
                class="ea-button ea-button--danger"
                type="button"
                ?disabled=${props.busy}
                @click=${() => props.onRevokePreviousKey(integration)}
              >
                Thu hồi key cũ
              </button>`
            : nothing}
          ${integration.status === "active"
            ? html`<button
                class="ea-button"
                type="button"
                ?disabled=${props.busy}
                @click=${() => props.onStatus(integration, "disabled")}
              >
                Tạm tắt kết nối
              </button>`
            : integration.status === "disabled"
              ? html`<button
                  class="ea-button"
                  type="button"
                  ?disabled=${props.busy}
                  @click=${() => props.onStatus(integration, "active")}
                >
                  Kích hoạt lại
                </button>`
              : nothing}
          ${integration.status !== "revoked"
            ? html`<button
                class="ea-button ea-button--danger"
                type="button"
                ?disabled=${props.busy}
                @click=${() => props.onStatus(integration, "revoked")}
              >
                Thu hồi kết nối
              </button>`
            : nothing}
        </div>
      </details>
    </article>
  `;
}

export function renderAgentDeveloperPanel(props: Props) {
  return html`
    <div class="ea-developer-intro">
      <h2>Kết nối Agent với ứng dụng</h2>
      <p>Tạo kết nối, lưu API key vào backend của bạn, rồi gọi Agent và theo dõi kết quả.</p>
      <div class="ea-developer-flow" aria-label="Luồng kết nối">
        <span>Ứng dụng của bạn</span><span aria-hidden="true">→</span> <span>Backend của bạn</span
        ><span aria-hidden="true">→</span>
        <span>OpenClaw Agent</span>
      </div>
    </div>
    ${props.error ? html`<p class="ea-error" role="alert">${props.error}</p>` : nothing}
    ${props.notice ? html`<div class="ea-banner" role="status">${props.notice}</div>` : nothing}
    ${props.reveal
      ? html`
          <section class="ea-banner ea-developer-reveal" role="status">
            <strong
              >Lưu thông tin kết nối ngay. API key và webhook secret chỉ hiển thị một lần.</strong
            >
            <div class="ea-code">API key: ${props.reveal.apiKey}</div>
            ${props.reveal.webhookSecret
              ? html`<div class="ea-code">Webhook secret: ${props.reveal.webhookSecret}</div>`
              : nothing}
            <div class="ea-developer-reveal__actions">
              <button
                class="ea-button"
                type="button"
                @click=${() => props.onCopy(props.reveal!.apiKey)}
              >
                Sao chép API key
              </button>
              ${props.reveal.webhookSecret
                ? html`<button
                    class="ea-button"
                    type="button"
                    @click=${() => props.onCopy(props.reveal!.webhookSecret!)}
                  >
                    Sao chép webhook secret
                  </button>`
                : nothing}
              <button
                class="ea-button ea-button--primary"
                type="button"
                @click=${props.onDismissReveal}
              >
                Tôi đã lưu
              </button>
            </div>
          </section>
        `
      : nothing}
    <section class="ea-card ea-panel-editor ea-developer-section">
      <div class="ea-developer-heading">
        <span class="ea-developer-step">1</span>
        <div>
          <h3>Tạo kết nối cho môi trường của bạn</h3>
          <p>Mỗi kết nối có API key riêng. Webhook chỉ cần khi bạn muốn nhận kết quả xử lý nền.</p>
        </div>
      </div>
      <form class="ea-form-grid" @submit=${props.onCreate}>
        <label class="ea-field"
          ><span>Tên kết nối</span
          ><input
            class="ea-input"
            name="name"
            required
            maxlength="128"
            placeholder="CSKH Production"
        /></label>
        <label class="ea-field"
          ><span>Webhook URL (không bắt buộc)</span
          ><input
            class="ea-input"
            name="webhookUrl"
            type="url"
            placeholder="https://cskh.example.com/webhooks/openclaw"
        /></label>
        <label class="ea-field"
          ><span>Cho phép tải lên</span
          ><select class="ea-select" name="uploadPolicy">
            <option value="disabled">Tắt</option>
            <option value="images">Chỉ ảnh</option>
            <option value="images_and_documents">Ảnh + tài liệu</option>
          </select></label
        >
        <label class="ea-field"
          ><span>Dung lượng tối đa/request (MB)</span
          ><input class="ea-input" name="maxUploadMb" type="number" min="1" max="20" value="10"
        /></label>
        <div class="ea-developer-create-action ea-form-grid__full">
          <button class="ea-button ea-button--primary" type="submit" ?disabled=${props.busy}>
            Tạo kết nối và lấy API key
          </button>
        </div>
      </form>
      <div class="ea-developer-list">
        <h4>Kết nối đã tạo (${props.panel.integrations.length})</h4>
        ${props.panel.integrations.length
          ? props.panel.integrations.map((item) => renderIntegrationCard(item, props))
          : html`<p class="ea-developer-empty">
              Chưa có kết nối nào. Tạo kết nối để nhận API key đầu tiên.
            </p>`}
      </div>
    </section>
    ${renderQuickStart(props.panel, props.origin, props.onCopy)}
    <section class="ea-card ea-panel-editor ea-developer-section">
      <div class="ea-developer-heading">
        <span class="ea-developer-step">3</span>
        <div>
          <h3>Theo dõi các lượt gọi</h3>
          <p>Xem trạng thái và nội dung trả lời trong ${props.panel.retentionDays} ngày.</p>
        </div>
      </div>
      <form class="ea-form-grid" @submit=${props.onFilter}>
        <label class="ea-field"
          ><span>Kết nối</span
          ><select class="ea-select" name="integrationId">
            <option value="">Tất cả</option>
            ${props.panel.integrations.map(
              (item) => html`<option value=${item.id}>${item.name}</option>`,
            )}
          </select></label
        >
        <label class="ea-field"
          ><span>ID cuộc hội thoại</span><input class="ea-input" name="externalConversationId"
        /></label>
        <label class="ea-field"
          ><span>ID người dùng bên ngoài</span><input class="ea-input" name="externalUserId"
        /></label>
        <label class="ea-field"
          ><span>Trạng thái</span
          ><select class="ea-select" name="status">
            <option value="">Tất cả</option>
            <option value="queued">Đang chờ</option>
            <option value="in_progress">Đang xử lý</option>
            <option value="completed">Hoàn thành</option>
            <option value="failed">Thất bại</option>
            <option value="incomplete">Chưa hoàn tất</option>
          </select></label
        >
        <label class="ea-field"
          ><span>Từ ngày</span><input class="ea-input" name="after" type="date"
        /></label>
        <label class="ea-field"
          ><span>Đến ngày</span><input class="ea-input" name="before" type="date"
        /></label>
        <div class="ea-developer-create-action ea-form-grid__full">
          <button class="ea-button" type="submit">Áp dụng bộ lọc</button>
        </div>
      </form>
      <div class="ea-card ea-table-wrap ea-developer-responses">
        <table class="ea-table" style="min-width: 980px">
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>Cuộc hội thoại / người dùng</th>
              <th>Kết nối</th>
              <th>Trạng thái</th>
              <th>Nội dung trả lời</th>
            </tr>
          </thead>
          <tbody>
            ${props.panel.responses.map(
              (response) =>
                html`<tr>
                  <td>${formatDate(response.createdAt)}</td>
                  <td>
                    <code>${response.externalConversationId}</code><br /><span class="muted"
                      >${response.externalUserId ?? "—"}</span
                    >
                  </td>
                  <td>
                    ${props.panel.integrations.find((item) => item.id === response.integrationId)
                      ?.name ?? response.integrationId}
                  </td>
                  <td>
                    ${responseStatusLabels[response.status]} ·
                    ${response.background ? "xử lý nền" : "trực tiếp"}
                  </td>
                  <td>
                    ${outputText(response).slice(0, 120)}<br />
                    <button
                      class="ea-button"
                      type="button"
                      @click=${() => props.onOpenResponse(response)}
                    >
                      Xem đầy đủ
                    </button>
                  </td>
                </tr>`,
            )}
          </tbody>
        </table>
      </div>
      ${props.panel.responses.length
        ? nothing
        : html`<p class="ea-developer-empty">Chưa có lượt gọi nào khớp bộ lọc.</p>`}
      ${props.panel.pageInfo.hasMore
        ? html`<div class="ea-form-actions">
            <button
              class="ea-button"
              type="button"
              ?disabled=${props.busy}
              @click=${props.onLoadMore}
            >
              Tải thêm
            </button>
          </div>`
        : nothing}
      ${props.responseDetail
        ? html`<div class="ea-card ea-developer-response-detail">
            <h4>${props.responseDetail.response.id}</h4>
            <p>
              ${props.responseDetail.transcript.totalMessages} tin nhắn · gồm lượt gọi công cụ và
              kết quả.
            </p>
            <pre class="ea-code" style="white-space: pre-wrap">
${JSON.stringify(props.responseDetail, null, 2)}</pre>
          </div>`
        : nothing}
    </section>
  `;
}
