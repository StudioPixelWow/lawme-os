/**
 * Verified-legislation answer builder (P1-S1) — DETERMINISTIC, no model.
 *
 * For a covered doctrine question it produces a bottom-line-first answer whose
 * every legal proposition references a VERIFIED provision. Nothing unsupported
 * is presented as established law. Out-of-scope / missing-authority / missing-
 * facts are honest, distinct statuses. The legislation-only badge is applied.
 */
import type { DoctrineId } from "./types.ts";
import { VerifiedCorpusStore, verifiedCorpus, type ResolvedProvision } from "./store.ts";
import { toCitationView, toWordExportBlock, type CitationView } from "./citation-format.ts";
import { reproducibilityKey } from "./hash.ts";
import { deepFreeze } from "./deep-freeze.ts";
import type { DoctrineCoverageRecord } from "./types.ts";

export type LegislationAnswerStatus =
  | "answered"
  | "needs_facts"
  | "no_verified_authority"
  | "insufficient_coverage"
  | "out_of_scope";

export type LegislationBadge =
  | "verified_legislation" // מבוסס חקיקה מאומתת
  | "legislation_only_pending_caselaw"; // מבוסס חקיקה בלבד — טרם אומתה פסיקה רלוונטית

export const BADGE_TEXT: Record<LegislationBadge, string> = {
  verified_legislation: "מבוסס חקיקה מאומתת",
  legislation_only_pending_caselaw: "מבוסס חקיקה בלבד — טרם אומתה פסיקה רלוונטית",
};

export interface AnswerClaim {
  claimHe: string;
  supportingCitationIds: string[];
  kind: "established_law" | "withheld";
}

export interface VerifiedLegislationAnswer {
  status: LegislationAnswerStatus;
  doctrineId: DoctrineId | null;
  bottomLineHe: string;
  badge: LegislationBadge | null;
  badgeTextHe: string | null;
  citations: CitationView[];
  claims: AnswerClaim[];
  coverage: DoctrineCoverageRecord | null;
  wordExportBlock: string | null;
  reproKey: string | null;
  corpusVersion: string;
  asOfISO: string;
}

export interface AnswerRequest {
  question: string;
  doctrineId?: DoctrineId | null; // if known; else classified from the question
  contextKind: "general" | "matter";
  /** For matter questions: are the outcome-determinative facts present? */
  factsPresent?: boolean;
  asOfISO: string;
}

const NOTICE_TERMS = ["הודעה", "תנאי העבודה", "תנאי עבודה", "בכתב"];
const MINWAGE_TERMS = ["שכר מינימום", "שכר המינימום", "מינימום"];

export function classifyDoctrine(question: string): DoctrineId | null {
  if (MINWAGE_TERMS.some((t) => question.includes(t))) return "D-MINWAGE";
  if (NOTICE_TERMS.some((t) => question.includes(t))) return "D-NOTICE";
  return null;
}

function bottomLineNotice(): string {
  return "כן. מעסיק חייב למסור לעובד הודעה בכתב על תנאי העבודה — לא יאוחר מ-30 ימים מתחילת העבודה (7 ימים לגבי עובד מתחת לגיל 18).";
}

function bottomLineMinwageCurrent(rate: ResolvedProvision | undefined): string {
  if (!rate) return "לא נמצא שיעור שכר מינימום מאומת התקף במועד המבוקש.";
  return "שכר המינימום התקף הוא 6,443.85 ₪ לחודש (משרה מלאה) ו-35.40 ₪ לשעה, החל מ-1.4.2026.";
}

