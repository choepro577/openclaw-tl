export type PersonalAgentProfile = {
  revision: number;
  name: string;
  avatarPreset: string | null;
  greeting: string;
  tone: "professional" | "friendly" | "concise";
  responseLength: "brief" | "balanced" | "detailed";
  language: "auto" | "vi" | "en";
  customInstructions: string;
  preferredName: string;
  workContext: string;
  preferences: string;
};

export type PersonalAgentKnowledgeItem = {
  id: string;
  title: string;
  kind: "note" | "upload";
  sourceName: string | null;
  content: string;
  revision: number;
  createdAt: number;
  updatedAt: number;
};
