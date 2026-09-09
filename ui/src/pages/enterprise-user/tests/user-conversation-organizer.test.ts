/* @vitest-environment jsdom */

import { nothing, render } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GatewaySessionRow, SessionsListResult } from "../../../api/types.ts";
import type { RouteId } from "../../../app-route-paths.ts";
import type { ApplicationContext } from "../../../app/context.ts";
import { SESSION_DRAG_MIME } from "../../../lib/sessions/drag.ts";
import type {
  SessionListScope,
  SessionListSnapshot,
} from "../../../lib/sessions/session-capability.ts";
import {
  enterpriseConversationTitle,
  type EnterpriseUserConversationDragController,
} from "../components/user-conversation-drag-controller.ts";
import { organizeEnterpriseUserSessions } from "../components/user-conversation-organization.ts";
import { EnterpriseUserConversationOrganizer } from "../components/user-conversation-organizer.ts";
import type { EnterpriseConversationProject } from "../services/user-enterprise-api.ts";

type MutableConversationOrganizer = {
  sessions: GatewaySessionRow[];
  projects: EnterpriseConversationProject[];
  loading: boolean;
  busyKey: string;
  dragController: EnterpriseUserConversationDragController;
  context?: ApplicationContext<RouteId>;
  moveToProject: (
    row: GatewaySessionRow,
    projectId: string | null,
    beforeSessionKey?: string | null,
  ) => Promise<void>;
  sessionListScope: () => SessionListScope;
  subscribeSessionList: (context: ApplicationContext<RouteId>, scope: SessionListScope) => void;
  render(): unknown;
};

function createDataTransferStub() {
  const data = new Map<string, string>();
  return {
    get types() {
      return [...data.keys()];
    },
    setData: (type: string, value: string) => void data.set(type, value),
    getData: (type: string) => data.get(type) ?? "",
    setDragImage: vi.fn(),
    effectAllowed: "none",
    dropEffect: "none",
  };
}

function dispatchDragEvent(
  target: Element,
  type: "dragstart" | "dragover" | "dragleave" | "drop" | "dragend",
  dataTransfer: ReturnType<typeof createDataTransferStub>,
  clientY = 0,
): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
  Object.defineProperty(event, "clientY", { value: clientY });
  target.dispatchEvent(event);
  return event;
}

function session(key: string, patch: Partial<GatewaySessionRow> = {}): GatewaySessionRow {
  return {
    key,
    kind: "direct",
    updatedAt: 1,
    pinned: false,
    archived: false,
    ...patch,
  } as GatewaySessionRow;
}

function project(id: string, name: string, sessionKeys: string[]): EnterpriseConversationProject {
  return { id, name, sessionKeys, position: 0, createdAt: 1, updatedAt: 1 };
}

