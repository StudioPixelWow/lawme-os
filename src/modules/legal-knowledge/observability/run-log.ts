/**
 * POC observability — every research/benchmark run is recorded as a JSONL
 * line under .poc-runs/ (gitignored-safe local telemetry).
 * NEVER logged: secrets, tokens, client content, full private documents.
 */
import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";

export interface PocRunRecord {
  kind: "research" | "benchmark" | "ingestion" | "extraction";
  timestamp: string;
  engineVersion: string;
  modelProvider: string;
  parserVersion: string;
  query: string | null;             // research question (not client data in POC)
  sourceAdapters: string[];
  documentsRetrieved: number;
  rankScores: number[];
  citationsReturned: number;
  verificationStatus: string[];
  warnings: string[];
  failures: string[];
  benchmarkResult: Record<string, unknown> | null;
  /** correlation id propagated across research/persistence/audit */
  correlationId?: string;
  durationMs?: number;
}

const RUN_DIR = ".poc-runs";

export function recordRun(record: PocRunRecord, dir: string = RUN_DIR): string {
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `poc-runs-${record.timestamp.slice(0, 10)}.jsonl`);
  // Defensive: refuse to write anything that looks like a secret.
  const line = JSON.stringify(record);
  if (/(sk-[a-zA-Z0-9]{16,}|SERVICE_ROLE|Bearer\s+[A-Za-z0-9._-]{20,})/.test(line)) {
    throw new Error("run record rejected: potential secret detected in payload");
  }
  appendFileSync(file, line + "\n");
  return file;
}
