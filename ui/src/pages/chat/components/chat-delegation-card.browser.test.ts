import { afterEach, describe, expect, it } from "vitest";
import "../../../styles/chat/tool-cards.css";

let host: HTMLDivElement | undefined;

afterEach(() => {
  host?.remove();
  host = undefined;
});

describe("delegation card browser layout", () => {
  it("keeps the reported status on one line beside a long agent activity", () => {
    host = document.createElement("div");
    host.style.width = "700px";
    host.innerHTML = `
      <section class="chat-delegation">
        <button class="chat-delegation__row" type="button">
          <span class="chat-delegation__icons">●</span>
          <span class="chat-delegation__names">HRM</span>
          <span class="chat-delegation__status">1 đã báo cáo</span>
          <span class="chat-delegation__chevron">›</span>
          <span class="chat-delegation__activity">Danh sách nhân viên rất dài đang được hiển thị tại đây</span>
        </button>
      </section>
    `;
    document.body.append(host);

    const status = host.querySelector<HTMLElement>(".chat-delegation__status");
    expect(status).not.toBeNull();
    const style = getComputedStyle(status!);
    expect(style.whiteSpace).toBe("nowrap");
    expect(style.overflowWrap).toBe("normal");
    expect(status!.getBoundingClientRect().height).toBeLessThan(24);
  });
});
