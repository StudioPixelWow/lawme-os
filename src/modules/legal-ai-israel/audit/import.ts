/**
 * Audit-artifact import + collector-mode suggestion (LEGAL AI ISRAEL — Phase 2).
 *
 * The import step VALIDATES an operator audit artifact, summarizes it, and
 * SUGGESTS a collector mode. It never enables a collector and never sets the
 * source's access status — those remain explicit administrator operations.
 */
import type { SourceAuditArtifact } from "./schema.ts";
import type { CollectorMode, AuditDecision } from "../collector/types.ts";

export interface AuditImportResult {
  sourceCode: string;
  decision: AuditDecision;
  suggestedMode: CollectorMode;
  summaryHe: string;
  blockers: readonly string[];
  // Explicitly NOT applied — administrator must approve each of these:
  requiresAdminApprovalFor: readonly ["automated_access_status", "collector_mode", "legal_review_status", "collector_enabled"];
}

/** Suggest a mode from the audit; conservative — a blocker forces NO_GO. */
export function suggestFromAudit(a: SourceAuditArtifact): AuditImportResult {
  const blockers: string[] = [];
  if (a.access.loginRequired) blockers.push("login_required");
  if (a.access.captchaDetected) blockers.push("captcha_detected");
  if (a.robots.disallowsRelevantPaths === true) blockers.push("robots_disallows");
  if (a.access.publicDocumentOpenableWithoutAuth === false) blockers.push("no_public_document_without_auth");

  let decision: AuditDecision;
  let suggestedMode: CollectorMode;

  if (blockers.length > 0) {
    decision = "NO_GO";
    suggestedMode = "disabled";
  } else if (a.access.apiHints.length > 0 && a.http.status === 200) {
    decision = "LIMITED_GO";
    suggestedMode = "official_feed"; // an operator-confirmed API/feed
  } else if (a.access.hasPublicSearch && a.access.stableIdentifiersFound) {
    decision = "LIMITED_GO";
    suggestedMode = "public_search_pilot";
  } else if (a.access.hasPublicSearch) {
    decision = "DISCOVERY_ONLY";
    suggestedMode = "discovery_only";
  } else {
    decision = "NO_GO";
    suggestedMode = "disabled";
  }

  const summaryHe = [
    `מקור: ${a.sourceCode}`,
    `סטטוס HTTP: ${a.http.status ?? "לא ידוע"}`,
    `robots: ${a.robots.found ? "נמצא" : "לא נמצא"}${a.robots.disallowsRelevantPaths === true ? " (אוסר)" : ""}`,
    `Login: ${a.access.loginRequired ? "נדרש" : "לא"} · CAPTCHA: ${a.access.captchaDetected ? "זוהה" : "לא"}`,
    `API hints: ${a.access.apiHints.length}`,
    `חיפוש ציבורי: ${a.access.hasPublicSearch ? "כן" : "לא"}`,
    `החלטה מוצעת: ${decision} · מצב מוצע: ${suggestedMode}`,
    blockers.length ? `חסמים: ${blockers.join(", ")}` : "אין חסמים שזוהו",
  ].join("\n");

  return {
    sourceCode: a.sourceCode,
    decision,
    suggestedMode,
    summaryHe,
    blockers,
    requiresAdminApprovalFor: ["automated_access_status", "collector_mode", "legal_review_status", "collector_enabled"],
  };
}
