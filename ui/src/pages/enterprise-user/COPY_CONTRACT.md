# Enterprise User composition contract

- Baseline commit: `61bc753da306a49243525b99e3d70e12ef1e5c25`
- Source hashes at the baseline commit:
  - `ui/src/app/app-host.ts`: `1de2e0b28c4e98a9a092e93a4b01548bfaf709caade48c42a42935b691e80e21`
  - `ui/src/app/app-shell-view.ts`: `287844056b32246d81332beeedf74f22aa1c3039cdfccfe204c9cd16b822ff92`
  - `ui/src/app-routes.ts`: `82afb79fcf362ed5dc6c876adb4e66979223da53988529d5ec1ea9743681cb83`
  - `ui/src/app/bootstrap.ts`: `c8a120ca1cb691035a6ffe8cedea1bb112a106bd5e0ad08420fe735a254e4c63`
- Forked markup: shell grid, desktop navigation column, mobile navigation drawer, top bar,
  account-menu placement, router outlet, page header composition, and settings-page composition.
- Forked logic: only the positive user route manifest, user navigation presentation, and
  AgentKey-to-conversation adapter.
- Shared imports: `ApplicationRuntime`, Gateway capabilities, Chat route, session stores,
  theme/preferences, router outlet, icons, buttons, forms, settings helpers, modal, and tooltip
  primitives. The User shell is deliberately minimal and does not inherit `OpenClawShell`.
- Deliberately excluded: Control navigation registry, Settings operator sidebar, Terminal,
  Browser/Desktop panels, Debug, Logs, Config, Devices, plugin installation, and Custodian.
- Shared logic remains imported from the canonical sources: runtime/context, Gateway lifecycle,
  theme and preferences, Chat page/controller, session stores and ownership projection, icons,
  form controls, settings helpers, dialogs, tooltips, and session URL generation.
- Agent and recent-conversation navigation must call the canonical `selectApplicationSession`
  transition before navigating. This preserves the Control UI ordering of selected Agent,
  Gateway session key, and route observers; User UI code must not recreate that ordering.
- Shell/sidebar/topbar presentation wrappers use `OpenClawLightDomContentsElement`, matching the
  canonical shell, so custom-element hosts never become an extra flex/grid sizing boundary.

When the upstream shell changes, review:

1. Focus handling and focus return after drawer/modal close.
2. Mobile drawer semantics and touch targets.
3. Router outlet ownership and lazy route boundaries.
4. Session path generation and deep-link compatibility.
5. Theme events, text scale, reduced motion, and forced-colors behavior.
6. Computed styles for shared primitives; accepted difference is zero.
7. New operator chrome; it must remain excluded from the User presentation profile.

Never merge shell markup blindly. Update the baseline commit and hashes only after this checklist
passes for Control UI, `/admin`, and `/app`.
