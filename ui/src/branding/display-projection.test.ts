import { html } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";
import { handleMarkdownCodeBlockClick } from "../components/markdown-code-blocks.ts";
import { toSanitizedMarkdownHtml } from "../components/markdown.ts";
import { eu } from "../i18n/enterprise-user.ts";
import { i18n, t } from "../i18n/index.ts";
import { OpenClawLightDomElement } from "../lit/openclaw-element.ts";
import { maskEngineName } from "./display-brand.ts";
import { observeDisplayRoot, originalDisplayText, projectDisplay } from "./display-projection.ts";

class PresentationFixture extends OpenClawLightDomElement {
  text = "";
  override render() {
    return html`<p>${this.text}</p>`;
  }
}
customElements.define("maap-presentation-fixture", PresentationFixture);

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("MAAP display boundary", () => {
  it("rebrands owned copy before interpolating unmodified runtime values", () => {
    expect(eu("loadingPortal")).toBe("Starting MAAP…");
    expect(t("aboutPage.productName")).toBe("MAAP");
    expect(maskEngineName("/home/.openclaw/x @OpenClaw/diffs OPENCLAW_HOME")).toBe(
      "/home/.*******/x @*******/diffs *******_HOME",
    );
    expect(maskEngineName("OpenAI Codex, Claude, GitHub")).toBe("OpenAI Codex, Claude, GitHub");
    expect(i18n.t("common.notARealTranslation")).toBe("common.notARealTranslation");
  });

  it("masks after each Lit commit without changing streaming source or markers", async () => {
    const host = new PresentationFixture();
    document.body.append(host);
    for (const text of [
      "/tmp/open",
      "/tmp/openclaw",
      "/tmp/openclaw/file",
      "openclaw",
      "*******",
      "/tmp/other",
    ]) {
      host.text = text;
      host.requestUpdate();
      await host.updateComplete;
      expect(host.querySelector("p")?.textContent).toBe(maskEngineName(text));
      expect(host.text).toBe(text);
      expect(originalDisplayText(host.querySelector("p")!)).toBe(text);
    }
  });

  it("masks highlighted spans and presentation attributes while preserving action targets", () => {
    const host = document.createElement("div");
    host.innerHTML =
      '<a href="/openclaw/file" title="OpenClaw file" data-file-path="/openclaw/file"><code><span>open</span><span>claw</span>/file</code></a><img alt="openclaw file" src="/openclaw.png">';
    projectDisplay(host);
    const link = host.querySelector("a")!;
    expect(link.textContent).toBe("*******/file");
    expect(link.title).toBe("******* file");
    expect(link.getAttribute("href")).toBe("/openclaw/file");
    expect(link.dataset.filePath).toBe("/openclaw/file");
    expect(originalDisplayText(link)).toBe("openclaw/file");
    expect(host.querySelector("img")?.getAttribute("src")).toBe("/openclaw.png");
    expect(host.querySelector("img")?.alt).toBe("******* file");
    projectDisplay(host);
    expect(originalDisplayText(link)).toBe("openclaw/file");
  });

  it("keeps native option submission values and technical form values intact", () => {
    const host = document.createElement("form");
    host.innerHTML =
      '<select name="plugin"><option>@openclaw/diffs</option></select><input name="path" value="/tmp/openclaw" placeholder="openclaw"><textarea name="config">OPENCLAW_HOME</textarea>';
    projectDisplay(host);
    expect(host.querySelector("option")?.label).toBe("@*******/diffs");
    expect(new FormData(host).get("plugin")).toBe("@openclaw/diffs");
    expect(new FormData(host).get("path")).toBe("/tmp/openclaw");
    expect(new FormData(host).get("config")).toBe("OPENCLAW_HOME");
    expect(host.querySelector("input")?.placeholder).toBe("*******");
  });

  it("keeps code Copy source and Markdown table text despite display masking", async () => {
    const markdown =
      "```sh\ncat /tmp/openclaw/file\n```\n\n| Path |\n| --- |\n| C:\\OpenClaw\\file |";
    const host = document.createElement("div");
    host.innerHTML = toSanitizedMarkdownHtml(markdown);
    document.body.append(host);
    projectDisplay(host);
    expect(host.querySelector("code")?.textContent).toContain("/tmp/*******/file");
    expect(originalDisplayText(host.querySelector("td")!)).toContain("OpenClaw");
    expect(host.querySelector("td")?.textContent).not.toMatch(/openclaw/i);
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    host.addEventListener("click", handleMarkdownCodeBlockClick);
    host.querySelector<HTMLButtonElement>(".code-block-copy")!.click();
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledWith("cat /tmp/openclaw/file");
    expect(markdown).toContain("/tmp/openclaw/file");
  });

  it("covers portal changes and late shadow content before the next paint", async () => {
    const root = document.createElement("div");
    document.body.append(root);
    observeDisplayRoot(root);
    const host = document.createElement("div");
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = "<span>open</span><b>claw</b>";
    root.append(host);
    await new Promise<void>((resolve) => {
      queueMicrotask(resolve);
    });
    expect(shadow.textContent).toBe("*******");
    shadow.querySelector("b")!.textContent = "claw/path";
    await new Promise<void>((resolve) => {
      queueMicrotask(resolve);
    });
    expect(shadow.textContent).toBe("*******/path");
    expect(originalDisplayText(shadow)).toBe("openclaw/path");
    shadow.querySelector("b")!.textContent = "source";
    await new Promise<void>((resolve) => {
      queueMicrotask(resolve);
    });
    expect(shadow.textContent).toBe("opensource");
  });
});
