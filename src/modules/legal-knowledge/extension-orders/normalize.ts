/**
 * Extension-order normalization + versioning helpers (Epic 3B, Phase 6).
 */
import { normalizeText } from "../extraction/normalize-text.ts";
import type { ExtensionOrder } from "./types.ts";

export const ORDER_NORMALIZE_VERSION = "extension-order-normalize-1.0.0";

/** Canonical key for an extension-order title. */
export function normalizeOrderName(name: string): string {
  let s = normalizeText(name);
  s = s.replace(/צו\s+הרחבה\s*(ל|בדבר|בענף)?\s*/g, "");
  s = s.replace(/,?\s*הת?ש[א-ת]{1,3}["'׳״]?[א-ת]?\s*[-–]?\s*\d{4}/g, "");
  s = s.replace(/[-–]\s*\d{4}\b/g, "").replace(/\b\d{4}\b/g, "");
  s = s.replace(/["'׳״(),.]/g, " ").replace(/\s+/g, " ").trim();
  s = s.replace(/(^|\s)ה(?=[א-ת])/g, "$1");
  return s;
}

/** Resolve the currently-in-force order in a replacement chain, given
 * today's date. Returns null with a reason when uncertain. */
export function resolveCurrentOrder(
  orders: ExtensionOrder[],
  todayIso: string,
): { order: ExtensionOrder | null; reasonHe: string } {
  if (orders.length === 0) return { order: null, reasonHe: "אין צווים ידועים" };
  const active = orders.filter(
    (o) => !o.supersededByOrderId && o.verificationStatus === "verified" &&
      (!o.expirationDate || Date.parse(o.expirationDate) > Date.parse(todayIso)),
  );
  if (active.length === 1) return { order: active[0], reasonHe: "צו פעיל מאומת יחיד" };
  if (active.length === 0) return { order: null, reasonHe: "כל הצווים הוחלפו/פגו או אינם מאומתים" };
  return { order: null, reasonHe: `${active.length} צווים פעילים — נדרשת הכרעה אנושית` };
}
