#!/usr/bin/env node

/**
 * Bounded, isolated benchmark for the Enterprise delegation router.
 *
 * This drives prepareEnterpriseDelegationTurn for both modes. It does not
 * call enterprise_delegate or launch a child run. A temporary Enterprise
 * state database is created for each case/mode, while model credentials and
 * plugin configuration are read from the explicitly supplied temporary
 * OpenClaw state directory.
 *
 * Example:
 *   OPENCLAW_STATE_DIR=/tmp/enterprise-latency-20260909/isolated-state \
 *   OPENCLAW_CONFIG_PATH=/tmp/enterprise-latency-20260909/isolated-state/openclaw.json \
 *   node scripts/bench-enterprise-delegation-router.mjs --trials 30
 */

const { appendFileSync, existsSync, mkdtempSync, readFileSync, realpathSync, rmSync } =
  process.getBuiltinModule("node:fs");
const { createHash } = process.getBuiltinModule("node:crypto");
const { performance } = process.getBuiltinModule("node:perf_hooks");
const { tmpdir } = process.getBuiltinModule("node:os");
const { isAbsolute, join, relative, resolve } = process.getBuiltinModule("node:path");

type EvaluationMode = "sequential" | "parallel_pending_confirmation";
type ExpectedOutcome = "approve" | "reject";
type SeedFailure = {
  caseId: string;
  attempt: number;
  runId: string;
  reasonCode?: string;
  error?: string;
  prepareMs: number;
  modelMs: number;
  modelCalls: number;
};

type CaseTemplate = {
  id: string;
  task: string;
  followup: string;
  expected: ExpectedOutcome;
};

type RouterTurn = {
  decisionId?: string;
  outcome?: string;
  reasonCode?: string;
  instruction?: string;
};

type TimelineEvent = {
  type?: string;
  name?: string;
  durationMs?: number;
  attributes?: Record<string, string | number | boolean | null>;
};

type CaseSample = {
  caseId: string;
  mode: EvaluationMode;
  expected: ExpectedOutcome;
  initial: Pick<RouterTurn, "outcome" | "reasonCode"> | null;
  followup: Pick<RouterTurn, "outcome" | "reasonCode"> | null;
  initialPending: boolean;
  decisionCommitted: boolean;
  decisionAgentIds: string[];
  decisionMatchesPending: boolean | null;
  decisionMatchMode: "exact" | "includes" | null;
  decisionTaskExact: boolean | null;
  decisionTaskIncludesPending: boolean | null;
  decisionRequiredInputsMatch: boolean | null;
  decisionKnowledgeQueriesMatch: boolean | null;
  qualityPass: boolean;
  error?: string;
  totalWallMs: number;
  followupWallMs: number;
  prepareMs: number;
  modelMs: number;
  modelCalls: number;
  seedPrepareMs: number;
  seedModelMs: number;
  seedModelCalls: number;
  canonicalSnapshotDigest: string;
  parallelChecksStarted: number;
  parallelChecksCompleted: number;
  parallelFallback: boolean;
};

type CliOptions = {
  stateDir: string;
  configPath: string;
  trials: number;
  caseOffset: number;
  supplemental: boolean;
  modelRef: string;
  keep: boolean;
};

type BenchmarkConfig = {
  agents?: Record<string, unknown> & {
    entries?: Record<string, Record<string, unknown>>;
  };
  [key: string]: unknown;
};

type BenchmarkMetadata = {
  enterpriseDelegation?: {
    accountId: string;
    personalAgentId: string;
    specialists: readonly unknown[];
    turn?: RouterTurn;
  };
};

type StateOptions = { path: string };
type BenchmarkAccount = { id: string };
type BenchmarkInput = { id: string; value: string; sourceText: string };
type BenchmarkRoute = {
  agentId: string;
  task: string;
  requiredInputs: BenchmarkInput[];
  knowledgeQueries: string[];
};
type BenchmarkDecision = { routes: BenchmarkRoute[] };
type BenchmarkPending = {
  planId: string;
  planRevision: number;
  handling: "specialist" | "hybrid";
  personalAgentId: string;
  policyRevision: number;
  accountPolicyRevision: number;
  source: "explicit" | "rule" | "ai";
  prompt: string;
  answerContext: string;
  userInputs: string[];
  kind: "confirmation" | "input" | "choice";
  question: string;
  explicitAgentIds: string[];
  consentedAgentIds: string[];
  requiresRenewedConsent: boolean;
  expiresAt: number;
  routes: Array<{
    assignmentId: string;
    agentId: string;
    task: string;
    requiredInputs: BenchmarkInput[];
    knowledgeQueries: string[];
    profileRevision: string;
    overrideRevision: number;
  }>;
};
type BenchmarkPlan = {
  planId: string;
  planRevision: number;
  accountId: string;
  sessionKey: string;
  expiresAt: number;
  selected?: boolean;
  confirmed?: boolean;
};
type ConsumedDecision =
  | { ok: true; decision: BenchmarkDecision }
  | { ok: false; reasonCode?: string };

type ConfigRuntimeModule = {
  loadConfig(options: {
    pin: boolean;
    skipPluginValidation: boolean;
    skipShellEnvFallback: boolean;
  }): BenchmarkConfig;
};
type RequestRuntimeModule = {
  markGatewayRequestScopedRuntimeConfig(
    config: BenchmarkConfig,
    metadata: BenchmarkMetadata,
  ): BenchmarkConfig;
  readGatewayRequestRuntimeMetadata(config: BenchmarkConfig): BenchmarkMetadata | undefined;
};
type StateDbModule = { closeOpenClawStateDatabaseForTest(): void };
type RouterStateModule = {
  pendingClarifications: Map<string, BenchmarkPending>;
  plans: Map<string, BenchmarkPlan>;
};
type AccountsModule = {
  createEnterpriseAccount(input: Record<string, unknown>, options: StateOptions): BenchmarkAccount;
};
type EntitlementsModule = { sharedAgentResourceKey(agentId: string): string };
type DelegationStoreModule = {
  writeEnterpriseDelegationPolicy(
    baseRevision: number,
    input: Record<string, unknown>,
    options: StateOptions,
  ): unknown;
};
type RouterModule = {
  prepareEnterpriseDelegationTurn(params: {
    config: BenchmarkConfig;
    agentId: string;
    sessionKey: string;
    parentRunId: string;
    prompt: string;
    routerEvaluationMode: EvaluationMode;
    stateOptions: StateOptions;
  }): Promise<void>;
  consumeEnterpriseDelegationDecision(params: {
    config: BenchmarkConfig;
    decisionId: string;
    accountId: string;
    personalAgentId: string;
    sessionKey: string;
    parentRunId: string;
    stateOptions: StateOptions;
  }): ConsumedDecision;
  invalidateEnterpriseDelegationRouterRuntimeState(): void;
};

