/**
 * POST /api/dino/ask — the Reasoned Dino endpoint (Capability 4, Slice 4.1.0).
 * SERVER-ONLY.
 *
 * The canonical live path: Conversation Engine → Matter Intelligence (authorized,
 * when a matterId is supplied) → Legal Research Orchestrator → Legal Reasoning
 * Engine → LegalOpinion → provider adapter (renderer) → ReasonedDinoResponse.
 * The provider receives only the LegalOpinion; it never queries legal sources.
 * The Anthropic renderer is used only when ANTHROPIC_API_KEY is configured and
 * its output passes validation; otherwise the deterministic structured opinion
 * is returned. Never fabricates.
 */
import { getServerAuthClient, tryGetServerActorContext } from "@/modules/identity/server";
import { loadMatterIntelligence } from "@/modules/matter/intelligence/loader";
import { runReasonedDinoTurn, createAnthropicReasonedProvider, deterministicReasonedProvider, type ContextKind } from "@/modules/dino/reasoned";
import type { MatterIntelligence } from "@/modules/matter/intelligence/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Turn = { role?: string; content?: string };

export async function POST(request: Request) {
  const actor = await tryGetServerActorContext();
  if (!actor.ok) return Response.json({ error: "unauthenticated" }, { status: 401 });

  let body: { question?: string; matterId?: string; page?: string; history?: Turn[] };
  try { body = await request.json(); } catch { return Response.json({ error: "bad_request" }, { status: 400 }); }

  const question = (body.question ?? "").trim();
  if (question.length < 2 || question.length > 2000) {
    return Response.json({ error: "invalid_question", messageHe: "השאלה חייבת להיות בין 2 ל־2000 תווים." }, { status: 400 });
  }

  // Only structured, bounded conversation state is accepted (no unrestricted context).
  const history = Array.isArray(body.history)
    ? body.history.filter((t): t is { role: "user" | "assistant"; content: string } =>
        (t?.role === "user" || t?.role === "assistant") && typeof t?.content === "string" && t.content.length <= 2000).slice(-8)
    : undefined;

  const nowISO = new Date().toISOString();
  let matterIntelligence: MatterIntelligence | null = null;
  const matterId = body.matterId?.trim() || null;
  if (matterId) {
    const db = await getServerAuthClient();
    const loaded = await loadMatterIntelligence(db, actor.actor, matterId, nowISO);
    if (loaded.ok) matterIntelligence = loaded.intelligence; // unauthorized → null (fail closed)
  }

  const contextKind: ContextKind = matterIntelligence ? "matter" : "general";
  const deps = { provider: createAnthropicReasonedProvider(), fallbackProvider: deterministicReasonedProvider };

  try {
    const response = await runReasonedDinoTurn(
      { question, matterIntelligence, contextKind, matterId: matterIntelligence ? matterId : null, history, nowISO },
      deps,
    );
    return Response.json(response);
  } catch (e) {
    console.error("[dino/ask] reasoned pipeline failure", e);
    return Response.json({ error: "pipeline_error", messageHe: "אירעה שגיאה בעיבוד השאלה." }, { status: 500 });
  }
}
