import { definePage } from "@openclaw/uirouter";
import { html } from "lit";
import { routePageSpec } from "../../app-route-paths.ts";

export const page = definePage({
  ...routePageSpec("knowledge"),
  component: () =>
    import("../enterprise-user/pages/knowledge/knowledge-page.ts").then(() => ({
      header: true,
      render: () => html`<openclaw-user-knowledge-page></openclaw-user-knowledge-page>`,
    })),
});
