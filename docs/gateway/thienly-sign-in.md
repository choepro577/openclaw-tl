---
summary: "Configure Thiên Lý sign-in and Personal Agent provisioning for MAAP"
read_when:
  - Enabling Thiên Lý sign-in for Enterprise users
  - Connecting a MAAP gateway to the Thiên Lý API
title: "Thiên Lý sign-in"
---

This page describes the operator setup for the optional Thiên Lý sign-in flow
in the Enterprise User Portal. A user starts at the MAAP login page, approves
the connection in the Thiên Lý web app, and returns to MAAP. MAAP then creates
or resumes the user's private Personal Agent.

The integration is disabled unless all three services are configured:

- MAAP Gateway with `enterprise.enabled` and `enterprise.thienly.enabled`.
- Thiên Lý API with the MAAP client settings and the additive authorization-code
  table migration.
- Thiên Lý web admin V2 with the `/integrations/maap/connect` route.

## Connection contract

The browser follows this sequence:

1. MAAP `POST /api/auth/user/thienly/start` creates a ten-minute attempt and
   opens the Thiên Lý URL `/integrations/maap/connect` with `state` and an
   S256 PKCE challenge.
2. Thiên Lý V2 calls `GET /api/maap/connect/context`. With no Thiên Lý session,
   it shows the sign-in prompt. With a session, it shows the employee name,
   staff code, and company before showing the allow and deny actions.
3. The allow action calls `POST /api/maap/connect/authorize`. The API returns a
   short-lived, one-use authorization code and redirects the popup to the MAAP
   callback.
4. MAAP exchanges the code server to server with
   `POST /api/maap/connect/exchange`, checks the returned employee identity,
   provisions the account and Personal Agent, then sets the MAAP session cookie.
5. The MAAP login page reads the persisted attempt through SSE or polling. It
   shows the completed state for three seconds, then opens the Enterprise home
   page.

The callback for the local MAAP instance is exactly:

```text
http://127.0.0.1:18789/api/auth/user/thienly/callback
```

The V2 confirmation page is:

```text
http://127.0.0.1:5174/integrations/maap/connect
```

Use the deployed V2 origin in `webBaseUrl` when the local development server
is not used.

## Configure the MAAP Gateway

Add the following block to the gateway's `openclaw.json`. This is a partial
snippet; merge it with the existing configuration instead of replacing the
file.

```json5 validate=false
{
  enterprise: {
    enabled: true,
    userPortal: { version: "v2" },
    thienly: {
      enabled: true,
      webBaseUrl: "http://127.0.0.1:5174",
      apiBaseUrl: "http://127.0.0.1:8000/api",
      callbackUrl: "http://127.0.0.1:18789/api/auth/user/thienly/callback",
      clientId: "maap-local",
      clientSecretEnv: "MAAP_THIENLY_CLIENT_SECRET",
    },
  },
}
```

Set `apiBaseUrl` to the origin and `/api` prefix served by the Thiên Lý API.
The exchange client appends `/maap/connect/exchange`; do not append that route
again in `apiBaseUrl`. `webBaseUrl` is the V2 origin and must not include the
`/integrations/maap/connect` path.

`clientId` must match the API's `MAAP_CLIENT_ID`. The callback must also be in
the API's `MAAP_ALLOWED_REDIRECT_URIS` allowlist. The gateway validates that
the callback ends with `/api/auth/user/thienly/callback` and rejects credentials
embedded in any configured URL.

Use the callback URL in the allowlist, not the visible login page URL. The
login page is `/app/login`; the OAuth-style `redirect_uri` sent by MAAP is the
callback endpoint shown above. Using `/app/login` as the callback causes authorization to fail before the
employee consent screen can finish.

## Configure the shared secret

The secret has two server-side names and one shared value. Set it in the
process environment of each backend:

```bash
# MAAP Gateway process environment
export MAAP_THIENLY_CLIENT_SECRET="<shared-secret>"

# Thiên Lý API process environment
export MAAP_CLIENT_ID="maap-local"
export MAAP_CLIENT_SECRET="<same-shared-secret>"
export MAAP_ALLOWED_REDIRECT_URIS="http://127.0.0.1:18789/api/auth/user/thienly/callback"
export MAAP_AUTHORIZATION_CODE_TTL_SECONDS="60"
```

Replace `<shared-secret>` with the same randomly generated value in both
server environments. Do not put the value in `openclaw.json`, a `VITE_*`
variable, a browser bundle, a URL, an SSE event, or a log. For a managed
service, configure the variables in that service's environment and restart the
process so the gateway and Laravel configuration cache both read the new
values.

## Account and identity behavior

The API returns the minimum verified identity needed by MAAP:

