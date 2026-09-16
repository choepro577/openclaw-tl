import { describe, expect, it } from "vitest";
import {
  requestBatchSizes,
  summarizeNumbers,
  summarizeWaterfall,
  testing,
} from "../../scripts/bench-enterprise-startup.mts";
import type { QualityRecord } from "../../scripts/bench-enterprise-startup.mts";
import {
  ENTERPRISE_QUALITY_CASES,
  enterpriseQualityExpectationForTurn,
  evaluateEnterpriseQualityExpectation,
  type EnterpriseBenchmarkStrategy,
  type QualityEvaluation,
} from "../../scripts/lib/enterprise-benchmark-fixtures.mts";

describe("Enterprise startup benchmark helpers", () => {
  it("counts request calls per row while deduplicating concurrent ledger observations", () => {
    type CallCountSample = Parameters<typeof testing.performanceCallCounts>[0][number];
    const calls = {
      llmRequests: 2,
      routerCalls: 1,
      specialistCalls: null,
      providerSubmissionRequests: 2,
      providerLedgerRequests: 10,
      source: "provider-submit-marker" as const,
    };
    const samples: CallCountSample[] = [
      { batchId: "c5-b0", status: "ok", calls },
      { batchId: "c5-b0", status: "ok", calls: { ...calls } },
      {
        batchId: "c5-b1",
        status: "error",
        calls: {
          llmRequests: 1,
          routerCalls: 1,
          specialistCalls: null,
          providerSubmissionRequests: 1,
          providerLedgerRequests: 1,
          source: "provider-submit-marker",
        },
      },
    ];
    expect(testing.performanceCallCounts(samples)).toEqual({
      llmRequests: 5,
      routerCalls: 3,
      providerSubmissionRequests: 5,
      providerLedgerRequests: 11,
    });
  });

  it("keeps request observations at the requested count while preserving concurrency batches", () => {
    expect(requestBatchSizes(100, 1)).toEqual(Array.from({ length: 100 }, () => 1));
    expect(requestBatchSizes(100, 5)).toEqual(Array.from({ length: 20 }, () => 5));
    expect(requestBatchSizes(100, 10)).toEqual(Array.from({ length: 10 }, () => 10));
    expect(requestBatchSizes(102, 10)).toEqual([...Array.from({ length: 10 }, () => 10), 2]);
  });

  it("does not invent overlap when timeline spans lack a shared clock", () => {
    expect(summarizeWaterfall([])).toMatchObject({
      criticalPathMs: null,
      spanSumMs: null,
      overlapMs: null,
    });
    expect(summarizeWaterfall([{ name: "prepare", durationMs: 7 }])).toMatchObject({
      criticalPathMs: null,
      spanSumMs: 7,
      overlapMs: null,
    });
    expect(
      summarizeWaterfall([
        { name: "a", durationMs: 10, startMs: 0, endMs: 10 },
        { name: "b", durationMs: 8, startMs: 5, endMs: 13 },
      ]),
    ).toMatchObject({ criticalPathMs: 13, spanSumMs: 18, overlapMs: 5 });
    expect(
      summarizeWaterfall([
        { name: "timed", durationMs: 10, startMs: 0, endMs: 10 },
        { name: "duration-only", durationMs: 8 },
      ]),
    ).toMatchObject({ criticalPathMs: null, spanSumMs: 18, overlapMs: null });
  });

  it("retains clock offsets and parent links for every reported span", () => {
    expect(
      summarizeWaterfall([
        { name: "parent", durationMs: 13, startMs: 0, endMs: 13, parentSpanId: "root" },
        { name: "child", durationMs: 8, startMs: 5, endMs: 13, parentSpanId: "parent" },
      ]).spans,
    ).toEqual([
      { name: "parent", durationMs: 13, startMs: 0, endMs: 13, parentSpanId: "root" },
      { name: "child", durationMs: 8, startMs: 5, endMs: 13, parentSpanId: "parent" },
    ]);
  });

  it("keeps percentile and empty-summary semantics explicit", () => {
    expect(summarizeNumbers([])).toBeNull();
    expect(summarizeNumbers([4, 1, 3, 2])).toMatchObject({
      count: 4,
      min: 1,
      p50: 2,
      p95: 4,
      max: 4,
    });
  });
});