function printUsage(): void {
  console.log(
    [
      "Usage:",
      "  node scripts/bench-enterprise-delegation-router.mjs",
      "    --state-dir /tmp/openclaw-isolated",
      "    --config /tmp/openclaw-isolated/openclaw.json",
      "    --trials 30",
      "",
      "Required safety boundary:",
      "  --state-dir (or OPENCLAW_STATE_DIR) must be below the OS temporary directory.",
      "  --config (or OPENCLAW_CONFIG_PATH) must be inside that state directory.",
      "",
      "Options:",
      "  --trials N    Number of paired cases; the selected range must end at case 30.",
      "  --case-offset N  Start index for a resumable suffix (default: 0).",
      "  --supplemental  Run approve-5, approve-9 and quoted-defer oracle cases only.",
      "  --model REF   Router model reference (default: openai/gpt-5.6-luna).",
      "  --keep        Keep the temporary benchmark fixture and timeline for inspection.",
    ].join("\n"),
  );
}

function optionValue(args: string[], name: string): string | undefined {
  const exactIndex = args.indexOf(name);
  if (exactIndex >= 0) {
    return args[exactIndex + 1];
  }
  const prefix = name + "=";
  const inline = args.find((arg) => arg.startsWith(prefix));
  return inline?.slice(prefix.length);
}

function isWithin(parent: string, child: string): boolean {
  const rel = relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function parseCli(): CliOptions {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }
  const stateDir = resolve(
    optionValue(args, "--state-dir") ?? process.env.OPENCLAW_STATE_DIR ?? "",
  );
  const configPath = resolve(
    optionValue(args, "--config") ??
      process.env.OPENCLAW_CONFIG_PATH ??
      (stateDir ? join(stateDir, "openclaw.json") : ""),
  );
  if (!stateDir || stateDir === resolve(".")) {
    throw new Error(
      "Refusing to run without --state-dir or OPENCLAW_STATE_DIR pointing at an isolated temp state.",
    );
  }
  const tempRoot = resolve(tmpdir());
  if (!existsSync(stateDir) || !existsSync(configPath)) {
    throw new Error("Isolated state/config does not exist: " + stateDir);
  }
  const realStateDir = realpathSync(stateDir);
  const realConfigPath = realpathSync(configPath);
  const temporaryRoots = [tempRoot, resolve("/tmp")]
    .filter((root, index, all) => all.indexOf(root) === index)
    .map((root) => (existsSync(root) ? realpathSync(root) : root));
  if (!temporaryRoots.some((root) => isWithin(root, realStateDir))) {
    throw new Error("Refusing non-temporary state directory: " + stateDir);
  }
  if (!isWithin(realStateDir, realConfigPath)) {
    throw new Error("Refusing config outside the isolated state directory: " + configPath);
  }
  const supplemental = args.includes("--supplemental");
  const rawTrials = Number(
    optionValue(args, "--trials") ?? (supplemental ? String(SUPPLEMENTAL_CASES.length) : "30"),
  );
  const rawCaseOffset = Number(optionValue(args, "--case-offset") ?? "0");
  if (
    !Number.isInteger(rawTrials) ||
    rawTrials < 1 ||
    rawTrials > (supplemental ? SUPPLEMENTAL_CASES.length : CASE_TEMPLATES.length) ||
    !Number.isInteger(rawCaseOffset) ||
    rawCaseOffset < 0 ||
    (supplemental
      ? rawCaseOffset !== 0 || rawTrials !== SUPPLEMENTAL_CASES.length
      : rawCaseOffset + rawTrials !== CASE_TEMPLATES.length)
  ) {
    throw new Error(
      supplemental
        ? "--supplemental requires its fixed three-case set."
        : "--trials and --case-offset must select a suffix ending at all 30 benchmark cases.",
    );
  }
  return {
    stateDir,
    configPath,
    trials: rawTrials,
    caseOffset: rawCaseOffset,
    supplemental,
    modelRef: optionValue(args, "--model")?.trim() || "openai/gpt-5.6-luna",
    keep: args.includes("--keep"),
  };
}

const APPROVAL_FOLLOWUPS = [
  "Oke, làm giúp tôi",
  "Ừ, bạn cứ chuyển phần việc này cho chuyên gia nhé.",
  "Đồng ý, hãy thực hiện đúng phần phân tích vừa nêu.",
  "Tôi xác nhận, giao việc này cho chuyên gia tài chính.",
  "Vâng, làm giúp tôi theo đúng phạm vi trên.",
  "Được, bạn chuyển việc và trả lại kết quả cho tôi.",
  "Ừ, giao phần việc đó đi.",
  "Tôi đồng ý để chuyên gia xử lý kế hoạch này.",
  "Xác nhận chuyển việc cho chuyên gia tài chính.",
  "Đồng ý, bạn làm tiếp phần này giúp tôi.",
  "Được rồi, hãy giao đúng nhiệm vụ vừa mô tả.",
  "Tôi xác nhận việc chuyển giao.",
  "Vâng, nhờ chuyên gia kiểm tra các con số trên.",
  "Ừ, thực hiện giúp mình nhé.",
  "Đồng ý cho chuyên gia xử lý và báo cáo lại.",
] as const;

