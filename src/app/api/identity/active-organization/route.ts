/**
 * Active-organization selection API (Capability 0.8, Slice 0.8.2).
 *
 * POST { organizationId } — the ONLY way to choose the active organization.
 * Security posture:
 *  - The org is authorized SERVER-SIDE by resolving the canonical ActorContext
 *    with `requestedOrganizationId`; resolution verifies the caller has an
 *    ACTIVE membership in that org. We never trust role/caps/membership from the
 *    request body — only the organizationId is read; any extra fields are ignored.
 *  - On success we write ONLY the org id into the httpOnly active-org cookie
 *    (no actor/role/capability material is ever serialized).
 *  - Failures return the safe JSON envelope with the right status; no SQL,
 *    cookie, or Supabase strings leak.
 */
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getServerActorContext, activeOrgCookieStore } from "@/modules/identity/server";
import { writeActiveOrganizationId } from "@/modules/identity/infrastructure/active-organization-cookie";
import { toSafeApiError } from "@/modules/identity/http";
import { toSafeIdentityDisplay } from "@/modules/identity";
import { newCorrelationId } from "@/modules/identity/correlation";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const correlationId = newCorrelationId();
  let organizationId: unknown;
  try {
    const body: unknown = await request.json();
    // Read ONLY organizationId; ignore any other fields a client might send.
    organizationId = (body as { organizationId?: unknown } | null)?.organizationId;
  } catch {
    organizationId = undefined;
  }

  if (typeof organizationId !== "string" || organizationId.length === 0) {
    return NextResponse.json(
      { ok: false, code: "ORGANIZATION_SELECTION_REQUIRED", messageHe: "יש לבחור ארגון פעיל.", correlationId },
      { status: 400 },
    );
  }

  try {
    // Resolution verifies an ACTIVE membership in the requested org (fail closed).
    const actor = await getServerActorContext({ requestedOrganizationId: organizationId, correlationId });
    // Only now — proven active — persist the selection (org id only).
    writeActiveOrganizationId(activeOrgCookieStore(await cookies()), actor.organization.id);
    return NextResponse.json(
      { ok: true, correlationId, identity: toSafeIdentityDisplay(actor) },
      { status: 200 },
    );
  } catch (error) {
    const { status, body } = toSafeApiError(error, correlationId);
    return NextResponse.json(body, { status });
  }
}
