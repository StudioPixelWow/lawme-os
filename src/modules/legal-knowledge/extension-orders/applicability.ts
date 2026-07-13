/**
 * Extension-order applicability (Epic 3B, Phase 6).
 * Deterministic applicability reasoning. HARD RULE: applicability
 * limitations are never hidden — an uncertain match returns "uncertain"
 * with the reason, never a confident "applies".
 */
import type { ExtensionOrder } from "./types.ts";
import { dateInWindow } from "../legislation/versioning.ts";

export const APPLICABILITY_VERSION = "extension-order-applicability-1.0.0";

export interface ApplicabilityQuery {
  sectorHe?: string | null;
  asOf?: string | null;           // ISO — the date applicability is tested for
  employeeCategoryHe?: string | null;
}

export interface ApplicabilityResult {
  applies: "yes" | "no" | "uncertain";
  reasonHe: string;
  limitationsHe: string[];
  temporalOk: "yes" | "no" | "unknown";
  scopeOk: "yes" | "no" | "unknown";
}

export function evaluateApplicability(order: ExtensionOrder, q: ApplicabilityQuery): ApplicabilityResult {
  const limitations: string[] = [];

  // temporal
  let temporalOk: ApplicabilityResult["temporalOk"] = "unknown";
  if (q.asOf) {
    if (!order.effectiveDate) {
      temporalOk = "unknown";
      limitations.push("אין תאריך תחילה לצו — לא ניתן לקבוע תחולה במועד");
    } else if (dateInWindow(q.asOf, order.effectiveDate, order.expirationDate)) {
      temporalOk = "yes";
    } else {
      temporalOk = "no";
      limitations.push("המועד המבוקש מחוץ לתקופת תוקף הצו");
    }
    if (order.supersededByOrderId && temporalOk === "yes") {
      limitations.push(`ייתכן שהוחלף בצו ${order.supersededByOrderId} — נדרשת בדיקת גרסה`);
    }
  }

  // scope (sector)
  let scopeOk: ApplicabilityResult["scopeOk"] = "unknown";
  if (order.scope === "general") {
    scopeOk = "yes";
  } else if (q.sectorHe) {
    if (order.sectorHe && order.sectorHe.includes(q.sectorHe)) scopeOk = "yes";
    else { scopeOk = "no"; limitations.push("הענף המבוקש אינו תואם את ענף הצו"); }
  } else {
    scopeOk = "unknown";
    limitations.push("צו ענפי — נדרש ענף המעסיק לצורך הכרעת תחולה");
  }

  if (order.verificationStatus !== "verified") limitations.push("צו לא מאומת — התחולה לגילוי בלבד");

  let applies: ApplicabilityResult["applies"];
  if (temporalOk === "no" || scopeOk === "no") applies = "no";
  else if (temporalOk === "yes" && scopeOk === "yes" && order.verificationStatus === "verified") applies = "yes";
  else applies = "uncertain";

  return {
    applies,
    reasonHe:
      applies === "yes" ? "הצו חל: תוקף וענף תואמים, ומאומת"
      : applies === "no" ? "הצו אינו חל: כשל בתוקף או בענף"
      : "תחולה בלתי ודאית — ראו מגבלות",
    limitationsHe: limitations,
    temporalOk,
    scopeOk,
  };
}