const REJECTION_FOLLOWUPS = [
  "Ừ để tôi hỏi lại đã",
  "Đồng ý, nhưng chỉ chi nhánh A",
  "Không, tôi không muốn chuyển cho chuyên gia.",
  "Thôi, dừng việc chuyển giao này giúp tôi.",
  "Chờ tôi hỏi lại quản lý đã rồi mới quyết định.",
  '"Đồng ý, làm giúp tôi"',
  "Ừ, nhưng khoanh phạm vi chỉ ở tháng 8 và chưa giao ngay.",
  "Không phải phần việc đó; hãy lập báo cáo nhân sự mới.",
  "Tôi đổi yêu cầu: chỉ kiểm tra chi phí cố định, chưa chuyển cho chuyên gia.",
  "Đừng giao việc, hãy giải thích cách tính ngay trong cuộc trò chuyện.",
  "Tôi chưa đồng ý, cần bổ sung số liệu trước.",
  "Hãy hỏi lại tôi sau, bây giờ chưa thực hiện.",
  "Tôi muốn xem lại phạm vi các chi nhánh trước khi giao.",
  "Không chuyển lúc này; tôi sẽ gửi yêu cầu mới.",
  "Tôi rút lại yêu cầu chuyển cho chuyên gia.",
] as const;

const CONCRETE_TASKS = [
  "Ban lãnh đạo cần đánh giá rủi ro và khuyến nghị hành động cho kế hoạch dòng tiền của các chi nhánh A và B trong tháng 8. Doanh thu dự kiến là 2.400 triệu đồng, chi phí cố định 800 triệu, chi phí biến đổi 600 triệu và tiền mặt đầu kỳ 1.000 triệu. Hãy phân tích nguyên nhân rủi ro thanh khoản, ưu tiên xử lý, điều kiện theo dõi và dấu hiệu cần báo cáo.",
  "Hãy đánh giá phương án ngân sách quý 3 cho các chi nhánh A và B: doanh thu dự kiến 7.200 triệu đồng, nhân sự 2.100 triệu, mặt bằng 900 triệu, marketing 450 triệu và dự phòng 300 triệu. Cần khuyến nghị thứ tự cắt hoặc giữ các khoản chi, nêu rủi ro vận hành và điều kiện để kế hoạch vẫn khả thi.",
  "Hãy thẩm định kế hoạch tăng trưởng sản phẩm X tại các chi nhánh A và B: giá bán 1.200.000 đồng, giá vốn 720.000 đồng, sản lượng dự kiến 1.500 sản phẩm mỗi tháng và chi phí vận hành 180 triệu. Cần đánh giá độ bền lợi nhuận, rủi ro khi sản lượng lệch kế hoạch và khuyến nghị điều kiện triển khai.",
  "Hãy đánh giá quyết định mở rộng cửa hàng B tại các chi nhánh A và B: chi phí cố định 360 triệu đồng mỗi tháng, giá bán trung bình 250.000 đồng và biến phí mỗi đơn 150.000 đồng. Cần đưa ra khuyến nghị triển khai, các rủi ro khi nhu cầu thấp và chỉ báo cần theo dõi trước khi cam kết.",
  "Hãy thẩm định hai phương án đầu tư cho các chi nhánh A và B: phương án A vốn 1.200 triệu và thu hồi 1.500 triệu sau 12 tháng; phương án B vốn 900 triệu và thu hồi 1.080 triệu sau 12 tháng. Cần khuyến nghị phương án theo rủi ro, thanh khoản và khả năng mở rộng, đồng thời nêu thông tin còn thiếu trước khi quyết định.",
  "Hãy đánh giá kế hoạch thu hồi công nợ tháng 8 của các chi nhánh A và B: phải thu 1.800 triệu đồng, đã thu 1.250 triệu, quá hạn 320 triệu và dự phòng 80 triệu. Cần khuyến nghị thứ tự xử lý, mức độ rủi ro và biện pháp kiểm soát để không làm gián đoạn hoạt động.",
  "Hãy thẩm định kế hoạch tiền mặt ba tháng cho các chi nhánh A và B: số dư đầu kỳ 900 triệu, thu lần lượt 1.100/1.300/1.500 triệu và chi 1.250/1.450/1.600 triệu. Cần nêu rủi ro theo từng giai đoạn, phương án dự phòng và ngưỡng cần báo cáo cho lãnh đạo.",
  "Hãy đánh giá kế hoạch tối ưu vận chuyển cho các chi nhánh A và B: 4.000 đơn, phí trung bình 42.000 đồng, ngân sách 150 triệu và phụ phí 18 triệu. Cần khuyến nghị cách xử lý phần vượt, rủi ro chất lượng dịch vụ và tiêu chí quyết định có thay đổi nhà cung cấp hay không.",
  "Hãy thẩm định kế hoạch khuyến mãi áp dụng cho các chi nhánh A và B: giảm giá 10%, sản lượng tăng từ 2.000 lên 2.500 sản phẩm, giá niêm yết 400.000 đồng và giá vốn 250.000 đồng. Cần đánh giá tính bền vững, rủi ro biên lợi nhuận và khuyến nghị điều kiện tiếp tục chương trình.",
  "Hãy đánh giá kế hoạch trả khoản vay của các chi nhánh A và B: dư nợ 3.000 triệu đồng, lãi suất năm 9%, kỳ hạn 12 tháng và trả gốc đều mỗi tháng. Cần phân tích rủi ro dòng tiền, khuyến nghị lịch trả hoặc dự phòng, và các điều kiện cần kiểm tra trước khi cam kết.",
] as const;

const CASE_TEMPLATES: CaseTemplate[] = [
  ...APPROVAL_FOLLOWUPS.map((followup, index) => ({
    id: "approve-" + (index + 1),
    task: CONCRETE_TASKS[index % CONCRETE_TASKS.length]!,
    followup,
    expected: "approve" as const,
  })),
  ...REJECTION_FOLLOWUPS.map((followup, index) => ({
    id: "reject-" + (index + 1),
    task: CONCRETE_TASKS[(index + APPROVAL_FOLLOWUPS.length) % CONCRETE_TASKS.length]!,
    followup,
    expected: "reject" as const,
  })),
];

const SUPPLEMENTAL_CASES: CaseTemplate[] = [
  CASE_TEMPLATES[4]!,
  CASE_TEMPLATES[8]!,
  {
    id: "supplement-quoted-defer",
    task: CONCRETE_TASKS[0],
    followup:
      "Tôi chỉ nhắc lại câu người kia viết: “Đồng ý, làm giúp tôi”; tôi chưa đồng ý giao việc.",
    expected: "reject",
  },
];

