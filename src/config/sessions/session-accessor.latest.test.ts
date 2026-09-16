import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanupTempDirs, makeTempDir } from "../../../test/helpers/temp-dir.js";
import { closeOpenClawAgentDatabasesForTest } from "../../state/openclaw-agent-db.js";
import { listLatestSessionEntriesReadOnly, replaceSessionEntry } from "./session-accessor.js";

const tempDirs: string[] = [];

describe("bounded latest session accessor", () => {
  let storePath: string;

  beforeEach(() => {
    storePath = path.join(makeTempDir(tempDirs, "openclaw-session-latest-"), "sessions.json");
  });

  afterEach(() => {
    closeOpenClawAgentDatabasesForTest();
    cleanupTempDirs(tempDirs);
  });

  it("returns the newest owner row with a look-ahead and keeps exact special keys", async () => {
    const now = Date.now();
    await replaceSessionEntry(
      { agentId: "main", sessionKey: "agent:main:older", storePath },
      {
        sessionId: "older",
        updatedAt: now - 2,
        createdActor: { type: "human", id: "profile-1" },
      },
    );
    await replaceSessionEntry(
      { agentId: "main", sessionKey: "agent:main:newer", storePath },
      {
        sessionId: "newer",
        updatedAt: now - 1,
        createdActor: { type: "human", id: "profile-1" },
      },
    );
    await replaceSessionEntry(
      { agentId: "main", sessionKey: "agent:main:home", storePath },
      {
        sessionId: "home",
        updatedAt: now,
        createdActor: { type: "system", id: "system" },
      },
    );

    const ownerProbe = listLatestSessionEntriesReadOnly({
      agentId: "main",
      createdActorId: "profile-1",
      sessionKeyPrefix: "agent:main:",
      storePath,
      limit: 1,
    });
    expect(ownerProbe.entries.map(({ sessionKey }) => sessionKey)).toEqual(["agent:main:newer"]);
    expect(ownerProbe.hasMore).toBe(true);

    const homeProbe = listLatestSessionEntriesReadOnly({
      agentId: "main",
      exactSessionKeys: ["agent:main:home"],
      storePath,
      limit: 1,
    });
    expect(homeProbe.entries.map(({ sessionKey }) => sessionKey)).toEqual(["agent:main:home"]);
    expect(homeProbe.hasMore).toBe(false);
  });
});
