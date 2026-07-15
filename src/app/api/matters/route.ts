/**
 * POST /api/matters — create a real matter (Capability 2, Slice 1). SERVER-ONLY.
 *
 * Writes a `matters` header row (title, procedure, forum, file no) to the Slice A
 * schema and returns its slug so the client can open the new matter's room. The
 * rich intake (facts, deadlines, parties, financials) is captured in a later
 * slice; a fresh matter honestly starts with no facts. Storage mode is explicit:
 * in supabase_dev a missing credential FAILS CLEARLY; in memory mode creation is
 * unavailable (there is no durable store) rather than silently faked.
 */
import { randomUUID } from "node:crypto";
import {
  documentStorageMode, persistenceConfigError, serviceClient,
} from "@/modules/matter/persistence/supabase-server";
import { MatterRepository } from "@/modules/matter/persistence/matter-repository";
import { ensureDemoSeed } from "@/modules/matter/persistence/matter-context";
import { DEMO_SEED } from "@/modules/matter/fixtures/demo-seed";
import type { EmploymentProcedureType } from "@/modules/legal-knowledge/procedure/types";

export const runtime = "nodejs";

const PROCEDURES: EmploymentProcedureType[] = [
  "pregnancy_dismissal", "pre_dismissal_dispute", "hearing_before_dismissal", "severance_claim",
  "wage_overtime_claim", "pension_rights_claim", "discrimination_claim", "harassment_complaint",
  "regional_labor_court_civil", "appeal_to_national_labor_court", "national_insurance_claim", "settlement_enforcement",
];

export async function POST(request: Request) {
  if (documentStorageMode() !== "supabase_dev") {
    return Response.json({ error: "unavailable", messageHe: "יצירת תיק דורשת אחסון קבוע (Development)." }, { status: 409 });
  }
  const cfg = persistenceConfigError();
  if (cfg) {
    console.error(`[matters] storage misconfigured: ${cfg}`);
    return Response.json({ error: "storage_misconfigured", messageHe: "האחסון אינו מוגדר כראוי." }, { status: 503 });
  }

  let body: { titleHe?: string; procedureType?: string; fileNoHe?: string; forumHe?: string };
  try { body = await request.json(); } catch { return Response.json({ error: "bad_request" }, { status: 400 }); }

  const titleHe = (body.titleHe ?? "").trim();
  if (titleHe.length < 2 || titleHe.length > 300) {
    return Response.json({ error: "invalid_title", messageHe: "כותרת התיק חייבת להיות בין 2 ל־300 תווים." }, { status: 400 });
  }
  const procedureType = (PROCEDURES as string[]).includes(body.procedureType ?? "")
    ? (body.procedureType as EmploymentProcedureType) : null;
  if (!procedureType) {
    return Response.json({ error: "invalid_procedure", messageHe: "סוג הליך לא נתמך." }, { status: 400 });
  }

  const db = serviceClient();
  await ensureDemoSeed(db); // ensures the org exists (FK) — Slice 1 uses the demo org
  const repo = new MatterRepository(db);
  const slug = `m-${randomUUID().slice(0, 8)}`;

  const r = await repo.create({
    organizationId: DEMO_SEED.organizationId,
    slug,
    titleHe,
    procedureType,
    fileNoHe: (body.fileNoHe ?? "").trim() || null,
    forumHe: (body.forumHe ?? "").trim() || null,
  });
  if (!r.ok) return Response.json({ error: r.code, messageHe: r.messageHe }, { status: r.code === "conflict" ? 409 : 400 });
  return Response.json({ matter: r.value, href: `/matters/${r.value.slug}` }, { status: 201 });
}
