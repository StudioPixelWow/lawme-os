/**
 * POST /api/dino/ask — the Dino Experience endpoint (Capability 3, Slice 3.2.0).
 * SERVER-ONLY.
 *
 * Runs the grounded pipeline: Conversation Engine → Matter Intelligence (when a
 * matterId is supplied and the actor is authorized to read it) → Legal Research
 * Orchestrator → provider adapter → GroundedResponse. The Anthropic adapter is
 * used only when ANTHROPIC_API_KEY is configured; otherwise the deterministic
 * prose provider answers with the verified findings. Never queries legal DBs
 * from the model; never fabricates.
 */
import { getServerAuthClient, tryGetServerActorContext } from "@/modules/identity/server";
import { loadMatterIntelligence } from "@/modules/matter/intelligence/loader";
import { runDinoTurn, createAnthropicProvider, deterministicProvider, type DinoContextKind } from "@/modules/dino/experience";
import type { MatterIntelligence } from "@/modules/matter/intelligence/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const actor = await tryGetServerActorContext();
  if (!actor.ok) return Response.json({ error: "unauthenticated" }, { status: 401 });

  let body: { question?: string; matterId?: string; page?: string };
  try { body = await request.json(); } catch { return Response.json({ error: "bad_request" }, { status: 400 }); }

  const question = (body.question ?? "").trim();
  if (question.length < 2 || question.length > 2000) {
    return Response.json({ error: "invalid_question", messageHe: "השאלה חייבת להיות בין 2 ל־2000 תווים." }, { status: 400 });
  }

  const nowISO = new Date().toISOString();
  let matterIntelligence: MatterIntelligence | null = null;
  const matterId = body.matterId?.trim() || null;
  if (matterId) {
    const db = await getServerAuthClient();
    const loaded = await loadMatterIntelligence(db, actor.actor, matterId, nowISO);
    if (loaded.ok) matterIntelligence = loaded.intelligence;
  }

  const contextKind: DinoContextKind = matterIntelligence ? "matter" : "general";
  const deps = { provider: createAnthropicProvider(), fallbackProvider: deterministicProvider };

  try {
    const response = await runDinoTurn(
      { question, matterIntelligence, contextKind, matterId: matterIntelligence ? matterId : null, nowISO },
      deps,
    );
    return Response.json(response);
  } catch (e) {
    console.error("[dino/ask] pipeline failure", e);
    return Response.json({ error: "pipeline_error", messageHe: "אירעה שגיאה בעיבוד השאלה." }, { status: 500 });
  }
}
