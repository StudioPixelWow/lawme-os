/**
 * Shell route scoping — pure + testable.
 * The Matter Room takes over the full canvas, so the Today Utility Rail is
 * suppressed on a single matter route (`/matters/:id`) and ONLY there. The
 * matters list (`/matters`) and every other OS route keep the rail.
 */
export function suppressesUtilityRail(pathname: string): boolean {
  // exactly /matters/<id> (one segment, optional trailing slash) — not /matters, not deeper
  return /^\/matters\/[^/]+\/?$/.test(pathname);
}
