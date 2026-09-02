import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import { createEnterpriseAccount } from "../accounts/account-store.js";
import {
  claimEnterpriseExtensionIdempotency,
  completeEnterpriseExtensionIdempotency,
  hashEnterpriseExtensionRequest,
} from "./extension-idempotency-store.js";

const directories: string[] = [];

afterEach(() => {
  closeOpenClawStateDatabaseForTest();
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function createOptions() {
  const directory = mkdtempSync(join(tmpdir(), "openclaw-enterprise-extension-idempotency-"));
  directories.push(directory);
  return { path: join(directory, "state.sqlite") };
}

function captureError(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  throw new Error("Expected operation to fail");
}

describe("Enterprise extension idempotency", () => {
  it("replays the completed response and rejects key reuse with another body", () => {
    const options = createOptions();
    const account = createEnterpriseAccount(
      {
        username: "idempotency-user",
        displayName: "Idempotency User",
        passwordHash: "test-only",
        role: "employee",
      },
      options,
    );
    const body = { reviewToken: "review-token" };
    const fence = {
      audience: "user" as const,
      actorAccountId: account.id,
      operation: "skill.install",
      key: "install-calendar-v1",
      requestHash: hashEnterpriseExtensionRequest(body),
    };

    expect(claimEnterpriseExtensionIdempotency(fence, options)).toEqual({ state: "claimed" });
    expect(captureError(() => claimEnterpriseExtensionIdempotency(fence, options))).toMatchObject({
      code: "IDEMPOTENCY_IN_PROGRESS",
      status: 409,
    });

    completeEnterpriseExtensionIdempotency(
      { ...fence, responseStatus: 201, response: { install: { id: "install-1" } } },
      options,
    );
    expect(claimEnterpriseExtensionIdempotency(fence, options)).toEqual({
      state: "replay",
      status: 201,
      response: { install: { id: "install-1" } },
    });
    expect(
      captureError(() =>
        claimEnterpriseExtensionIdempotency(
          { ...fence, requestHash: hashEnterpriseExtensionRequest({ reviewToken: "different" }) },
          options,
        ),
      ),
    ).toMatchObject({
      code: "IDEMPOTENCY_KEY_REUSED",
      status: 409,
    });
  });
});
