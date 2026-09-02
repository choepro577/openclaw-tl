---
summary: "Enterprise User Plugin and Skill installation boundaries, approval flow, and operations"
read_when:
  - Enabling the Enterprise User Plugins page
  - Reviewing a native plugin request from an Enterprise account
  - Troubleshooting a modified Skill or suspended account plugin grant
title: "Enterprise User Plugins"
---

# Enterprise User Plugins

Enterprise User Plugins is opt-in. Enable it only after the additive Enterprise schema is present and the Gateway has passed a smoke test:

```json5
{
  enterprise: {
    userExtensions: { enabled: true },
  },
}
```

When disabled, the User sidebar omits **Plugins** and the User/Admin extension APIs return `USER_EXTENSIONS_DISABLED`.

## Security model

User-installed ClawHub Skills belong to one account and one selected Agent. Their managed root is derived by the server and has the form:

```text
enterprise/accounts/<profileId>/agents/<agentId>/workspace/skills/<slug>
```

The public User API accepts only an `AgentKey` (`personal` or `shared:<resourceKey>`). It does not accept or return account IDs, runtime Agent IDs, absolute paths, relative managed paths, tree hashes, installer output, registry overrides, uploads, `force`, or risk acknowledgements.

Only an exact ClawHub release with a clean current trust result and matching integrity can be installed. The installer stages and validates the artifact before committing it. It rejects identity mismatches, collisions, traversal, symlinks, hardlinks, oversized trees, native payloads, and untracked updates. Missing existing dependencies leave the Skill in `needs_setup`; the extension flow never installs binaries or injects config, environment variables, or secrets.

Managed Skill trees are hidden from the Enterprise User File API and mounted read-only by the sandbox's protected Skill mounts. OpenClaw verifies ClawHub provenance and the full tree hash before projecting a Skill into a request-scoped runtime config. A mismatch disables the installation and records only `SKILL_TAMPERED` with state `modified`.

Native `code-plugin` and `bundle-plugin` packages are never installed into an account workspace. They always create an Admin request. Native plugins remain global Gateway processes; their hooks, routes, services, providers, and secrets are not account-isolated.

## Admin approval

Open **Enterprise Admin > Plugins > Yêu cầu từ User**. Before approval, review the requesting account, exact version and integrity, trust snapshot, capability digest, active-registry tool ownership, current global installation, and Gateway-wide impact.

Approval re-downloads and revalidates the exact release. If the release is not installed, it uses the normal Gateway `plugins.install` lifecycle. If the same verified release is already installed, installation is skipped. A different global version returns `GLOBAL_VERSION_CONFLICT`; use the normal Operator plugin upgrade workflow instead.

The account grant becomes `active` only after the Gateway reports the plugin as loaded and confirms tool ownership. If a restart is required, the request remains `approving`; after restart, the post-ready reconciliation pass verifies the installed release and active-registry ownership before activating the grant. Rejection requires a reason.

The grant stores a fixed tool snapshot. New tools are not granted automatically. Non-delegable tools plus global, Agent, and account denies still win. A version or integrity change suspends the grant until a new Admin review. Disabling or removing the global plugin makes the grant unavailable or orphaned; it never creates a per-user plugin process.

## Operations

- Users update Skills manually; there is no auto-update.
- Users can disable or remove only their account-Agent Skill installation.
- Users can cancel a pending native request and relinquish their own active plugin grant.
- Admins can revoke a grant without disabling or uninstalling the global plugin.
- Mutations require the correct cookie audience, password state, same origin, CSRF token, idempotency key, and CAS revision.
- Audit and persistence store safe codes and relative paths only. Do not copy secrets or raw installer output into request decisions.

For rollout, keep the feature disabled while applying the additive schema. Test with two accounts and one Shared Agent, then enable the flag and verify account isolation, Skill persistence after reload, native approval after any required restart, deny precedence, revoke behavior, and audit/reconciliation events.
