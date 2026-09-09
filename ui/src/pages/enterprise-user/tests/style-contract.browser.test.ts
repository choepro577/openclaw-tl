import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readStyleSheet } from "../../../../../test/helpers/ui-style-fixtures.js";
import {
  canRunPlaywrightChromium,
  resolvePlaywrightChromiumExecutablePath,
} from "../../../test-helpers/control-ui-e2e.ts";

const chromiumExecutablePath = resolvePlaywrightChromiumExecutablePath(chromium.executablePath());
const chromiumAvailable = canRunPlaywrightChromium(chromiumExecutablePath);
const describeBrowserLayout = chromiumAvailable ? describe : describe.skip;

let browser: Browser;
let context: BrowserContext;

function readUiCss(): string {
  return [
    "ui/src/styles/base.css",
    "ui/src/styles/layout.css",
    "ui/src/styles/layout.mobile.css",
    "ui/src/styles/components.css",
    "ui/src/styles/settings-controls.css",
    "ui/src/styles/settings.css",
    "ui/src/styles/chat/layout.css",
    "ui/src/pages/enterprise-user/styles/semantic.css",
    "ui/src/pages/enterprise-user/styles/shell.css",
    "ui/src/pages/enterprise-user/styles/sidebar.css",
    "ui/src/pages/enterprise-user/styles/agents-library.css",
    "ui/src/pages/enterprise-user/styles/personal-agent.css",
  ]
    .map((file) => readStyleSheet(file))
    .join("\n");
}

function fixtureHtml(): string {
  return `<!doctype html>
    <html data-theme="dark" data-theme-mode="dark">
      <head><style>${readUiCss()}</style></head>
      <body>
        <div class="shell eu-shell">
          <header class="topbar eu-topbar">
            <button class="topbar-icon-btn topbar-nav-toggle" type="button">Menu</button>
            <button class="btn btn--ghost eu-topbar__agent" type="button">
              <span>✨</span>
              <span class="eu-topbar__agent-label">
                <small>Active Agent</small><strong>Personal Agent</strong>
              </span>
            </button>
          </header>
          <div class="shell-nav">
            <div style="display: contents">
              <aside class="sidebar">
                <div class="sidebar-shell">
                  <div class="sidebar-shell__content">
                    <div class="sidebar-shell__body">
                      <div style="display: contents">
                        <details class="eu-agent-switcher">
                          <summary><span class="eu-agent-switcher__avatar">✨</span><span class="eu-agent-switcher__identity"><small>Active Agent</small><strong>Personal Agent</strong></span><span class="eu-agent-switcher__chevron">⌄</span></summary>
                          <div class="eu-agent-switcher__menu">
                            <section class="eu-agent-switcher__group" aria-label="Mine">
                              <span class="eu-agent-switcher__group-label">Mine</span>
                              <div class="eu-agent-switcher__row">
                                <button class="eu-agent-switcher__select" aria-current="true" type="button">
                                  <span class="eu-agent-switcher__menu-avatar">✨</span>
                                  <span class="eu-agent-switcher__copy"><strong>Personal Agent</strong><small>Daily assistant</small></span>
                                </button>
                                <button class="btn btn--ghost eu-agent-switcher__action" type="button">Edit</button>
                              </div>
                            </section>
                            <section class="eu-agent-switcher__group" aria-label="Company">
                              <span class="eu-agent-switcher__group-label">Company</span>
                              <div class="eu-agent-switcher__row">
                                <button class="eu-agent-switcher__select" type="button">
                                  <span class="eu-agent-switcher__menu-avatar">M</span>
                                  <span class="eu-agent-switcher__copy"><strong>main</strong><small>Managed by company</small></span>
                                </button>
                              </div>
                            </section>
                          </div>
                        </details>
                      </div>
                      <button class="btn primary eu-new-chat" type="button">New chat</button>
                      <nav class="sidebar-nav">
                        <button class="nav-item active" type="button"><span class="nav-item__icon">A</span><span>Agents</span></button>
                        <button class="nav-item" type="button"><span class="nav-item__icon">C</span><span>Automations</span></button>
                        <div class="eu-session-organizer"><div class="eu-session-organizer__toolbar"><span>Projects</span></div></div>
                      </nav>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
          <main class="content">
            <div class="settings-workspace">
              <div class="settings-page settings-page--wide">
                <header class="eu-page-header"><div><h1>Agent Library</h1><p>Description</p></div></header>
                <div class="eu-agent-grid">
                  <div style="display: contents">
                    <article class="card eu-agent-card">
                      <div class="eu-agent-card__identity"><span class="eu-agent-card__avatar">✨</span><div class="eu-agent-card__copy"><span class="eu-agent-card__kind">Personal Agent</span><h2>Personal Agent</h2><p class="eu-agent-card__description">Description</p></div></div>
                      <div class="eu-actions eu-agent-card__actions"><button class="btn primary" type="button">Start chat</button></div>
                    </article>
                  </div>
                  <div style="display: contents">
                    <article class="card eu-agent-card">
                      <div class="eu-agent-card__identity"><span class="eu-agent-card__avatar">M</span><div class="eu-agent-card__copy"><span class="eu-agent-card__kind">Enterprise Agent</span><h2>main</h2><p class="eu-agent-card__description">Managed by company</p></div></div>
                      <div class="eu-actions eu-agent-card__actions"><button class="btn primary" type="button">Start chat</button></div>
                    </article>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
        <button class="btn" id="control-button" type="button">Control primitive</button>
      </body>
    </html>`;
}

