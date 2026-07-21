/**
 * POST /api/matters/intake/analyze — Intelligent Intake analysis. SERVER-ONLY.
 *
 * Runs the deterministic intake pipeline over the attorney's free-text story
 * (and optional pasted email/message) and returns a reviewable MatterIntakeDraft.
 * It PERSISTS NOTHING. No model is called (none is wired). Pasted text is data,
 * never instructions.
 *
 * Identity (Capability 0.8, Slice 0.8.2): the tenant is the caller's REAL active
 * organization, resolved server-side from the verified Supabase session — never
 * a demo placeholder and never trusted from the request body. Anonymous / no
 * active org fails CLOSED with the safe JSON envelope. This is the authenticated
 * boundary only; per-matter/resource authorization is NOT performed here.
 */
import { runIntakePipeline } from "@/modules/matter/intake/pipeline";
import { getServerActorContext } from "@/modules/identity/server";
import { toSafeApiError } from "@/modules/identity/http";
import { newCorrelationId } from "@/modules/identity/correlation";

export const runtime = "nodejs";

const MAX = 20000;

export async function POST(request: Request) {
  const correlationId = newCorrelationId();

  // Fail closed: a verified session with an active organization is required.
  let organizationId: string;
  try {
    const actor = await getServerActorContext({ correlationId });
    organizationId = actor.organization.id;
  } catch (error) {
    const { status, body } = toSafeApiError(error, correlationId);
    return Response.json(body, { status });
  }

  let body: { storyHe?: string; pastedHe?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request", messageHe: "בקשה לא תקינה." }, { status: 400 });
  }

  const storyHe = (body.storyHe ?? "").toString().slice(0, MAX);
  const pastedHe = (body.pastedHe ?? "").toString().slice(0, MAX);
  if (!storyHe.trim() && !pastedHe.trim()) {
    return Response.json({ error: "empty", messageHe: "יש להזין תיאור של המקרה." }, { status: 400 });
  }

  try {
    const draft = await runIntakePipeline(
      {
        // Real tenant from the verified session — analysis is scoped to the
        // caller's active organization. Nothing is persisted here.
        organizationId,
        createdBy: null,
        storyHe,
        pastedHe: pastedHe || null,
      },
      { nowISO: new Date().toISOString() },
    );
    return Response.json({ draft }, { status: 200 });
  } catch (err) {
    console.error("[intake.analyze] pipeline error", err instanceof Error ? err.message : "unknown");
    return Response.json({ error: "analysis_failed", messageHe: "הניתוח נכשל. נסו שוב." }, { status: 500 });
  }
}