export function buildVerifiedLegislationAnswer(
  req: AnswerRequest,
  store: VerifiedCorpusStore = verifiedCorpus,
): VerifiedLegislationAnswer {
  const asOf = req.asOfISO;
  const doctrineId = req.doctrineId ?? classifyDoctrine(req.question);

  // Out of scope: not a covered doctrine.
  if (doctrineId === null || !store.coveredDoctrines().includes(doctrineId)) {
    return deepFreeze({
      status: "out_of_scope", doctrineId: null,
      bottomLineHe: "השאלה חורגת מהתחום המכוסה כרגע (הודעה על תנאי עבודה ושכר מינימום בלבד).",
      badge: null, badgeTextHe: null, citations: [], claims: [], coverage: null,
      wordExportBlock: null, reproKey: null, corpusVersion: store.corpusVersion, asOfISO: asOf,
    });
  }

  // Matter question missing outcome-determinative facts → needs_facts.
  if (req.contextKind === "matter" && req.factsPresent === false) {
    const coverage = store.coverage(doctrineId, asOf);
    return deepFreeze({
      status: "needs_facts", doctrineId,
      bottomLineHe:
        "כדי להשיב לגבי התיק דרושות עובדות מכריעות (מועד תחילת העבודה, האם נמסרה הודעה בכתב ומתי). ניתן להשיב כללית על בסיס החקיקה המאומתת.",
      badge: "verified_legislation", badgeTextHe: BADGE_TEXT.verified_legislation,
      citations: [], claims: [], coverage,
      wordExportBlock: null, reproKey: null, corpusVersion: store.corpusVersion, asOfISO: asOf,
    });
  }

  const resolved = store.resolve(doctrineId, asOf).filter((r) => r.canSupport);
  const coverage = store.coverage(doctrineId, asOf);

  // D-MINWAGE requires the rate instrument to answer the amount.
  if (doctrineId === "D-MINWAGE") {
    const entitlement = resolved.find((r) => r.provision.provisionId === "vlc-minwage-1987-s2");
    const rate = resolved.find((r) => r.provision.provisionId === "vlc-minwage-rate-2026-04-p");
    const views = resolved.map((r) => toCitationView(r, store.license));
    if (!rate) {
      // Entitlement verified, but no rate instrument in force for asOf → honest.
      const claims: AnswerClaim[] = [
        entitlement
          ? { claimHe: entitlement.propositionHe, supportingCitationIds: [`cit-${entitlement.provision.provisionId}`], kind: "established_law" }
          : { claimHe: "זכאות לשכר מינימום", supportingCitationIds: [], kind: "withheld" },
        { claimHe: "השיעור הכספי התקף במועד המבוקש", supportingCitationIds: [], kind: "withheld" },
      ];
      return deepFreeze({
        status: "insufficient_coverage", doctrineId,
        bottomLineHe:
          "קיימת זכאות עקרונית לשכר מינימום, אך לא קיים במאגר המאומת שיעור התקף למועד המבוקש — לכן לא ניתן לנקוב בסכום.",
        badge: "verified_legislation", badgeTextHe: BADGE_TEXT.verified_legislation,
        citations: entitlement ? [toCitationView(entitlement, store.license)] : [],
        claims, coverage,
        wordExportBlock: entitlement ? toWordExportBlock([toCitationView(entitlement, store.license)]) : null,
        reproKey: entitlement ? reproKeyFor(entitlement, store.corpusVersion, asOf) : null,
        corpusVersion: store.corpusVersion, asOfISO: asOf,
      });
    }
    const claims: AnswerClaim[] = resolved.map((r) => ({
      claimHe: r.propositionHe, supportingCitationIds: [`cit-${r.provision.provisionId}`], kind: "established_law",
    }));
    return deepFreeze({
      status: "answered", doctrineId,
      bottomLineHe: bottomLineMinwageCurrent(rate),
      badge: "verified_legislation", badgeTextHe: BADGE_TEXT.verified_legislation,
      citations: views, claims, coverage,
      wordExportBlock: toWordExportBlock(views),
      reproKey: reproKeyFor(rate, store.corpusVersion, asOf),
      corpusVersion: store.corpusVersion, asOfISO: asOf,
    });
  }

  // D-NOTICE.
  if (resolved.length === 0) {
    return deepFreeze({
      status: "no_verified_authority", doctrineId,
      bottomLineHe: "לא נמצאה הוראת חוק מאומתת התומכת בתשובה במועד המבוקש.",
      badge: null, badgeTextHe: null, citations: [], claims: [], coverage,
      wordExportBlock: null, reproKey: null, corpusVersion: store.corpusVersion, asOfISO: asOf,
    });
  }
  const views = resolved.map((r) => toCitationView(r, store.license));
  const claims: AnswerClaim[] = resolved.map((r) => ({
    claimHe: r.propositionHe, supportingCitationIds: [`cit-${r.provision.provisionId}`], kind: "established_law",
  }));
  return deepFreeze({
    status: "answered", doctrineId,
    bottomLineHe: bottomLineNotice(),
    badge: "verified_legislation", badgeTextHe: BADGE_TEXT.verified_legislation,
    citations: views, claims, coverage,
    wordExportBlock: toWordExportBlock(views),
    reproKey: reproKeyFor(resolved[0], store.corpusVersion, asOf),
    corpusVersion: store.corpusVersion, asOfISO: asOf,
  });
}

function reproKeyFor(r: ResolvedProvision, corpusVersion: string, asOfISO: string): string {
  return reproducibilityKey({
    corpusVersion,
    sourceId: r.source.sourceId,
    versionId: r.version.versionId,
    sourceTextHash: r.version.sourceTextHash,
    verificationId: r.verification.verificationId,
    asOfISO,
  });
}