describe("Enterprise User conversation organizer", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
  });

  afterEach(() => {
    render(nothing, container);
    container.remove();
    document.querySelectorAll(".eu-session-drag-preview").forEach((preview) => preview.remove());
  });

  it("places pinned chats first, Project chats in their Project, and the remainder in Recent", () => {
    const pinned = session("pinned", { pinned: true });
    const projectChat = session("project-chat");
    const recent = session("recent");

    expect(
      organizeEnterpriseUserSessions(
        [pinned, projectChat, recent],
        [project("project-1", "Launch", ["project-chat"])],
      ),
    ).toEqual({
      pinned: [pinned],
      projects: [
        {
          project: project("project-1", "Launch", ["project-chat"]),
          sessions: [projectChat],
        },
      ],
      recent: [recent],
    });
  });

  it("keeps a pinned Project chat assigned without rendering it twice", () => {
    const pinnedProjectChat = session("pinned-project", { pinned: true });
    const launch = project("project-1", "Launch", ["pinned-project", "deleted-chat"]);

    expect(organizeEnterpriseUserSessions([pinnedProjectChat], [launch])).toEqual({
      pinned: [pinnedProjectChat],
      projects: [{ project: launch, sessions: [] }],
      recent: [],
    });
  });

  it("does not treat archived rows as pinned", () => {
    const archived = session("archived", { archived: true, pinned: true });

    expect(organizeEnterpriseUserSessions([archived], [])).toEqual({
      pinned: [],
      projects: [],
      recent: [archived],
    });
  });

  it("uses the Gateway-derived title when the user has not renamed the chat", () => {
    expect(
      enterpriseConversationTitle(
        session("agent:main:dashboard:chat-1", { derivedTitle: "Plan the quarterly launch" }),
      ),
    ).toBe("Plan the quarterly launch");
    expect(
      enterpriseConversationTitle(
        session("agent:main:dashboard:chat-1", {
          label: "Launch room",
          derivedTitle: "Plan the quarterly launch",
        }),
      ),
    ).toBe("Launch room");
  });

  it("updates a visible title when the subscribed Gateway session list publishes it", () => {
    let publish: ((snapshot: SessionListSnapshot) => void) | undefined;
    const initial = session("agent:main:dashboard:chat-1");
    const snapshot = (row: GatewaySessionRow): SessionListSnapshot => ({
      result: { sessions: [row] } as SessionsListResult,
      agentId: null,
      loading: false,
      error: null,
    });
    const sessions = {
      subscribeList: vi.fn((_scope: SessionListScope, listener: typeof publish) => {
        publish = listener;
        return vi.fn();
      }),
      listSnapshot: vi.fn(() => snapshot(initial)),
    };
    const context = {
      sessions,
      gateway: { snapshot: { sessionKey: "" } },
    } as unknown as ApplicationContext<RouteId>;
    const organizer =
      new EnterpriseUserConversationOrganizer() as unknown as MutableConversationOrganizer;
    organizer.context = context;
    organizer.loading = false;
    organizer.subscribeSessionList(context, organizer.sessionListScope());

    render(organizer.render(), container);
    expect(container.querySelector(".eu-session-row__open")?.textContent?.trim()).toBe(
      "New session",
    );

    publish?.(snapshot(session(initial.key, { derivedTitle: "Prepare customer kickoff" })));
    render(organizer.render(), container);
    expect(container.querySelector(".eu-session-row__open")?.textContent?.trim()).toBe(
      "Prepare customer kickoff",
    );
  });

  it("shows the canonical run spinner only while a conversation run is active", () => {
    const organizer =
      new EnterpriseUserConversationOrganizer() as unknown as MutableConversationOrganizer;
    organizer.context = {
      gateway: { snapshot: { sessionKey: "running" } },
    } as unknown as ApplicationContext<RouteId>;
    organizer.sessions = [
      session("running", { hasActiveRun: true, status: "running" }),
      session("stale-running", { hasActiveRun: false, status: "running" }),
      session("finished", { hasActiveRun: true, status: "done" }),
    ];
    organizer.loading = false;

    render(organizer.render(), container);

    const running = container.querySelector<HTMLElement>('[data-session-key="running"]')!;
    expect(running.classList.contains("eu-session-row--active")).toBe(true);
    expect(running.classList.contains("eu-session-row--running")).toBe(true);
    expect(running.querySelector('.session-run-spinner[aria-label="Active run"]')).not.toBeNull();
    expect(running.querySelector(".session-run-spinner")?.hasAttribute("title")).toBe(false);
    expect(
      container.querySelector('[data-session-key="stale-running"] .session-run-spinner'),
    ).toBeNull();
    expect(
      container.querySelector('[data-session-key="finished"] .session-run-spinner'),
    ).toBeNull();
  });

  it("renders conversation rows without leading chat, pin, or archive icons", () => {
    const organizer =
      new EnterpriseUserConversationOrganizer() as unknown as MutableConversationOrganizer;
    organizer.sessions = [
      session("plain"),
      session("pinned", { pinned: true }),
      session("archived", { archived: true }),
    ];
    organizer.loading = false;

    render(organizer.render(), container);

    expect(container.querySelectorAll(".eu-session-row")).toHaveLength(3);
    expect(container.querySelector(".eu-session-row__icon")).toBeNull();
    expect(
      Array.from(container.querySelectorAll(".eu-session-row__open")).map((row) =>
        row.textContent?.trim(),
      ),
    ).toEqual(["pinned", "plain", "archived"]);
    const marquees = container.querySelectorAll<HTMLElement>(
      '.eu-session-title-marquee.hover-marquee[data-hover-marquee-mode="codex"]',
    );
    expect(marquees).toHaveLength(3);
    for (const marquee of marquees) {
      expect(marquee.querySelector(".eu-session-title-marquee__clip")).not.toBeNull();
      expect(marquee.querySelector(".eu-session-title-marquee__track")).not.toBeNull();
      expect(marquee.querySelector("[data-hover-marquee-content]")).not.toBeNull();
    }
  });

  it("shows five sessions per group and reveals five more only in the selected group", () => {
    const organizer =
      new EnterpriseUserConversationOrganizer() as unknown as MutableConversationOrganizer;
    const planned = Array.from({ length: 11 }, (_, i) => session(`planned-${i}`));
    const other = Array.from({ length: 5 }, (_, i) => session(`other-${i}`));
    const recent = Array.from({ length: 6 }, (_, i) => session(`recent-${i}`));
    const pinned = Array.from({ length: 6 }, (_, i) => session(`pinned-${i}`, { pinned: true }));
    organizer.sessions = [...planned, ...other, ...recent, ...pinned];
    organizer.projects = [
      project(
        "planning",
        "Planning",
        planned.map((row) => row.key),
      ),
      project(
        "other",
        "Other",
        other.map((row) => row.key),
      ),
    ];
    organizer.loading = false;
    const refresh = () => render(organizer.render(), container);
    const counts = () =>
      [...container.querySelectorAll(".eu-session-section")].map(
        (section) => section.querySelectorAll(".eu-session-row").length,
      );
    refresh();
    expect(counts()).toEqual([5, 5, 5, 5]);
    expect(container.querySelector('[data-project-id="other"] .eu-session-show-more')).toBeNull();
    const more = () =>
      container.querySelector<HTMLButtonElement>(
        '[data-project-id="planning"] .eu-session-show-more',
      );
    more()!.click();
    refresh();
    expect(counts()).toEqual([5, 10, 5, 5]);
    more()!.click();
    refresh();
    expect(counts()).toEqual([5, 11, 5, 5]);
    expect(more()).toBeNull();
    container.querySelector<HTMLButtonElement>(".eu-session-recent .eu-session-show-more")!.click();
    refresh();
    expect(counts()).toEqual([5, 11, 5, 6]);
    expect(container.querySelector(".eu-session-recent .eu-session-show-more")).toBeNull();
    expect(organizer.sessions).toHaveLength(28);
  });

  it("toggles Projects and Recent independently without losing their children", () => {
    const organizer =
      new EnterpriseUserConversationOrganizer() as unknown as MutableConversationOrganizer;
    organizer.sessions = [
      session("planned"),
      ...Array.from({ length: 6 }, (_, i) => session(`recent-${i}`)),
    ];
    organizer.projects = [project("planning", "Planning", ["planned"])];
    organizer.loading = false;
    const refresh = () => render(organizer.render(), container);
    const projectsToggle = () =>
      container.querySelector<HTMLButtonElement>(
        ".eu-session-organizer__toolbar > .eu-session-heading-toggle",
      )!;
    const recentToggle = () =>
      container.querySelector<HTMLButtonElement>(
        ".eu-session-recent > .eu-session-heading-toggle",
      )!;
    refresh();
    expect(container.querySelectorAll(".eu-session-organizer__toolbar > div button")).toHaveLength(
      1,
    );
    expect(projectsToggle().getAttribute("aria-expanded")).toBe("true");
    expect(projectsToggle().querySelector("svg")).toBeNull();
    expect(recentToggle().querySelector("svg")).toBeNull();
    projectsToggle().click();
    refresh();
    expect(projectsToggle().getAttribute("aria-expanded")).toBe("false");
    expect(projectsToggle().querySelector("svg")).not.toBeNull();
    expect(container.querySelector(".eu-session-project")).toBeNull();
    expect(container.querySelectorAll(".eu-session-recent .eu-session-row")).toHaveLength(5);
    recentToggle().click();
    refresh();
    expect(recentToggle().getAttribute("aria-expanded")).toBe("false");
    expect(recentToggle().querySelector("svg")).not.toBeNull();
    expect(container.querySelector(".eu-session-recent .eu-session-show-more")).toBeNull();
    expect(container.querySelector(".eu-session-recent .eu-session-row")).toBeNull();
    projectsToggle().click();
    recentToggle().click();
    refresh();
    expect(container.querySelector('[data-session-key="planned"]')).not.toBeNull();
    expect(container.querySelectorAll(".eu-session-recent .eu-session-row")).toHaveLength(5);
    expect(container.querySelector(".eu-session-recent .eu-session-show-more")).not.toBeNull();
    expect(organizer.sessions).toHaveLength(7);
    expect(projectsToggle().querySelector("svg")).toBeNull();
    expect(recentToggle().querySelector("svg")).toBeNull();
  });

  it("changes the folder icon when a Project is collapsed and expanded", () => {
    const organizer =
      new EnterpriseUserConversationOrganizer() as unknown as MutableConversationOrganizer;
    organizer.sessions = [];
    organizer.projects = [project("project-1", "Planning", [])];
    organizer.loading = false;
    render(organizer.render(), container);
    const toggle = () => container.querySelector<HTMLButtonElement>(".eu-session-section__toggle")!;
    const icon = () => toggle().querySelector("svg")!.innerHTML;
    const openIcon = icon();
    expect(toggle().getAttribute("aria-expanded")).toBe("true");
    expect(toggle().querySelectorAll("svg")).toHaveLength(1);
    toggle().click();
    render(organizer.render(), container);
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
    expect(icon()).not.toBe(openIcon);
    toggle().click();
    render(organizer.render(), container);
    expect(toggle().getAttribute("aria-expanded")).toBe("true");
    expect(icon()).toBe(openIcon);
  });

  it("elevates a Project header while its actions menu is open", () => {
    const organizer =
      new EnterpriseUserConversationOrganizer() as unknown as MutableConversationOrganizer;
    organizer.sessions = [];
    organizer.projects = [project("project-1", "Planning", [])];
    organizer.loading = false;

    render(organizer.render(), container);
    expect(
      container.querySelector(".eu-session-project .eu-session-section__folder-icon > svg"),
    ).not.toBeNull();
    container
      .querySelector<HTMLButtonElement>(
        ".eu-session-project .eu-session-actions > .eu-session-actions__trigger",
      )!
      .click();
    render(organizer.render(), container);

    expect(
      container
        .querySelector(".eu-session-project .eu-session-section__header")
        ?.classList.contains("eu-session-section__header--menu-open"),
    ).toBe(true);
    expect(container.querySelector(".eu-session-project .eu-session-actions__menu")).not.toBeNull();
  });

  it("reuses the canonical session drag payload and marks an eligible Project drop target", () => {
    const chat = session("chat-1", { displayName: "Quarterly plan" });
    const sourceProject = project("project-1", "Planning", [chat.key]);
    const targetProject = project("project-2", "Delivery", []);
    const organizer =
      new EnterpriseUserConversationOrganizer() as unknown as MutableConversationOrganizer;
    organizer.sessions = [chat];
    organizer.projects = [sourceProject, targetProject];
    organizer.loading = false;
    organizer.busyKey = "";
    const moveToProject = vi.fn(async () => {});
    organizer.moveToProject = moveToProject;

    render(organizer.render(), container);
    expect(
      container.querySelector(`[data-project-id="${sourceProject.id}"] .eu-session-section__count`),
    ).toBeNull();
    let row = container.querySelector<HTMLElement>(`[data-session-key="${chat.key}"]`)!;
    const dragControl = row.querySelector<HTMLElement>(".eu-session-row__open")!;
    expect(dragControl.getAttribute("draggable")).toBe("true");
    expect(row.querySelector(".eu-session-row__drag-handle")).toBeNull();

    const dataTransfer = createDataTransferStub();
    dispatchDragEvent(dragControl, "dragstart", dataTransfer);
    expect(dataTransfer.types).toContain(SESSION_DRAG_MIME);
    expect(dataTransfer.effectAllowed).toBe("copyMove");
    expect(dataTransfer.setDragImage).toHaveBeenCalledOnce();
    expect(document.querySelector(".eu-session-drag-preview__marker")).toBeNull();

    render(organizer.render(), container);
    row = container.querySelector<HTMLElement>(`[data-session-key="${chat.key}"]`)!;
    expect(row.classList.contains("eu-session-row--dragging")).toBe(true);

    let target = container.querySelector<HTMLElement>(`[data-project-id="${targetProject.id}"]`)!;
    const dragOver = dispatchDragEvent(target, "dragover", dataTransfer);
    expect(dragOver.defaultPrevented).toBe(true);
    expect(dataTransfer.dropEffect).toBe("move");

    render(organizer.render(), container);
    target = container.querySelector<HTMLElement>(`[data-project-id="${targetProject.id}"]`)!;
    expect(target.classList.contains("eu-session-project--session-drop")).toBe(true);
    expect(target.querySelector(".eu-session-drop-indicator")).not.toBeNull();

    dispatchDragEvent(target, "drop", dataTransfer);
    expect(moveToProject).toHaveBeenCalledWith(chat, targetProject.id, null);
    expect(organizer.dragController.draggingSessionKey).toBeNull();
    expect(organizer.dragController.sessionDropTarget).toBeNull();
  });

  it("does not accept a session dropped back into its current Project", () => {
    const chat = session("chat-1");
    const currentProject = project("project-1", "Planning", [chat.key]);
    const organizer =
      new EnterpriseUserConversationOrganizer() as unknown as MutableConversationOrganizer;
    organizer.sessions = [chat];
    organizer.projects = [currentProject];
    organizer.loading = false;
    organizer.busyKey = "";
    organizer.moveToProject = vi.fn(async () => {});

    render(organizer.render(), container);
    const row = container.querySelector<HTMLElement>(`[data-session-key="${chat.key}"]`)!;
    const dragControl = row.querySelector<HTMLElement>(".eu-session-row__open")!;
    const target = container.querySelector<HTMLElement>(
      `[data-project-id="${currentProject.id}"]`,
    )!;
    const dataTransfer = createDataTransferStub();
    dispatchDragEvent(dragControl, "dragstart", dataTransfer);

    const dragOver = dispatchDragEvent(target, "dragover", dataTransfer);
    expect(dragOver.defaultPrevented).toBe(false);
    expect(dataTransfer.dropEffect).toBe("none");
    dispatchDragEvent(target, "drop", dataTransfer);
    expect(organizer.moveToProject).not.toHaveBeenCalled();
  });

  it("marks and persists the exact insertion position inside the current Project", () => {
    const first = session("chat-1");
    const second = session("chat-2");
    const third = session("chat-3");
    const planning = project("project-1", "Planning", [first.key, second.key, third.key]);
    const organizer =
      new EnterpriseUserConversationOrganizer() as unknown as MutableConversationOrganizer;
    organizer.sessions = [first, second, third];
    organizer.projects = [planning];
    organizer.loading = false;
    organizer.busyKey = "";
    const moveToProject = vi.fn(async () => {});
    organizer.moveToProject = moveToProject;

    render(organizer.render(), container);
    const source = container.querySelector<HTMLElement>(`[data-session-key="${third.key}"]`)!;
    const target = container.querySelector<HTMLElement>(`[data-project-id="${planning.id}"]`)!;
    const firstRow = container.querySelector<HTMLElement>(`[data-session-key="${first.key}"]`)!;
    vi.spyOn(firstRow, "getBoundingClientRect").mockReturnValue({
      top: 10,
      bottom: 44,
      height: 34,
      left: 0,
      right: 200,
      width: 200,
      x: 0,
      y: 10,
      toJSON: () => ({}),
    });
    const dataTransfer = createDataTransferStub();
    dispatchDragEvent(source.querySelector(".eu-session-row__open")!, "dragstart", dataTransfer);
    dispatchDragEvent(target, "dragover", dataTransfer, 12);

    render(organizer.render(), container);
    const marker = container.querySelector<HTMLElement>(".eu-session-drop-indicator")!;
    expect(marker.nextElementSibling?.getAttribute("data-session-key")).toBe(first.key);

    dispatchDragEvent(
      container.querySelector<HTMLElement>(`[data-project-id="${planning.id}"]`)!,
      "drop",
      dataTransfer,
      12,
    );
    expect(moveToProject).toHaveBeenCalledWith(third, planning.id, first.key);
  });

  it("keeps an active pointer drag from being replaced by native HTML drag", () => {
    const chat = session("chat-1");
    const organizer =
      new EnterpriseUserConversationOrganizer() as unknown as MutableConversationOrganizer;
    organizer.sessions = [chat];
    organizer.projects = [project("project-1", "Planning", [])];
    organizer.loading = false;
    organizer.busyKey = "";
    (
      organizer.dragController as unknown as {
        pointerDrag: { pointerId: number; sessionKey: string; active: boolean };
      }
    ).pointerDrag = { pointerId: 1, sessionKey: chat.key, active: true };

    render(organizer.render(), container);
    const dataTransfer = createDataTransferStub();
    const dragStart = dispatchDragEvent(
      container.querySelector(".eu-session-row__open")!,
      "dragstart",
      dataTransfer,
    );

    expect(dragStart.defaultPrevented).toBe(true);
    expect(dataTransfer.types).not.toContain(SESSION_DRAG_MIME);
  });

  it("moves a Project chat back to Recent through the same drag payload", () => {
    const chat = session("chat-1", { derivedTitle: "Review launch risks" });
    const currentProject = project("project-1", "Planning", [chat.key]);
    const organizer =
      new EnterpriseUserConversationOrganizer() as unknown as MutableConversationOrganizer;
    organizer.sessions = [chat];
    organizer.projects = [currentProject];
    organizer.loading = false;
    organizer.busyKey = "";
    const moveToProject = vi.fn(async () => {});
    organizer.moveToProject = moveToProject;

    render(organizer.render(), container);
    const row = container.querySelector<HTMLElement>(`[data-session-key="${chat.key}"]`)!;
    const recent = container.querySelector<HTMLElement>(".eu-session-recent")!;
    const dataTransfer = createDataTransferStub();
    dispatchDragEvent(row.querySelector(".eu-session-row__open")!, "dragstart", dataTransfer);

    const dragOver = dispatchDragEvent(recent, "dragover", dataTransfer);
    expect(dragOver.defaultPrevented).toBe(true);
    render(organizer.render(), container);
    const activeRecent = container.querySelector<HTMLElement>(".eu-session-recent")!;
    expect(activeRecent.classList.contains("eu-session-recent--session-drop")).toBe(true);

    dispatchDragEvent(activeRecent, "drop", dataTransfer);
    expect(moveToProject).toHaveBeenCalledWith(chat, null, undefined);
  });

  it("keeps pinned chats stable instead of offering a drag that cannot change their section", () => {
    const pinned = session("pinned", { pinned: true });
    const organizer =
      new EnterpriseUserConversationOrganizer() as unknown as MutableConversationOrganizer;
    organizer.sessions = [pinned];
    organizer.projects = [project("project-1", "Planning", [pinned.key])];
    organizer.loading = false;
    organizer.busyKey = "";

    render(organizer.render(), container);
    const row = container.querySelector<HTMLElement>(`[data-session-key="${pinned.key}"]`)!;
    expect(row.querySelector(".eu-session-row__drag-handle")).toBeNull();
    expect(row.querySelector(".eu-session-row__open")?.getAttribute("draggable")).toBe("false");
  });
});
