import { i as t, o as n } from "./control-ui-boot-BkPDmfcr.js";
import { n as e } from "./rolldown-runtime-DkW27tQK.js";
function r(e) {
  let t = e.avatar?.trim();
  return (t && a[t]) ?? t ?? e.name.charAt(0).toUpperCase();
}
function i(e) {
  let n = e.access?.request?.state;
  if (n === `pending`) return t(`agentAccessPending`);
  if (n === `rejected`) return t(`agentAccessRejected`);
  if (n === `cancelled`) return t(`agentAccessCancelled`);
  let r = e.access?.reason,
    i = r ? o[r] : void 0;
  return i ? t(i) : r || t(`agentAccessUnavailable`);
}
var a, o;
function s() {
  return (s = e(() => {
    (n(),
      (a = { sparkles: `✨`, briefcase: `💼`, "message-circle": `💬`, bot: `🤖`, user: `👤` }),
      (o = {
        not_granted: `agentAccessNotGranted`,
        explicit_deny: `agentAccessDenied`,
        account_disabled: `agentAccessAccountDisabled`,
        personal_agent_disabled: `agentAccessPersonalDisabled`,
        personal_agent_owner_mismatch: `agentAccessOwnerMismatch`,
        employee_tool_hard_deny: `agentAccessDenied`,
      }));
  }))();
}
export { i as n, r, s as t };
//# sourceMappingURL=user-agent-presenter-DM90PmU-.js.map
