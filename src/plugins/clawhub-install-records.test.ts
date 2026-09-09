import { describe, expect, it } from "vitest";
import { z } from "zod";
import { PluginInstallRecordShape } from "../config/zod-schema.installs.js";
import { buildClawHubPluginInstallRecordFields } from "./clawhub-install-records.js";

describe("ClawHub release identity", () => {
  it("preserves registry and runtime versions through install record construction and parsing", () => {
    const record = buildClawHubPluginInstallRecordFields({
      source: "clawhub",
      clawhubUrl: "https://clawhub.ai",
      clawhubPackage: "@acme/native",
      clawhubFamily: "code-plugin",
      clawhubVersion: "0.1.2",
      version: "0.1.0",
      integrity: "sha256-reviewed",
    });
    expect(z.object(PluginInstallRecordShape).parse(record)).toMatchObject({
      clawhubVersion: "0.1.2",
      version: "0.1.0",
      integrity: "sha256-reviewed",
    });
  });
});
