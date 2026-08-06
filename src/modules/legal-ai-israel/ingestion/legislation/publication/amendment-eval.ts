/**
 * Amendment-parser evaluation harness (Epic Track A step 8).
 *
 * Runs the v2 parser (over normalized text) against a labeled eval set and
 * computes precision / recall / type-accuracy / target-accuracy / unsupported /
 * ambiguous rates, plus the GO-critical "high-confidence false mutations" count.
 * Pure/offline.
 */
import { normalizePdfText } from "./pdf-normalize.ts";
import { parseAmendmentsV2 } from "./amendment-parser-v2.ts";
import type { OperationTypeV2 } from "./amendment-parser-v2.ts";
import type { EvalEntry } from "./__fixtures__/amendment-eval-set.ts";

export interface EvalMetrics {
  total: number;
  realCount: number;
  detected: number; // returned a non-unsupported op
  correctType: number;
  precision: number; // correctType / detected
  recall: number; // correctType / total
  operationTypeAccuracy: number; // correctType / detected
  targetSectionAccuracy: number; // over entries with an expected target that were detected
  unsupportedRate: number;
  ambiguousRate: number;
  highConfidenceFalseMutations: number; // status=parsed, conf>=0.7, wrong type — must be 0
  perEntry: readonly {
    text: string; expected: OperationTypeV2; got: OperationTypeV2 | null;
    status: string; typeOk: boolean; targetOk: boolean | null; confidence: number;
  }[];
}

/** Pick the operation that best represents a clause (first non-unsupported). */
function pickOp(ops: ReturnType<typeof parseAmendmentsV2>) {
  return ops.find((o) => o.status !== "unsupported") ?? ops[0] ?? null;
}

function normTarget(t: string | null): string | null {
  if (!t) return null;
  return t.replace(/\s+/g, "");
}

export function evaluateAmendments(entries: readonly EvalEntry[]): EvalMetrics {
  let detected = 0, correctType = 0, unsupported = 0, ambiguous = 0, falseMut = 0;
  let targetDenom = 0, targetOkCount = 0;
  const perEntry: EvalMetrics["perEntry"] = [] as EvalMetrics["perEntry"];
  const per = perEntry as {
    text: string; expected: OperationTypeV2; got: OperationTypeV2 | null;
    status: string; typeOk: boolean; targetOk: boolean | null; confidence: number;
  }[];

  for (const e of entries) {
    const norm = normalizePdfText(e.text).normalizedText;
    const ops = parseAmendmentsV2(norm);
    const op = pickOp(ops);
    const isDetected = op !== null && op.status !== "unsupported";
    const typeOk = isDetected && op!.operationType === e.expectedType;
    if (isDetected) detected += 1;
    if (typeOk) correctType += 1;
    if (op && op.status === "unsupported") unsupported += 1;
    if (op && op.status === "ambiguous") ambiguous += 1;
    if (op && op.status === "parsed" && op.confidence >= 0.7 && op.operationType !== e.expectedType) falseMut += 1;

    let targetOk: boolean | null = null;
    if (e.expectedTarget !== null && isDetected) {
      targetDenom += 1;
      targetOk = normTarget(op!.targetSection) === normTarget(e.expectedTarget);
      if (targetOk) targetOkCount += 1;
    }
    per.push({ text: e.text.slice(0, 60), expected: e.expectedType, got: op ? op.operationType : null, status: op ? op.status : "none", typeOk, targetOk, confidence: op ? op.confidence : 0 });
  }

  const total = entries.length;
  const r = (n: number, d: number) => (d === 0 ? 0 : Number((n / d).toFixed(4)));
  return {
    total,
    realCount: entries.filter((e) => e.real).length,
    detected,
    correctType,
    precision: r(correctType, detected),
    recall: r(correctType, total),
    operationTypeAccuracy: r(correctType, detected),
    targetSectionAccuracy: r(targetOkCount, targetDenom),
    unsupportedRate: r(unsupported, total),
    ambiguousRate: r(ambiguous, total),
    highConfidenceFalseMutations: falseMut,
    perEntry,
  };
}
