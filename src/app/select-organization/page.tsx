import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerAuthClient } from "@/modules/identity/server";
import { createSupabaseActorIdentityRepository } from "@/modules/identity/infrastructure/supabase-actor-identity-repository";
import { SelectOrganizationForm, type OrganizationChoice } from "./select-organization-form";

export const metadata: Metadata = { title: "בחירת ארגון" };
export const dynamic = "force-dynamic";

/**
 * Organization-selection surface (Capability 0.8, Slice 0.8.2).
 *
 * Shown when an authenticated actor has no active-org selection (or the stored
 * one is no longer valid). It lists ONLY the organizations in which the caller
 * has an ACTIVE membership — sourced server-side under RLS, never from the
 * client. Choosing one POSTs to the selection API, which re-verifies membership
 * before writing the cookie. An anonymous visitor is redirected to /login; an
 * actor with zero active memberships sees a neutral no-organization state.
 */
export default async function SelectOrganizationPage() {
  const supabase = await getServerAuthClient();
  const { data } = await supabase.auth.getUser();
  const authUserId = data.user?.id;
  if (!authUserId) redirect("/login");

  const repository = createSupabaseActorIdentityRepository(supabase);
  const profile = await repository.findProfileByAuthUserId(authUserId);
  const memberships = profile ? await repository.listActiveMemberships(profile.profileId) : [];

  // Resolve display names for the eligible orgs (RLS-scoped read).
  const orgIds = memberships.map((m) => m.organizationId);
  const names = new Map<string, string>();
  if (orgIds.length > 0) {
    const { data: orgs } = await supabase.from("organizations").select("id, name").in("id", orgIds);
    for (const org of orgs ?? []) {
      if (typeof org.id === "string" && typeof org.name === "string") names.set(org.id, org.name);
    }
  }

  const choices: OrganizationChoice[] = memberships.map((m) => ({
    organizationId: m.organizationId,
    name: names.get(m.organizationId) ?? m.organizationId,
    roleLabel: m.role,
  }));

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center px-5 py-16">
      <div className="mb-8 text-center">
        <h1 className="text-heading font-semibold text-foreground">בחירת ארגון</h1>
        <p className="mt-1 text-small text-foreground-soft">בחר את הארגון שבו ברצונך לעבוד.</p>
      </div>
      {choices.length > 0 ? (
        <SelectOrganizationForm choices={choices} />
      ) : (
        <div className="rounded-md bg-surface-raised p-6 text-center shadow-hairline">
          <p className="text-body text-foreground">אין לך חברות פעילה באף ארגון.</p>
          <p className="mt-2 text-small text-foreground-soft">פנה למנהל המשרד כדי לקבל גישה.</p>
          <form action="/logout" method="post" className="mt-4">
            <button type="submit" className="text-small text-foreground-soft underline">
              התנתקות
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
