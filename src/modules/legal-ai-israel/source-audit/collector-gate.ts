/**
 * Collector gate — the fail-closed authority that decides whether a Collector
 * may be BUILT or ACTIVATED for a source. Mirrors the DB CHECK constraint
 * (ls_activation_fail_closed_chk); the two must agree. Default is DENY.
 */
import type { SourceRecord, GateResult, PermissionRecord } from "./types.ts";

const MIN_BUILD_CONFIDENCE = 0.6;
const MIN_ACTIVATE_CONFIDENCE = 0.75;

const LAWFUL_REUSE = new Set(["open_license", "public_reuse_allowed", "commercial_permission_required"]);
const USABLE_TECH = new Set(["open", "partially_open", "rate_limited"]);

/** May we DEVELOP a collector for this source? */
export function canBuildCollector(s: SourceRecord): GateResult {
  const reasons: string[] = [];
  const requiredActions: string[] = [];

  if (s.auditStatus !== "completed") { reasons.push("audit not completed"); requiredActions.push("run and complete a full audit"); }
  if (!USABLE_TECH.has(s.technicalAccessStatus)) { reasons.push(`technical access '${s.technicalAccessStatus}' is not usable`); requiredActions.push("resolve access (allowlist/API) or mark blocked"); }
  if (s.requiresCaptcha) { reasons.push("CAPTCHA present"); requiredActions.push("obtain a non-CAPTCHA access path from the owner"); }
  if (s.requiresLogin) { reasons.push("login required"); requiredActions.push("obtain public/authorized access path"); }
  if (s.robotsDisallowsRelevantPaths === true) { reasons.push("robots disallows the relevant paths"); requiredActions.push("confirm scope with owner / choose allowed paths"); }

  if (s.legalReuseStatus === "unknown") { reasons.push("legal reuse status unknown"); requiredActions.push("complete legal review (manual)"); }
  else if (!LAWFUL_REUSE.has(s.legalReuseStatus)) { reasons.push(`legal reuse '${s.legalReuseStatus}' does not permit collection`); requiredActions.push("obtain documented permission or drop source"); }

  if (s.legalReuseStatus === "commercial_permission_required" && !s.hasDocumentedPermission) {
    reasons.push("commercial permission required but none documented");
    requiredActions.push("record written permission in source_permissions");
  }
  if (s.requiresWrittenPermission && !s.hasDocumentedPermission) {
    reasons.push("written permission required but none documented");
    requiredActions.push("record written permission in source_permissions");
  }

  if (s.recommendedAccessMethod === null) { reasons.push("no recommended access method"); requiredActions.push("determine access method during audit"); }
  if (s.auditConfidence < MIN_BUILD_CONFIDENCE) { reasons.push(`audit confidence ${s.auditConfidence} < ${MIN_BUILD_CONFIDENCE}`); requiredActions.push("raise audit confidence (more evidence)"); }

  return { allowed: reasons.length === 0, reasons, requiredActions };
}

/** May we ACTIVATE (run) a collector? Stricter than build. */
export function canActivateCollector(s: SourceRecord): GateResult {
  const build = canBuildCollector(s);
  const reasons = [...build.reasons];
  const requiredActions = [...build.requiredActions];

  if (!(s.collectorStatus === "testing" || s.collectorStatus === "development" || s.collectorStatus === "ready_to_build" || s.collectorStatus === "active" || s.collectorStatus === "paused")) {
    reasons.push(`collector_status '${s.collectorStatus}' is not activatable`);
    requiredActions.push("advance collector through development/testing first");
  }
  if (s.auditConfidence < MIN_ACTIVATE_CONFIDENCE) {
    reasons.push(`audit confidence ${s.auditConfidence} < ${MIN_ACTIVATE_CONFIDENCE} required to activate`);
    requiredActions.push("raise audit confidence before activation");
  }
  return { allowed: reasons.length === 0, reasons, requiredActions };
}

/** Is a documented permission currently in force (dates + automated-access flag)? */
export function isPermissionActive(p: PermissionRecord, nowIso: string): boolean {
  if (!p.automatedAccessAllowed) return false;
  if (p.effectiveFrom !== null && nowIso < p.effectiveFrom) return false;
  if (p.expiresAt !== null && nowIso >= p.expiresAt) return false;
  return true;
}