async function openFixture(viewport: { width: number; height: number }): Promise<Page> {
  const page = await context.newPage();
  await page.setViewportSize(viewport);
  await page.setContent(fixtureHtml());
  return page;
}

beforeAll(async () => {
  if (!chromiumAvailable) {
    return;
  }
  browser = await chromium.launch({ executablePath: chromiumExecutablePath, headless: true });
  context = await browser.newContext();
});

afterAll(async () => {
  await context?.close().catch(() => undefined);
  await browser?.close().catch(() => undefined);
});

describeBrowserLayout("Enterprise User inherited style contract", () => {
  it("uses the wider desktop sidebar without overflowing the content", async () => {
    const page = await openFixture({ width: 1440, height: 900 });
    try {
      const geometry = await page.evaluate(() => {
        const shellNav = document.querySelector(".shell-nav")!.getBoundingClientRect();
        const sidebar = document.querySelector(".sidebar")!.getBoundingClientRect();
        const settingsPage = document.querySelector(".settings-page")!.getBoundingClientRect();
        const agentCard = document.querySelector(".eu-agent-card")!.getBoundingClientRect();
        return { agentCard, settingsPage, shellNav, sidebar };
      });

      expect(geometry.shellNav.width).toBe(316);
      expect(geometry.sidebar.width).toBe(315);
      expect(geometry.sidebar.height).toBe(900);
      expect(geometry.settingsPage.right).toBeLessThanOrEqual(1440);
      expect(geometry.agentCard.width).toBeLessThan(geometry.settingsPage.width / 2);
    } finally {
      await page.close();
    }
  });

  it("aligns the agent controls and active navigation item to the full sidebar width", async () => {
    const page = await openFixture({ width: 1440, height: 900 });
    try {
      const geometry = await page.evaluate(() => {
        const rect = (selector: string) => {
          const bounds = document.querySelector(selector)!.getBoundingClientRect();
          return { left: bounds.left, right: bounds.right, width: bounds.width };
        };
        return {
          activeItem: rect(".sidebar-nav > .nav-item.active"),
          agentSwitcher: rect(".eu-agent-switcher > summary"),
          navigation: rect(".sidebar-nav"),
          newChat: rect(".eu-new-chat"),
        };
      });

      for (const control of [geometry.agentSwitcher, geometry.newChat, geometry.activeItem]) {
        expect(control.left).toBeCloseTo(geometry.navigation.left, 4);
        expect(control.right).toBeCloseTo(geometry.navigation.right, 4);
        expect(control.width).toBeCloseTo(geometry.navigation.width, 4);
      }
    } finally {
      await page.close();
    }
  });

  it("centers the Project folder glyph and keeps page text selectable", async () => {
    const page = await openFixture({ width: 1440, height: 900 });
    try {
      await page.locator(".eu-session-organizer").evaluate((organizer) => {
        organizer.insertAdjacentHTML(
          "beforeend",
          `<section class="eu-session-section eu-session-project">
            <div class="eu-session-section__header">
              <button class="eu-session-section__toggle" type="button">
                <span class="eu-session-section__folder-icon"><svg viewBox="0 0 24 24"><path d="M3 5h6l2 2h10v12H3z"></path></svg></span>
                <span class="eu-session-section__name">Example Project</span>
              </button>
            </div>
          </section>`,
        );
      });

      const presentation = await page.evaluate(() => {
        const centerY = (element: Element) => {
          const bounds = element.getBoundingClientRect();
          return bounds.top + bounds.height / 2;
        };
        const icon = document.querySelector(".eu-session-section__folder-icon")!;
        const svg = icon.querySelector("svg")!;
        const name = icon.nextElementSibling!;
        return {
          bodyUserSelect: getComputedStyle(document.body).userSelect,
          iconCenter: centerY(svg),
          nameCenter: centerY(name),
        };
      });

      const headingBounds = await page
        .getByRole("heading", { name: "Agent Library" })
        .boundingBox();
      expect(headingBounds).not.toBeNull();
      await page.mouse.dblclick(
        (headingBounds?.x ?? 0) + 10,
        (headingBounds?.y ?? 0) + (headingBounds?.height ?? 0) / 2,
      );
      const selectedText = await page.evaluate(() => window.getSelection()?.toString() ?? "");

      await page.locator("body").evaluate((body) => body.classList.add("eu-session-drag-active"));
      const dragUserSelect = await page
        .getByText("Example Project", { exact: true })
        .evaluate((name) => getComputedStyle(name).userSelect);

      expect(presentation.bodyUserSelect).toBe("text");
      expect(presentation.iconCenter).toBeCloseTo(presentation.nameCenter, 4);
      expect(selectedText.length).toBeGreaterThan(0);
      expect(dragUserSelect).toBe("none");
    } finally {
      await page.close();
    }
  });

  it("centers a running indicator in the trailing action slot without an active stripe", async () => {
    const page = await openFixture({ width: 1440, height: 900 });
    try {
      await page.locator(".eu-new-chat").evaluate((newChat) => {
        newChat.insertAdjacentHTML(
          "afterend",
          `<div class="eu-session-row eu-session-row--active eu-session-row--running" data-session-key="active">
            <button class="eu-session-row__open" type="button">
              <span>Active session</span>
            </button>
            <div class="eu-session-actions">
              <span class="session-run-spinner" aria-label="Active run"></span>
              <button class="eu-session-actions__trigger" type="button">Menu</button>
            </div>
          </div>`,
        );
      });
      const presentation = await page.locator(".eu-session-row--active").evaluate((row) => {
        const spinner = row.querySelector<HTMLElement>(".session-run-spinner")!;
        const action = row.querySelector<HTMLElement>(".eu-session-actions")!;
        const spinnerRect = spinner.getBoundingClientRect();
        const actionRect = action.getBoundingClientRect();
        return {
          boxShadow: getComputedStyle(row).boxShadow,
          actionCenter: actionRect.left + actionRect.width / 2,
          spinnerCenter: spinnerRect.left + spinnerRect.width / 2,
        };
      });

      expect(presentation.boxShadow).toBe("none");
      expect(Math.abs(presentation.actionCenter - presentation.spinnerCenter)).toBeLessThan(0.5);
    } finally {
      await page.close();
    }
  });

  it("gives an idle title the full row, reveals actions on hover, and runs a stop-at-end marquee", async () => {
    const page = await openFixture({ width: 1440, height: 900 });
    try {
      await page.locator(".eu-new-chat").evaluate((newChat) => {
        newChat.insertAdjacentHTML(
          "afterend",
          `<div class="eu-session-row" data-session-key="long-title">
            <button class="eu-session-row__open" type="button">
              <span class="eu-session-title-marquee hover-marquee" data-hover-marquee-mode="codex">
                <span class="eu-session-title-marquee__clip">
                  <span class="eu-session-title-marquee__track">
                    <span class="eu-session-title-marquee__content" data-hover-marquee-content>Review the complete quarterly launch readiness and remediation plan</span>
                  </span>
                </span>
              </span>
            </button>
            <div class="eu-session-actions">
              <button class="eu-session-actions__trigger" type="button">Menu</button>
            </div>
          </div>`,
        );
      });

      const row = page.locator('[data-session-key="long-title"]');
      const idle = await row.evaluate((element) => {
        const open = element.querySelector<HTMLElement>(".eu-session-row__open")!;
        const actions = element.querySelector<HTMLElement>(".eu-session-actions")!;
        const trigger = element.querySelector<HTMLElement>(".eu-session-actions__trigger")!;
        const clip = element.querySelector<HTMLElement>(".eu-session-title-marquee__clip")!;
        return {
          openWidth: open.getBoundingClientRect().width,
          actionsWidth: actions.getBoundingClientRect().width,
          triggerOpacity: getComputedStyle(trigger).opacity,
          maskImage: getComputedStyle(clip).maskImage,
        };
      });

      await row.hover();
      const hovered = await row.evaluate((element) => {
        const open = element.querySelector<HTMLElement>(".eu-session-row__open")!;
        const actions = element.querySelector<HTMLElement>(".eu-session-actions")!;
        const trigger = element.querySelector<HTMLElement>(".eu-session-actions__trigger")!;
        return {
          openWidth: open.getBoundingClientRect().width,
          actionsWidth: actions.getBoundingClientRect().width,
          triggerOpacity: getComputedStyle(trigger).opacity,
        };
      });

      expect(idle.actionsWidth).toBe(0);
      expect(idle.triggerOpacity).toBe("0");
      expect(idle.maskImage).not.toBe("none");
      expect(hovered.actionsWidth).toBe(30);
      expect(hovered.openWidth).toBeCloseTo(idle.openWidth - 30, 4);
      expect(hovered.triggerOpacity).toBe("1");

      const animation = await row.evaluate((element) => {
        const marquee = element.querySelector<HTMLElement>(".eu-session-title-marquee")!;
        marquee.style.setProperty("--hover-marquee-shift", "-120px");
        marquee.style.setProperty("--hover-marquee-duration", "6.350s");
        marquee.style.setProperty("--hover-marquee-timing", "linear");
        marquee.classList.add("hover-marquee--scrolling");
        const track = element.querySelector<HTMLElement>(".eu-session-title-marquee__track")!;
        const style = getComputedStyle(track);
        return {
          name: style.animationName,
          fillMode: style.animationFillMode,
          iterationCount: style.animationIterationCount,
        };
      });
      expect(animation.name).toBe("eu-session-title-marquee-scroll");
      expect(animation.fillMode).toBe("forwards");
      expect(animation.iterationCount).toBe("1");
    } finally {
      await page.close();
    }
  });

  it("keeps an open Project menu above the session rows it overlaps", async () => {
    const page = await openFixture({ width: 1440, height: 900 });
    try {
      await page.locator(".eu-new-chat").evaluate((newChat) => {
        newChat.insertAdjacentHTML(
          "afterend",
          `<section class="eu-session-section eu-session-project">
            <div class="eu-session-section__header eu-session-section__header--menu-open">
              <button class="eu-session-section__toggle" type="button">Project</button>
              <div class="eu-session-actions">
                <button class="eu-session-actions__trigger" aria-expanded="true" type="button">Menu</button>
                <div class="eu-session-actions__menu" role="menu">
                  <button class="eu-session-actions__item" type="button"><span>×</span><span>Delete Project</span></button>
                </div>
              </div>
            </div>
            <div class="eu-session-section__rows">
              <div class="eu-session-row">
                <button class="eu-session-row__open" type="button"><span>Session behind menu</span></button>
                <div class="eu-session-actions"></div>
              </div>
            </div>
          </section>`,
        );
      });
      await page.locator(".eu-session-section__header .eu-session-actions__trigger").focus();

      const stacking = await page.evaluate(() => {
        const menu = document.querySelector<HTMLElement>(
          ".eu-session-project .eu-session-actions__menu",
        )!;
        const row = document.querySelector<HTMLElement>(".eu-session-project .eu-session-row")!;
        const menuRect = menu.getBoundingClientRect();
        const rowRect = row.getBoundingClientRect();
        const topElement = document.elementFromPoint(menuRect.left + 12, rowRect.top + 12);
        return {
          overlaps: menuRect.bottom > rowRect.top,
          menuOwnsTopElement: menu.contains(topElement),
        };
      });

      expect(stacking.overlaps).toBe(true);
      expect(stacking.menuOwnsTopElement).toBe(true);
    } finally {
      await page.close();
    }
  });

  it("opens the Agent menu as a compact overlay without moving sidebar navigation", async () => {
    const page = await openFixture({ width: 1440, height: 900 });
    try {
      const closedTop = await page
        .locator(".eu-new-chat")
        .evaluate((element) => element.getBoundingClientRect().top);
      await page
        .locator(".eu-agent-switcher")
        .evaluate((element) => element.setAttribute("open", ""));
      const layout = await page.evaluate(() => {
        const menu = document.querySelector(".eu-agent-switcher__menu")!;
        const firstRow = document.querySelector(".eu-agent-switcher__select")!;
        return {
          menuPosition: getComputedStyle(menu).position,
          newChatTop: document.querySelector(".eu-new-chat")!.getBoundingClientRect().top,
          rowHeight: firstRow.getBoundingClientRect().height,
        };
      });

      expect(layout.menuPosition).toBe("fixed");
      expect(layout.newChatTop).toBe(closedTop);
      expect(layout.rowHeight).toBe(44);
    } finally {
      await page.close();
    }
  });

  it("reveals the Personal Agent edit action only while its row is interactive", async () => {
    const page = await openFixture({ width: 1440, height: 900 });
    try {
      await page
        .locator(".eu-agent-switcher")
        .evaluate((element) => element.setAttribute("open", ""));
      const personalRow = page.locator(".eu-agent-switcher__row").first();
      const editAction = personalRow.locator(".eu-agent-switcher__action");
      const actionState = () =>
        editAction.evaluate((element) => {
          const style = getComputedStyle(element);
          return { opacity: style.opacity, pointerEvents: style.pointerEvents };
        });

      expect(await actionState()).toEqual({ opacity: "0", pointerEvents: "none" });
      await personalRow.hover();
      expect(await actionState()).toEqual({ opacity: "1", pointerEvents: "auto" });
      expect(
        page.locator(".eu-agent-switcher__group").nth(1).locator(".eu-agent-switcher__action"),
      ).toHaveCount(0);
    } finally {
      await page.close();
    }
  });

  it("keeps the mobile topbar inside the canonical 58px shell row", async () => {
    const page = await openFixture({ width: 390, height: 844 });
    try {
      await page
        .locator(".shell")
        .evaluate((element) => element.classList.add("shell--mobile-nav"));
      const geometry = await page.evaluate(() => {
        const topbar = document.querySelector(".topbar")!.getBoundingClientRect();
        const content = document.querySelector(".content")!.getBoundingClientRect();
        return {
          topbarBottom: topbar.bottom,
          topbarHeight: topbar.height,
          contentTop: content.top,
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });

      expect(geometry.topbarHeight).toBe(58);
      expect(geometry.topbarBottom).toBe(geometry.contentTop);
      expect(geometry.overflow).toBe(0);
    } finally {
      await page.close();
    }
  });

  it("uses the same primitive styles and text-scale tokens as Control UI", async () => {
    const page = await openFixture({ width: 1440, height: 900 });
    try {
      await page
        .locator("html")
        .evaluate((element) => element.style.setProperty("--control-ui-text-scale", "1.4"));
      const styles = await page.evaluate(() => {
        const read = (selector: string) => {
          const style = getComputedStyle(document.querySelector(selector)!);
          return {
            borderRadius: style.borderRadius,
            fontFamily: style.fontFamily,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            padding: style.padding,
          };
        };
        return {
          controlButton: read("#control-button"),
          userButton: read(".eu-agent-card .btn"),
          agentName: read(".eu-agent-switcher__identity strong"),
          pageTitle: read(".eu-page-header h1"),
        };
      });

      expect(styles.userButton).toEqual(styles.controlButton);
      expect(styles.agentName.fontSize).toBe("16.8px");
      expect(styles.pageTitle.fontSize).toBe("22.4px");
    } finally {
      await page.close();
    }
  });
});
