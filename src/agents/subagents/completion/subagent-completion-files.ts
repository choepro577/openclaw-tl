import type { OpenClawConfig } from "../../../config/types.openclaw.js";
import { createLazyImportLoader } from "../../../shared/lazy-promise.js";
import { findTaskByRunId } from "../../../tasks/runtime-internal.js";
import { getLatestSubagentRunByChildSessionKey } from "../registry/subagent-registry-read.js";

const taskFilesRuntime = createLazyImportLoader(
  () => import("../../../gateway/server-methods/chat-history-files.runtime.js"),
);

/** The admitted completion owner publishes transcript-backed files before waking its requester. */
export async function deliverSubagentCompletionFiles(params: {
  cfg: OpenClawConfig;
  childSessionKey: string;
  childRunId: string;
  requesterSessionKey: string;
  isDeliveryAllowed: () => boolean;
}): Promise<boolean> {
  const source = getLatestSubagentRunByChildSessionKey(params.childSessionKey);
  if (source?.runId !== params.childRunId) {
    return false;
  }
  const task = findTaskByRunId(source.taskRunId ?? params.childRunId);
  if (
    !task ||
    task.runtime !== "subagent" ||
    task.childSessionKey !== params.childSessionKey ||
    task.requesterSessionKey !== params.requesterSessionKey
  ) {
    return false;
  }
  const isDeliveryAllowed = () => {
    const current = getLatestSubagentRunByChildSessionKey(params.childSessionKey);
    return (
      params.isDeliveryAllowed() &&
      current?.runId === params.childRunId &&
      current.generation === source.generation &&
      (current.taskRunId ?? current.runId) === task.runId &&
      current.requesterSessionKey === params.requesterSessionKey
    );
  };
  if (!isDeliveryAllowed()) {
    return false;
  }
  const runtime = await taskFilesRuntime.load();
  if (!isDeliveryAllowed()) {
    return false;
  }
  const result = await runtime.deliverTaskResultFiles(task, params.cfg, {
    isDeliveryAllowed,
    sourceRunId: params.childRunId,
  });
  return isDeliveryAllowed() && result.blocks.length > 0;
}
