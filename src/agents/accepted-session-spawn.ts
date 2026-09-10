/** Normalizes accepted child-session spawn results from loose tool payloads. */
import { asOptionalRecord } from "@openclaw/normalization-core/record-coerce";
import { normalizeOptionalString } from "@openclaw/normalization-core/string-coerce";

// Helpers for recognizing accepted session-spawn tool results.
export type AcceptedSessionSpawn = {
  runId: string;
  childSessionKey: string;
};

/** Normalize a tool result that accepted a child session spawn. */
export function normalizeAcceptedSessionSpawnResult(result: unknown): AcceptedSessionSpawn | null {
  const details = asOptionalRecord(asOptionalRecord(result)?.details);
  if (!details || details.status !== "accepted") {
    return null;
  }
  const runId = normalizeOptionalString(details.runId);
  const childSessionKey = normalizeOptionalString(details.childSessionKey);
  if (!runId || !childSessionKey) {
    return null;
  }
  return { runId, childSessionKey };
}

/** Normalize every accepted child launch carried by a managed fan-out tool result. */
export function normalizeAcceptedSessionSpawnResults(result: unknown): AcceptedSessionSpawn[] {
  const single = normalizeAcceptedSessionSpawnResult(result);
  if (single) {
    return [single];
  }
  const details = asOptionalRecord(asOptionalRecord(result)?.details);
  const rawSpawns =
    details?.acceptedSessionSpawns ?? asOptionalRecord(details?.telemetry)?.acceptedSessionSpawns;
  if (!Array.isArray(rawSpawns)) {
    return [];
  }
  const seen = new Set<string>();
  const accepted: AcceptedSessionSpawn[] = [];
  for (const rawSpawn of rawSpawns.slice(0, 3)) {
    const spawn = asOptionalRecord(rawSpawn);
    const runId = normalizeOptionalString(spawn?.runId);
    const childSessionKey = normalizeOptionalString(spawn?.childSessionKey);
    if (!runId || !childSessionKey) {
      continue;
    }
    const key = `${runId}\u0000${childSessionKey}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    accepted.push({ runId, childSessionKey });
  }
  return accepted;
}

/** Return true when a collection contains at least one accepted child spawn. */
export function hasAcceptedSessionSpawn(
  acceptedSessionSpawns?: readonly AcceptedSessionSpawn[],
): boolean {
  return Boolean(acceptedSessionSpawns?.length);
}
