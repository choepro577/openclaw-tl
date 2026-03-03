export type ProjectEntry = {
  projectId: string;
  name: string;
};

export type ProjectStore = Record<string, ProjectEntry>;

export function normalizeProjectName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}
