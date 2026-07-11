/**
 * Dev-interface gate — pure and testable (Epic 2, Phase 12).
 * The /dev/legal-intelligence route renders ONLY when:
 *   - not a production build, OR
 *   - the explicit LAWME_DEV_TOOLS=1 escape hatch is set (founder decision,
 *     e.g. a protected preview) — never set in the production project.
 */
export function isDevInterfaceEnabled(env: {
  NODE_ENV?: string;
  LAWME_DEV_TOOLS?: string;
}): boolean {
  if (env.LAWME_DEV_TOOLS === "1") return true;
  return env.NODE_ENV !== "production";
}