describe("Enterprise quality oracle", () => {
  it("ships the required 60 two-turn cases", () => {
    expect(ENTERPRISE_QUALITY_CASES).toHaveLength(60);
    expect(
      new Set(ENTERPRISE_QUALITY_CASES.map((testCase) => testCase.family)).size,
    ).toBeGreaterThan(1);
    expect(ENTERPRISE_QUALITY_CASES.every((testCase) => testCase.turns.length === 2)).toBe(true);
  });

  it("keeps missing execution receipts unknown instead of passing a zero-write gate", () => {
    const testCase = ENTERPRISE_QUALITY_CASES[0]!;
    const expected = enterpriseQualityExpectationForTurn(testCase, 0);
    const evaluation = evaluateEnterpriseQualityExpectation(expected, {
      outcome: expected.outcome,
      facts: expected.facts.map((item) => item.id),
      sourceTags: expected.sourceTags,
      routeAgents: expected.routeAgents,
      requiredInputIds: expected.requiredInputIds,
      missingInputIds: expected.missingInputIds ?? [],
    });
    expect(evaluation.sideEffects.passed).toBe(false);
    expect(evaluation.sideEffects.missing).toContain("tool_calls_telemetry_missing");
    expect(evaluation.sideEffects.evidence).toContain("businessWrites=unknown");
    expect(evaluation.requiredInputs.passed).toBe(true);
  });

  it("passes a fully observed read-only turn on facts, source, route, and receipts", () => {
    const testCase = ENTERPRISE_QUALITY_CASES[0]!;
    const expected = enterpriseQualityExpectationForTurn(testCase, 0);
    const evaluation = evaluateEnterpriseQualityExpectation(expected, {
      outcome: expected.outcome,
      facts: expected.facts.map((item) => item.id),
      sourceTags: expected.sourceTags,
      routeAgents: expected.routeAgents,
      requiredInputIds: expected.requiredInputIds,
      missingInputIds: expected.missingInputIds ?? [],
      toolCalls: [{ name: "enterprise_knowledge_search", sideEffect: "read" }],
      delegateCalls: 1,
      businessWrites: 0,
    });
    expect(evaluation.passed).toBe(true);
    expect(evaluation.sideEffects.unexpected).toEqual([]);
  });

  it("judges a cancel turn independently from its already-authorized first turn", () => {
    const testCase = ENTERPRISE_QUALITY_CASES.find((item) => item.variant === "cancel");
    expect(testCase).toBeDefined();
    const initial = enterpriseQualityExpectationForTurn(testCase!, 0);
    const cancelled = enterpriseQualityExpectationForTurn(testCase!, 1);
    expect(initial.outcome).toBe("delegated");
    expect(initial.routeAgents.length).toBeGreaterThan(0);
    expect(cancelled).toMatchObject({
      outcome: "cancelled",
      facts: [],
      sourceTags: [],
      routeAgents: [],
      allowedTools: [],
      maxDelegateCalls: 0,
      maxBusinessWrites: 0,
    });
  });
});

describe("Enterprise quality acceptance gate", () => {
  const MODEL = "mock-openai/gpt-5.6-luna";
  const passingEvaluation: QualityEvaluation = {
    passed: true,
    outcome: { passed: true, missing: [], unexpected: [], evidence: [] },
    factual: { passed: true, missing: [], unexpected: [], evidence: [] },
    provenance: { passed: true, missing: [], unexpected: [], evidence: [] },
    sideEffects: { passed: true, missing: [], unexpected: [], evidence: [] },
    requiredInputs: { passed: true, missing: [], unexpected: [], evidence: [] },
  };

  function makeRecord(
    caseId: string,
    strategy: EnterpriseBenchmarkStrategy,
    repetition: number,
    receipts: "verified" | "unsupported" = "verified",
    observedModel = MODEL,
  ): QualityRecord {
    return {
      caseId,
      strategy,
      repetition,
      turns: [
        { evaluation: passingEvaluation, responseLength: 1, providerRequests: 1 },
        { evaluation: passingEvaluation, responseLength: 1, providerRequests: 1 },
      ],
      passed: true,
      diagnosticsAvailable: true,
      evidence: {
        authorityReceipt: receipts,
        toolReceipts: receipts,
        configuredModel: MODEL,
        observedModels: [observedModel],
        modelComplete: true,
      },
    };
  }

  it("rejects a passing subset instead of treating records.length as full coverage", () => {
    const summary = testing.summarizeQuality(
      [makeRecord(ENTERPRISE_QUALITY_CASES[0]!.id, "baseline", 0)],
      { model: MODEL },
    );
    expect(summary.gatePassed).toBe(false);
    expect(summary.gateStatus).toBe("unknown");
    expect(summary.gateReasons).toContain("matrix_incomplete:records=1/360");
  });

  it("keeps a complete matrix unknown until authority and tool receipts exist", () => {
    const records: QualityRecord[] = [];
    for (const strategy of ["baseline", "personal-agent-first"] as const) {
      for (const testCase of ENTERPRISE_QUALITY_CASES) {
        for (let repetition = 0; repetition < 3; repetition += 1) {
          records.push(makeRecord(testCase.id, strategy, repetition, "unsupported"));
        }
      }
    }
    const summary = testing.summarizeQuality(records, { model: MODEL });
    expect(summary.gatePassed).toBe(false);
    expect(summary.gateStatus).toBe("unknown");
    expect(summary.gateReasons).toContain("authority_receipts_unverified:360/360");
    expect(summary.gateReasons).toContain("tool_receipts_unverified:360/360");
  });

  it("rejects a complete observed model change even when the matrix and receipts are complete", () => {
    const records: QualityRecord[] = [];
    for (const strategy of ["baseline", "personal-agent-first"] as const) {
      for (const testCase of ENTERPRISE_QUALITY_CASES) {
        for (let repetition = 0; repetition < 3; repetition += 1) {
          records.push(makeRecord(testCase.id, strategy, repetition, "verified", "other-model"));
        }
      }
    }
    const summary = testing.summarizeQuality(records, { model: MODEL });
    expect(summary.gatePassed).toBe(false);
    expect(summary.gateStatus).toBe("not-accepted");
    expect(summary.gateReasons).toContain("observed_model_changed_or_mismatched:360/360");
  });
});