```json
{
  "subject": "comnieu:<company_id>:<user_id>",
  "company_id": 1,
  "user_id": 42,
  "staff_code": "TL001",
  "display_name": "Nguyen Van An"
}
```

For `staff_code` `TL001`, MAAP uses `tl001` as the Enterprise username. New
accounts are created as employees with `basic@1`, Personal Agent enabled, and
no shared-agent or initial skill grants. The account has no default password;
the Thiên Lý authorization flow is its sign-in method.

If the username already exists without a Thiên Lý binding, MAAP asks for the
existing MAAP password before linking. A wrong password leaves the account
unlinked. A correct password links the verified Thiên Lý subject and keeps the
account's existing rights, chat history, workspace, and Personal Agent. A
subject already bound to a different account, a changed staff code, a disabled
account, an ineligible employee, or a missing or invalid staff code stops the
flow without creating another account.

The error for a missing staff code is:

```text
Xác thực không thành công: tài khoản Thiên Lý chưa có mã nhân viên.
```

The staff code is the only username source. MAAP does not fall back to a phone
number, email address, employee name, or database ID.

## Database and deployment order

Apply the API migration
`2026_09_07_000001_create_maap_authorization_codes_table.php` to a test
database or a copy of the target data first. It creates the additive
`maap_authorization_codes` table used for hashed, one-use authorization codes.
Keep the migration backup and its command output as deployment evidence.

The MAAP state database creates the additive Thiên Lý attempt and binding
tables when the feature first initializes:

- `enterprise_thienly_attempts` stores attempt phases, ordered progress,
  browser ownership, expiry, and hashed state data.
- `enterprise_thienly_bindings` stores the stable Thiên Lý subject to MAAP
  account mapping.

Back up or copy the MAAP state database before enabling the feature in a
non-development environment. Do not run a migration or first-use initialization
against a live operator database until the copy has been inspected and the
rollback artifact has been retained.

Deploy in this order:

1. Apply and verify the additive API migration on the test or copied database.
2. Deploy the API with `MAAP_CLIENT_ID`, `MAAP_CLIENT_SECRET`, the callback
   allowlist, and the 60-second authorization-code TTL.
3. Deploy the V2 bundle and verify that the route is reachable at
   `/integrations/maap/connect`.
4. Deploy the MAAP bundle and set the `enterprise.thienly` block plus
   `MAAP_THIENLY_CLIENT_SECRET`.
5. Enable the feature only after the API, V2, callback, and server-side secret
   values agree.

Keep the existing username and password login available while the integration
is being staged. The optional Thiên Lý button remains hidden when the gateway
cannot resolve its configuration or has no Enterprise administrator.

## Security and lifecycle limits

The authorization request expires after ten minutes. The authorization code
expires after sixty seconds and can be exchanged only once. MAAP binds an
attempt to its browser cookie and PKCE verifier, checks the exact callback
origin for pre-auth mutations, and keeps the client secret in backend memory
only.

SSE events contain only public attempt progress, account display information,
and safe error messages. The callback popup sends a completion signal without
credentials; MAAP remains the source of truth for authentication. Reloading
the MAAP login page can resume an unfinished attempt through its stored attempt
ID and status endpoint.

This integration does not synchronize logout or revoke an already issued MAAP
session when a Thiên Lý session changes. Use the normal MAAP session expiry and
logout controls until a separate revocation contract is added.

## Manual acceptance checklist

Run these checks manually after the staged deployment. The checks below are
intentionally left for the operator; this page does not claim Chrome or
Computer Use verification.

1. Open `http://127.0.0.1:18789/app/login` and confirm the Thiên Lý button is
   visible only when the integration is enabled.
2. Start a connection and confirm the V2 page opens at
   `/integrations/maap/connect` with the request parameters intact.
3. With no Thiên Lý session, confirm V2 shows the sign-in-required screen,
   returns to the connection screen after sign-in, and displays the employee
   name, staff code, and company.
4. Choose deny and confirm MAAP shows a cancelled attempt without creating an
   account. Start again, choose allow, and confirm the MAAP progress moves
   through verification, account, agent, ready, and completed.
5. For a new employee with code `TL001`, confirm the MAAP username is `tl001`,
   the role is employee, the access preset is `basic@1`, one Personal Agent is
   ready, and no shared agent or initial skill was granted.
6. Repeat with an existing unlinked MAAP account: wrong password must not link;
   the correct password must link it while preserving its previous rights,
   workspace, and chat history.
7. Repeat with no staff code, an invalid code, a disabled account, an ineligible
   employee, an expired request, an expired code, and a second code exchange.
   Each case must show a visible error and must not create a duplicate account.
8. Confirm the success message remains visible for three seconds after the
   MAAP session cookie is set, then the browser reaches the Enterprise home
   page with the Personal Agent selected.