function readTimeline(pathname: string): TimelineEvent[] {
  if (!existsSync(pathname)) {
    return [];
  }
  return readFileSync(pathname, "utf8")
    .split("\n")
    .filter(Boolean)
    .flatMap((line: string) => {
      try {
        const event = JSON.parse(line) as TimelineEvent;
        return event && typeof event === "object" ? [event] : [];
      } catch {
        return [];
      }
    });
}

function timelineStats(
  events: readonly TimelineEvent[],
  runIds: readonly string[],
): {
  prepareMs: number;
  modelMs: number;
  modelCalls: number;
  parallelChecksStarted: number;
  parallelChecksCompleted: number;
  parallelFallback: boolean;
} {
  const ids = new Set(runIds);
  let prepareMs = 0;
  let modelMs = 0;
  let modelCalls = 0;
  let parallelChecksStarted = 0;
  let parallelChecksCompleted = 0;
  let parallelFallback = false;
  for (const event of events) {
    if (!event.name) {
      continue;
    }
    const runId = event.attributes?.runId;
    if (typeof runId !== "string" || !ids.has(runId)) {
      continue;
    }
    const stage = event.attributes?.stage;
    if (
      event.type === "span.start" &&
      (stage === "confirmation_parallel_a" || stage === "confirmation_parallel_b")
    ) {
      parallelChecksStarted += 1;
    }
    if (
      (event.type === "span.end" || event.type === "span.error") &&
      (stage === "confirmation_parallel_a" || stage === "confirmation_parallel_b")
    ) {
      parallelChecksCompleted += 1;
    }
    if (
      event.type === "span.start" &&
      (stage === "continuation" || stage === "continuation_retry")
    ) {
      parallelFallback = true;
    }
    if (
      (event.type !== "span.end" && event.type !== "span.error") ||
      typeof event.durationMs !== "number"
    ) {
      continue;
    }
    if (event.name === "enterprise.delegation.router.prepare") {
      prepareMs += event.durationMs;
    } else if (event.name === "enterprise.delegation.router.model") {
      modelMs += event.durationMs;
      modelCalls += 1;
    }
  }
  return {
    prepareMs,
    modelMs,
    modelCalls,
    parallelChecksStarted,
    parallelChecksCompleted,
    parallelFallback,
  };
}

function finiteNumber(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function percentile(values: readonly number[], percentileValue: number): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = values.toSorted((a, b) => a - b);
  const rank = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(percentileValue * sorted.length) - 1),
  );
  return sorted[rank] ?? 0;
}

function failureReason(reasonCode: string | undefined): boolean {
  if (!reasonCode) {
    return false;
  }
  const normalSemanticReasons = new Set([
    "handoff_confirmation_required",
    "handoff_confirmation_required_for_routes",
    "handoff_cancelled",
    "pending_clarification_unresolved",
    "pending_clarification_changed",
    "pending_clarification_replaced",
    "router_ambiguous",
    "router_low_confidence",
    "router_no_candidate",
    "router_route_unknown",
    "router_scope_mismatch",
    "router_mode_disallowed",
    "router_agent_limit",
  ]);
  if (
    normalSemanticReasons.has(reasonCode) ||
    reasonCode.startsWith("required_input_missing:") ||
    reasonCode.startsWith("router_input_")
  ) {
    return false;
  }
  return (
    reasonCode === "router_unavailable" ||
    reasonCode === "pending_continuation_missing" ||
    reasonCode === "pending_continuation_invalid" ||
    /^(router_preparation_failed|router_provider_error|router_timed_out|router_response_|router_verifier_)/i.test(
      reasonCode,
    )
  );
}

function isRetryableSeedFailure(
  reasonCode: string | undefined,
  error: string | undefined,
): boolean {
  return (
    reasonCode === "router_unavailable" ||
    reasonCode?.startsWith("router_provider_error") === true ||
    /(?:provider|request was aborted)/i.test(error ?? "")
  );
}

function turnSummary(
  turn: RouterTurn | undefined,
): Pick<RouterTurn, "outcome" | "reasonCode"> | null {
  return turn
    ? {
        outcome: turn.outcome,
        reasonCode: turn.reasonCode,
      }
    : null;
}

function isInitialConfirmation(turn: RouterTurn | undefined): boolean {
  return (
    turn?.outcome === "clarify" &&
    (turn.reasonCode === "handoff_confirmation_required" ||
      turn.reasonCode === "handoff_confirmation_required_for_routes")
  );
}

function canonicalInputs(inputs: readonly BenchmarkInput[]): BenchmarkInput[] {
  return inputs
    .map(({ id, value, sourceText }) => ({ id, value, sourceText }))
    .toSorted((left, right) => left.id.localeCompare(right.id));
}

function accountPendingKey(accountId: string, sessionKey: string): string {
  return accountId + "\0" + sessionKey;
}

function snapshotPending(pending: BenchmarkPending | undefined): BenchmarkPending | undefined {
  if (!pending) {
    return undefined;
  }
  return {
    planId: pending.planId,
    planRevision: pending.planRevision,
    handling: pending.handling,
    personalAgentId: pending.personalAgentId,
    policyRevision: pending.policyRevision,
    accountPolicyRevision: pending.accountPolicyRevision,
    source: pending.source,
    prompt: pending.prompt,
    answerContext: pending.answerContext,
    userInputs: [...pending.userInputs],
    kind: pending.kind,
    question: pending.question,
    explicitAgentIds: [...pending.explicitAgentIds],
    consentedAgentIds: [...pending.consentedAgentIds],
    requiresRenewedConsent: pending.requiresRenewedConsent,
    expiresAt: pending.expiresAt,
    routes: pending.routes.map((route) => ({
      assignmentId: route.assignmentId,
      agentId: route.agentId,
      task: route.task,
      requiredInputs: route.requiredInputs.map((input) => ({ ...input })),
      knowledgeQueries: [...route.knowledgeQueries],
      profileRevision: route.profileRevision,
      overrideRevision: route.overrideRevision,
    })),
  };
}

function snapshotPlan(plan: BenchmarkPlan | undefined): BenchmarkPlan | undefined {
  return plan ? { ...plan } : undefined;
}

