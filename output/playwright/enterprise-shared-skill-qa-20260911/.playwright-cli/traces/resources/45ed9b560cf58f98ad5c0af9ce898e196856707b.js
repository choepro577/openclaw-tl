const __vite__mapDeps = (
  i,
  m = __vite__mapDeps,
  d = m.f ||
    (m.f = [
      "./thienly-login-flow-B9CArbEr.js",
      "./rolldown-runtime-DkW27tQK.js",
      "./control-ui-foundation-CUUNgsy7.js",
      "./control-ui-core-B5rJKETr.js",
      "./control-ui-core-BOclcphE.js",
      "./lit-runtime-BZcFnh9F.js",
      "./control-ui-core-k5VGv3wu.js",
      "./gateway-runtime-CzCgK0eB.js",
      "./control-ui-core-CXVrgOlR.css",
      "./control-ui-boot-BkPDmfcr.js",
      "./control-ui-boot-CIjwt-AI.js",
      "./control-ui-boot-gfE6fZcA.js",
      "./control-ui-boot-adV0af1C.js",
      "./control-ui-boot-D1_QZILW.js",
      "./config-runtime-DfcY45Be.js",
      "./control-ui-boot-BbQ-8EFH.js",
      "./control-ui-boot-DOOMhK8q.js",
      "./control-ui-boot-4F0V1byh.js",
      "./control-ui-boot-DJiLHUhu.js",
      "./control-ui-boot-Bvc3ZZNG.js",
      "./control-ui-boot-DWMwnn3C.js",
      "./control-ui-boot-DBYHHRMP.js",
      "./control-ui-boot-DkB48Nei.js",
      "./control-ui-boot-DPe_-ugS.css",
      "./control-ui-boot-D9vIvOo1.js",
      "./control-ui-boot-BDXl61AB.css",
      "./cron-runtime-_BjI8iKO.js",
      "./session-navigation-runtime-BnHifKSI.js",
      "./markdown-runtime-DmZBdNxi.js",
      "./user-thienly-auth-BM6eyieS.js",
      "./thienly-login-flow-Dk4ZVoSj.css",
    ]),
) => i.map((i) => d[i]);
import { Sn as g, i as _, o as v, xn as y } from "./control-ui-boot-BkPDmfcr.js";
import {
  K as b,
  P as x,
  V as S,
  in as C,
  kt as w,
  mt as T,
  w as E,
} from "./control-ui-boot-Bvc3ZZNG.js";
import { Is as i, Ps as a, it as o, nt as s } from "./control-ui-core-B5rJKETr.js";
import { Mr as c, Nr as l } from "./control-ui-core-BOclcphE.js";
import { Kn as t, Nr as n, Pr as r } from "./control-ui-foundation-CUUNgsy7.js";
import { n as k, t as A } from "./enterprise-errors-DDImCIwf.js";
import { n as D, t as O } from "./enterprise-language-picker-DC2t90un.js";
import { G as u, J as d, W as f, Z as p, at as m, rt as h } from "./lit-runtime-BZcFnh9F.js";
import { n as e } from "./rolldown-runtime-DkW27tQK.js";
import { n as L, r as R } from "./user-auth-session-CaN1SBOb.js";
import { f as j, i as M, l as N, o as P, p as F, u as I } from "./user-thienly-auth-BM6eyieS.js";
var z;
function B() {
  return (B = e(() => {
    (f(),
      p(),
      k(),
      O(),
      v(),
      i(),
      x(),
      (z = class extends a {
        constructor(...e) {
          (super(...e), (this.busy = !1), (this.error = ``));
        }
        async submit(e) {
          e.preventDefault();
          let t = new FormData(e.currentTarget),
            n = String(t.get(`currentPassword`) ?? ``),
            r = String(t.get(`newPassword`) ?? ``);
          if (r !== String(t.get(`confirmation`) ?? ``)) {
            this.error = _(`passwordMismatch`);
            return;
          }
          ((this.busy = !0), (this.error = ``));
          try {
            (await E(n, r), this.onChanged?.());
          } catch (e) {
            this.error = e;
          } finally {
            this.busy = !1;
          }
        }
        render() {
          return d`<main class="eu-auth-screen">
      <section class="card eu-auth-card">
        <div>
          <h1>${_(`changePasswordFirst`)}</h1>
          <p>${_(`welcomePassword`, { name: this.account?.displayName ?? _(`account`) })}</p>
        </div>
        ${D(`input`)}
        <form class="stack" @submit=${(e) => void this.submit(e)}>
          <label class="field">
            <span>${_(`currentPassword`)}</span>
            <input
              class="input"
              name="currentPassword"
              type="password"
              autocomplete="current-password"
              required
            />
          </label>
          <label class="field">
            <span>${_(`newPassword`)}</span>
            <input
              class="input"
              name="newPassword"
              type="password"
              minlength="10"
              autocomplete="new-password"
              required
            />
          </label>
          <label class="field">
            <span>${_(`confirmNewPassword`)}</span>
            <input
              class="input"
              name="confirmation"
              type="password"
              minlength="10"
              autocomplete="new-password"
              required
            />
          </label>
          <button class="btn primary" type="submit" ?disabled=${this.busy}>
            ${this.busy ? _(`saveBusy`) : _(`changePassword`)}
          </button>
          ${
            this.error
              ? d`<div class="callout danger" role="alert">
                ${A(this.error, _(`passwordUpdateFailed`))}
              </div>`
              : u
          }
        </form>
      </section>
    </main>`;
        }
      }),
      t([m({ attribute: !1 })], z.prototype, `account`, void 0),
      t([m({ attribute: !1 })], z.prototype, `onChanged`, void 0),
      t([h()], z.prototype, `busy`, void 0),
      t([h()], z.prototype, `error`, void 0),
      customElements.get(`openclaw-enterprise-user-change-password-page`) ||
        customElements.define(`openclaw-enterprise-user-change-password-page`, z));
  }))();
}
var V;
function H() {
  return (H = e(() => {
    (f(),
      p(),
      l(),
      y(),
      k(),
      O(),
      v(),
      i(),
      x(),
      P(),
      r(),
      (V = class extends a {
        constructor(...e) {
          (super(...e),
            (this.bootstrapped = !0),
            (this.busy = !1),
            (this.error = ``),
            (this.password = ``),
            (this.showPassword = !1),
            (this.thienlyEnabled = !1));
        }
        connectedCallback() {
          (super.connectedCallback(), this.bootstrapped && this.loadThienlyConfig());
        }
        async loadThienlyConfig() {
          try {
            let { enabled: e } = await I();
            (e &&
              (await n(
                () => import(`./thienly-login-flow-B9CArbEr.js`),
                __vite__mapDeps([
                  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
                  23, 24, 25, 26, 27, 28, 29, 30,
                ]),
                import.meta.url,
              )),
              (this.thienlyEnabled = e));
          } catch {
            this.thienlyEnabled = !1;
          }
        }
        async submit(e) {
          e.preventDefault();
          let t = new FormData(e.currentTarget),
            n = String(t.get(`username`) ?? ``).trim(),
            r = String(t.get(`password`) ?? ``);
          ((this.busy = !0), (this.error = ``));
          try {
            let e = await b(n, r);
            (M(),
              (this.password = ``),
              (this.showPassword = !1),
              this.onAuthenticated?.(e.account));
          } catch (e) {
            this.error = e;
          } finally {
            this.busy = !1;
          }
        }
        render() {
          return d`<main class="eu-auth-screen">
      <section class="card eu-auth-card eu-auth-card--login">
        <div class="eu-auth-visual">
          <div class="eu-auth-brand">
            <span class="eu-auth-brand__mark" aria-hidden="true">
              <img src=${c(`favicon.svg`)} alt="" />
            </span>
            <span><strong>MAAP</strong><small>${_(`productName`)}</small></span>
          </div>
          <div class="eu-auth-visual__mark" aria-hidden="true">
            <img src=${c(`favicon.svg`)} alt="" />
          </div>
        </div>
        <div class="eu-auth-panel">
          <div class="eu-auth-copy">
            <span class="eu-auth-eyebrow">MAAP USER</span>
            <h1>${_(`login`)}</h1>
            <p>${_(`loginDescription`)}</p>
          </div>
          ${
            this.bootstrapped
              ? d`<form class="stack" @submit=${(e) => void this.submit(e)}>
                <label class="field">
                  <span>${_(`username`)}</span>
                  <input class="input" name="username" autocomplete="username" required autofocus />
                </label>
                <div class="field">
                  <label for="eu-login-password">${_(`password`)}</label>
                  ${g({
                    id: `eu-login-password`,
                    name: `password`,
                    value: this.password,
                    revealed: this.showPassword,
                    revealLabel: _(`showPassword`),
                    hideLabel: _(`hidePassword`),
                    className: `eu-auth-password`,
                    inputClassName: `input`,
                    autocomplete: `current-password`,
                    required: !0,
                    disabled: this.busy,
                    onInput: (e) => {
                      this.password = e;
                    },
                    onToggle: () => {
                      this.showPassword = !this.showPassword;
                    },
                  })}
                </div>
                <button class="btn primary" type="submit" ?disabled=${this.busy}>
                  ${this.busy ? _(`loginBusy`) : _(`login`)}
                </button>
                ${
                  this.error
                    ? d`<div class="callout danger" role="alert">
                      ${A(this.error, _(`loginFailed`))}
                    </div>`
                    : u
                }
              </form>`
              : d`<div class="callout danger" role="alert">${_(`noAdmin`)}</div>`
          }
          ${
            this.bootstrapped && this.thienlyEnabled
              ? d`<openclaw-enterprise-user-thienly-login-flow
                .onAuthenticated=${(e) => this.onAuthenticated?.(e)}
              ></openclaw-enterprise-user-thienly-login-flow>`
              : u
          }
          <footer class="eu-auth-language">
            ${D(`input eu-auth-language__select`)}
          </footer>
        </div>
      </section>
    </main>`;
        }
      }),
      t([m({ attribute: !1 })], V.prototype, `onAuthenticated`, void 0),
      t([m({ type: Boolean })], V.prototype, `bootstrapped`, void 0),
      t([h()], V.prototype, `busy`, void 0),
      t([h()], V.prototype, `error`, void 0),
      t([h()], V.prototype, `password`, void 0),
      t([h()], V.prototype, `showPassword`, void 0),
      t([h()], V.prototype, `thienlyEnabled`, void 0),
      customElements.get(`openclaw-enterprise-user-login-page`) ||
        customElements.define(`openclaw-enterprise-user-login-page`, V));
  }))();
}
async function U() {
  if (F() !== null) return !0;
  let e = j();
  if (!e) return !1;
  try {
    let { attempt: t } = await N(e);
    return (
      t.phase === `waiting` ||
      t.phase === `verifying` ||
      t.phase === `account` ||
      t.phase === `link_required` ||
      t.phase === `agent` ||
      t.phase === `ready` ||
      t.phase === `completed` ||
      (M(), !1)
    );
  } catch {
    return !1;
  }
}
var W;
function G() {
  return (G = e(() => {
    (f(),
      k(),
      v(),
      i(),
      w(),
      s(),
      x(),
      P(),
      L(),
      B(),
      H(),
      (W = class extends a {
        constructor(...e) {
          (super(...e), (this.state = { phase: `checking` }));
        }
        connectedCallback() {
          (super.connectedCallback(), this.load());
        }
        publish(e) {
          ((this.state = e),
            o(e.phase === `ready` ? e.account.role : void 0),
            this.synchronizePath(),
            this.requestUpdate(),
            (e.phase === `ready` || e.phase === `disabled`) &&
              this.dispatchEvent(
                new CustomEvent(`enterprise-auth-ready`, {
                  bubbles: !0,
                  composed: !0,
                  detail: e.phase === `ready` ? { account: e.account } : { disabled: !0 },
                }),
              ));
        }
        synchronizePath() {
          let e = globalThis.location?.pathname ?? `/`,
            t = e.indexOf(`/app`);
          if (t < 0) return;
          let n = e.slice(0, t),
            r =
              this.state.phase === `login`
                ? `${n}/app/login`
                : this.state.phase === `password`
                  ? `${n}/app/change-password`
                  : null;
          r && e !== r && globalThis.history.replaceState(globalThis.history.state, ``, r);
        }
        async load() {
          this.publish({ phase: `checking` });
          try {
            let e = await C();
            if (!e.enabled) {
              this.publish({ phase: `disabled` });
              return;
            }
            if (!e.bootstrapped) {
              this.publish({ phase: `login`, bootstrapped: !1 });
              return;
            }
            if (await U()) {
              this.publish({ phase: `login`, bootstrapped: !0 });
              return;
            }
            try {
              this.accept((await S()).account);
            } catch (e) {
              if (e instanceof T && e.status === 401) {
                this.publish({ phase: `login`, bootstrapped: !0 });
                return;
              }
              throw e;
            }
          } catch (e) {
            this.publish({ phase: `error`, error: e });
          }
        }
        accept(e) {
          (R(e),
            this.publish(
              e.mustChangePassword
                ? { phase: `password`, account: e }
                : { phase: `ready`, account: e },
            ));
        }
        render() {
          return this.state.phase === `checking` ||
            this.state.phase === `disabled` ||
            this.state.phase === `ready`
            ? d`<main class="eu-auth-screen" role="status">${_(`loadingPortal`)}</main>`
            : this.state.phase === `error`
              ? d`<main class="eu-auth-screen">
        <section class="card eu-auth-card">
          <div class="callout danger" role="alert">
            ${A(this.state.error, _(`portalCheckFailed`))}
          </div>
          <button class="btn" type="button" @click=${() => void this.load()}>${_(`retry`)}</button>
        </section>
      </main>`
              : this.state.phase === `password`
                ? d`<openclaw-enterprise-user-change-password-page
        .account=${this.state.account}
        .onChanged=${() => this.publish({ phase: `login`, bootstrapped: !0 })}
      ></openclaw-enterprise-user-change-password-page>`
                : d`<openclaw-enterprise-user-login-page
      .bootstrapped=${this.state.bootstrapped}
      .onAuthenticated=${(e) => this.accept(e)}
    ></openclaw-enterprise-user-login-page>`;
        }
      }),
      customElements.get(`openclaw-enterprise-user-auth-gate`) ||
        customElements.define(`openclaw-enterprise-user-auth-gate`, W));
  }))();
}
G();
export { W as EnterpriseUserAuthGate };
//# sourceMappingURL=user-auth-gate-BgVGtnEb.js.map
