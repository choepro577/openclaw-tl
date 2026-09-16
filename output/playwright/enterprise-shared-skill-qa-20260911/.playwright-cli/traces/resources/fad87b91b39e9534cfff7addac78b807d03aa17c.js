import { i as c, o as l } from "./control-ui-boot-BkPDmfcr.js";
import { P as u, q as d } from "./control-ui-boot-Bvc3ZZNG.js";
import { Ar as t, Ir as n, Mr as r, Wo as i, Xo as a } from "./control-ui-core-B5rJKETr.js";
import { D as o, E as s } from "./control-ui-core-BOclcphE.js";
import { n as e } from "./rolldown-runtime-DkW27tQK.js";
import { n as f, t as p } from "./user-agent-catalog-store-9TBczRt4.js";
async function m(e, t, n, r = {}) {
  h(e, (await d(t, n, r)).sessionKey, {
    agentKey: t,
    focusComposer: n === `new`,
    ...(r.draft?.trim() ? { draft: r.draft } : {}),
  });
}
function h(e, r, i = {}) {
  let s = a(r)?.agentId;
  if (!s) throw Error(c(`invalidConversation`));
  (i.agentKey ? f.bindRuntimeAgent(i.agentKey, s) : f.setActiveRuntime(s),
    o({ selection: e.agentSelection, gateway: e.gateway, sessionKey: r, agentId: s }));
  let l = n({
    context: e,
    face: `chat`,
    sessionKey: r,
    agentId: s,
    exactKey: !0,
    focusComposer: i.focusComposer,
    navigationKey: r,
  });
  if (i.draft?.trim()) {
    let n = new URLSearchParams(l.options.search ?? ``),
      r = new URLSearchParams(t(i.draft));
    for (let [e, t] of r) n.set(e, t);
    e.navigate(`chat`, { ...l.options, search: `?${n.toString()}` });
    return;
  }
  e.navigate(`chat`, l.options);
}
function g() {
  return (g = e(() => {
    (s(), l(), r(), i(), u(), p());
  }))();
}
export { h as n, m as r, g as t };
//# sourceMappingURL=chat-route-adapter-Di6rAvcG.js.map