function canonicalSnapshotDigest(pending: BenchmarkPending, plan: BenchmarkPlan): string {
  return createHash("sha256").update(JSON.stringify({ pending, plan })).digest("hex");
}

function restoreCanonicalPending(
  routerState: RouterStateModule,
  accountId: string,
  sessionKey: string,
  pending: BenchmarkPending,
  plan: BenchmarkPlan,
): void {
  routerState.plans.set(plan.planId, { ...plan });
  routerState.pendingClarifications.set(
    accountPendingKey(accountId, sessionKey),
    snapshotPending(pending)!,
  );
}

type DecisionRouteComparison = {
  all: boolean;
  taskExact: boolean;
  taskIncludesPending: boolean;
  requiredInputsMatch: boolean;
  knowledgeQueriesMatch: boolean;
};

function compareDecisionRoutes(
  decisionRoutes: readonly BenchmarkRoute[],
  pendingRoutes: readonly BenchmarkPending["routes"][number][],
  mode: EvaluationMode,
): DecisionRouteComparison {
  if (decisionRoutes.length !== pendingRoutes.length) {
    return {
      all: false,
      taskExact: false,
      taskIncludesPending: false,
      requiredInputsMatch: false,
      knowledgeQueriesMatch: false,
    };
  }
  const pendingByAgent = new Map(pendingRoutes.map((route) => [route.agentId, route]));
  let taskExact = true;
  let taskIncludesPending = true;
  let requiredInputsMatch = true;
  let knowledgeQueriesMatch = true;
  for (const route of decisionRoutes) {
    const pending = pendingByAgent.get(route.agentId);
    if (!pending) {
      taskExact = false;
      taskIncludesPending = false;
      requiredInputsMatch = false;
      knowledgeQueriesMatch = false;
      continue;
    }
    taskExact &&= route.task.trim() === pending.task.trim();
    taskIncludesPending &&= route.task.includes(pending.task);
    requiredInputsMatch &&=
      JSON.stringify(canonicalInputs(route.requiredInputs)) ===
      JSON.stringify(canonicalInputs(pending.requiredInputs));
    knowledgeQueriesMatch &&=
      JSON.stringify(route.knowledgeQueries.toSorted()) ===
      JSON.stringify(pending.knowledgeQueries.toSorted());
  }
  const taskMatches = mode === "parallel_pending_confirmation" ? taskExact : taskIncludesPending;
  return {
    all: taskMatches && requiredInputsMatch && knowledgeQueriesMatch,
    taskExact,
    taskIncludesPending,
    requiredInputsMatch,
    knowledgeQueriesMatch,
  };
}

