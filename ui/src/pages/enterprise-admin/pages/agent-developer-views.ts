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

function uploadPolicyLabel(value: EnterpriseDeveloperIntegration["uploadPolicy"]): string {
  return value === "images"
    ? "Chỉ ảnh"
    : value === "images_and_documents"
      ? "Ảnh + tài liệu hỗ trợ"
      : "Tắt";
}

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
  -d '${JSON.stringify({ model: panel.agentId, input: "Xin chào", stream: true, background: false, metadata: { external_conversation_id: "ticket-8421", external_user_id: "customer-19" } })}'`;
  const nodeSse = `const response = await fetch("${baseUrl}/responses", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.OPENCLAW_DEVELOPER_API_KEY}\`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "${panel.agentId}", input: "Xin chào", stream: true,
    metadata: { external_conversation_id: "ticket-8421" }
  })
});
for await (const chunk of response.body) process.stdout.write(Buffer.from(chunk));`;
  const phpSse = `$ch = curl_init('${baseUrl}/responses');
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_HTTPHEADER => [
    'Authorization: Bearer '.getenv('OPENCLAW_DEVELOPER_API_KEY'),
    'Content-Type: application/json'
  ],
  CURLOPT_POSTFIELDS => json_encode([
    'model' => '${panel.agentId}', 'input' => 'Xin chào', 'stream' => true,
    'metadata' => ['external_conversation_id' => 'ticket-8421']
  ]),
  CURLOPT_WRITEFUNCTION => function ($ch, $chunk) { echo $chunk; flush(); return strlen($chunk); }
]);
curl_exec($ch);`;
  const curlBackground = `curl ${baseUrl}/responses \\
  -H "Authorization: Bearer $OPENCLAW_DEVELOPER_API_KEY" \\
  -H "Idempotency-Key: ticket-8421-message-7" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify({ model: panel.agentId, input: "Tổng hợp lịch sử khiếu nại", background: true, stream: false, metadata: { external_conversation_id: "ticket-8421" } })}'`;
  const nodeBackground = `const response = await fetch("${baseUrl}/responses", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.OPENCLAW_DEVELOPER_API_KEY}\`,
    "Content-Type": "application/json",
    "Idempotency-Key": "ticket-8421-message-7"
  },
  body: JSON.stringify({
    model: "${panel.agentId}",
    input: "Tổng hợp lịch sử khiếu nại",
    background: true,
    metadata: { external_conversation_id: "ticket-8421" }
  })
});
console.log(await response.json());`;
  const phpBackground = `$ch = curl_init('${baseUrl}/responses');
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => [
    'Authorization: Bearer '.getenv('OPENCLAW_DEVELOPER_API_KEY'),
    'Content-Type: application/json',
    'Idempotency-Key: ticket-8421-message-7'
  ],
  CURLOPT_POSTFIELDS => json_encode([
    'model' => '${panel.agentId}', 'input' => 'Tổng hợp lịch sử khiếu nại',
    'background' => true,
    'metadata' => ['external_conversation_id' => 'ticket-8421']
  ])
]);
echo curl_exec($ch);`;
  const verify = `const signed = \`${"${timestamp}.${eventId}.${rawBody}"}\`;
const expected = crypto.createHmac("sha256", webhookSecret).update(signed).digest("hex");
if (!crypto.timingSafeEqual(Buffer.from(signature.slice(3), "hex"), Buffer.from(expected, "hex"))) throw new Error("invalid signature");`;
  return html`
    <section class="ea-card ea-panel-editor">
      <div class="ea-section-heading">
        <div>
          <h3>Hướng dẫn nhanh</h3>
          <p>Browser → Backend CSKH → OpenClaw → Backend CSKH → Browser</p>
        </div>
      </div>
      <div class="ea-form-grid">
        <label class="ea-field"
          ><span>Base URL</span>
          <div class="ea-code">${baseUrl}</div></label
        >
        <label class="ea-field"
          ><span>Agent ID / model</span>
          <div class="ea-code">${panel.agentId}</div></label
        >
      </div>
      <div class="ea-banner ea-banner--warning" role="note">
        Không đặt API key trong JavaScript của trình duyệt. Trình duyệt chỉ gọi backend CSKH;
        backend mới giữ key và gọi OpenClaw.
      </div>
      ${[
        ["cURL — SSE", curlSse],
        ["Node.js — SSE", nodeSse],
        ["PHP — SSE", phpSse],
        ["cURL — background", curlBackground],
        ["Node.js — background", nodeBackground],
        ["PHP — background", phpBackground],
        ["Node.js — xác thực webhook", verify],
      ].map(
        ([title, code]) => html`
          <details class="ea-card" style="margin-top: 10px">
            <summary>${title}</summary>
            <pre class="ea-code" style="white-space: pre-wrap">${code}</pre>
            <button class="ea-button" type="button" @click=${() => onCopy(code!)}>Sao chép</button>
          </details>
        `,
      )}
    </section>
  `;
}

