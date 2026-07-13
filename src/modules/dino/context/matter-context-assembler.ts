/**
 * DinoMatterContextAssembler (Epic 3A, Phase 3).
 * POC inputs: explicit user-supplied context + synthetic development
 * fixtures. Future: LawME matter records via the repository layer.
 * Never merges allegations into facts; every item keeps provenance.
 */
import { createHash } from "node:crypto";
import type { DinoRequest, SuppliedContextItem } from "../core/request.ts";
import type { ContextItem, ContextItemStatus, MatterContextPackage } from "./types.ts";
import type { AiPolicy } from "../../intelligence/core/index.ts";

export const CONTEXT_ASSEMBLER_VERSION = "matter-context-1.0.0";

/** deterministic id from content — reproducible runs */
function itemId(seed: string): string {
  return "ctx-" + createHash("sha256").update(seed).digest("hex").slice(0, 10);
}

const FIELD_DETECTORS: { field: string; pattern: RegExp }[] = [
  { field: "employment_duration", pattern: /(\d+)\s*(חודש|שנ)(ים|ות|ה)?\s*(עבודה|העסקה|וותק)?|וותק/ },
  { field: "pregnancy_status", pattern: /היריון|הריון|בהיריון/ },
  { field: "employer_knowledge", pattern: /המעסיק ידע|ידע על ההיריון|הודיעה למעסיק/ },
  { field: "hearing_held", pattern: /שימוע (נערך|לא נערך|התקיים)|ללא שימוע|בלי שימוע/ },
  { field: "permit_status", pattern: /היתר (ניתן|לא ניתן|התבקש)|ללא היתר/ },
  { field: "dismissal_date", pattern: /פוטר[ה]? ב[־-]?\d|תאריך הפיטורים/ },
  { field: "salary", pattern: /שכר|משכורת/ },
  { field: "deadline", pattern: /מועד אחרון|דדליין|עד ה[־-]?\d/ },
];

function statusFor(assertedBy: SuppliedContextItem["assertedBy"]): ContextItemStatus {
  switch (assertedBy) {
    case "our_client": return "client_allegation";
    case "opposing_party": return "opposing_party_allegation";
    case "document": return "document_derived_fact";
    case "user_unknown": return "unknown";
  }
}

/** POC synthetic matter fixture — used by deterministic test scenarios. */
export interface SyntheticMatterFixture {
  matterId: string;
  clientId: string;
  matterTitleHe: string;
  aiPolicy?: AiPolicy;
  items: { field: string; statementHe: string; status: ContextItemStatus }[];
}

export function assembleMatterContext(
  request: DinoRequest,
  fixture: SyntheticMatterFixture | null,
): MatterContextPackage {
  const now = new Date().toISOString();
  const items: ContextItem[] = [];

  // 1) explicit user-supplied context — classified by asserter, NEVER as confirmed fact
  for (const s of request.suppliedContext ?? []) {
    const detected = FIELD_DETECTORS.find((d) => d.pattern.test(s.statement));
    items.push({
      id: itemId(s.statement + s.assertedBy),
      field: detected?.field ?? "general_statement",
      statementHe: s.statement,
      status: statusFor(s.assertedBy),
      provenance: { origin: "user_supplied", reference: "user message", recordedAt: now },
    });
  }

  // 2) synthetic fixture items (deterministic scenarios / dev)
  for (const f of fixture?.items ?? []) {
    items.push({
      id: itemId(fixture!.matterId + f.field + f.statementHe),
      field: f.field,
      statementHe: f.statementHe,
      status: f.status,
      provenance: { origin: "synthetic_fixture", reference: fixture!.matterId, recordedAt: now },
    });
  }

  // conflicting statements on the same field → disputed
  const byField = new Map<string, ContextItem[]>();
  for (const it of items) {
    byField.set(it.field, [...(byField.get(it.field) ?? []), it]);
  }
  const unresolved: string[] = [];
  for (const [field, group] of byField) {
    const sides = new Set(group.map((g) => g.status));
    if (sides.has("client_allegation") && sides.has("opposing_party_allegation")) {
      for (const g of group) g.status = "disputed_fact";
      unresolved.push(`עובדה שנויה במחלוקת בשדה: ${field}`);
    }
  }

  return {
    matterId: request.matterId ?? fixture?.matterId ?? null,
    clientId: request.clientId ?? fixture?.clientId ?? null,
    identity: {
      matterTitleHe: fixture?.matterTitleHe ?? null,
      client: fixture?.clientId ?? null,
      opposingParties: [],
      court: request.courtOrAuthority ?? null,
      procedure: null,
      judge: null,
      legalDomain: request.legalDomain ?? null,
    },
    items,
    chronology: items
      .filter((i) => i.field === "dismissal_date" || i.field === "deadline")
      .map((i) => ({ date: null, eventHe: i.statementHe, itemId: i.id })),
    deadlines: items.filter((i) => i.field === "deadline").map((i) => ({ date: null, whatHe: i.statementHe, itemId: i.id })),
    unresolvedFactualQuestions: unresolved,
    confidentialityRestrictions: request.confidentiality ? [request.confidentiality] : [],
    sourceRestrictions: request.sourceRestrictions ?? [],
    synthetic: true,
    assembledAt: now,
    limitationsHe: [
      "הקשר התיק סינתטי/ידני בלבד (POC) — אין חיבור לרשומות אמת",
      "טענות אינן עובדות: כל פריט נושא סטטוס אפיסטמי ומקור",
    ],
  };
}
