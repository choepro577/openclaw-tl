import { C as v, w as y } from "./control-ui-boot-BbQ-8EFH.js";
import { di as m, mi as h, pi as g, vi as _ } from "./control-ui-boot-D1_QZILW.js";
import {
  Ca as a,
  Gt as o,
  Ut as s,
  Wt as c,
  _ as l,
  v as u,
  xa as d,
} from "./control-ui-core-B5rJKETr.js";
import { o as f, t as p } from "./control-ui-core-k5VGv3wu.js";
import { Jt as t, Oi as n, Vt as r, gn as i } from "./control-ui-foundation-CUUNgsy7.js";
import { n as e } from "./rolldown-runtime-DkW27tQK.js";
function b(e) {
  return i(e)
    ? e.kind === `systemEvent`
      ? typeof e.text == `string`
      : e.kind === `agentTurn`
        ? typeof e.message == `string`
        : e.kind === `command`
          ? Array.isArray(e.argv) && e.argv.every((e) => typeof e == `string`)
          : e.kind === `script`
            ? typeof e.script == `string`
            : e.kind === `heartbeat`
    : !1;
}
function ee(e) {
  return (
    e === `main` ||
    e === `isolated` ||
    e === `current` ||
    (e.startsWith(`session:`) && e.length > 8)
  );
}
function x(e) {
  let t = e.payload;
  return b(t) ? t : null;
}
function te(e) {
  return x(e) !== null;
}
function S(e = {}) {
  return {
    client: e.client ?? null,
    connected: e.connected ?? !1,
    cronLoading: !1,
    cronJobsLoadingMore: !1,
    cronJobsReloadPending: !1,
    cronJobsReloadPendingTableFilters: !1,
    cronJobs: [],
    cronJobsSnapshotRevision: null,
    cronJobsTotal: 0,
    cronJobsHasMore: !1,
    cronJobsNextOffset: null,
    cronJobsLimit: 50,
    cronJobsQuery: ``,
    cronJobsEnabledFilter: `all`,
    cronJobsScheduleKindFilter: `all`,
    cronJobsLastStatusFilter: `all`,
    cronJobsTriggerFilter: `all`,
    cronJobsSortBy: `nextRunAtMs`,
    cronJobsSortDir: `asc`,
    cronAgentId: null,
    cronStatus: null,
    cronScopedTotal: null,
    cronScopedNextWakeAtMs: null,
    cronFailingCount: null,
    cronError: null,
    cronForm: { ...Z },
    cronCreateOpen: !1,
    cronFieldErrors: {},
    cronEditingJob: null,
    cronEditingJobId: null,
    cronEditingConfigRevision: null,
    cronRunsJobId: null,
    cronRunsLoadingMore: !1,
    cronRuns: [],
    cronRunsTotal: 0,
    cronRunsHasMore: !1,
    cronRunsNextOffset: null,
    cronRunsLimit: 50,
    cronRunsScope: `all`,
    cronRunsStatuses: [],
    cronRunsDeliveryStatuses: [],
    cronRunsStatusFilter: `all`,
    cronRunsQuery: ``,
    cronRunsSortDir: `desc`,
    cronBusy: !1,
  };
}
function C(e) {
  return e.sessionTarget !== `main` && (e.payloadKind === `agentTurn` || e.payloadLocked);
}
function w(e) {
  return e.deliveryMode !== `announce` || C(e) ? e : { ...e, deliveryMode: `none` };
}
function T(e) {
  let t = {};
  if ((e.name.trim() || (t.name = `cron.errors.nameRequired`), e.scheduleKind === `at`)) {
    let n = Date.parse(e.scheduleAt);
    Number.isFinite(n) || (t.scheduleAt = `cron.errors.scheduleAtInvalid`);
  } else if (e.scheduleKind === `every`) {
    let n = h(e.everyAmount, e.everyUnit);
    n === void 0
      ? (t.everyAmount = `cron.errors.everyAmountInvalid`)
      : e.triggerEnabled && n < y() && (t.everyAmount = `cron.errors.triggerIntervalTooShort`);
  } else if (
    e.scheduleKind === `cron` &&
    (e.cronExpr.trim() || (t.cronExpr = `cron.errors.cronExprRequired`), !e.scheduleExact)
  ) {
    let n = e.staggerAmount.trim();
    n && u(n, 0) <= 0 && (t.staggerAmount = `cron.errors.staggerAmountInvalid`);
  }
  if (
    (e.triggerEnabled &&
      (e.payloadKind === `script`
        ? (t.triggerScript = `cron.errors.triggerScriptPayloadUnsupported`)
        : e.scheduleKind !== `every` && e.scheduleKind !== `cron` && e.scheduleKind !== `stream`
          ? (t.triggerScript = `cron.errors.triggerScheduleUnsupported`)
          : e.triggerScript.trim() || (t.triggerScript = `cron.errors.triggerScriptRequired`)),
    !e.payloadLocked &&
      !e.payloadText.trim() &&
      (t.payloadText =
        e.payloadKind === `systemEvent`
          ? `cron.errors.systemTextRequired`
          : `cron.errors.agentMessageRequired`),
    !e.payloadLocked && e.payloadKind === `agentTurn`)
  ) {
    let n = e.timeoutSeconds.trim();
    if (n) {
      let e = u(n, NaN);
      (!Number.isFinite(e) || e < 0) && (t.timeoutSeconds = `cron.errors.timeoutInvalid`);
    }
  }
  if (e.deliveryMode === `webhook`) {
    let n = e.deliveryTo.trim();
    n
      ? /^https?:\/\//i.test(n) || (t.deliveryTo = `cron.errors.webhookUrlInvalid`)
      : (t.deliveryTo = `cron.errors.webhookUrlRequired`);
  }
  if (e.failureAlertMode === `custom`) {
    let n = e.failureAlertAfter.trim();
    if (n) {
      let e = u(n, 0);
      (!Number.isFinite(e) || e <= 0) &&
        (t.failureAlertAfter = `Failure alert threshold must be greater than 0.`);
    }
    let r = e.failureAlertCooldownSeconds.trim();
    if (r) {
      let e = u(r, -1);
      (!Number.isFinite(e) || e < 0) &&
        (t.failureAlertCooldownSeconds = `Cooldown must be 0 or greater.`);
    }
  }
  return t;
}
function E(e) {
  return Object.keys(e).length > 0;
}
async function D(e) {
  if (!(!e.client || !e.connected))
    try {
      e.cronStatus = await e.client.request(`cron.status`, {});
    } catch (t) {
      o(t) ? ((e.cronStatus = null), (e.cronError = s(`cron status`))) : (e.cronError = d(t));
    }
}
async function ne(e, n) {
  if (!(!e.client || !e.connected || !n))
    try {
      let r = (
        await e.client.request(`models.list`, { agentId: n, view: `configured`, preparedOnly: !0 })
      )?.models;
      if (!Array.isArray(r)) {
        e.cronModelSuggestions = [];
        return;
      }
      let i = r
        .map((e) => {
          if (!e || typeof e != `object`) return ``;
          let t = e.id;
          return typeof t == `string` ? t.trim() : ``;
        })
        .filter(Boolean);
      e.cronModelSuggestions = t(i);
    } catch {
      e.cronModelSuggestions = [];
    }
}
function O(e, t) {
  if (typeof t != `string`) return;
  let n = t.trim();
  n && e.add(n);
}
function k(e, t) {
  if (!t) return;
  if (typeof t == `string`) {
    O(e, t);
    return;
  }
  if (typeof t != `object`) return;
  let n = t;
  (O(e, n.primary), O(e, n.model), O(e, n.id), O(e, n.value));
  let r = Array.isArray(n.fallbacks) ? n.fallbacks : Array.isArray(n.fallback) ? n.fallback : [];
  for (let t of r) O(e, t);
}
function re(e) {
  if (!e || typeof e != `object`) return [];
  let n = e.agents;
  if (!n || typeof n != `object`) return [];
  let r = new Set(),
    i = n.defaults;
  if (i && typeof i == `object`) {
    let e = i;
    k(r, e.model);
    let t = e.models;
    if (t && typeof t == `object`) for (let e of Object.keys(t)) O(r, e);
  }
  let a = n.entries;
  if (a && typeof a == `object` && !Array.isArray(a))
    for (let e of Object.values(a)) e && typeof e == `object` && k(r, e.model);
  return t([...r]);
}
async function A(e, t) {
  let n = e.client;
  if (!(!n || !e.connected || e.cronBusy)) {
    ((e.cronBusy = !0), (e.cronError = null));
    try {
      await t(n);
    } catch (t) {
      e.cronError = d(t);
    } finally {
      e.cronBusy = !1;
    }
  }
}
function j(e) {
  if (e) return e;
  throw Error(`This automation is missing its configuration revision. Refresh and try again.`);
}
function M(e, t) {
  e.cronJobs = e.cronJobs.map((e) => (e.id === t.id ? t : e));
}
function ie(e) {
  return (i(e) && i(e.details) ? e.details : null)?.code === `CRON_JOB_CHANGED`;
}
function ae(e) {
  let t =
      typeof e.totalRaw == `number` && Number.isFinite(e.totalRaw)
        ? Math.max(0, Math.floor(e.totalRaw))
        : e.pageCount,
    n =
      typeof e.offsetRaw == `number` && Number.isFinite(e.offsetRaw)
        ? Math.max(0, Math.floor(e.offsetRaw))
        : 0,
    r =
      typeof e.hasMoreRaw == `boolean`
        ? e.hasMoreRaw
        : n + e.pageCount < Math.max(t, n + e.pageCount);
  return {
    total: t,
    hasMore: r,
    nextOffset:
      typeof e.nextOffsetRaw == `number` && Number.isFinite(e.nextOffsetRaw)
        ? Math.max(0, Math.floor(e.nextOffsetRaw))
        : r
          ? n + e.pageCount
          : null,
  };
}
function oe(e, t) {
  if (
    !i(e) ||
    !Array.isArray(e.jobs) ||
    typeof e.snapshotRevision != `string` ||
    e.snapshotRevision.length === 0 ||
    typeof e.total != `number` ||
    !Number.isSafeInteger(e.total) ||
    e.total < 0 ||
    typeof e.offset != `number` ||
    !Number.isSafeInteger(e.offset) ||
    e.offset < 0 ||
    typeof e.limit != `number` ||
    !Number.isSafeInteger(e.limit) ||
    e.limit < 1 ||
    e.limit > t ||
    e.jobs.length > e.limit ||
    typeof e.hasMore != `boolean` ||
    (e.nextOffset !== null &&
      (typeof e.nextOffset != `number` || !Number.isSafeInteger(e.nextOffset) || e.nextOffset < 0))
  )
    throw Error(`cron.list returned an invalid inventory page`);
  return e;
}
function se(e, t) {
  let n = t + e.jobs.length;
  if (
    e.offset !== t ||
    !Number.isSafeInteger(n) ||
    n > e.total ||
    (e.hasMore
      ? e.nextOffset !== n || n <= t || n >= e.total
      : e.nextOffset !== null || n !== e.total)
  )
    throw Error(`cron.list returned an invalid inventory page`);
}
function ce(e, t) {
  e.cronJobsReloadPending ||
    ((e.cronJobsReloadPending = !0), (e.cronJobsReloadPendingTableFilters = t));
}
async function le(e) {
  if (!e.cronJobsReloadPending) return;
  let t = e.cronJobsReloadPendingTableFilters;
  ((e.cronJobsReloadPending = !1),
    (e.cronJobsReloadPendingTableFilters = !1),
    await N(e, { tableFilters: t }));
}
async function N(e, t) {
  if (!e.client || !e.connected) return;
  let n = t?.append === !0;
  if (e.cronLoading || e.cronJobsLoadingMore) {
    n ||
      ((e.cronJobsReloadPending = !0),
      (e.cronJobsReloadPendingTableFilters = t?.tableFilters === !0));
    return;
  }
  if (!(n && !e.cronJobsHasMore)) {
    (n ? (e.cronJobsLoadingMore = !0) : (e.cronLoading = !0), (e.cronError = null));
    try {
      let r = n ? Math.max(0, e.cronJobsNextOffset ?? e.cronJobs.length) : 0,
        i = oe(
          await e.client.request(`cron.list`, {
            ...(e.cronAgentId ? { agentId: e.cronAgentId } : {}),
            includeDisabled: e.cronJobsEnabledFilter === `all`,
            includeDeliveryPreviews: !1,
            limit: e.cronJobsLimit,
            offset: r,
            query: e.cronJobsQuery.trim() || void 0,
            enabled: e.cronJobsEnabledFilter,
            ...(t?.tableFilters
              ? {
                  scheduleKind: e.cronJobsScheduleKindFilter,
                  lastRunStatus: e.cronJobsLastStatusFilter,
                  trigger: e.cronJobsTriggerFilter,
                }
              : {}),
            sortBy: e.cronJobsSortBy,
            sortDir: e.cronJobsSortDir,
          }),
          e.cronJobsLimit,
        );
      if (n && (i.snapshotRevision !== e.cronJobsSnapshotRevision || i.total !== e.cronJobsTotal)) {
        ce(e, t?.tableFilters === !0);
        return;
      }
      se(i, r);
      let a = i.jobs.filter(te);
      ((e.cronJobs = n ? [...e.cronJobs, ...a] : a),
        (e.cronJobsSnapshotRevision = i.snapshotRevision),
        (e.cronJobsTotal = i.total),
        (e.cronJobsHasMore = i.hasMore),
        (e.cronJobsNextOffset = i.nextOffset));
    } catch (t) {
      e.cronError = d(t);
    } finally {
      (n ? (e.cronJobsLoadingMore = !1) : (e.cronLoading = !1), await le(e));
    }
  }
}
function ue(e, t) {
  (typeof t.cronJobsQuery == `string` && (e.cronJobsQuery = t.cronJobsQuery),
    (e.cronJobsEnabledFilter = t.cronJobsEnabledFilter ?? e.cronJobsEnabledFilter),
    (e.cronJobsScheduleKindFilter = t.cronJobsScheduleKindFilter ?? e.cronJobsScheduleKindFilter),
    (e.cronJobsLastStatusFilter = t.cronJobsLastStatusFilter ?? e.cronJobsLastStatusFilter),
    (e.cronJobsTriggerFilter = t.cronJobsTriggerFilter ?? e.cronJobsTriggerFilter),
    (e.cronJobsSortBy = t.cronJobsSortBy ?? e.cronJobsSortBy),
    (e.cronJobsSortDir = t.cronJobsSortDir ?? e.cronJobsSortDir));
}
function de(e) {
  return e.cronJobs.filter((t) => {
    let n = fe(t);
    return !(
      !n ||
      (e.cronJobsScheduleKindFilter !== `all` && n !== e.cronJobsScheduleKindFilter) ||
      (e.cronJobsLastStatusFilter !== `all` && _(t) !== e.cronJobsLastStatusFilter) ||
      (e.cronJobsTriggerFilter === `conditional` && !t.trigger) ||
      (e.cronJobsTriggerFilter === `unconditional` && t.trigger)
    );
  });
}
function fe(e) {
  let t = e.schedule?.kind;
  return t === `at` || t === `every` || t === `cron` || t === `on-exit` || t === `stream`
    ? t
    : null;
}
function P(e) {
  ((e.cronEditingJob = null), (e.cronEditingJobId = null), (e.cronEditingConfigRevision = null));
}
function F(e) {
  ((e.cronRuns = []),
    (e.cronRunsTotal = 0),
    (e.cronRunsHasMore = !1),
    (e.cronRunsNextOffset = null));
}
function I(e, t) {
  ((e.cronForm = { ...Z, agentId: t ?? `` }), (e.cronFieldErrors = {}));
}
function L(e) {
  let t = Date.parse(e);
  if (!Number.isFinite(t)) return ``;
  let n = new Date(t);
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, `0`)}-${String(n.getDate()).padStart(2, `0`)}T${String(n.getHours()).padStart(2, `0`)}:${String(n.getMinutes()).padStart(2, `0`)}`;
}
function R(e) {
  return e % 864e5 == 0
    ? { everyAmount: String(e / 864e5), everyUnit: `days` }
    : e % 36e5 == 0
      ? { everyAmount: String(e / 36e5), everyUnit: `hours` }
      : e % 6e4 == 0
        ? { everyAmount: String(e / 6e4), everyUnit: `minutes` }
        : { everyAmount: z(e), everyUnit: `seconds` };
}
function z(e) {
  let t = BigInt(e),
    n = t / 1000n,
    r = t % 1000n;
  return r === 0n ? String(n) : `${n}.${r.toString().padStart(3, `0`).replace(/0+$/u, ``)}`;
}
function B(e) {
  return e === 0
    ? { scheduleExact: !0, staggerAmount: ``, staggerUnit: `seconds` }
    : typeof e != `number` || !Number.isFinite(e) || e < 0
      ? { scheduleExact: !1, staggerAmount: ``, staggerUnit: `seconds` }
      : e % 6e4 == 0
        ? { scheduleExact: !1, staggerAmount: String(Math.max(1, e / 6e4)), staggerUnit: `minutes` }
        : {
            scheduleExact: !1,
            staggerAmount: String(Math.max(1, Math.ceil(e / 1e3))),
            staggerUnit: `seconds`,
          };
}
function V(e) {
  return e?.kind === `command` || e?.kind === `script` || e?.kind === `heartbeat`;
}
function H(e, t) {
  let n = e.failureAlert,
    r = x(e),
    i = V(r);
  if (!ee(e.sessionTarget)) throw TypeError(`Invalid cron session target: ${e.sessionTarget}`);
  let a = {
    ...t,
    name: e.name,
    description: e.description ?? ``,
    agentId: e.agentId ?? ``,
    sessionKey: e.sessionKey ?? ``,
    clearAgent: !1,
    enabled: e.enabled,
    deleteAfterRun: e.deleteAfterRun ?? e.schedule.kind === `at`,
    scheduleKind: e.schedule.kind,
    scheduleAt: ``,
    everyAmount: t.everyAmount,
    everyUnit: t.everyUnit,
    cronExpr: t.cronExpr,
    cronTz: ``,
    scheduleExact: !1,
    staggerAmount: ``,
    staggerUnit: `seconds`,
    triggerEnabled: e.trigger !== void 0,
    triggerScript: e.trigger?.script ?? ``,
    triggerOnce: e.trigger?.once === !0,
    sessionTarget: e.sessionTarget,
    wakeMode: e.wakeMode,
    payloadKind: r?.kind ?? Z.payloadKind,
    payloadLocked: i,
    payloadText:
      r?.kind === `systemEvent`
        ? r.text
        : r?.kind === `agentTurn`
          ? r.message
          : r?.kind === `command`
            ? r.argv.join(` `)
            : r?.kind === `script`
              ? r.script
              : ``,
    payloadModel: r?.kind === `agentTurn` ? (r.model ?? ``) : ``,
    payloadThinking: r?.kind === `agentTurn` ? (r.thinking ?? ``) : ``,
    payloadLightContext: r?.kind === `agentTurn` && r.lightContext === !0,
    deliveryMode: e.delivery?.mode ?? `none`,
    deliveryChannel: e.delivery?.channel ?? X,
    deliveryTo: e.delivery?.to ?? ``,
    deliveryAccountId: e.delivery?.accountId ?? ``,
    deliveryBestEffort: e.delivery?.bestEffort ?? !1,
    deliveryThreadId: e.delivery?.threadId,
    deliveryCompletionDestination:
      e.delivery?.mode === `announce` ? e.delivery.completionDestination : void 0,
    deliveryFailureDestination: e.delivery?.failureDestination,
    failureAlertMode: n === !1 ? `disabled` : n && typeof n == `object` ? `custom` : `inherit`,
    failureAlertAfter:
      n && typeof n == `object` && typeof n.after == `number`
        ? String(n.after)
        : Z.failureAlertAfter,
    failureAlertCooldownSeconds:
      n && typeof n == `object` && typeof n.cooldownMs == `number`
        ? String(Math.floor(n.cooldownMs / 1e3))
        : Z.failureAlertCooldownSeconds,
    failureAlertChannel: n && typeof n == `object` ? (n.channel ?? X) : X,
    failureAlertTo: n && typeof n == `object` ? (n.to ?? ``) : ``,
    failureAlertDeliveryMode: n && typeof n == `object` ? (n.mode ?? `announce`) : `announce`,
    failureAlertAccountId: n && typeof n == `object` ? (n.accountId ?? ``) : ``,
    timeoutSeconds:
      r?.kind === `agentTurn` && typeof r.timeoutSeconds == `number`
        ? String(r.timeoutSeconds)
        : ``,
  };
  if (e.schedule.kind === `at`) a.scheduleAt = L(e.schedule.at);
  else if (e.schedule.kind === `every`) {
    let t = R(e.schedule.everyMs);
    ((a.everyAmount = t.everyAmount), (a.everyUnit = t.everyUnit));
  } else if (e.schedule.kind === `cron`) {
    ((a.cronExpr = e.schedule.expr), (a.cronTz = e.schedule.tz ?? ``));
    let t = B(e.schedule.staggerMs);
    ((a.scheduleExact = t.scheduleExact),
      (a.staggerAmount = t.staggerAmount),
      (a.staggerUnit = t.staggerUnit));
  }
  return w(a);
}
function pe(e) {
  if (e.scheduleKind === `at`) {
    let t = Date.parse(e.scheduleAt);
    if (!Number.isFinite(t)) throw Error(f(`cron.errors.invalidRunTime`));
    return { kind: `at`, at: new Date(t).toISOString() };
  }
  if (e.scheduleKind === `every`) {
    let t = h(e.everyAmount, e.everyUnit);
    if (t === void 0) throw Error(f(`cron.errors.invalidIntervalAmount`));
    return { kind: `every`, everyMs: t };
  }
  let t = e.cronExpr.trim();
  if (!t) throw Error(f(`cron.errors.cronExprRequiredShort`));
  if (e.scheduleExact)
    return { kind: `cron`, expr: t, tz: e.cronTz.trim() || void 0, staggerMs: 0 };
  let n = e.staggerAmount.trim();
  if (!n) return { kind: `cron`, expr: t, tz: e.cronTz.trim() || void 0 };
  let r = u(n, 0);
  if (r <= 0) throw Error(f(`cron.errors.invalidStaggerAmount`));
  let i = e.staggerUnit === `minutes` ? r * 6e4 : r * 1e3;
  return { kind: `cron`, expr: t, tz: e.cronTz.trim() || void 0, staggerMs: i };
}
function me(e) {
  if (e.payloadKind === `systemEvent`) {
    let t = e.payloadText.trim();
    if (!t) throw Error(f(`cron.errors.systemEventTextRequired`));
    return { kind: `systemEvent`, text: t };
  }
  if (e.payloadKind !== `agentTurn`)
    throw Error(`Cron ${e.payloadKind} payloads are read-only in Control UI.`);
  let t = e.payloadText.trim();
  if (!t) throw Error(f(`cron.errors.agentMessageRequiredShort`));
  let n = { kind: `agentTurn`, message: t },
    r = e.payloadModel.trim();
  r && (n.model = r);
  let i = e.payloadThinking.trim();
  i && (n.thinking = i);
  let a = e.timeoutSeconds.trim();
  if (a) {
    let e = u(a, NaN);
    Number.isFinite(e) && e >= 0 && (n.timeoutSeconds = e);
  }
  return (e.payloadLightContext && (n.lightContext = !0), n);
}
function U(e, t = {}) {
  let n = e.trim();
  if (n) return n === X ? (t.preserveLastOnUpdate ? X : void 0) : n;
}
function he(e, t) {
  if (e.failureAlertMode === `disabled`) return !1;
  if (e.failureAlertMode !== `custom`) return t === void 0 ? void 0 : null;
  let n = t && typeof t == `object` ? t : void 0,
    r = u(e.failureAlertAfter.trim(), 0),
    i = e.failureAlertCooldownSeconds.trim(),
    a = i.length > 0 ? u(i, 0) : void 0,
    o = a !== void 0 && Number.isFinite(a) && a >= 0 ? Math.floor(a * 1e3) : void 0,
    s = e.failureAlertDeliveryMode,
    c = e.failureAlertAccountId.trim(),
    l = e.failureAlertTo.trim(),
    d = {
      after: r > 0 ? Math.floor(r) : n?.after === void 0 ? void 0 : null,
      channel: U(e.failureAlertChannel, { preserveLastOnUpdate: !!n?.channel }),
      to: l || (n?.to ? null : void 0),
      ...(o === void 0
        ? n?.cooldownMs === void 0
          ? {}
          : { cooldownMs: null }
        : { cooldownMs: o }),
    };
  return (s && (d.mode = s), (d.accountId = c || (n?.accountId ? null : void 0)), d);
}
function ge(e) {
  if (!e || typeof e != `object`) return null;
  let t = `job` in e ? e.job : e;
  if (!t || typeof t != `object`) return null;
  let n = t.id;
  return typeof n == `string` && n.length > 0 ? n : null;
}
async function _e(e) {
  let t = { saved: !1 };
  return (
    await A(e, async (n) => {
      let r = w(e.cronForm);
      r !== e.cronForm && (e.cronForm = r);
      let i = T(r);
      if (((e.cronFieldErrors = i), E(i))) return;
      let a = e.cronEditingJob,
        o = a ? j(e.cronEditingConfigRevision) : void 0,
        s = a ? x(a) : null,
        c =
          a &&
          (((a?.schedule.kind === `on-exit` || a?.schedule.kind === `stream`) &&
            r.scheduleKind === a.schedule.kind) ||
            (a?.schedule.kind === `at` &&
              r.scheduleKind === `at` &&
              r.scheduleAt === L(a.schedule.at)))
            ? void 0
            : pe(r),
        l = a && r.payloadLocked && V(s) ? void 0 : me(r);
      l?.kind === `agentTurn` &&
        a &&
        s?.kind === `agentTurn` &&
        (!r.payloadModel.trim() && s.model !== void 0 && (l.model = null),
        !r.payloadThinking.trim() && s.thinking !== void 0 && (l.thinking = null),
        !r.payloadLightContext && s.lightContext !== void 0 && (l.lightContext = !1));
      let u = r.deliveryMode,
        d = r.deliveryAccountId.trim(),
        p = u === `announce` ? d || (a?.delivery?.accountId ? null : void 0) : void 0,
        m =
          u && u !== `none`
            ? {
                mode: u,
                channel:
                  u === `announce`
                    ? U(r.deliveryChannel, { preserveLastOnUpdate: !!a?.delivery?.channel })
                    : void 0,
                to: r.deliveryTo.trim() || (u === `announce` && a?.delivery?.to ? null : void 0),
                accountId: p,
                bestEffort: r.deliveryBestEffort,
                ...(r.deliveryThreadId === void 0 ? {} : { threadId: r.deliveryThreadId }),
                ...(u === `announce` && r.deliveryCompletionDestination
                  ? { completionDestination: r.deliveryCompletionDestination }
                  : {}),
                ...(r.deliveryFailureDestination
                  ? { failureDestination: r.deliveryFailureDestination }
                  : {}),
              }
            : u === `none`
              ? {
                  mode: `none`,
                  ...(r.deliveryBestEffort ? { bestEffort: !0 } : {}),
                  ...(r.deliveryThreadId === void 0 ? {} : { threadId: r.deliveryThreadId }),
                  ...(r.deliveryFailureDestination
                    ? { failureDestination: r.deliveryFailureDestination }
                    : {}),
                }
              : void 0,
        h = he(r, a?.failureAlert),
        g = r.triggerScript.trim(),
        _ = r.triggerEnabled
          ? a?.trigger?.script === g && (a.trigger.once === !0) === r.triggerOnce
            ? void 0
            : { script: g, once: r.triggerOnce }
          : a?.trigger
            ? null
            : void 0,
        v = r.clearAgent ? null : r.agentId.trim(),
        y = r.sessionKey.trim() || (a?.sessionKey ? null : void 0),
        b = {
          name: r.name.trim(),
          description: r.description.trim(),
          agentId: v === null ? null : v || void 0,
          sessionKey: y,
          enabled: r.enabled,
          ...(r.scheduleKind === `at` || r.scheduleKind === `on-exit`
            ? { deleteAfterRun: r.deleteAfterRun }
            : {}),
          sessionTarget: r.sessionTarget,
          wakeMode: r.wakeMode,
          trigger: _,
          delivery: m,
          failureAlert: h,
        };
      if ((c && (b.schedule = c), l && (b.payload = l), !b.name))
        throw Error(f(`cron.errors.nameRequiredShort`));
      if (a) {
        let r = a.id;
        try {
          let t = await n.request(`cron.update`, { id: r, expectedConfigRevision: o, patch: b });
          (M(e, t), J(e, t));
        } catch (t) {
          if (!ie(t)) throw t;
          await W(e);
          try {
            (J(e, await n.request(`cron.get`, { id: r })),
              (e.cronError = `This automation changed on the Gateway. The latest definition is loaded; review it before retrying.`));
          } catch {
            e.cronError = `This automation changed on the Gateway, but the latest definition could not be loaded. Refresh before retrying.`;
          }
          return;
        }
        t = { saved: !0, jobId: r };
      } else {
        let r = await n.request(`cron.add`, b);
        (I(e, v), (t = { saved: !0, jobId: ge(r) }));
      }
      await W(e);
    }),
    t
  );
}
async function W(e) {
  (await N(e, { tableFilters: !0 }), await D(e), await m(e));
}
async function ve(e, t, n) {
  let r = !1;
  return (
    await A(e, async (i) => {
      let a = await i.request(`cron.update`, {
        id: t.id,
        expectedConfigRevision: j(t.configRevision),
        patch: { enabled: n },
      });
      (M(e, a),
        e.cronEditingJob?.id === a.id && q(e, a, { ...e.cronForm, enabled: a.enabled }),
        (r = !0),
        await W(e));
    }),
    r
  );
}
function ye(e) {
  if (!(`reason` in e)) return f(`cron.runNotStarted.unknown`);
  switch (e.reason) {
    case `not-due`:
      return f(`cron.runNotStarted.notDue`);
    case `already-running`:
      return f(`cron.runNotStarted.alreadyRunning`);
    case `restart-recovery-pending`:
      return f(`cron.runNotStarted.recoveryPending`);
    case `invalid-spec`:
      return f(`cron.runNotStarted.invalidSpec`);
    case `stopped`:
      return f(`cron.runNotStarted.stopped`);
  }
  return f(`cron.runNotStarted.unknown`);
}
async function be(e, t, n = `force`) {
  await A(e, async (r) => {
    let i = await r.request(`cron.run`, { id: t, mode: n });
    if (!i.ok || (`ran` in i && !i.ran)) {
      ((e.cronError = ye(i)),
        `reason` in i &&
          i.reason === `invalid-spec` &&
          (await K(e, e.cronRunsScope === `all` ? null : t)));
      return;
    }
    (await K(e, e.cronRunsScope === `all` ? null : t),
      `enqueued` in i && i.enqueued && (e.cronError = `Run queued. Run ID: ${i.runId}`));
  });
}
async function xe(e, t) {
  await A(e, async (n) => {
    await n.request(`cron.remove`, { id: t.id });
    let r = e.cronJobs.length;
    ((e.cronJobs = e.cronJobs.filter((e) => e.id !== t.id)),
      e.cronJobs.length !== r && (e.cronJobsTotal = Math.max(0, e.cronJobsTotal - 1)),
      e.cronEditingJob?.id === t.id && P(e),
      e.cronRunsJobId === t.id && ((e.cronRunsJobId = null), F(e)),
      await W(e));
  });
}
function G(e, t) {
  return (
    Q.get(e) === t &&
    e.connected &&
    e.client === t.client &&
    e.cronAgentId === t.agentId &&
    e.cronRunsScope === t.scope &&
    (t.scope !== `job` || e.cronRunsJobId === t.jobId) &&
    e.cronRunsLimit === t.limit &&
    e.cronRunsStatusFilter === t.status &&
    e.cronRunsQuery.trim() === t.query &&
    e.cronRunsSortDir === t.sortDir &&
    e.cronRunsStatuses.length === t.statuses.length &&
    e.cronRunsStatuses.every((e, n) => e === t.statuses[n]) &&
    e.cronRunsDeliveryStatuses.length === t.deliveryStatuses.length &&
    e.cronRunsDeliveryStatuses.every((e, n) => e === t.deliveryStatuses[n]) &&
    (!t.append || Math.max(0, e.cronRunsNextOffset ?? e.cronRuns.length) === t.offset)
  );
}
async function K(e, t, n) {
  let r = e.client;
  if (!r || !e.connected) return `skipped`;
  let i = e.cronRunsScope,
    a = t ?? e.cronRunsJobId;
  if (i === `job` && !a) return (F(e), `skipped`);
  let o = n?.append === !0;
  if (o && !e.cronRunsHasMore) return `skipped`;
  let s = {
    client: r,
    agentId: e.cronAgentId,
    scope: i,
    jobId: i === `job` ? a : null,
    limit: e.cronRunsLimit,
    offset: o ? Math.max(0, e.cronRunsNextOffset ?? e.cronRuns.length) : 0,
    statuses: [...e.cronRunsStatuses],
    status: e.cronRunsStatusFilter,
    deliveryStatuses: [...e.cronRunsDeliveryStatuses],
    query: e.cronRunsQuery.trim(),
    sortDir: e.cronRunsSortDir,
    append: o,
  };
  (Q.set(e, s), (e.cronRunsLoadingMore = o));
  try {
    let t = await r.request(`cron.runs`, {
      ...(s.agentId ? { agentId: s.agentId } : {}),
      scope: s.scope,
      id: s.jobId ?? void 0,
      limit: s.limit,
      offset: s.offset,
      statuses: s.statuses.length > 0 ? s.statuses : void 0,
      status: s.status,
      deliveryStatuses: s.deliveryStatuses.length > 0 ? s.deliveryStatuses : void 0,
      query: s.query || void 0,
      sortDir: s.sortDir,
    });
    if (!G(e, s)) return `skipped`;
    let n = Array.isArray(t.entries) ? t.entries : [];
    e.cronRuns = o ? [...e.cronRuns, ...n] : n;
    let i = ae({
      totalRaw: t.total,
      offsetRaw: t.offset,
      nextOffsetRaw: t.nextOffset,
      hasMoreRaw: t.hasMore,
      pageCount: n.length,
    });
    return (
      (e.cronRunsTotal = Math.max(i.total, e.cronRuns.length)),
      (e.cronRunsHasMore = i.hasMore),
      (e.cronRunsNextOffset = i.nextOffset),
      `ok`
    );
  } catch (t) {
    return G(e, s) ? ((e.cronError = d(t)), `error`) : `skipped`;
  } finally {
    o && Q.get(e) === s && (e.cronRunsLoadingMore = !1);
  }
}
async function Se(e) {
  (e.cronRunsScope === `job` && !e.cronRunsJobId) || (await K(e, e.cronRunsJobId, { append: !0 }));
}
function Ce(e, t) {
  ((e.cronRunsScope = t.cronRunsScope ?? e.cronRunsScope),
    Array.isArray(t.cronRunsStatuses) &&
      ((e.cronRunsStatuses = t.cronRunsStatuses),
      (e.cronRunsStatusFilter = t.cronRunsStatuses[0] ?? `all`)),
    Array.isArray(t.cronRunsDeliveryStatuses) &&
      (e.cronRunsDeliveryStatuses = t.cronRunsDeliveryStatuses),
    t.cronRunsStatusFilter &&
      ((e.cronRunsStatusFilter = t.cronRunsStatusFilter),
      (e.cronRunsStatuses = t.cronRunsStatusFilter === `all` ? [] : [t.cronRunsStatusFilter])),
    typeof t.cronRunsQuery == `string` && (e.cronRunsQuery = t.cronRunsQuery),
    (e.cronRunsSortDir = t.cronRunsSortDir ?? e.cronRunsSortDir));
}
function q(e, t, n) {
  ((e.cronEditingJob = t),
    (e.cronEditingJobId = t.id),
    (e.cronEditingConfigRevision = t.configRevision ?? null),
    (e.cronRunsJobId = t.id),
    (e.cronForm = n),
    (e.cronFieldErrors = T(n)));
}
function J(e, t) {
  q(e, t, H(t, e.cronForm));
}
function we(e, t) {
  let r = e.trim() || `Job`,
    i = `${r} copy`;
  if (!t.has(n(i))) return i;
  let a = 2;
  for (; a < 1e3;) {
    let e = `${r} copy ${a}`;
    if (!t.has(n(e))) return e;
    a += 1;
  }
  return `${r} copy ${Date.now()}`;
}
function Y(e, t) {
  (P(e), (e.cronRunsJobId = t.id));
  let r = new Set(e.cronJobs.map((e) => n(e.name))),
    i = H(t, e.cronForm);
  ((i.name = we(t.name, r)),
    i.payloadLocked &&
      ((i.payloadLocked = !1), (i.payloadKind = Z.payloadKind), (i.payloadText = ``)),
    (e.cronForm = i),
    (e.cronFieldErrors = T(e.cronForm)));
}
function Te(e, t) {
  (P(e), I(e, t));
}
var X, Z, Q;
function $() {
  return ($ = e(() => {
    (r(),
      v(),
      p(),
      a(),
      l(),
      c(),
      g(),
      (X = `last`),
      (Z = {
        name: ``,
        description: ``,
        agentId: ``,
        sessionKey: ``,
        clearAgent: !1,
        enabled: !0,
        deleteAfterRun: !1,
        scheduleKind: `every`,
        scheduleAt: ``,
        everyAmount: `30`,
        everyUnit: `minutes`,
        cronExpr: `0 7 * * *`,
        cronTz: ``,
        scheduleExact: !1,
        staggerAmount: ``,
        staggerUnit: `seconds`,
        triggerEnabled: !1,
        triggerScript: ``,
        triggerOnce: !1,
        sessionTarget: `isolated`,
        wakeMode: `now`,
        payloadKind: `agentTurn`,
        payloadLocked: !1,
        payloadText: ``,
        payloadModel: ``,
        payloadThinking: ``,
        payloadLightContext: !1,
        deliveryMode: `announce`,
        deliveryChannel: `last`,
        deliveryTo: ``,
        deliveryAccountId: ``,
        deliveryBestEffort: !1,
        deliveryThreadId: void 0,
        deliveryCompletionDestination: void 0,
        deliveryFailureDestination: void 0,
        failureAlertMode: `inherit`,
        failureAlertAfter: `2`,
        failureAlertCooldownSeconds: `3600`,
        failureAlertChannel: `last`,
        failureAlertTo: ``,
        failureAlertDeliveryMode: `announce`,
        failureAlertAccountId: ``,
        timeoutSeconds: ``,
      }),
      (Q = new WeakMap()));
  }))();
}
export {
  T as S,
  Y as _,
  de as a,
  ue as b,
  N as c,
  D as d,
  Se as f,
  be as g,
  re as h,
  x as i,
  ne as l,
  xe as m,
  Te as n,
  E as o,
  w as p,
  S as r,
  $ as s,
  _e as t,
  K as u,
  J as v,
  Ce as x,
  ve as y,
};
//# sourceMappingURL=cron-runtime-_BjI8iKO.js.map
