import type { Metadata } from "next";
import Link from "next/link";
import { Workspace } from "@/design-system/patterns/workspace";
import { PageHeader } from "@/design-system/patterns/page-header";
import { SectionChapter } from "@/design-system/patterns/section-chapter";
import { Placeholder } from "@/design-system/patterns/placeholder";
import { listMattersForPage } from "@/modules/matter/view/matter-loader";

export const metadata: Metadata = { title: "תיקים" };

const PROCEDURE_HE: Record<string, string> = {
  pregnancy_dismissal: "פיטורי הריון", pre_dismissal_dispute: "טרום־פיטורים",
  hearing_before_dismissal: "שימוע", severance_claim: "פיצויי פיטורים",
  wage_overtime_claim: "שכר ושעות נוספות", pension_rights_claim: "זכויות פנסיה",
  discrimination_claim: "אפליה", harassment_complaint: "הטרדה",
  regional_labor_court_civil: "אזורי לעבודה", appeal_to_national_labor_court: "ערעור ארצי",
  national_insurance_claim: "ביטוח לאומי", settlement_enforcement: "אכיפת פשרה",
};

export default async function MattersPage() {
  const { matters } = await listMattersForPage();

  return (
    <Workspace>
      <PageHeader title="תיקים" context="כל תיקי המשרד — חיים, מסודרים, ומספרים את הסיפור של עצמם.">
        <Link
          href="/matters/new"
          className="inline-flex items-center rounded-md bg-ink-900 px-3 py-1.5 text-small text-surface transition-colors hover:bg-ink-800"
        >
          תיק חדש
        </Link>
      </PageHeader>
      <SectionChapter title="התיקים הפעילים" index={0}>
        {matters.length === 0 ? (
          <Placeholder headline="עוד אין תיקים" line="הרגע המושלם לפתוח את הראשון." />
        ) : (
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
        )}
      </SectionChapter>
    </Workspace>
  );
}