function renderIntegrationRow(integration: EnterpriseDeveloperIntegration, props: Props) {
  return html`
    <tr>
      <td>
        <form
          id=${`integration-${integration.id}`}
          @submit=${(event: SubmitEvent) => props.onSave(integration, event)}
        >
          <input class="ea-input" name="name" .value=${integration.name} maxlength="128" required />
          <div class="muted">ocdev_${integration.keyPrefix}_… · ${integration.status}</div>
        </form>
      </td>
      <td>
        <input
          class="ea-input"
          name="webhookUrl"
          form=${`integration-${integration.id}`}
          .value=${integration.webhookUrl ?? ""}
          placeholder="https://cskh.example.com/webhooks/openclaw"
        />
        <div class="muted">
          ${integration.lastWebhookStatus ?? "Chưa callback"} ·
          ${formatDate(integration.lastWebhookAt)}
        </div>
      </td>
      <td>
        <select
          class="ea-select"
          name="uploadPolicy"
          form=${`integration-${integration.id}`}
          .value=${integration.uploadPolicy}
        >
          <option value="disabled">Tắt</option>
          <option value="images">Chỉ ảnh</option>
          <option value="images_and_documents">Ảnh + tài liệu</option>
        </select>
        <input
          class="ea-input"
          name="maxUploadMb"
          form=${`integration-${integration.id}`}
          type="number"
          min="1"
          max="20"
          .value=${String(Math.round(integration.maxUploadBytes / 1024 / 1024))}
        />
        <div class="muted">${uploadPolicyLabel(integration.uploadPolicy)}</div>
      </td>
      <td>
        ${integration.requestCount} request · ${integration.errorCount} lỗi ·
        ${integration.runningCount} đang chạy<br />
        <span class="muted">Tạo: ${formatDate(integration.createdAt)}</span><br />
        <span class="muted">Dùng gần nhất: ${formatDate(integration.lastUsedAt)}</span>
      </td>
      <td class="ea-table__action">
        <button
          class="ea-button"
          form=${`integration-${integration.id}`}
          type="submit"
          ?disabled=${props.busy}
        >
          Lưu
        </button>
        <button
          class="ea-button"
          type="button"
          ?disabled=${props.busy || !integration.webhookUrl}
          @click=${() => props.onTest(integration)}
        >
          Test webhook
        </button>
        <button
          class="ea-button"
          type="button"
          ?disabled=${props.busy || integration.status === "revoked"}
          @click=${() => props.onRotate(integration)}
        >
          Rotate key
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
              @click=${() => props.onStatus(integration, "disabled")}
            >
              Vô hiệu hóa
            </button>`
          : integration.status === "disabled"
            ? html`<button
                class="ea-button"
                type="button"
                @click=${() => props.onStatus(integration, "active")}
              >
                Kích hoạt
              </button>`
            : nothing}
        ${integration.status !== "revoked"
          ? html`<button
              class="ea-button ea-button--danger"
              type="button"
              @click=${() => props.onStatus(integration, "revoked")}
            >
              Thu hồi
            </button>`
          : nothing}
      </td>
    </tr>
  `;
}

export function renderAgentDeveloperPanel(props: Props) {
  return html`
    ${props.error ? html`<p class="ea-error" role="alert">${props.error}</p>` : nothing}
    ${props.notice ? html`<div class="ea-banner" role="status">${props.notice}</div>` : nothing}
    ${props.reveal
      ? html`
          <section class="ea-banner" role="status">
            <strong
              >Secret chỉ hiển thị một lần — hãy lưu vào secret manager của backend CSKH.</strong
            >
            <div class="ea-code">API key: ${props.reveal.apiKey}</div>
            ${props.reveal.webhookSecret
              ? html`<div class="ea-code">Webhook secret: ${props.reveal.webhookSecret}</div>`
              : nothing}
            <button
              class="ea-button"
              type="button"
              @click=${() => props.onCopy(props.reveal!.apiKey)}
            >
              Sao chép API key
            </button>
            <button class="ea-button" type="button" @click=${props.onDismissReveal}>Đã lưu</button>
          </section>
        `
      : nothing}
    ${renderQuickStart(props.panel, props.origin, props.onCopy)}
    <section class="ea-card ea-panel-editor">
      <div class="ea-section-heading">
        <div>
          <h3>Integrations</h3>
          <p>Mỗi môi trường có key, webhook, upload policy và hạn mức độc lập.</p>
        </div>
      </div>
      <form class="ea-form-grid" @submit=${props.onCreate}>
        <label class="ea-field"
          ><span>Tên</span
          ><input
            class="ea-input"
            name="name"
            required
            maxlength="128"
            placeholder="CSKH Production"
        /></label>
        <label class="ea-field"
          ><span>Webhook URL</span
          ><input
            class="ea-input"
            name="webhookUrl"
            type="url"
            placeholder="https://cskh.example.com/webhooks/openclaw"
        /></label>
        <label class="ea-field"
          ><span>Upload</span
          ><select class="ea-select" name="uploadPolicy">
            <option value="disabled">Tắt</option>
            <option value="images">Chỉ ảnh</option>
            <option value="images_and_documents">Ảnh + tài liệu</option>
          </select></label
        >
        <label class="ea-field"
          ><span>Dung lượng/request (MB)</span
          ><input class="ea-input" name="maxUploadMb" type="number" min="1" max="20" value="10"
        /></label>
        <div class="ea-form-actions ea-form-grid__full">
          <button class="ea-button ea-button--primary" type="submit" ?disabled=${props.busy}>
            Tạo Integration
          </button>
        </div>
      </form>
      <div class="ea-card ea-table-wrap" style="margin-top: 14px">
        <table class="ea-table" style="min-width: 1100px">
          <thead>
            <tr>
              <th>Tên / key</th>
              <th>Webhook</th>
              <th>Upload</th>
              <th>Sử dụng</th>
              <th class="ea-table__action">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            ${props.panel.integrations.map((item) => renderIntegrationRow(item, props))}
          </tbody>
        </table>
      </div>
    </section>
    <section class="ea-card ea-panel-editor">
      <div class="ea-section-heading">
        <div>
          <h3>Transcript</h3>
          <p>Lưu ${props.panel.retentionDays} ngày; không hiển thị secret hoặc session key.</p>
        </div>
      </div>
      <form class="ea-form-grid" @submit=${props.onFilter}>
        <label class="ea-field"
          ><span>Integration</span
          ><select class="ea-select" name="integrationId">
            <option value="">Tất cả</option>
            ${props.panel.integrations.map(
              (item) => html`<option value=${item.id}>${item.name}</option>`,
            )}
          </select></label
        >
        <label class="ea-field"
          ><span>Conversation ID</span><input class="ea-input" name="externalConversationId"
        /></label>
        <label class="ea-field"
          ><span>External user ID</span><input class="ea-input" name="externalUserId"
        /></label>
        <label class="ea-field"
          ><span>Trạng thái</span
          ><select class="ea-select" name="status">
            <option value="">Tất cả</option>
            <option value="queued">queued</option>
            <option value="in_progress">in_progress</option>
            <option value="completed">completed</option>
            <option value="failed">failed</option>
            <option value="incomplete">incomplete</option>
          </select></label
        >
        <label class="ea-field"
          ><span>Từ ngày</span><input class="ea-input" name="after" type="date"
        /></label>
        <label class="ea-field"
          ><span>Đến ngày</span><input class="ea-input" name="before" type="date"
        /></label>
        <div class="ea-form-actions ea-form-grid__full">
          <button class="ea-button" type="submit">Lọc transcript</button>
        </div>
      </form>
      <div class="ea-card ea-table-wrap">
        <table class="ea-table" style="min-width: 980px">
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>Conversation / user</th>
              <th>Integration</th>
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
                  <td>${response.status}${response.background ? " · background" : " · direct"}</td>
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
        ? html`<div class="ea-card" style="margin-top: 14px">
            <h4>${props.responseDetail.response.id}</h4>
            <p>
              ${props.responseDetail.transcript.totalMessages} message · gồm tool call/result từ
              transcript runtime.
            </p>
            <pre class="ea-code" style="white-space: pre-wrap">
${JSON.stringify(props.responseDetail, null, 2)}</pre>
          </div>`
        : nothing}
    </section>
  `;
}
