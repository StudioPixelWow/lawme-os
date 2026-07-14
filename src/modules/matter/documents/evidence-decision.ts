/**
 * Matter documents — evidentiary decision gate (Sprint 3, Slice 1).
 *
 * The epistemic guard: a document NEVER confirms a Matter fact merely because it
 * was uploaded. A fact may be confirmed only when the reviewer's decision
 * supports it AND the document is verified enough AND no conflicting evidence
 * blocks the conclusion AND provenance is retained. Everything else (contradicts,
 * inconclusive, authenticity_uncertain, incomplete, unclean scan, conflict)
 * leaves the fact unchanged. Pure and language-light.
 */
import type { EvidenceDecision, ScanStatus, VerificationState } from "./types.ts";

export interface EvidenceContext {
  decision: EvidenceDecision | null;
  scanStatus: ScanStatus;
  hasConflictingEvidence: boolean;
  hasProvenance: boolean;
}

/** Verification state derived from the decision + scan posture. */
export function deriveVerification(ctx: EvidenceContext): VerificationState {
  if (ctx.scanStatus !== "scan_clean_demo") return "unverified";
  if (ctx.decision === "supports") return "verified";
  if (ctx.decision === "contradicts" || ctx.decision === "inconclusive") return "provisional";
  return "unverified"; // authenticity_uncertain / incomplete / null
}

/**
 * The single gate. True only when every condition to legally confirm the fact
 * holds. An allegation can never pass this by upload alone.
 */
export function mayConfirmFact(ctx: EvidenceContext): boolean {
  return (
    ctx.decision === "supports" &&
    ctx.scanStatus === "scan_clean_demo" &&
    ctx.hasProvenance &&
    !ctx.hasConflictingEvidence
  );
}

/** An honest reason the fact was NOT confirmed (null when it was). */
export function whyNotConfirmedHe(ctx: EvidenceContext): string | null {
  if (mayConfirmFact(ctx)) return null;
  switch (ctx.decision) {
    case "contradicts":
      return "הראיה סותרת את העובדה — העובדה לא תאושר.";
    case "authenticity_uncertain":
      return "אותנטיות המסמך מוטלת בספק — נדרש אימות לפני הסתמכות.";
    case "inconclusive":
      return "הראיה אינה חד־משמעית — אינה מספיקה לאישור העובדה.";
    case "incomplete":
      return "הראיה חלקית — נדרש חומר משלים.";
    default:
      break;
  }
  if (ctx.scanStatus !== "scan_clean_demo") return "בדיקת הבטיחות של הקובץ טרם הושלמה.";
  if (ctx.hasConflictingEvidence) return "קיימת ראיה סותרת החוסמת את המסקנה.";
  if (!ctx.hasProvenance) return "חסרה שרשרת מקור (provenance) למסמך.";
  return "התנאים לאישור העובדה אינם מתקיימים.";
}
