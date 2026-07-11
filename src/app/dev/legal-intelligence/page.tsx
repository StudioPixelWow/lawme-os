/**
 * /dev/legal-intelligence — development-only founder review interface
 * (Epic 2, Phase 12). Deliberately minimal and functional: NOT the future
 * Research Workspace, not linked from any navigation, gated out of
 * production builds. Native RTL, Design-Bible materials only.
 */
import { notFound } from "next/navigation";
import { isDevInterfaceEnabled } from "./gate";
import { runDevResearch } from "./run-research";
import type { DbResearchResult } from "../../../modules/legal-knowledge/research/engine-db";

export const dynamic = "force-dynamic";

const AUTHORITY_LABELS: Record<string, string> = {
  legislation: "חקיקה",
  supreme: "בית המשפט העליון",
  national_labor: "בית הדין הארצי לעבודה",
  regional: "ערכאה אזורית",
  guidance: "הנחיה מנהלית",
  secondary: "מקור משני",
  unknown: "לא סווג",
};

export default async function LegalIntelligenceDevPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; domain?: string; authority?: string }>;
}) {
  if (!isDevInterfaceEnabled(process.env)) notFound();

  const params = await searchParams;
  const question = (params.q ?? "").trim();
  const result: DbResearchResult | null = question
    ? await runDevResearch({
        question,
        legalDomain: params.domain || "labor",
        authorityPreference: params.authority === "binding_first" ? "binding_first" : "balanced",
      })
    : null;

  return (
    <main dir="rtl" lang="he" className="min-h-screen bg-paper-50 px-6 py-10 text-ink-900">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="space-y-2">
          <p className="inline-block rounded-pill border border-gold-400/60 bg-gold-400/10 px-3 py-1 text-caption font-semibold text-ink-700">
            סביבת POC — נתונים סינתטיים בלבד
          </p>
          <h1 className="text-heading font-bold">בינה משפטית — ממשק בדיקה פנימי</h1>
          <p className="text-body text-ink-500">
            פרוסת מחקר אנכית מול מסד הפיתוח. אינו Workspace המחקר הסופי; ללא ניווט
            ייצור; כל הפלט חילוצי בלבד — &quot;טיוטת מחקר — נדרשת בדיקת עורך דין&quot;.
          </p>
        </header>

        <form method="get" className="space-y-3 rounded-xl border border-ink-100 bg-paper-0 p-5 shadow-lift">
          <label htmlFor="q" className="block text-body font-semibold">
            שאלה משפטית בעברית
          </label>
          <textarea
            id="q"
            name="q"
            rows={2}
            defaultValue={question}
            placeholder="לדוגמה: עובדת פוטרה בהיריון ללא שימוע — מה זכויותיה?"
            className="w-full rounded-lg border border-ink-200 bg-paper-0 p-3 text-body focus:border-gold-400 focus:outline-none"
          />
          <div className="flex flex-wrap items-center gap-4">
            <label className="text-caption text-ink-500">
              תחום:{" "}
              <select name="domain" defaultValue={params.domain ?? "labor"} className="rounded border border-ink-200 bg-paper-0 p-1">
                <option value="labor">דיני עבודה</option>
              </select>
            </label>
            <label className="text-caption text-ink-500">
              העדפת סמכות:{" "}
              <select name="authority" defaultValue={params.authority ?? "balanced"} className="rounded border border-ink-200 bg-paper-0 p-1">
                <option value="balanced">מאוזן</option>
                <option value="binding_first">מחייב תחילה</option>
              </select>
            </label>
            <button
              type="submit"
              className="rounded-pill bg-ink-900 px-5 py-2 text-body font-semibold text-paper-0 transition-colors hover:bg-ink-700"
            >
              הרץ מחקר
            </button>
          </div>
        </form>

        {result && (
          <section className="space-y-4">
            <div className="rounded-xl border border-ink-100 bg-paper-0 p-4 text-caption text-ink-500">
              <p>{result.retrievalExplanation}</p>
              <p className="mt-1">
                מנוע {result.engineVersion} · מזהה ריצה {result.correlationId.slice(0, 8)} ·{" "}
                {result.durationMs}ms
              </p>
              {result.warnings.map((w) => (
                <p key={w} className="mt-1 font-semibold text-status-pending">⚠ {w}</p>
              ))}
            </div>

            {result.missingSourceNotice && (
              <div className="rounded-xl border border-status-pending/40 bg-status-pending-wash p-4 text-body">
                {result.missingSourceNotice}
              </div>
            )}

            <ol className="space-y-4">
              {result.evidence.map((e, i) => (
                <li key={`${e.documentId}:${e.anchor.anchorKey}`} className="rounded-xl border border-ink-100 bg-paper-0 p-5 shadow-lift">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-body font-bold">
                      {i + 1}. {e.title}
                    </h2>
                    <span className="rounded-pill bg-ink-900/5 px-2 py-0.5 text-caption text-ink-500">
                      {AUTHORITY_LABELS[e.authorityClass] ?? e.authorityClass}
                    </span>
                  </div>
                  <p className="mt-1 text-caption text-ink-500">
                    {e.court ?? "—"} · {e.caseNumberDisplay ?? "ללא מספר הליך"} · אימות: {e.verificationStatus}
                  </p>
                  <blockquote className="mt-3 border-s-2 border-gold-400 ps-3 text-body leading-relaxed">
                    {e.passage}
                  </blockquote>
                  <p className="mt-2 text-caption text-ink-500">{e.citation}</p>
                  <p className="mt-1 text-caption text-ink-500">
                    עוגן {e.anchor.anchorKey} · תווים {e.anchor.charStart}–{e.anchor.charEnd}
                    {e.sourceUrl ? <> · מקור: <span className="break-all">{e.sourceUrl}</span></> : null}
                  </p>
                  <p className="mt-2 text-caption text-ink-500">
                    ניקוד {e.scoreBreakdown.final.toFixed(3)} = לקסיקלי{" "}
                    {e.scoreBreakdown.lexical.toFixed(2)} · וקטורי(mock) {e.scoreBreakdown.vector.toFixed(2)} · סמכות{" "}
                    {e.scoreBreakdown.authority.toFixed(2)} · אמינות {e.scoreBreakdown.trust.toFixed(2)} · עדכניות{" "}
                    {e.scoreBreakdown.freshness.toFixed(2)}
                  </p>
                  {e.warnings.length > 0 && (
                    <p className="mt-1 text-caption text-status-pending">⚠ {e.warnings.join(" · ")}</p>
                  )}
                </li>
              ))}
            </ol>

            <footer className="rounded-xl border border-ink-100 bg-paper-0 p-4 text-caption text-ink-500">
              טיוטת מחקר — נדרשת בדיקת עורך דין. מאגר: {result.repositoryKind === "supabase" ? "Supabase פיתוח" : "זיכרון מקומי (fallback)"}.
            </footer>
          </section>
        )}
      </div>
    </main>
  );
}
