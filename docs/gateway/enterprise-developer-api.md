---
summary: "Connect a backend application to one Enterprise shared Agent with scoped API keys, SSE, and signed webhooks"
read_when:
  - Building a CSKH chat box backed by a shared Agent
  - Operating Enterprise Developer integrations and webhooks
title: "Enterprise Developer API"
---

# Enterprise Developer API

The Developer API exposes a restricted subset of the Responses API for one shared Agent. Create an Integration from **Enterprise Admin → Agents → shared Agent → Developer**. Personal Agents do not expose this tab.

Keep `ocdev_...` keys in the external application's backend. A browser must call that backend, never OpenClaw directly:

```text
Browser -> CSKH backend -> OpenClaw Developer API
Browser <- CSKH backend <- SSE or retrieved background result
```

Set `OPENCLAW_ENTERPRISE_SKILL_TOKEN_KEY` to a 32-byte base64 value. OpenClaw stores only the API-key SHA-256 hash and encrypts the webhook secret with AES-256-GCM. Generated keys and secrets are shown once.

## Endpoints

```text
POST /api/enterprise/developer/v1/responses
GET  /api/enterprise/developer/v1/responses/{response_id}
```

Authenticate with `Authorization: Bearer ocdev_...`. The request `model` must equal the Agent ID bound to that Integration.

### Direct SSE

```bash
curl -N https://openclaw.example.com/api/enterprise/developer/v1/responses \
  -H "Authorization: Bearer $OPENCLAW_DEVELOPER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "tesst",
    "input": "Khách hàng hỏi tình trạng đơn hàng #DH8421",
    "stream": true,
    "metadata": {
      "external_conversation_id": "ticket-8421",
      "external_user_id": "customer-19"
    }
  }'
```

SSE uses the same events as [`/v1/responses`](./openai-http-api.md), including `response.output_text.delta`, terminal response events, and `[DONE]`. If the browser disconnects from the CSKH backend, the backend should abort its upstream fetch so OpenClaw closes the agent run.

Continue a conversation by sending `previous_response_id` with the same `external_conversation_id`. Cross-Integration, cross-Agent, cross-conversation, and expired IDs return `404`.

### Background work

```bash
curl https://openclaw.example.com/api/enterprise/developer/v1/responses \
  -H "Authorization: Bearer $OPENCLAW_DEVELOPER_API_KEY" \
  -H "Idempotency-Key: ticket-8421-message-7" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "tesst",
    "input": "Tổng hợp toàn bộ lịch sử khiếu nại",
    "background": true,
    "stream": false,
    "metadata": { "external_conversation_id": "ticket-8421" }
  }'
```

OpenClaw returns `202` with a durable `resp_...` ID. Repeating the same `Idempotency-Key` returns the existing response instead of running the Agent twice. Retrieve the result with `GET /responses/{response_id}`. Queued background requests are reclaimed after a Gateway restart.

## Request boundary

Supported fields are `model`, user `input`, `stream`, `background`, `previous_response_id`, string `metadata`, and `max_output_tokens`. `metadata.external_conversation_id` is required and limited to 512 characters.

The API rejects `instructions`, system/developer/assistant roles, client-defined tools, `tool_choice`, session keys, model-provider overrides, and channel overrides. The caller is always a non-owner: owner-only tools remain unavailable while non-owner tools and the shared Agent's configured Skills still work.

Only base64 attachments are accepted. Each Integration selects disabled, images, or images plus supported documents. OpenClaw detects MIME from bytes and applies a 1–20 MB decoded request limit. Client URLs, executables, archives, Office files, and unknown binary formats are rejected.

Default limits per Integration are 60 requests/minute with burst 20, 10 foreground responses, and 5 background responses. Concurrent work for one external conversation returns `409 conversation_busy` with `Retry-After`.

## Webhooks

Background terminal events contain only the response ID:

```json
{
  "id": "evt_01xyz",
  "object": "event",
  "created_at": 1789344000,
  "type": "response.completed",
  "data": { "id": "resp_01abc" }
}
```

Possible terminal types are `response.completed`, `response.failed`, and `response.incomplete`. Verify the raw body before parsing JSON:

```js
const signed = `${webhookTimestamp}.${webhookId}.${rawBody}`;
const expected = crypto.createHmac("sha256", webhookSecret).update(signed).digest("hex");
const received = webhookSignature.replace(/^v1=/, "");
if (!crypto.timingSafeEqual(Buffer.from(received, "hex"), Buffer.from(expected, "hex"))) {
  throw new Error("invalid webhook signature");
}
```

Use headers `webhook-id`, `webhook-timestamp`, and `webhook-signature`. Store processed event IDs because the ID is stable across retries. OpenClaw retries network failures, `429`, and `5xx` immediately, then after 5 seconds, 30 seconds, 2 minutes, 10 minutes, and 30 minutes. Other `4xx` responses stop retries.

Webhook targets must be public HTTPS endpoints. Creation validates DNS; delivery pins DNS again, blocks private/link-local/metadata addresses, and rejects redirects.

## Retention and rotation

Responses, transcript access, and attachment data expire after 90 days. API-key rotation keeps the old key valid for at most 24 hours; use `overlapHours: 0` for immediate rotation, or click **Thu hồi key cũ** after the external backend has switched. Revoking an Integration invalidates both keys immediately.
