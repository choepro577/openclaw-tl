/** Owns process-only publications released by the outer shared-state transaction. */
import type { DatabaseSync } from "node:sqlite";
import type { OpenClawStateDatabase } from "./openclaw-state-db-contract.js";

const postCommitPublications = new WeakMap<DatabaseSync, Array<() => void>>();

/** Queue a non-throwing runtime publication on the outer shared-state commit edge. */
export function deferOpenClawStatePostCommitPublication(
  database: OpenClawStateDatabase,
  publish: () => void,
): boolean {
  const publications = postCommitPublications.get(database.db);
  if (!publications) {
    return false;
  }
  publications.push(publish);
  return true;
}

/** Wrap the canonical transaction, then let its owner finish hardening before publication. */
export function runWithOpenClawStatePostCommitPublications<T>(
  database: OpenClawStateDatabase,
  operation: () => T,
): { result: T; publish: () => void } {
  const enteredNestedTransaction = database.db.isTransaction;
  const publications = enteredNestedTransaction ? postCommitPublications.get(database.db) : [];
  const publicationStart = publications?.length ?? 0;
  if (!enteredNestedTransaction && publications) {
    postCommitPublications.set(database.db, publications);
  }
  let result: T;
  try {
    result = operation();
  } catch (error) {
    publications?.splice(publicationStart);
    throw error;
  } finally {
    if (!enteredNestedTransaction && publications) {
      postCommitPublications.delete(database.db);
    }
  }
  return {
    result,
    publish: () => {
      if (!enteredNestedTransaction) {
        for (const publish of publications ?? []) {
          publish();
        }
      }
    },
  };
}
