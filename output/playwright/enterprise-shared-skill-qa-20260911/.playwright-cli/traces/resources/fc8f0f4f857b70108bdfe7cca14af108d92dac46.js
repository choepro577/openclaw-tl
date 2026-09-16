import {
  $r as x,
  Br as S,
  Cr as C,
  Fr as w,
  Gr as T,
  Hr as ne,
  Ir as E,
  Jr as D,
  Kr as O,
  Lr as k,
  Mr as A,
  Nr as j,
  Pr as M,
  Qr as N,
  Rr as P,
  Sr as F,
  Ur as I,
  Vr as L,
  Wr as R,
  Xr as z,
  Yr as B,
  Zr as V,
  aa as H,
  br as U,
  ca as W,
  ci as G,
  da as K,
  ea as q,
  ei as re,
  fa as J,
  ia as Y,
  ii as X,
  li as ie,
  lr as ae,
  na as oe,
  ni as se,
  nr as ce,
  oa as le,
  pa as ue,
  qr as de,
  ra as fe,
  ri as pe,
  sa as me,
  ta as he,
  ti as Z,
  tr as ge,
  ua as _e,
  ur as ve,
  xr as ye,
  zr as be,
} from "./control-ui-boot-BkPDmfcr.js";
import { $r as xe, Zr as Se, wo as Ce } from "./control-ui-boot-D1_QZILW.js";
import {
  Ar as i,
  Ir as a,
  Mr as o,
  Pr as s,
  Rr as c,
  Wo as l,
  Xo as u,
  _i as ee,
  si as d,
  ts as te,
  zo as f,
} from "./control-ui-core-B5rJKETr.js";
import { Jr as p, Kr as m, br as h, fr as g } from "./control-ui-core-BOclcphE.js";
import { o as y, t as b } from "./control-ui-core-k5VGv3wu.js";
import { Kn as t, Ti as n, ji as r } from "./control-ui-foundation-CUUNgsy7.js";
import { Z as _, rt as v } from "./lit-runtime-BZcFnh9F.js";
import { n as e } from "./rolldown-runtime-DkW27tQK.js";
var Q;
function $() {
  return ($ = e(() => {
    (_(),
      g(),
      m(),
      b(),
      c(),
      Se(),
      o(),
      l(),
      ie(),
      J(),
      M(),
      D(),
      C(),
      U(),
      q(),
      ve(),
      ce(),
      (Q = class extends G {
        constructor(...e) {
          (super(...e),
            (this.sessionSortMode = oe()),
            (this.sessionData = new ge(this)),
            (this.sessionPullRequestIndicators = new F(this, {
              getConnected: () => this.connected,
              getRows: () =>
                w({
                  rows: this.visibleSessionRowsInOrder(),
                  adopted: K(this.visibleSessionCatalogs()),
                  sessionsResult: this.sessionData.sessionsResult,
                  sessionResultsByAgent: this.sessionData.sessionResultsByAgent,
                  navigationState: this.getSessionNavigationState(),
                }),
              getSelectedAgentId: () => this.selectedAgentIdForSessions(),
              getGateway: () => this.context?.gateway,
              getSessions: () => this.context?.sessions,
            })),
            (this.compareSidebarSessionRows = (e, t) =>
              R({
                a: e,
                b: t,
                sortMode: this.effectiveSessionSortMode(),
                owners: this.selectedAgentSessionResult()?.owners,
                createdOrder: this.sessionData.sessionCreatedOrder,
              })),
            (this.sessionOwnerFilterId = null),
            (this.sessionInvolvingMeFilterActive = !1),
            (this.sessionOwnerOptions = []),
            (this.activeSessionOwnerId = null),
            (this.sessionOwnershipVisible = !1),
            (this.selectedSessionKeys = new Set()),
            (this.expandedChildSessionKeys = new Set()),
            (this.collapsedActiveChildSessionKeys = new Set()),
            (this.fullyShownChildSessionKeys = new Set()),
            (this.sessionsGrouping = Y()),
            (this.sessionsShowCron = H()),
            (this.sessionsShowPreview = le()),
            (this.sessionsShowSystem = me()),
            (this.sessionsStatusFilter = fe()),
            (this.hiddenSessionCatalogIds = he()),
            (this.visibleSessionCatalogs = () =>
              ue(
                this.sessionData.sessionCatalogs,
                this.hiddenSessionCatalogIds,
                this.sessionsStatusFilter === `archived`,
              )),
            (this.sessionSelectionAnchor = null),
            (this.collapsedActiveRouteKey = null),
            (this.runtimeSampledAtByRow = new WeakMap()),
            (this.attention = new ae(this)),
            (this.selectSession = (e) => {
              let t = s(this.findSidebarSessionByKey(e)),
                n = a({
                  face: t,
                  sessionKey: e,
                  fallbackAgentId: this.selectedAgentIdForSessions(),
                  basePath: this.basePath,
                  row: this.findSidebarSessionByKey(e),
                  mainKey: this.sessionMainKey(),
                  preferenceDerivedFace: !0,
                  navigationKey: e,
                });
              xe(this, {
                commit: () => (
                  this.prepareSessionNavigation(e, n.options.pathname),
                  this.onNavigate?.(t, n.options),
                  this.bindLiteralSession(e, this.selectedAgentIdForSessions(), n.options),
                  !0
                ),
                face: t,
                sessionKey: e,
              });
            }),
            (this.replaceCurrentSession = (e) => {
              let t = s(this.findSidebarSessionByKey(e)),
                n = a({
                  face: t,
                  sessionKey: e,
                  fallbackAgentId: this.selectedAgentIdForSessions(),
                  basePath: this.basePath,
                  row: this.findSidebarSessionByKey(e),
                  mainKey: this.sessionMainKey(),
                  preferenceDerivedFace: !0,
                });
              (this.setApplicationSession(e, this.selectedAgentIdForSessions()),
                p(this.activeRouteId) && this.onNavigate?.(t, n.options));
            }),
            (this.expandAgent = (e) => {
              let t = this.context;
              if (!t) return;
              let r = n(e);
              if (r === n(this.expandedAgentId())) {
                t.agentSelection.setScope(r);
                return;
              }
              (this.clearSessionSelection(),
                (this.expandedChildSessionKeys = new Set()),
                this.sessionData.visibleSessionLimits.clear(),
                t.agentSelection.set(r),
                this.sessionData.refreshSidebarSessions(r));
            }),
            (this.knownSectionOrder = () => [...(this.context?.sessions.state.sectionOrder ?? [])]),
            (this.openMainSession = (e) => {
              if (!this.connected) {
                this.onNavigate?.(`appearance`);
                return;
              }
              (this.clearSessionSelection(),
                this.selectSession(this.selectedAgentMainSessionKey(n(e))));
            }));
        }
        sessionPeopleSortCapability() {
          return this.context?.gateway.snapshot.hello?.policy?.hasMultipleSessionSharingIdentities;
        }
        sessionPeopleSortAvailable() {
          return this.sessionPeopleSortCapability() === !0;
        }
        effectiveSessionSortMode() {
          return W(this.sessionSortMode, this.sessionPeopleSortAvailable());
        }
        effectiveSessionsGrouping() {
          let e = this.sessionsGrouping;
          return e === `person` && !this.sessionPeopleSortAvailable() ? `category` : e;
        }
        setSessionSortMode(e) {
          this.sessionSortMode = _e(e, this.sessionPeopleSortCapability());
        }
        get sessionOwnerFilterActive() {
          return this.activeSessionOwnerId !== null;
        }
        get sessionAttentionContext() {
          return this.context;
        }
        get sessionDataContext() {
          return this.context;
        }
        get collapsedSessionSections() {
          return this.sessionOrganizer.collapsedSessionSections;
        }
        dismissTransientMenus() {
          return this.sidebarMenus.dismissTransientMenus();
        }
        closeAgentMenu(e) {
          this.sidebarMenus.closeAgentMenu(e);
        }
        promoteCreatedSession(e) {
          z(this.sessionData.sessionCreatedOrder, e) && this.requestUpdate();
        }
        sessionPullRequestIndicatorState(e, t) {
          return this.sessionPullRequestIndicators.state(e, t);
        }
        updated(e) {
          super.updated(e);
          let t = this.sessionOwnerFilterId;
          (this.sessionSortMode === `people` &&
            this.sessionPeopleSortCapability() === !1 &&
            this.setSessionSortMode(`created`),
            t &&
              (!this.sessionOwnershipVisible ||
                !this.sessionOwnerOptions.some((e) => e.id === t)) &&
              ((this.sessionOwnerFilterId = null), this.context?.sessions.setOwnerFilter(null)));
          let n = p(this.activeRouteId) ? this.getRouteSessionKey() : ``;
          (n !== this.collapsedActiveRouteKey &&
            ((this.collapsedActiveRouteKey = n),
            this.collapsedActiveChildSessionKeys.size > 0 &&
              (this.collapsedActiveChildSessionKeys = new Set())),
            p(this.activeRouteId) && this.sessionData.loadActiveSessionLineage(n));
          let r = [...this.visibleSessionRowsInOrder()];
          for (; r.length > 0;) {
            let e = r.shift();
            e &&
              (r.push(...e.children),
              e.childSessionKeys.length > 0 &&
                this.isSessionChildrenExpanded(e) &&
                !this.sessionData.loadedChildSessionKeys.has(e.key) &&
                !this.sessionData.childSessionErrorsByParent.has(e.key) &&
                !this.sessionData.loadingChildSessionKeys.has(e.key) &&
                this.sessionData.loadChildSessions(e.key));
          }
          let i = this.mainSessionRow();
          i &&
            (i.childSessions?.length ?? 0) > 0 &&
            !this.sessionData.loadedChildSessionKeys.has(i.key) &&
            !this.sessionData.childSessionErrorsByParent.has(i.key) &&
            !this.sessionData.loadingChildSessionKeys.has(i.key) &&
            this.sessionData.loadChildSessions(i.key);
        }
        applySessionOwnerFilter(e, t) {
          let n = E({
            projected: e,
            ownerFacet: t,
            selectedOwnerId: this.sessionOwnerFilterId,
            self: this.context?.gateway.snapshot.selfUser,
          });
          return (
            (this.sessionOwnerOptions = n.ownerOptions),
            (this.sessionOwnershipVisible = n.ownershipVisible),
            (this.activeSessionOwnerId = n.activeOwnerId),
            n.rows
          );
        }
        getRouteSessionKey() {
          return this.sessionKey.trim() || this.context?.gateway.snapshot.sessionKey.trim() || ``;
        }
        getSessionNavigationState() {
          let e = this.getRouteSessionKey();
          return P({
            context: this.context,
            routeSessionKey: e,
            sessionsResult: this.sessionData.sessionsResult,
            activeSession: A(this.sessionData, e),
            sessionsAgentId: this.sessionData.sessionsAgentId,
            showCron: this.sessionsShowCron,
            showSystem: this.sessionsShowSystem,
            statusFilter: this.sessionsStatusFilter,
            compareSessions: this.compareSidebarSessionRows,
            highlightCurrentSession: p(this.activeRouteId),
            runtimeSampledAtByRow: this.runtimeSampledAtByRow,
            loadingChildSessionKeys: this.sessionData.loadingChildSessionKeys,
            outboxAttentionCountForSessionKey: this.outboxAttentionCountForSession,
            hasSessionDraft: (e) => this.hasSessionDraft(e),
            resolveAttention: (e) => this.attention.resolveSessionAttention(e),
            resolveAgentStatusNote: (e) => this.attention.resolveSessionAgentStatus(e)?.note,
          });
        }
        selectedAgentIdForSessions() {
          return this.getSessionNavigationState().selectedAgentId;
        }
        sidebarSessionStatusFilter() {
          return this.sessionsStatusFilter;
        }
        zonedVisibleSections(e) {
          let t = this.effectiveSessionsGrouping();
          return B({
            rows: e,
            grouping: t,
            knownGroups: t === `category` ? this.knownSessionGroups() : [],
            selfOwnerId: this.context?.gateway.snapshot.selfUser?.id ?? null,
            sectionOrder: this.knownSectionOrder(),
            catalogIds:
              this.sessionsStatusFilter === `archived`
                ? []
                : this.visibleSessionCatalogs().map((e) => e.id),
            collapsedSections: this.collapsedSessionSections,
            hideEmptyOwnerFilteredGroup: (e, t) => this.sessionOwnerFilterActive && !!e && t === 0,
            visibleSessionLimits: this.sessionData.visibleSessionLimits,
          });
        }
        reconciledSidebarZone() {
          let e = this.getSessionNavigationState(),
            t = this.selectedAgentSessionRows(e);
          return k({
            sidebarEntries: this.sidebarEntries,
            rows: t,
            workboardBoards: this.workboardBoards,
            enabledRouteIds: this.enabledRouteIds,
            workboardBoardsReady: this.workboardBoardsReady,
            controlUiTabs: this.context?.gateway.snapshot.hello?.controlUiTabs,
          });
        }
        pruneSidebarSessionEntry(e) {
          let t = h({ type: `session`, key: e });
          this.sidebarEntries.includes(t) &&
            this.onUpdateSidebarEntries?.(this.sidebarEntries.filter((e) => e !== t));
        }
        visibleSessionRowsInOrder() {
          let e = this.getSessionNavigationState(),
            t = this.selectedAgentSessionRows(e),
            { visibleRows: n } = this.zonedVisibleSections(t),
            r = new Map(t.filter((e) => e.pinned).map((e) => [e.key, e]));
          return [
            ...this.reconciledSidebarZone().entries.flatMap((e) => {
              let t = e.type === `session` ? r.get(e.key) : void 0;
              return t ? [t] : [];
            }),
            ...n,
          ];
        }
        selectedVisibleSessions() {
          return this.selectedSessionKeys.size === 0
            ? []
            : this.visibleSessionRowsInOrder().filter((e) => this.selectedSessionKeys.has(e.key));
        }
        handleSessionRowClick(e, t) {
          if (t.isChild && Ce(e)) {
            (e.preventDefault(), this.clearSessionSelection(), this.selectSession(t.key));
            return;
          }
          if (!(t.isChild || e.defaultPrevented || e.button !== 0) && !(e.metaKey || e.ctrlKey)) {
            if (e.shiftKey) {
              (e.preventDefault(), this.extendSessionSelection(t.key));
              return;
            }
            if (e.altKey) {
              (e.preventDefault(), this.toggleSessionSelected(t.key));
              return;
            }
            (e.preventDefault(), this.clearSessionSelection(), this.selectSession(t.key));
          }
        }
        toggleSessionSelected(e) {
          let t = X(this.selectedSessionKeys, e);
          ((this.sessionSelectionAnchor = t.anchor), (this.selectedSessionKeys = t.selectedKeys));
        }
        extendSessionSelection(e) {
          let t = T({
            rows: this.visibleSessionRowsInOrder(),
            anchor: this.sessionSelectionAnchor,
            key: e,
          });
          ((this.sessionSelectionAnchor = t.anchor), (this.selectedSessionKeys = t.selectedKeys));
        }
        clearSessionSelection() {
          ((this.sessionSelectionAnchor = null),
            this.selectedSessionKeys.size > 0 && (this.selectedSessionKeys = new Set()));
        }
        expandedAgentId() {
          let e = r(this.context?.agentSelection.state.selectedId);
          return n(e || this.getSessionNavigationState().selectedAgentId);
        }
        activeChipAgent() {
          return V({
            activeId: this.expandedAgentId(),
            roster: this.context?.agents.state.agentsList?.agents ?? [],
            identities: this.context?.agentIdentity.entries() ?? [],
          });
        }
        latestAgentSessionRow(e) {
          return N({ agentId: e, sessionData: this.sessionData, context: this.context });
        }
        agentResumeKey(e) {
          let t = this.latestAgentSessionRow(e);
          return re(t, e, this.sessionMainKey());
        }
        openAgentConversation(e) {
          if (!this.connected) {
            this.onNavigate?.(`appearance`);
            return;
          }
          this.selectSession(this.agentResumeKey(e));
        }
        agentChipSubtitle(e) {
          return x(this.latestAgentSessionRow(e));
        }
        switchChipAgent(e) {
          (this.closeAgentMenu(), this.expandAgent(e), this.openAgentConversation(e));
        }
        askAgentCapabilities(e) {
          if ((this.closeAgentMenu(), !this.connected)) return;
          let t = this.agentResumeKey(e),
            n = a({
              face: `chat`,
              sessionKey: t,
              fallbackAgentId: e,
              basePath: this.basePath,
              row: this.findSidebarSessionByKey(t),
              mainKey: this.sessionMainKey(),
            });
          (this.setApplicationSession(t, this.selectedAgentIdForSessions()),
            this.onNavigate?.(`chat`, {
              ...n.options,
              search: i(y(`chat.welcome.suggestions.whatCanYouDo`)),
            }));
        }
        knownSessionGroups() {
          return L(
            this.context?.sessions.state.groups ?? [],
            this.sessionData.sessionsResult?.sessions ?? [],
          );
        }
        knownSessionCatalogIds() {
          return S({
            loadedCatalogIds: this.sessionData.sessionCatalogs.map((e) => e.id),
            hasLoaded: this.sessionData.sessionCatalogRefreshStatus.hasLoaded,
            sectionOrder: this.knownSectionOrder(),
          });
        }
        findSidebarSessionByKey(e) {
          let t = this.getSessionNavigationState();
          return O({
            sessionKey: e,
            navigationState: t,
            sessionResultsByAgent: this.sessionData.sessionResultsByAgent,
          });
        }
        findSidebarHovercardRowByKey(e) {
          return j(this, e);
        }
        selectedAgentSessionRows(e) {
          let t = K(this.visibleSessionCatalogs()),
            r = this.expandedAgentId(),
            i = n(this.sessionData.sessionsAgentId ?? ``),
            a = n(e.selectedAgentId),
            o = {
              agentId: r,
              defaultAgentId: te({
                agentsList: this.context?.agents.state.agentsList,
                hello: this.context?.gateway.snapshot.hello,
              }),
              filterByAgent: !0,
              showCron: this.sessionsShowCron,
              showSystem: this.sessionsShowSystem,
              archivedFilter: this.sessionsStatusFilter,
            },
            s =
              r === i
                ? (this.sessionData.sessionsResult?.sessions ?? [])
                : (this.sessionData.sessionResultsByAgent[r]?.sessions ?? []),
            c = new Map(s.map((e) => [e.key, e])),
            l =
              r === a && r === i
                ? e.visibleSessionRows.flatMap((e) => {
                    let t = c.get(e.key);
                    return t ? [t] : [];
                  })
                : d(s, o).toSorted(this.compareSidebarSessionRows),
            p = this.selectedAgentMainSessionKey(r),
            m = this.sessionData.activeSessionLineageRoot,
            h = n(u(m?.key ?? ``)?.agentId ?? ``),
            g = e.visibleSessionRows.find(
              (n) =>
                (r === a || h === r) && n.key === e.activeRowKey && !t.has(n.key) && !f(n.key, p),
            ),
            _ = new Set([p]),
            v = l.filter((e) => !f(e.key, p) || (_.add(e.key), !1)),
            y = n(u(e.routeSessionKey)?.agentId ?? ``),
            b = !!(m && f(m.key, e.routeSessionKey));
          m &&
            (b || ee(m, this.sessionsStatusFilter)) &&
            (h === r || y === r) &&
            !t.has(m.key) &&
            !f(m.key, p) &&
            !v.some((e) => e.key === m.key) &&
            v.push(m);
          let x = I({ rows: s, childRowsByParent: this.sessionData.childSessionRowsByParent }),
            S = be({ rows: x, scopedRoots: v, visibilityOptions: o });
          v.push(...S);
          let C = new Set(v.map((e) => e.key)),
            w = ne({
              rows: x,
              mainSessionKeys: _,
              scopedRootKeys: C,
              showCron: this.sessionsShowCron,
              showSystem: this.sessionsShowSystem,
            });
          for (let e of w) C.has(e.key) || (C.add(e.key), v.push(e));
          let T = w.length > 0 || S.length > 0 ? v.toSorted(this.compareSidebarSessionRows) : v,
            E = ye({
              roots: T.filter((e) => !t.has(e.key)),
              agentRows: s,
              childRowsByParent: this.sessionData.childSessionRowsByParent,
              loadingChildKeys: this.sessionData.loadingChildSessionKeys,
              knownSessionAttention: this.attention.knownSessionAttention(),
              toSidebarSession: e.toSidebarSession,
            });
          g && !pe(E, (e) => e.key === g.key) && E.unshift(e.toSidebarSession(g));
          let D =
            r === i
              ? this.sessionData.sessionsResult?.owners
              : this.sessionData.sessionResultsByAgent[r]?.owners;
          return this.applySessionOwnerFilter(E, D);
        }
        selectedAgentSessionResult() {
          let e = this.expandedAgentId();
          return e === n(this.sessionData.sessionsAgentId ?? ``)
            ? this.sessionData.sessionsResult
            : (this.sessionData.sessionResultsByAgent[e] ?? null);
        }
        selectedAgentMainSessionKey(e) {
          return se({
            agentId: e ?? this.expandedAgentId(),
            agentsList: this.context?.agents.state.agentsList,
            hello: this.context?.gateway.snapshot.hello,
          });
        }
        resolveHomeSessionAttention(e, t) {
          return Z(this.attention, e, t);
        }
        mainSessionRow(e) {
          let t = n(e ?? this.expandedAgentId()),
            r = this.selectedAgentMainSessionKey(t),
            i =
              t === n(this.sessionData.sessionsAgentId ?? ``)
                ? (this.sessionData.sessionsResult?.sessions ?? [])
                : (this.sessionData.sessionResultsByAgent[t]?.sessions ?? []);
          return de(i, r);
        }
        isSessionChildrenExpanded(e) {
          return (
            this.expandedChildSessionKeys.has(e.key) ||
            (e.containsActiveDescendant && !this.collapsedActiveChildSessionKeys.has(e.key))
          );
        }
        toggleSessionChildren(e) {
          let t = new Set(this.expandedChildSessionKeys),
            n = new Set(this.collapsedActiveChildSessionKeys),
            r = new Set(this.fullyShownChildSessionKeys);
          (this.isSessionChildrenExpanded(e)
            ? (t.delete(e.key),
              r.delete(e.key),
              e.containsActiveDescendant && n.add(e.key),
              this.sessionData.discardEmptyChildSessionSnapshot(e.key))
            : (t.add(e.key), n.delete(e.key), this.sessionData.retryChildSessions(e.key)),
            (this.expandedChildSessionKeys = t),
            (this.collapsedActiveChildSessionKeys = n),
            (this.fullyShownChildSessionKeys = r));
        }
        showMoreChildren(e) {
          this.fullyShownChildSessionKeys = new Set(this.fullyShownChildSessionKeys).add(e);
        }
        agentUnreadCount(e) {
          return (this.sessionData.sessionResultsByAgent[n(e)]?.sessions ?? []).filter(
            (e) => e.unread === !0 && e.archived !== !0,
          ).length;
        }
      }),
      t([v()], Q.prototype, `sessionSortMode`, void 0),
      t([v()], Q.prototype, `sessionOwnerFilterId`, void 0),
      t([v()], Q.prototype, `sessionInvolvingMeFilterActive`, void 0),
      t([v()], Q.prototype, `selectedSessionKeys`, void 0),
      t([v()], Q.prototype, `expandedChildSessionKeys`, void 0),
      t([v()], Q.prototype, `collapsedActiveChildSessionKeys`, void 0),
      t([v()], Q.prototype, `fullyShownChildSessionKeys`, void 0),
      t([v()], Q.prototype, `sessionsGrouping`, void 0),
      t([v()], Q.prototype, `sessionsShowCron`, void 0),
      t([v()], Q.prototype, `sessionsShowPreview`, void 0),
      t([v()], Q.prototype, `sessionsShowSystem`, void 0),
      t([v()], Q.prototype, `sessionsStatusFilter`, void 0),
      t([v()], Q.prototype, `hiddenSessionCatalogIds`, void 0));
  }))();
}
export { $ as n, Q as t };
//# sourceMappingURL=session-navigation-runtime-BnHifKSI.js.map
