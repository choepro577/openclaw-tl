import { i as t, o as n } from "./control-ui-boot-BkPDmfcr.js";
import { B as r, P as i } from "./control-ui-boot-Bvc3ZZNG.js";
import { n as e } from "./rolldown-runtime-DkW27tQK.js";
var a, o;
function s() {
  return (s = e(() => {
    (n(),
      i(),
      (a = class {
        constructor() {
          ((this.state = { phase: `idle` }), (this.listeners = new Set()), (this.loadEpoch = 0));
        }
        subscribe(e) {
          return (this.listeners.add(e), () => this.listeners.delete(e));
        }
        publish(e) {
          this.state = e;
          for (let e of this.listeners) e();
        }
        load(e = !1) {
          if (!e && this.state.phase === `ready`) return Promise.resolve();
          if (!e && this.pending) return this.pending;
          let n = ++this.loadEpoch,
            i = this.state;
          i.phase === `ready`
            ? this.publish({ phase: `ready`, data: i.data })
            : this.publish({ phase: `loading` });
          let a = r()
            .then((e) => {
              n === this.loadEpoch && this.publish({ phase: `ready`, data: e });
            })
            .catch((e) => {
              if (n !== this.loadEpoch) return;
              let r = e instanceof Error ? e.message : t(`portalLoadFailed`);
              this.state.phase === `ready`
                ? this.publish({ ...this.state, refreshError: r })
                : this.publish({ phase: `error`, message: r });
            })
            .finally(() => {
              n === this.loadEpoch && (this.pending = void 0);
            });
          return ((this.pending = a), a);
        }
        applyAgentAccessRequest(e) {
          this.state.phase === `ready` &&
            this.state.data.agents.find((t) => t.key === e.agentKey) &&
            (++this.loadEpoch,
            (this.pending = void 0),
            this.publish({
              phase: `ready`,
              data: {
                ...this.state.data,
                agents: this.state.data.agents.map((t) =>
                  t.key === e.agentKey
                    ? {
                        ...t,
                        access: {
                          allowed: t.access?.allowed ?? !1,
                          reason: t.access?.reason ?? null,
                          request: e,
                        },
                        actions: { ...t.actions, canRequestAccess: e.state !== `pending` },
                      }
                    : t,
                ),
              },
            }));
        }
      }),
      (o = new a()));
  }))();
}
export { o as n, s as t };
//# sourceMappingURL=user-bootstrap-store-x-iL-PgP.js.map
