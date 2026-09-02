import { t } from "../../i18n/index.ts";
import type { ChatComposerDisabledBanner } from "./components/chat-composer-types.ts";

type ChatModelSetupState = {
  catalog: boolean;
  connected: boolean;
  agentsLoaded: boolean;
  selectedAgentFound: boolean;
  agentModel?: string | null;
};

type ChatModelAvailabilityGateState = {
  agentsLoaded: boolean;
  enterpriseUserPresentation: boolean;
  modelSetupRequired: boolean;
  modelUnavailable: boolean;
  selectedAgentFound: boolean;
};

export function resolveChatModelAvailabilityGate(state: ChatModelAvailabilityGateState): {
  enterpriseUserUnavailable: boolean;
  modelSetupRequired: boolean;
  modelUnavailable: boolean;
} {
  if (!state.enterpriseUserPresentation) {
    return {
      enterpriseUserUnavailable: false,
      modelSetupRequired: state.modelSetupRequired,
      modelUnavailable: state.modelUnavailable,
    };
  }

  // Enterprise User responses deliberately omit model/provider details. The selected projected
  // Agent is the server-attested availability boundary; missing model metadata must not disable
  // the composer or leak the hidden model route back into the browser contract.
  const enterpriseUserUnavailable = state.agentsLoaded && !state.selectedAgentFound;
  return {
    enterpriseUserUnavailable,
    modelSetupRequired: false,
    modelUnavailable: enterpriseUserUnavailable,
  };
}

export function requiresChatModelSetup(state: ChatModelSetupState): boolean {
  if (state.catalog || !state.connected || !state.agentsLoaded || !state.selectedAgentFound) {
    return false;
  }
  return !state.agentModel?.trim();
}

export function createChatModelSetupBanner(onAction: () => void): ChatComposerDisabledBanner {
  return {
    kind: "composer-replacement",
    text: t("modelSetup.required.body"),
    actionLabel: t("modelSetup.required.action"),
    onAction,
  };
}
