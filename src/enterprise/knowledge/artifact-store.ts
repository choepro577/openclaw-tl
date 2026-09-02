import { createHash } from "node:crypto";
import fs from "node:fs";
import { mkdir, open, readFile, rename, rm, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolveStateDir } from "../../config/paths.js";
import { generateSecureUuid } from "../../infra/secure-random.js";
import type { NormalizedKnowledgeArtifact } from "./knowledge-types.js";

export type EnterpriseKnowledgeArtifactPaths = {
  root: string;
  blobs: string;
  normalized: string;
  indexes: string;
  uploads: string;
  exports: string;
  checkpoints: string;
};

export function resolveEnterpriseKnowledgeArtifactPaths(
  env: NodeJS.ProcessEnv = process.env,
): EnterpriseKnowledgeArtifactPaths {
  const root = path.join(resolveStateDir(env), "enterprise-knowledge");
  return {
    root,
    blobs: path.join(root, "blobs"),
    normalized: path.join(root, "normalized"),
    indexes: path.join(root, "indexes"),
    uploads: path.join(root, "uploads"),
    exports: path.join(root, "exports"),
    checkpoints: path.join(root, "checkpoints"),
  };
}

async function ensurePrivateDirectory(directory: string): Promise<void> {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await fs.promises.chmod(directory, 0o700);
}

export async function ensureEnterpriseKnowledgeArtifactDirectories(
  env: NodeJS.ProcessEnv = process.env,
): Promise<EnterpriseKnowledgeArtifactPaths> {
  const paths = resolveEnterpriseKnowledgeArtifactPaths(env);
  await ensurePrivateDirectory(paths.root);
  await Promise.all([
    ensurePrivateDirectory(paths.blobs),
    ensurePrivateDirectory(paths.normalized),
    ensurePrivateDirectory(paths.indexes),
    ensurePrivateDirectory(paths.uploads),
    ensurePrivateDirectory(paths.exports),
    ensurePrivateDirectory(paths.checkpoints),
  ]);
  return paths;
}

function casPath(base: string, hash: string, extension = "bin"): string {
  if (!/^[a-f0-9]{64}$/.test(hash)) {
    throw new Error("Invalid artifact hash");
  }
  return path.join(base, hash.slice(0, 2), `${hash}.${extension}`);
}

async function atomicPrivateWrite(target: string, data: Buffer | string): Promise<void> {
  await ensurePrivateDirectory(path.dirname(target));
  const temporary = `${target}.${generateSecureUuid()}.tmp`;
  try {
    await writeFile(temporary, data, { mode: 0o600, flag: "wx" });
    await rename(temporary, target).catch(async (error: NodeJS.ErrnoException) => {
      if (error.code !== "EEXIST") {
        throw error;
      }
      await unlink(temporary).catch(() => undefined);
    });
    await fs.promises.chmod(target, 0o600);
  } finally {
    await unlink(temporary).catch(() => undefined);
  }
}

export async function putKnowledgeBlob(
  buffer: Buffer,
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ hash: string; path: string; byteSize: number }> {
  const paths = await ensureEnterpriseKnowledgeArtifactDirectories(env);
  const hash = createHash("sha256").update(buffer).digest("hex");
  const target = casPath(paths.blobs, hash);
  try {
    await stat(target);
  } catch {
    await atomicPrivateWrite(target, buffer);
  }
  return { hash, path: target, byteSize: buffer.byteLength };
}

export async function importKnowledgeBlobFile(
  sourcePath: string,
  expectedHash: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ hash: string; path: string; byteSize: number }> {
  const source = await open(sourcePath, "r");
  const hash = createHash("sha256");
  let byteSize = 0;
  try {
    const buffer = Buffer.allocUnsafe(1024 * 1024);
    for (;;) {
      const result = await source.read(buffer, 0, buffer.byteLength, null);
      if (result.bytesRead === 0) {
        break;
      }
      hash.update(buffer.subarray(0, result.bytesRead));
      byteSize += result.bytesRead;
    }
  } finally {
    await source.close();
  }
  const digest = hash.digest("hex");
  if (expectedHash && digest !== expectedHash.toLowerCase()) {
    throw new Error("HASH_MISMATCH");
  }
  const paths = await ensureEnterpriseKnowledgeArtifactDirectories(env);
  const target = casPath(paths.blobs, digest);
  try {
    await stat(target);
  } catch {
    const temporary = `${target}.${generateSecureUuid()}.tmp`;
    await ensurePrivateDirectory(path.dirname(target));
    await fs.promises.copyFile(sourcePath, temporary, fs.constants.COPYFILE_EXCL);
    await fs.promises.chmod(temporary, 0o600);
    await rename(temporary, target).catch(async (error: NodeJS.ErrnoException) => {
      await unlink(temporary).catch(() => undefined);
      if (error.code !== "EEXIST") {
        throw error;
      }
    });
  }
  return { hash: digest, path: target, byteSize };
}

