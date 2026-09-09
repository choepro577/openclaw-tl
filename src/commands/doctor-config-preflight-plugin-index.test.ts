import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PluginInstallRecordMapState } from "../config/plugin-install-record-map.js";
import type { ConfigFileSnapshot } from "../config/types.js";
import type { StartupMigrationLease } from "../infra/startup-migration-checkpoint.js";
import type { PluginMetadataSnapshot } from "../plugins/plugin-metadata-snapshot.types.js";
import type { DoctorConfigPreflightPluginSnapshotRead } from "./doctor-config-preflight-plugin-index.js";

const writePersistedInstalledPluginIndexWithLeaseSync = vi.hoisted(() => vi.fn());
const inspectPersistedRecords = vi.hoisted(() =>
  vi.fn<() => PluginInstallRecordMapState>(() => ({ status: "missing" })),
);

vi.mock("../plugins/installed-plugin-index-record-state.js", () => ({
  inspectPersistedInstalledPluginIndexInstallRecordsSync: inspectPersistedRecords,
}));

vi.mock("../plugins/installed-plugin-index-store.js", () => ({
  writePersistedInstalledPluginIndexWithLeaseSync,
}));

const { persistRefreshedPluginIndex } = await import("./doctor-config-preflight-plugin-index.js");

function snapshotRead(
  metadata: Pick<PluginMetadataSnapshot, "index" | "registryDiagnostics" | "registrySource">,
): DoctorConfigPreflightPluginSnapshotRead {
  return {
    snapshot: {} as ConfigFileSnapshot,
    pluginMigrationFingerprint: "plugin-migrations",
    pluginMetadataSnapshot: metadata as PluginMetadataSnapshot,
  };
}

const measure = async <T>(_name: string, run: () => T | Promise<T>): Promise<T> => await run();

describe("persistRefreshedPluginIndex", () => {
  beforeEach(() => {
    writePersistedInstalledPluginIndexWithLeaseSync.mockReset();
    inspectPersistedRecords.mockReset();
    inspectPersistedRecords.mockReturnValue({ status: "missing" });
  });

  it.each(["missing-install", "changed-integrity", "invalid-ledger", "matching-ledger"])(
    "protects committed native installs from a stale Doctor snapshot: %s",
    async (scenario) => {
      const record = {
        source: "clawhub" as const,
        clawhubPackage: "@openclaw/diffs",
        version: "2026.8.1",
        integrity: "sha256-reviewed",
      };
      inspectPersistedRecords.mockReturnValue(
        scenario === "invalid-ledger"
          ? { status: "invalid" }
          : { status: "valid", records: { diffs: record } },
      );
      const index = {
        installRecords:
          scenario === "missing-install"
            ? {}
            : {
                diffs: {
                  ...record,
                  integrity: scenario === "changed-integrity" ? "sha256-old" : record.integrity,
                },
              },
      } as PluginMetadataSnapshot["index"];
      const reread = vi.fn(async () =>
        snapshotRead({ index, registryDiagnostics: [], registrySource: "persisted" }),
      );
      const result = persistRefreshedPluginIndex({
        env: {},
        lease: {} as StartupMigrationLease,
        measure,
        readPersistedSnapshot: reread,
        snapshotRead: snapshotRead({ index, registryDiagnostics: [], registrySource: "derived" }),
      });
      if (scenario === "matching-ledger") {
        await expect(result).resolves.toMatchObject({
          pluginMetadataSnapshot: { registrySource: "persisted" },
        });
        expect(writePersistedInstalledPluginIndexWithLeaseSync).toHaveBeenCalledOnce();
      } else {
        await expect(result).rejects.toThrow("committed install ledger");
        expect(writePersistedInstalledPluginIndexWithLeaseSync).not.toHaveBeenCalled();
        expect(reread).not.toHaveBeenCalled();
      }
    },
  );

  it("reports selector diagnostics when the durable reread is rejected", async () => {
    const index = {} as PluginMetadataSnapshot["index"];
    const lease = {} as StartupMigrationLease;
    const env = { OPENCLAW_STATE_DIR: "test-state" };

    await expect(
      persistRefreshedPluginIndex({
        env,
        lease,
        measure,
        readPersistedSnapshot: async () =>
          snapshotRead({
            index,
            registryDiagnostics: [
              {
                level: "warn",
                code: "persisted-registry-stale-source",
                message: "stale",
              },
            ],
            registrySource: "derived",
          }),
        snapshotRead: snapshotRead({
          index,
          registryDiagnostics: [],
          registrySource: "derived",
        }),
      }),
    ).rejects.toThrow("reread source was derived; diagnostics: persisted-registry-stale-source");

    expect(writePersistedInstalledPluginIndexWithLeaseSync).toHaveBeenCalledWith(index, {
      env,
      lease,
    });
  });
});
