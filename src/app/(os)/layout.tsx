import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/modules/shell";
import { tryGetServerActorContext } from "@/modules/identity/server";
import { protectedBoundaryRedirect } from "@/modules/identity/infrastructure/route-protection";
import { toSafeIdentityDisplay } from "@/modules/identity";

/**
 * Server-side protected boundary for the LawME OS (Capability 0.8, Slice 0.8.2).
 *
 * Fails CLOSED: resolves the canonical ActorContext server-side and renders the
 * shell ONLY for an authenticated actor with an active organization. On any
 * failure it redirects — never renders the OS with a partial/absent identity.
 * It hands the client shell ONLY safe DISPLAY data (name/org/role label); no
 * capabilities, membership id, or tokens cross to the browser. This boundary is
 * a gate, not resource authorization — per-matter/resource checks stay in the
 * server routes and RLS.
 */
export const dynamic = "force-dynamic";

export default async function OsLayout({ children }: { children: ReactNode }) {
  const result = await tryGetServerActorContext();

  if (!result.ok) {
    // Fail closed. NO_ACTIVE_ORGANIZATION/ORGANIZATION_SELECTION_REQUIRED →
    // organization selection; every other code → login. We never render the OS
    // with a partial identity, and never branch protected UI on the reason.
    redirect(protectedBoundaryRedirect(result.code));
  }

  return <AppShell identity={toSafeIdentityDisplay(result.actor)}>{children}</AppShell>;
}
