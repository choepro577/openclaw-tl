import { createRouter, definePage, type PageDefinition } from "@openclaw/uirouter";
import { html } from "lit";
import type { RouteId } from "../../app-route-paths.ts";
import type { ApplicationRouter, AppRouteModule } from "../../app-routes.ts";
import type { ApplicationContext } from "../../app/context.ts";
import { eu } from "../../i18n/enterprise-user.ts";
import { pages as chatPages } from "../chat/route.ts";

const userAgentsPage = definePage({
  id: "enterprise" as const,
  path: "/agents",
  aliases: ["/enterprise"],
  component: () =>
    import("./pages/agents/agents-library-page.ts").then(() => ({
      header: true,
      render: () => html`<openclaw-user-agents-library-page></openclaw-user-agents-library-page>`,
    })),
});

const userPersonalAgentPage = definePage({
  id: "agents" as const,
  path: "/agents/personal",
  aliases: ["/settings/agents"],
  component: () =>
    import("./pages/agents/personal-agent-page.ts").then(() => ({
      header: true,
      render: () => html`<openclaw-user-personal-agent-page></openclaw-user-personal-agent-page>`,
    })),
});

const userPluginsPage = definePage({
  id: "plugins" as const,
  path: "/plugins",
  component: () =>
    import("./pages/plugins/plugins-page.ts").then(() => ({
      header: true,
      render: () => html`<openclaw-user-plugins-page></openclaw-user-plugins-page>`,
    })),
});

const userNewConversationPage = definePage({
  id: "new-session" as const,
  path: "/new",
  component: () =>
    import("./pages/conversations/new-conversation-page.ts").then(() => ({
      header: true,
      render: () =>
        html`<openclaw-user-new-conversation-page></openclaw-user-new-conversation-page>`,
    })),
});

const userConversationsPage = definePage({
  id: "sessions" as const,
  path: "/conversations",
  aliases: ["/sessions"],
  component: () =>
    import("./pages/conversations/conversations-page.ts").then(() => ({
      header: true,
      render: () => html`<openclaw-user-conversations-page></openclaw-user-conversations-page>`,
    })),
});

const userAccountPage = definePage({
  id: "profile" as const,
  path: "/settings/account",
  aliases: ["/settings/profile"],
  component: () =>
    import("./pages/settings/account-page.ts").then(() => ({
      header: true,
      render: () => html`<openclaw-user-account-page></openclaw-user-account-page>`,
    })),
});

const userAppearancePage = definePage({
  id: "appearance" as const,
  path: "/settings/appearance",
  component: () =>
    import("./pages/settings/appearance-page.ts").then(() => ({
      header: true,
      render: () => html`<openclaw-user-appearance-page></openclaw-user-appearance-page>`,
    })),
});

const userNotificationsPage = definePage({
  id: "notifications" as const,
  path: "/settings/notifications",
  component: () =>
    import("./pages/settings/notifications-page.ts").then(() => ({
      header: true,
      render: () => html`<openclaw-user-notifications-page></openclaw-user-notifications-page>`,
    })),
});

const userHelpAboutPage = definePage({
  id: "about" as const,
  path: "/help",
  component: () =>
    import("./pages/help-about-page.ts").then(() => ({
      header: true,
      render: () => html`<openclaw-user-help-about-page></openclaw-user-help-about-page>`,
    })),
});

const userAutomationsPage = definePage({
  id: "cron" as const,
  path: "/automations",
  aliases: ["/cron"],
  component: () =>
    import("./pages/automations/automations-page.ts").then(() => ({
      header: true,
      render: () => html`<openclaw-user-automations-page></openclaw-user-automations-page>`,
    })),
});

const userKnowledgePage = definePage({
  id: "knowledge" as const,
  path: "/knowledge",
  component: () =>
    import("./pages/knowledge/knowledge-page.ts").then(() => ({
      header: true,
      render: () => html`<openclaw-user-knowledge-page></openclaw-user-knowledge-page>`,
    })),
});

const userAutomationEditorPage = definePage({
  id: "automation" as const,
  path: "/automations/editor",
  component: () =>
    import("./pages/automations/automation-editor-page.ts").then(() => ({
      header: true,
      render: () =>
        html`<openclaw-user-automation-editor-page></openclaw-user-automation-editor-page>`,
    })),
});

const userNotFoundPage = definePage({
  id: "advanced" as const,
  path: "/not-found",
  component: () =>
    import("./pages/not-found-page.ts").then(() => ({
      header: false,
      render: () => html`<openclaw-user-not-found-page></openclaw-user-not-found-page>`,
    })),
});

const chatPage = chatPages.find((page) => page.id === "chat");
if (!chatPage) {
  throw new Error(eu("chatRouteUnavailable"));
}

const userRoutes = [
  chatPage,
  userNewConversationPage,
  userConversationsPage,
  userAgentsPage,
  userPluginsPage,
  userKnowledgePage,
  userPersonalAgentPage,
  userAutomationsPage,
  userAutomationEditorPage,
  userAccountPage,
  userAppearancePage,
  userNotificationsPage,
  userHelpAboutPage,
  userNotFoundPage,
] as readonly PageDefinition<RouteId, ApplicationContext<RouteId>, AppRouteModule>[];

export function createEnterpriseUserRouter(): ApplicationRouter {
  return createRouter<RouteId, ApplicationContext<RouteId>, AppRouteModule>({
    routes: userRoutes,
  }) as ApplicationRouter;
}
