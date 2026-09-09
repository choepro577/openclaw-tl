import { encodeTerminalUpload } from "../../../components/terminal/terminal-file-upload.ts";

export const EXTERNAL_SKILL_FOLDER_MAX_FILES = 200;
export const EXTERNAL_SKILL_FOLDER_MAX_BYTES = 10 * 1024 * 1024;

export type ExternalSkillFolderFile = {
  file: File;
  path: string;
};

export type ExternalSkillFolderSelection = {
  folderName: string;
  files: ExternalSkillFolderFile[];
};

export type ExternalSkillFolderPayload = {
  folderName: string;
  files: Array<{ path: string; contentBase64: string }>;
};

export function selectExternalSkillFolder(files: FileList | null): ExternalSkillFolderSelection {
  const selected = files ? Array.from(files) : [];
  if (selected.length === 0) {
    throw new Error("empty folder");
  }

  const paths = selected.map((file) => {
    const path = file.webkitRelativePath || "";
    const segments = path.split("/");
    if (segments.length < 2 || segments.some((segment) => !segment)) {
      throw new Error("folder path unavailable");
    }
    return {
      file,
      root: segments[0],
      path: segments.slice(1).join("/"),
      systemMetadata: segments
        .slice(1)
        .some((segment) => [".git", ".openclaw", ".clawhub", ".clawdhub"].includes(segment)),
    };
  });
  const folderName = paths[0]?.root;
  if (!folderName || paths.some((entry) => entry.root !== folderName)) {
    throw new Error("folder paths differ");
  }
  const skillFiles = paths.filter((entry) => !entry.systemMetadata);
  if (skillFiles.length === 0) {
    throw new Error("empty folder");
  }
  if (skillFiles.length > EXTERNAL_SKILL_FOLDER_MAX_FILES) {
    throw new Error("too many files");
  }
  const totalBytes = skillFiles.reduce((total, entry) => total + entry.file.size, 0);
  if (totalBytes > EXTERNAL_SKILL_FOLDER_MAX_BYTES) {
    throw new Error("folder too large");
  }
  return {
    folderName,
    files: skillFiles.map(({ file, path }) => ({ file, path })),
  };
}

export async function encodeExternalSkillFolder(
  selection: ExternalSkillFolderSelection,
): Promise<ExternalSkillFolderPayload> {
  return {
    folderName: selection.folderName,
    files: await Promise.all(
      selection.files.map(async ({ file, path }) => ({
        path,
        contentBase64: await encodeTerminalUpload(file),
      })),
    ),
  };
}
