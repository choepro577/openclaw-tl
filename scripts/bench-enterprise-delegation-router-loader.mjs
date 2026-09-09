#!/usr/bin/env node

/**
 * Native source loader used only by the Enterprise delegation benchmark.
 *
 * The normal script runner uses tsx. In this source closure tsx can fall back
 * to its CommonJS path while loading an ESM-only plugin dependency, which
 * hides the real model and reports router_unavailable. This launcher keeps
 * the benchmark on Node's native ESM path and transforms only local TypeScript
 * source files with the repository's existing esbuild dependency.
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = join(repoRoot, "src");
const packageRoot = join(repoRoot, "packages");
const repoRequire = createRequire(join(repoRoot, "package.json"));
const { transformSync } = repoRequire("esbuild");

function isFile(pathname) {
  return existsSync(pathname) && statSync(pathname).isFile();
}

function isWithin(parent, child) {
  const pathname = relative(parent, child);
  return pathname === "" || (!pathname.startsWith("..") && !isAbsolute(pathname));
}

function sourceFile(pathname) {
  if (isFile(pathname)) {
    return pathname;
  }
  const TypeScriptPath = pathname.endsWith(".js") ? pathname.slice(0, -3) + ".ts" : pathname;
  return isFile(TypeScriptPath) ? TypeScriptPath : undefined;
}

function resolveConditionTarget(value) {
  if (typeof value === "string") {
    return value;
  }
  if (!value || typeof value !== "object") {
    return undefined;
  }
  for (const condition of ["node", "import", "default"]) {
    const target = resolveConditionTarget(value[condition]);
    if (target) {
      return target;
    }
  }
  return undefined;
}

function packageTarget(packageName, subpath) {
  const packageDirectory =
    packageName === "openclaw"
      ? repoRoot
      : join(packageRoot, packageName.replace(/^@openclaw\//u, ""));
  const packageJsonPath = join(packageDirectory, "package.json");
  if (!isFile(packageJsonPath)) {
    return undefined;
  }
  let packageJson;
  try {
    packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  } catch {
    return undefined;
  }
  const exportKey = subpath ? `./${subpath}` : ".";
  const target = resolveConditionTarget(
    packageJson.exports?.[exportKey] ??
      (exportKey === "." ? (packageJson.module ?? packageJson.main) : undefined),
  );
  if (!target) {
    return undefined;
  }
  const candidate = sourceFile(join(packageDirectory, target));
  return candidate && isFile(candidate) ? candidate : undefined;
}

function aliasTarget(specifier) {
  if (specifier === "openclaw") {
    return packageTarget("openclaw", "");
  }
  if (specifier.startsWith("openclaw/")) {
    return packageTarget("openclaw", specifier.slice("openclaw/".length));
  }
  if (!specifier.startsWith("@openclaw/")) {
    return undefined;
  }
  const rest = specifier.slice("@openclaw/".length);
  const slash = rest.indexOf("/");
  const packageName = slash < 0 ? `@openclaw/${rest}` : `@openclaw/${rest.slice(0, slash)}`;
  const subpath = slash < 0 ? "" : rest.slice(slash + 1);
  return packageTarget(packageName, subpath);
}

function localSourceUrl(url) {
  if (!url.startsWith("file:")) {
    return undefined;
  }
  const pathname = fileURLToPath(url);
  if (!isWithin(sourceRoot, pathname) && !isWithin(packageRoot, pathname)) {
    return undefined;
  }
  return pathname.endsWith(".ts") ? pathname : undefined;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    const alias = aliasTarget(specifier);
    if (alias) {
      return {
        url: pathToFileURL(alias).href,
        ...(alias.endsWith(".ts") ? { format: "module-typescript" } : {}),
        shortCircuit: true,
      };
    }

    if (!specifier.startsWith(".") || !context.parentURL?.startsWith("file:")) {
      return nextResolve(specifier, context);
    }

    let targetPath;
    try {
      targetPath = fileURLToPath(new URL(specifier, context.parentURL));
    } catch {
      return nextResolve(specifier, context);
    }

    if (
      targetPath.startsWith(repoRoot + "/") &&
      targetPath.endsWith(".json") &&
      isFile(targetPath)
    ) {
      // A CJS consumer must keep Node's own JSON loader and import attributes.
      // Source ESM imports are converted to data modules because the source
      // tree is intentionally not symlinked as an installed package here.
      if (context.conditions?.includes("require")) {
        return nextResolve(specifier, context);
      }
      const payload = readFileSync(targetPath, "utf8");
      if (context.importAttributes?.type === "json") {
        return {
          url: "data:application/json," + encodeURIComponent(payload),
          format: "json",
          shortCircuit: true,
        };
      }
      return {
        url: "data:text/javascript," + encodeURIComponent("export default " + payload + ";"),
        format: "module",
        shortCircuit: true,
      };
    }

    if (
      (!isWithin(sourceRoot, targetPath) && !isWithin(packageRoot, targetPath)) ||
      !targetPath.endsWith(".js") ||
      isFile(targetPath)
    ) {
      return nextResolve(specifier, context);
    }
    const source = sourceFile(targetPath);
    if (!source) {
      return nextResolve(specifier, context);
    }
    return {
      url: pathToFileURL(source).href,
      format: "module-typescript",
      shortCircuit: true,
    };
  },

  load(url, context, nextLoad) {
    const pathname = localSourceUrl(url);
    if (!pathname) {
      return nextLoad(url, context);
    }
    const transformed = transformSync(readFileSync(pathname, "utf8"), {
      loader: "ts",
      format: "esm",
      target: "es2022",
      sourcefile: pathname,
      sourcemap: false,
    });
    return { format: "module", source: transformed.code, shortCircuit: true };
  },
});