async function main(): Promise<void> {
  const options = parseCli();

  // Set these before loading source modules: auth/model/config resolution
  // reads the process environment during module/runtime setup.
  process.env.OPENCLAW_STATE_DIR = options.stateDir;
  process.env.OPENCLAW_CONFIG_PATH = options.configPath;
  process.env.OPENCLAW_DIAGNOSTICS = "timeline";
  process.env.OPENCLAW_DIAGNOSTICS_ENV = "enterprise-router-benchmark";

  const benchmarkDir = mkdtempSync(join(tmpdir(), "enterprise-router-benchmark-"));
  const timelinePath = join(benchmarkDir, "timeline.jsonl");
  const samplesPath = join(benchmarkDir, "samples.jsonl");
  process.env.OPENCLAW_DIAGNOSTICS_TIMELINE_PATH = timelinePath;

  // Keep source loading lazy until after the isolated environment is set. The
  // native launcher has already installed the benchmark-only ESM source hook;
  // imports stay sequential to avoid concurrent module/plugin initialization
  // races and are paid once per benchmark process.
  const loadSourceModule = (specifier: string) =>
    import(specifier) as Promise<Record<string, unknown>>;
  const rawConfigRuntime = await loadSourceModule("../src/config/io.runtime.js");
  const rawRequestRuntime = await loadSourceModule("../src/gateway/request-runtime-config.js");
  const rawStateDb = await loadSourceModule("../src/state/openclaw-state-db.js");
  const rawAccounts = await loadSourceModule("../src/enterprise/accounts/account-store.js");
  const rawEntitlements = await loadSourceModule("../src/enterprise/entitlements/resource-keys.js");
  const rawDelegationStore = await loadSourceModule(
    "../src/enterprise/delegation/delegation-store.js",
  );
  const rawRouter = await loadSourceModule("../src/enterprise/delegation/delegation-router.js");
  const rawRouterState = await loadSourceModule(
    "../src/enterprise/delegation/delegation-router-state.js",
  );
  const configRuntime = rawConfigRuntime as unknown as ConfigRuntimeModule;
  const requestRuntime = rawRequestRuntime as unknown as RequestRuntimeModule;
  const stateDb = rawStateDb as unknown as StateDbModule;
  const accounts = rawAccounts as unknown as AccountsModule;
  const entitlements = rawEntitlements as unknown as EntitlementsModule;
  const delegationStore = rawDelegationStore as unknown as DelegationStoreModule;
  const router = rawRouter as unknown as RouterModule;
  const routerState = rawRouterState as unknown as RouterStateModule;

  const baseConfig = configRuntime.loadConfig({
    pin: false,
    skipPluginValidation: true,
    skipShellEnvFallback: true,
  });

  function createFixture(caseTemplate: CaseTemplate) {
    const fixtureDir = mkdtempSync(join(benchmarkDir, caseTemplate.id + "-"));
    const stateOptions = { path: join(fixtureDir, "enterprise.sqlite") };
    const account = accounts.createEnterpriseAccount(
      {
        username: "bench." + caseTemplate.id,
        displayName: "Enterprise Router Benchmark",
        passwordHash: "benchmark-only",
        role: "employee",
        personalAgentEnabled: true,
        initialEntitlements: [
          {
            resourceType: "agent" as const,
            resourceId: entitlements.sharedAgentResourceKey("finance"),
            effect: "allow" as const,
          },
        ],
      },
      stateOptions,
    );
    delegationStore.writeEnterpriseDelegationPolicy(
      0,
      {
        rollout: "on",
        routerModel: options.modelRef,
        autoThreshold: 0.9,
        clarifyThreshold: 0.7,
        minimumMargin: 0.15,
        maxDelegatesPerTurn: 1,
        eventRetentionDays: 1,
      },
      stateOptions,
    );
    const configuredEntries = baseConfig.agents?.entries;
    const entries = {
      ...(configuredEntries ? configuredEntries : {}),
      finance: {
        name: "Finance Specialist",
        description: "Reviews concrete budgets, cash flow, margins, and financial plans.",
        delegationTarget: {
          status: "active" as const,
          aliases: ["finance", "chuyên gia tài chính"],
          handlingMode: "confirm_before_handoff" as const,
          useWhen: [
            "review budgets",
            "analyze cash flow",
            "calculate margins",
            "evaluate financial plans",
          ],
          avoidWhen: [],
          requiredInputs: [],
        },
      },
    };
    const createRequestConfig = () =>
      requestRuntime.markGatewayRequestScopedRuntimeConfig(
        {
          ...baseConfig,
          agents: {
            ...(baseConfig.agents ? baseConfig.agents : {}),
            entries,
          },
        },
        {
          enterpriseDelegation: {
            accountId: account.id,
            personalAgentId: "main",
            specialists: [],
          },
        },
      );
    return { account, createRequestConfig, fixtureDir, stateOptions };
  }

  async function runPair(caseTemplate: CaseTemplate): Promise<{
    samples: [CaseSample, CaseSample];
    blockedReason?: string;
    seedFailures: SeedFailure[];
  }> {
    const fixture = createFixture(caseTemplate);
    const sessionKey = "benchmark-" + caseTemplate.id;
    const pendingKey = accountPendingKey(fixture.account.id, sessionKey);
    let initial: RouterTurn | undefined;
    let pendingSnapshot: BenchmarkPending | undefined;
    let planSnapshot: BenchmarkPlan | undefined;
    let seedTiming = { prepareMs: 0, modelMs: 0, modelCalls: 0 };
    const seedRunIds: string[] = [];
    const seedFailures: SeedFailure[] = [];
    try {
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        if (attempt > 1) {
          router.invalidateEnterpriseDelegationRouterRuntimeState();
        }
        const seedRunId =
          attempt === 1 ? sessionKey + "-seed" : sessionKey + "-seed-retry-" + attempt;
        seedRunIds.push(seedRunId);
        initial = undefined;
        pendingSnapshot = undefined;
        planSnapshot = undefined;
        let attemptError: string | undefined;
        console.error("[benchmark] " + caseTemplate.id + " seed attempt " + attempt + "/3 start");
        try {
          const initialConfig = fixture.createRequestConfig();
          await router.prepareEnterpriseDelegationTurn({
            config: initialConfig,
            agentId: "main",
            sessionKey,
            parentRunId: seedRunId,
            prompt: caseTemplate.task,
            routerEvaluationMode: "sequential",
            stateOptions: fixture.stateOptions,
          });
          initial =
            requestRuntime.readGatewayRequestRuntimeMetadata(initialConfig)?.enterpriseDelegation
              ?.turn;
        } catch (caught) {
          attemptError = caught instanceof Error ? caught.message : String(caught);
        }
        pendingSnapshot = snapshotPending(routerState.pendingClarifications.get(pendingKey));
        planSnapshot = snapshotPlan(
          pendingSnapshot ? routerState.plans.get(pendingSnapshot.planId) : undefined,
        );
        const attemptTiming = timelineStats(readTimeline(timelinePath), [seedRunId]);
        seedTiming = timelineStats(readTimeline(timelinePath), seedRunIds);
        const seedValid =
          isInitialConfirmation(initial) &&
          Boolean(pendingSnapshot && planSnapshot) &&
          !attemptError;
        console.error(
          "[benchmark] " +
            caseTemplate.id +
            " seed attempt " +
            attempt +
            "/3 done " +
            Math.round(attemptTiming.modelMs) +
            "ms model quality=" +
            String(seedValid) +
            (attemptError ? " error=" + attemptError : ""),
        );
        if (seedValid) {
          break;
        }
        const reasonCode = initial?.reasonCode;
        seedFailures.push({
          caseId: caseTemplate.id,
          attempt,
          runId: seedRunId,
          ...(reasonCode ? { reasonCode } : {}),
          ...(attemptError ? { error: attemptError } : {}),
          prepareMs: attemptTiming.prepareMs,
          modelMs: attemptTiming.modelMs,
          modelCalls: attemptTiming.modelCalls,
        });
        if (!isRetryableSeedFailure(reasonCode, attemptError) || attempt === 3) {
          break;
        }
      }
      if (!isInitialConfirmation(initial) || !pendingSnapshot || !planSnapshot) {
        return {
          samples: [
            {
              caseId: caseTemplate.id,
              mode: "sequential",
              expected: caseTemplate.expected,
              initial: turnSummary(initial),
              followup: null,
              initialPending: isInitialConfirmation(initial),
              decisionCommitted: false,
              decisionAgentIds: [],
              decisionMatchesPending: null,
              decisionMatchMode: null,
              decisionTaskExact: null,
              decisionTaskIncludesPending: null,
              decisionRequiredInputsMatch: null,
              decisionKnowledgeQueriesMatch: null,
              qualityPass: false,
              error: "seed_not_pending_confirmation",
              totalWallMs: 0,
              followupWallMs: 0,
              prepareMs: 0,
              modelMs: 0,
              modelCalls: 0,
              seedPrepareMs: seedTiming.prepareMs,
              seedModelMs: seedTiming.modelMs,
              seedModelCalls: seedTiming.modelCalls,
              canonicalSnapshotDigest: "",
              parallelChecksStarted: 0,
              parallelChecksCompleted: 0,
              parallelFallback: false,
            },
            {
              caseId: caseTemplate.id,
              mode: "parallel_pending_confirmation",
              expected: caseTemplate.expected,
              initial: turnSummary(initial),
              followup: null,
              initialPending: isInitialConfirmation(initial),
              decisionCommitted: false,
              decisionAgentIds: [],
              decisionMatchesPending: null,
              decisionMatchMode: null,
              decisionTaskExact: null,
              decisionTaskIncludesPending: null,
              decisionRequiredInputsMatch: null,
              decisionKnowledgeQueriesMatch: null,
              qualityPass: false,
              error: "seed_not_pending_confirmation",
              totalWallMs: 0,
              followupWallMs: 0,
              prepareMs: 0,
              modelMs: 0,
              modelCalls: 0,
              seedPrepareMs: seedTiming.prepareMs,
              seedModelMs: seedTiming.modelMs,
              seedModelCalls: seedTiming.modelCalls,
              canonicalSnapshotDigest: "",
              parallelChecksStarted: 0,
              parallelChecksCompleted: 0,
              parallelFallback: false,
            },
          ],
          blockedReason:
            initial?.reasonCode ??
            (isInitialConfirmation(initial) ? "seed_plan_snapshot_missing" : "seed_not_pending"),
          seedFailures,
        };
      }

      async function runFollowup(mode: EvaluationMode): Promise<CaseSample> {
        const followupRunId = sessionKey + "-" + mode;
        const followupStartedAt = performance.now();
        let followup: RouterTurn | undefined;
        let decisionCommitted = false;
        let decisionAgentIds: string[] = [];
        let decisionMatchesPending: boolean | null = null;
        let decisionMatchMode: "exact" | "includes" | null = null;
        let decisionTaskExact: boolean | null = null;
        let decisionTaskIncludesPending: boolean | null = null;
        let decisionRequiredInputsMatch: boolean | null = null;
        let decisionKnowledgeQueriesMatch: boolean | null = null;
        let error: string | undefined;
        if (mode === "parallel_pending_confirmation") {
          router.invalidateEnterpriseDelegationRouterRuntimeState();
          restoreCanonicalPending(
            routerState,
            fixture.account.id,
            sessionKey,
            pendingSnapshot!,
            planSnapshot!,
          );
        }
        const modePending = snapshotPending(routerState.pendingClarifications.get(pendingKey));
        const modePlan = snapshotPlan(
          modePending ? routerState.plans.get(modePending.planId) : undefined,
        );
        const modeSnapshotDigest =
          modePending && modePlan ? canonicalSnapshotDigest(modePending, modePlan) : "";
        const followupConfig = fixture.createRequestConfig();
        let comparisonMode = mode;
        try {
          await router.prepareEnterpriseDelegationTurn({
            config: followupConfig,
            agentId: "main",
            sessionKey,
            parentRunId: followupRunId,
            prompt: caseTemplate.followup,
            routerEvaluationMode: mode,
            stateOptions: fixture.stateOptions,
          });
          followup =
            requestRuntime.readGatewayRequestRuntimeMetadata(followupConfig)?.enterpriseDelegation
              ?.turn;
          const observedTiming = timelineStats(readTimeline(timelinePath), [followupRunId]);
          if (mode === "parallel_pending_confirmation" && observedTiming.parallelFallback) {
            comparisonMode = "sequential";
          }
          if (followup?.decisionId) {
            const consumed = router.consumeEnterpriseDelegationDecision({
              config: followupConfig,
              decisionId: followup.decisionId,
              accountId: fixture.account.id,
              personalAgentId: "main",
              sessionKey,
              parentRunId: followupRunId,
              stateOptions: fixture.stateOptions,
            });
            if (!consumed.ok) {
              error = "decision_consume_failed:" + consumed.reasonCode;
            } else {
              decisionCommitted = true;
              const decisionRoutes = consumed.decision.routes as unknown as BenchmarkRoute[];
              const comparison = compareDecisionRoutes(
                decisionRoutes,
                pendingSnapshot!.routes,
                comparisonMode,
              );
              decisionMatchesPending = comparison.all;
              decisionMatchMode =
                comparisonMode === "parallel_pending_confirmation" ? "exact" : "includes";
              decisionTaskExact = comparison.taskExact;
              decisionTaskIncludesPending = comparison.taskIncludesPending;
              decisionRequiredInputsMatch = comparison.requiredInputsMatch;
              decisionKnowledgeQueriesMatch = comparison.knowledgeQueriesMatch;
              decisionAgentIds = decisionRoutes.map((route) => route.agentId);
            }
          }
        } catch (caught) {
          error = caught instanceof Error ? caught.message : String(caught);
        }
        const followupWallMs = finiteNumber(performance.now() - followupStartedAt);
        const timing = timelineStats(readTimeline(timelinePath), [followupRunId]);
        const initialPending = isInitialConfirmation(initial);
        const routerError =
          Boolean(error) ||
          failureReason(initial?.reasonCode) ||
          failureReason(followup?.reasonCode);
        const qualityPass =
          !routerError &&
          initialPending &&
          (caseTemplate.expected === "approve"
            ? decisionCommitted &&
              decisionMatchesPending === true &&
              decisionAgentIds.length > 0 &&
              decisionAgentIds.every((id) => id === "finance")
            : Boolean(followup) &&
              !decisionCommitted &&
              followup?.outcome !== "delegate" &&
              followup?.outcome !== "failed" &&
              followup?.outcome !== "error");
        return {
          caseId: caseTemplate.id,
          mode,
          expected: caseTemplate.expected,
          initial: turnSummary(initial),
          followup: turnSummary(followup),
          initialPending,
          decisionCommitted,
          decisionAgentIds,
          decisionMatchesPending,
          decisionMatchMode,
          decisionTaskExact,
          decisionTaskIncludesPending,
          decisionRequiredInputsMatch,
          decisionKnowledgeQueriesMatch,
          qualityPass,
          ...(error ? { error } : {}),
          totalWallMs: followupWallMs,
          followupWallMs,
          ...timing,
          parallelFallback: mode === "parallel_pending_confirmation" && timing.parallelFallback,
          seedPrepareMs: seedTiming.prepareMs,
          seedModelMs: seedTiming.modelMs,
          seedModelCalls: seedTiming.modelCalls,
          canonicalSnapshotDigest: modeSnapshotDigest,
        };
      }

      const sequential = await runFollowup("sequential");
      console.error(
        "[benchmark] " +
          caseTemplate.id +
          " sequential followup done " +
          Math.round(sequential.followupWallMs) +
          "ms quality=" +
          String(sequential.qualityPass),
      );
      const parallel = await runFollowup("parallel_pending_confirmation");
      console.error(
        "[benchmark] " +
          caseTemplate.id +
          " parallel followup done " +
          Math.round(parallel.followupWallMs) +
          "ms quality=" +
          String(parallel.qualityPass),
      );
      return { samples: [sequential, parallel], seedFailures };
    } finally {
      router.invalidateEnterpriseDelegationRouterRuntimeState();
      stateDb.closeOpenClawStateDatabaseForTest();
      rmSync(fixture.fixtureDir, { recursive: true, force: true });
    }
  }

  const samples: CaseSample[] = [];
  const selectedCases = options.supplemental
    ? SUPPLEMENTAL_CASES
    : CASE_TEMPLATES.slice(options.caseOffset, options.caseOffset + options.trials);
  const seedFailures: SeedFailure[] = [];
  let pairedCasesCompleted = 0;

  function actualModelCalls(rows: readonly CaseSample[]): number {
    const seedCalls = rows
      .filter((row) => row.mode === "sequential")
      .reduce((sum, row) => sum + row.seedModelCalls, 0);
    return seedCalls + rows.reduce((sum, row) => sum + row.modelCalls, 0);
  }

  for (const caseTemplate of selectedCases) {
    // Seed one real pending plan, then restore its complete immutable snapshot
    // before the second mode. This makes both followups judge the same task and
    // facts while keeping each decision one-shot and request-scoped.
    const pair = await runPair(caseTemplate);
    samples.push(...pair.samples);
    seedFailures.push(...pair.seedFailures);
    if (options.keep) {
      appendFileSync(
        samplesPath,
        pair.samples.map((sample) => JSON.stringify(sample) + "\n").join(""),
        "utf8",
      );
    }
    if (pair.blockedReason) {
      console.log(
        JSON.stringify(
          {
            benchmark: "enterprise-delegation-router",
            status: "blocked",
            model: options.modelRef,
            supplemental: options.supplemental,
            caseOffset: options.caseOffset,
            pairedCases: pairedCasesCompleted,
            actualModelCalls: actualModelCalls(samples),
            blockedReason: pair.blockedReason,
            seedFailures,
            diagnostic:
              "A seed did not produce one valid pending confirmation snapshot; no incomplete pair was counted as a timing or quality trial.",
            completedSamples: samples,
            firstSamples: pair.samples,
            ...(options.keep ? { timelinePath, samplesPath } : {}),
          },
          null,
          2,
        ),
      );
      if (!options.keep) {
        rmSync(benchmarkDir, { recursive: true, force: true });
      }
      process.exitCode = 2;
      return;
    }
    pairedCasesCompleted += 1;
    console.error(
      "[benchmark] paired " +
        pairedCasesCompleted +
        "/" +
        selectedCases.length +
        " " +
        caseTemplate.id,
    );
  }

  function summarize(mode: EvaluationMode) {
    const rows = samples.filter((sample) => sample.mode === mode);
    const qualityPasses = rows.filter((sample) => sample.qualityPass).length;
    const stats = (
      field: keyof Pick<CaseSample, "totalWallMs" | "followupWallMs" | "prepareMs" | "modelMs">,
    ) =>
      Object.fromEntries([
        [
          "p50Ms",
          percentile(
            rows.map((row) => row[field]),
            0.5,
          ),
        ],
        [
          "p95Ms",
          percentile(
            rows.map((row) => row[field]),
            0.95,
          ),
        ],
      ]);
    return {
      trials: rows.length,
      qualityPasses,
      qualityRate: rows.length === 0 ? 0 : qualityPasses / rows.length,
      totalWall: stats("totalWallMs"),
      followupWall: stats("followupWallMs"),
      routerPreparation: stats("prepareMs"),
      routerModelWork: stats("modelMs"),
      modelCalls: rows.reduce((sum, row) => sum + row.modelCalls, 0),
      parallelChecksStarted: rows.reduce((sum, row) => sum + row.parallelChecksStarted, 0),
      parallelChecksCompleted: rows.reduce((sum, row) => sum + row.parallelChecksCompleted, 0),
      parallelFallbacks: rows.filter((row) => row.parallelFallback).length,
      errors: rows.filter(
        (row) =>
          row.error ||
          failureReason(row.initial?.reasonCode) ||
          failureReason(row.followup?.reasonCode),
      ).length,
    };
  }

  const sequentialRows = samples.filter((sample) => sample.mode === "sequential");
  const digestByCase = new Map<string, string>();
  let snapshotDigestMismatches = 0;
  for (const sample of samples) {
    const prior = digestByCase.get(sample.caseId);
    if (prior && prior !== sample.canonicalSnapshotDigest) {
      snapshotDigestMismatches += 1;
    } else if (!prior) {
      digestByCase.set(sample.caseId, sample.canonicalSnapshotDigest);
    }
  }

  console.log(
    JSON.stringify(
      {
        benchmark: "enterprise-delegation-router",
        model: options.modelRef,
        supplemental: options.supplemental,
        caseOffset: options.caseOffset,
        pairedCases: selectedCases.length,
        actualModelCalls: actualModelCalls(samples),
        seedFailures,
        seed: {
          modelCalls: sequentialRows.reduce((sum, row) => sum + row.seedModelCalls, 0),
          prepareMs: {
            p50Ms: percentile(
              sequentialRows.map((row) => row.seedPrepareMs),
              0.5,
            ),
            p95Ms: percentile(
              sequentialRows.map((row) => row.seedPrepareMs),
              0.95,
            ),
          },
          modelWorkMs: {
            p50Ms: percentile(
              sequentialRows.map((row) => row.seedModelMs),
              0.5,
            ),
            p95Ms: percentile(
              sequentialRows.map((row) => row.seedModelMs),
              0.95,
            ),
          },
        },
        snapshotDigestMismatches,
        note: "Seed setup/model work is reported separately. Mode timings are followup-only wall-clock/provider timings from isolated state. Quality is fixture-case agreement, not a proof of semantic equivalence.",
        sequential: summarize("sequential"),
        parallelPendingConfirmation: summarize("parallel_pending_confirmation"),
        cases: samples,
        ...(options.keep ? { timelinePath, samplesPath } : {}),
      },
      null,
      2,
    ),
  );

  if (!options.keep) {
    rmSync(benchmarkDir, { recursive: true, force: true });
  } else {
    console.error("Kept benchmark artifacts at " + benchmarkDir);
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
