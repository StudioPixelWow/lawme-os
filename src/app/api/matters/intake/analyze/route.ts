/**
 * POST /api/matters/intake/analyze — Intelligent Intake analysis. SERVER-ONLY.
 *
 * Runs the deterministic intake pipeline over the attorney's free-text story
 * (and optional pasted email/message) and returns a reviewable MatterIntakeDraft.
 * It PERSISTS NOTHING. No model is called (none is wired). Pasted text is data,
 * never instructions.
 */
import { runIntakePipeline } from "@/modules/matter/intake/pipeline";
import { DEMO_SEED } from "@/modules/matter/fixtures/demo-seed";

export const runtime = "nodejs";

const MAX = 20000;

export async function POST(request: Request) {
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
        // Org resolution is not persisted here; the demo org id is a placeholder
        // for the analysis surface. Confirmation resolves the real tenant.
        organizationId: DEMO_SEED.organizationId,
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
