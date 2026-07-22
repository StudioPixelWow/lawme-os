import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Workspace } from "@/design-system/patterns/workspace";
import { PageHeader } from "@/design-system/patterns/page-header";
import { SectionChapter } from "@/design-system/patterns/section-chapter";
import { demoSummary, composeMatterList } from "@/modules/matter/view/matter-loader";
import { loadReadableDurableMatters } from "@/modules/matter/view/authorized-matter-loader";
import { getServerAuthClient, tryGetServerActorContext } from "@/modules/identity/server";
import { protectedBoundaryRedirect } from "@/modules/identity/infrastructure/route-protection";

export const metadata: Metadata = { title: "תיקים" };

// Per-request: the list must reflect matters created at runtime, and must never
// be frozen to a build-time database snapshot.
export const dynamic = "force-dynamic";

const PROCEDURE_HE: Record<string, string> = {
  pregnancy_dismissal: "פיטורי הריון", pre_dismissal_dispute: "טרום־פיטורים",
  hearing_before_dismissal: "שימוע", severance_claim: "פיצויי פיטורים",
  wage_overtime_claim: "שכר ושעות נוספות", pension_rights_claim: "זכויות פנסיה",
  discrimination_claim: "אפליה", harassment_complaint: "הטרדה",
  regional_labor_court_civil: "אזורי לעבודה", appeal_to_national_labor_court: "ערעור ארצי",
  national_insurance_claim: "ביטוח לאומי", settlement_enforcement: "אכיפת פשרה",
};

export default async function MattersPage() {
  // Identity (Slice 0.8.4): the list shows only the matters the actor may READ —
  // owner/member, via the authenticated (RLS) client — never every org matter and
  // never the demo tenant. The `(os)` layout already gates access; resolving again
  // here (defense in depth) fails closed rather than falling back.
  const actor = await tryGetServerActorContext();
  if (!actor.ok) redirect(protectedBoundaryRedirect(actor.code));

  const db = await getServerAuthClient();
  // The frozen demo is composed independently of the database — always present once.
  const demo = demoSummary();
  const durable = await loadReadableDurableMatters(db, actor.actor);
  const { matters, errorCode } = composeMatterList(demo, durable);

  return (
    <Workspace>
      <PageHeader reveal={false} title="תיקים" context="כל תיקי המשרד — חיים, מסודרים, ומספרים את הסיפור של עצמם.">
        <Link
          href="/matters/new"
          className="inline-flex items-center rounded-md bg-ink-900 px-3 py-1.5 text-small text-surface transition-colors hover:bg-ink-800"
        >
          תיק חדש
        </Link>
      </PageHeader>

      {errorCode && (
        <div dir="rtl" role="status" className="mb-4 rounded-lg border border-status-today/40 bg-status-today-wash/40 p-3 text-caption text-foreground-soft">
          התיקים הקבועים לא נטענו כרגע (סביבת פיתוח/Preview). התיק לדוגמה מוצג כרגיל. קוד לאבחון: <span className="font-mono">{errorCode}</span>
        </div>
      )}

      <SectionChapter title="התיקים הפעילים" index={0} reveal={false}>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" dir="rtl">
          {matters.map((m) => (
            <li key={m.slug}>
              <Link
                href={`/matters/${m.slug}`}
                className="block rounded-xl border border-line-strong bg-surface p-4 transition-colors hover:border-ink-400"
              >
                <p className="truncate text-small font-semibold text-foreground">{m.titleHe}</p>
                <p className="mt-1 text-caption text-foreground-soft">
                  {PROCEDURE_HE[m.procedureType] ?? m.procedureType}
                  {m.fileNoHe ? ` · תיק ${m.fileNoHe}` : ""}
                </p>
                <p className="mt-2 text-micro text-foreground-faint">
                  {m.forumHe ?? "טרם נקבע פורום"} · נפתח {m.openedAt.slice(0, 10)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </SectionChapter>
    </Workspace>
  );
}