export async function readKnowledgeBlob(
  hash: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<Buffer> {
  return await readFile(casPath(resolveEnterpriseKnowledgeArtifactPaths(env).blobs, hash));
}

export async function putNormalizedKnowledgeArtifact(
  artifact: NormalizedKnowledgeArtifact,
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ hash: string; path: string }> {
  const serialized = `${JSON.stringify(artifact)}\n`;
  const hash = createHash("sha256").update(serialized).digest("hex");
  const paths = await ensureEnterpriseKnowledgeArtifactDirectories(env);
  const target = casPath(paths.normalized, hash, "json");
  try {
    await stat(target);
  } catch {
    await atomicPrivateWrite(target, serialized);
  }
  return { hash, path: target };
}

export async function readNormalizedKnowledgeArtifact(
  hash: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<NormalizedKnowledgeArtifact> {
  const contents = await readFile(
    casPath(resolveEnterpriseKnowledgeArtifactPaths(env).normalized, hash, "json"),
    "utf8",
  );
  return JSON.parse(contents) as NormalizedKnowledgeArtifact;
}

export async function putKnowledgeWorkerCheckpoint(
  checkpoint: unknown,
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ hash: string; path: string }> {
  const serialized = `${JSON.stringify(checkpoint)}\n`;
  const hash = createHash("sha256").update(serialized).digest("hex");
  const paths = await ensureEnterpriseKnowledgeArtifactDirectories(env);
  const target = casPath(paths.checkpoints, hash, "json");
  try {
    await stat(target);
  } catch {
    await atomicPrivateWrite(target, serialized);
  }
  return { hash, path: target };
}

export async function readKnowledgeWorkerCheckpoint(
  hash: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<unknown> {
  return JSON.parse(
    await readFile(
      casPath(resolveEnterpriseKnowledgeArtifactPaths(env).checkpoints, hash, "json"),
      "utf8",
    ),
  ) as unknown;
}

export async function deleteKnowledgeWorkerCheckpointIfPresent(
  hash: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  await unlink(
    casPath(resolveEnterpriseKnowledgeArtifactPaths(env).checkpoints, hash, "json"),
  ).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") {
      throw error;
    }
  });
}

export async function deleteKnowledgeBlobIfPresent(
  hash: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  await unlink(casPath(resolveEnterpriseKnowledgeArtifactPaths(env).blobs, hash)).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") {
        throw error;
      }
    },
  );
}

export async function deleteNormalizedKnowledgeArtifactIfPresent(
  hash: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  await unlink(
    casPath(resolveEnterpriseKnowledgeArtifactPaths(env).normalized, hash, "json"),
  ).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") {
      throw error;
    }
  });
}

export async function deleteKnowledgeZoneIndexesIfPresent(
  zoneId: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  if (!/^[a-zA-Z0-9-]{8,80}$/.test(zoneId)) {
    throw new Error("Invalid Knowledge Zone identity");
  }
  await rm(path.join(resolveEnterpriseKnowledgeArtifactPaths(env).indexes, zoneId), {
    recursive: true,
    force: true,
  });
}

export function resolveKnowledgeUploadStagingPath(
  stagingName: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  if (!/^[a-f0-9-]{20,80}\.upload$/.test(stagingName)) {
    throw new Error("Invalid upload staging name");
  }
  return path.join(resolveEnterpriseKnowledgeArtifactPaths(env).uploads, stagingName);
}

export function resolveKnowledgeGenerationDatabasePath(
  zoneId: string,
  generationId: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  if (!/^[a-zA-Z0-9-]{8,80}$/.test(zoneId) || !/^[a-zA-Z0-9-]{8,80}$/.test(generationId)) {
    throw new Error("Invalid Knowledge generation identity");
  }
  return path.join(
    resolveEnterpriseKnowledgeArtifactPaths(env).indexes,
    zoneId,
    `${generationId}.sqlite`,
  );
}
