import { n as e } from "./rolldown-runtime-DkW27tQK.js";
import { n as t, t as n } from "./user-bootstrap-store-x-iL-PgP.js";
var r, i;
function a() {
  return (a = e(() => {
    (n(),
      (r = class {
        constructor() {
          ((this.activeKey = null),
            (this.runtimeAgentKeys = new Map()),
            (this.listeners = new Set()));
        }
        subscribe(e) {
          return (
            this.listeners.add(e),
            (this.unsubscribeBootstrap ??= t.subscribe(() => {
              let e = t.state;
              (e.phase === `ready` &&
                (e.data.agents.some((e) => e.key === this.activeKey && e.actions.canChat) ||
                  (this.activeKey = e.data.defaultAgentKey)),
                this.publish());
            })),
            () => {
              (this.listeners.delete(e),
                this.listeners.size === 0 &&
                  (this.unsubscribeBootstrap?.(), (this.unsubscribeBootstrap = void 0)));
            }
          );
        }
        get agents() {
          return t.state.phase === `ready` ? t.state.data.agents : [];
        }
        get activeAgent() {
          return this.agents.find((e) => e.key === this.activeKey && e.actions.canChat) ?? null;
        }
        setActive(e) {
          this.agents.some((t) => t.key === e && t.actions.canChat) &&
            ((this.activeKey = e), this.publish());
        }
        bindRuntimeAgent(e, t) {
          this.agents.some((t) => t.key === e && t.actions.canChat) &&
            (this.runtimeAgentKeys.set(t, e), (this.activeKey = e), this.publish());
        }
        setActiveRuntime(e) {
          let t = this.runtimeAgentKeys.get(e);
          t && this.setActive(t);
        }
        load(e = !1) {
          return t.load(e);
        }
        publish() {
          for (let e of this.listeners) e();
        }
      }),
      (i = new r()));
  }))();
}
export { i as n, a as t };
//# sourceMappingURL=user-agent-catalog-store-9TBczRt4.js.map
