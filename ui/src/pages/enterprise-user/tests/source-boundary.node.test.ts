import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { collectControlUiRawCopyFromSource } from "../../../../../scripts/lib/control-ui-i18n-raw-copy.ts";

const UI_ROOT = path.resolve(process.cwd(), path.basename(process.cwd()) === "ui" ? "." : "ui");
const REPO_ROOT = path.resolve(UI_ROOT, "..");
const ROOT = path.resolve(UI_ROOT, "src/pages/enterprise-user");

function filesUnder(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const target = path.join(directory, entry);
    return statSync(target).isDirectory() ? filesUnder(target) : [target];
  });
}

describe("Enterprise User source boundary", () => {
  const sourceFiles = filesUnder(ROOT).filter((file) => /\.(?:ts|css)$/u.test(file));

  it("does not import admin or operator feature modules", () => {
    for (const file of sourceFiles.filter((entry) => entry.endsWith(".ts"))) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/from\s+["'][^"']*enterprise-admin/u);
      expect(source, file).not.toMatch(
        /import\(["'](?:\.\.\/){3,}[^"']*\/(?:debug|logs|config|plugins)\//u,
      );
      expect(source, file).not.toMatch(/from\s+["'][^"']*\/(?:lib\/plugins|mcp-server)/u);
      expect(source, file).not.toMatch(/from\s+["'][^"']*operator/u);
      expect(source, file).not.toMatch(/from\s+["'][^"']*app-host(?:\.ts)?["']/u);
      expect(source, file).not.toMatch(/from\s+["'][^"']*app-shell-view(?:\.ts)?["']/u);
      const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
      const runtimeAppRoutesImports = sourceFile.statements.filter(
        (statement): statement is ts.ImportDeclaration =>
          ts.isImportDeclaration(statement) &&
          ts.isStringLiteral(statement.moduleSpecifier) &&
          /app-routes(?:\.ts)?$/u.test(statement.moduleSpecifier.text) &&
          statement.importClause?.isTypeOnly !== true,
      );
      expect(runtimeAppRoutesImports, file).toEqual([]);
    }
  });

  it("keeps scoped CSS free of global roots and raw design values", () => {
    for (const file of sourceFiles.filter((entry) => entry.endsWith(".css"))) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/(^|[,{\s])(?::root|html|body)(?=[\s,{])/mu);
      expect(source, file).not.toMatch(/@layer\b/u);
      expect(source, file).not.toMatch(/#[0-9a-f]{3,8}\b/iu);
      expect(source, file).not.toMatch(/@media[^\n]*(?:[0-9]{3,4}px)/u);
      expect(source, file).not.toMatch(/font-size:\s*[0-9.]+(?:px|rem|em)/u);
    }
  });

  it("keeps forbidden technical keys out of public V2 contracts", () => {
    const contract = readFileSync(
      path.resolve(REPO_ROOT, "src/enterprise/user/user-api-contracts.ts"),
      "utf8",
    );
    expect(contract).not.toMatch(
      /\b(?:accountId|profileId|runtimeAgentId|workspace|provider|model|resourceKey|toolId|skillId)\b/u,
    );
  });

  it("keeps User Portal copy in the English/Vietnamese i18n catalog", () => {
    const findings = sourceFiles
      .filter(
        (file) => file.endsWith(".ts") && !/\.(?:test|browser\.test|node\.test)\.ts$/u.test(file),
      )
      .flatMap((file) => {
        const source = readFileSync(file, "utf8");
        return collectControlUiRawCopyFromSource({
          filePath: file,
          source,
          sourceFile: ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true),
        });
      });
    expect(findings).toEqual([]);
  });
});
