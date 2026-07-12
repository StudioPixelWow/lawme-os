/**
 * /dev/legal-intelligence — development-only founder review interface
 * (Epic 2, Phase 12). Deliberately minimal and functional: NOT the future
 * Research Workspace, not linked from any navigation, gated out of
 * production builds. Native RTL, Design-Bible materials only.
 */
import { notFound } from "next/navigation";
import { isDevInterfaceEnabled } from "./gate";
import { runDevResearch } from "./run-research";
import { runDevDino } from "./run-dino";
import { DinoPipelineView } from "./dino-view";
import type { DbResearchResult } from "../../../modules/legal-knowledge/research/engine-db";
import type { DinoRunResult } from "../../../modules/dino/core/pipeline-result";

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
  searchParams: Promise<{ q?: string; domain?: string; authority?: string; mode?: string }>;
}) {
  if (!isDevInterfaceEnabled(process.env)) notFound();

  const params = await searchParams;
  const question = (params.q ?? "").trim();
  const mode = params.mode === "dino" ? "dino" : "research";

  const dinoResult: DinoRunResult | null = question && mode === "dino"
    ? await runDevDino({ question, legalDomain: params.domain || "labor" })
    : null;

  const result: DbResearchResult | null = question && mode === "research"
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
            <label className="text-caption text-ink-500">
              מצב:{" "}
              <select name="mode" defaultValue={mode} className="rounded border border-ink-200 bg-paper-0 p-1">
                <option value="research">אחזור (שער רלוונטיות)</option>
                <option value="dino">Dino — צינור אורקסטרציה מלא</option>
              </select>
            </label>
            <button
              type="submit"
              className="rounded-pill bg-ink-900 px-5 py-2 text-body font-semibold text-paper-0 transition-colors hover:bg-ink-700"
            >
              הרץ
            </button>
            {/* out-of-domain gate fixtures — expected: no sufficiently relevant source / domain stop */}
            <a
              href="?q=ירושת דירה&domain=labor&authority=balanced&mode=research"
              className="rounded-pill border border-ink-200 px-4 py-2 text-caption text-ink-500 transition-colors hover:border-gold-400"
            >
              בדיקת שער: &quot;ירושת דירה&quot; (מצופה: אין מקור רלוונטי)
            </a>
            <a
              href="?q=ירושת דירה&domain=labor&mode=dino"
              className="rounded-pill border border-ink-200 px-4 py-2 text-caption text-ink-500 transition-colors hover:border-gold-400"
            >
              בדיקת Dino: &quot;ירושת דירה&quot; (מצופה: עצירת תחום)
            </a>
          </div>
        </form>

        {dinoResult && <DinoPipelineView result={dinoResult} />}

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

            {/* ---- relevance-gate panel (fail-closed transparency) ---- */}
            <div className="rounded-xl border border-ink-100 bg-paper-0 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-body font-bold">שער רלוונטיות</span>
                <span className={`rounded-pill px-3 py-0.5 text-caption font-semibold ${
                  result.gate.status === "pass" ? "bg-ink-900 text-paper-0" : "bg-status-pending-wash text-status-pending"
                }`}>
                  {result.gate.status === "pass" ? "PASS — עבר" : "FAIL — נכשל (fail-closed)"}
                </span>
                <span className="text-caption text-ink-500">ביטחון {result.gate.confidence.toFixed(2)}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-caption text-ink-500 sm:grid-cols-3">
                <p>לקסיקלי גולמי (אבסולוטי): <b className="text-ink-700">{result.gate.signals.rawLexicalTop.toFixed(3)}</b></p>
                <p>לקסיקלי מנורמל (דירוג בלבד): {result.gate.signals.normalizedLexicalTop.toFixed(3)}</p>
                <p>סמנטי גולמי (mock): {result.gate.signals.rawSemanticTop.toFixed(3)}</p>
                <p>תחום שזוהה: <b className="text-ink-700">{result.gate.domain.detectedDomainLabelHe}</b></p>
                <p>תחום פעיל: {result.gate.activeDomainLabelHe}</p>
                <p>התאמת תחום: {result.gate.domain.domainMatch ? "כן" : "לא"}</p>
                <p>קטעים רלוונטיים: {result.gate.signals.relevantPassages}</p>
                <p>מקורות עצמאיים רלוונטיים: {result.gate.signals.independentRelevantSources}</p>
                <p>מקורות ראשיים רלוונטיים: {result.gate.signals.primaryRelevantSources}</p>
                <p>הפרדת ניקוד: {result.gate.signals.scoreSeparation.toFixed(3)}</p>
                <p>ביטחון שאלה: {result.gate.signals.queryConfidence.toFixed(2)}</p>
                <p>עוגנים תקינים: {result.gate.signals.anchorsValid ? "כן" : "לא"}</p>
              </div>
              {result.gate.failureReasons.length > 0 && (
                <ul className="mt-3 space-y-1 text-caption font-semibold text-status-pending">
                  {result.gate.failureReasons.map((r) => (
                    <li key={r.code}>✗ [{r.code}] {r.messageHe}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* ---- structured no-answer state ---- */}
            {result.answerState === "no_answer" ? (
              <div className="rounded-xl border-2 border-status-pending/60 bg-status-pending-wash p-5">
                <p className="text-body font-bold">{result.missingSourceNotice}</p>
                <div className="mt-3 grid grid-cols-1 gap-1 text-caption text-ink-700 sm:grid-cols-2">
                  <p>תחום שזוהה: {result.gate.domain.detectedDomainLabelHe}</p>
                  <p>תחום הקורפוס הפעיל: {result.gate.activeDomainLabelHe}</p>
                  <p>ניקוד רלוונטיות גולמי מרבי: {result.gate.signals.rawLexicalTop.toFixed(3)}</p>
                  <p>מדוע נכשל: {result.gate.failureReasons.map((r) => r.code).join(", ")}</p>
                </div>
                {result.gate.missingSourceTypes.length > 0 && (
                  <p className="mt-2 text-caption text-ink-700">
                    מקורות חסרים: {result.gate.missingSourceTypes.join(" · ")}
                  </p>
                )}
                {result.gate.suggestedActionsHe.length > 0 && (
                  <p className="mt-2 text-caption font-semibold text-ink-700">
                    פעולות מוצעות: {result.gate.suggestedActionsHe.join(" · ")}
                  </p>
                )}
              </div>
            ) : result.missingSourceNotice ? (
              <div className="rounded-xl border border-status-pending/40 bg-status-pending-wash p-4 text-body">
                {result.missingSourceNotice}
              </div>
            ) : null}

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

            {/* ---- weak results: collapsed, explicitly non-authoritative ---- */}
            {result.weakEvidence.length > 0 && (
              <details className="rounded-xl border border-dashed border-ink-200 bg-paper-0 p-4">
                <summary className="cursor-pointer text-caption font-semibold text-ink-500">
                  תוצאות חלשות שאינן מספיקות לתשובה ({result.weakEvidence.length}) — אינן עונות על השאלה
                </summary>
                <ol className="mt-3 space-y-3">
                  {result.weakEvidence.map((e) => (
                    <li key={`${e.documentId}:${e.anchor.anchorKey}`} className="rounded-lg border border-ink-100 p-3 opacity-70">
                      <p className="text-caption font-semibold">{e.title}</p>
                      <p className="mt-1 text-caption text-ink-500">{e.passage.slice(0, 160)}…</p>
                      <p className="mt-1 text-caption text-ink-500">
                        כיסוי אבסולוטי {e.scoreBreakdown.raw.lexicalCoverage.toFixed(3)} · עוגן {e.anchor.anchorKey}
                      </p>
                      <p className="mt-1 text-caption text-status-pending">⚠ {e.warnings.join(" · ")}</p>
                    </li>
                  ))}
                </ol>
              </details>
            )}

            {/* ---- corpus coverage ---- */}
            <div className="rounded-xl border border-ink-100 bg-paper-0 p-4 text-caption text-ink-500">
              <p className="text-body font-bold text-ink-900">כיסוי הקורפוס הפעיל</p>
              <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                <p>תחום פעיל: {result.corpusCoverage.activeDomainHe}</p>
                <p>מסמכים באינדקס: {result.corpusCoverage.indexedDocuments}</p>
                <p>
                  סוגי מקורות:{" "}
                  {Object.entries(result.corpusCoverage.documentsByType).map(([k, v]) => `${k} (${v})`).join(" · ") || "—"}
                </p>
                <p>עדכון מאומת אחרון: {result.corpusCoverage.latestVerifiedUpdate ?? "אין — הקורפוס סינתטי, דבר לא אומת"}</p>
                <p>תאריך מסמך אחרון: {result.corpusCoverage.latestDocumentDate ?? "—"}</p>
                <p>פסיקה זמינה: {result.corpusCoverage.caseLawAvailable ? "כן (סינתטית)" : "לא"}</p>
              </div>
              <p className="mt-2">חסר: {result.corpusCoverage.missingCategoriesHe.join(" · ")}</p>
              <p className="mt-2 font-semibold text-ink-700">{result.corpusCoverage.noticeHe}</p>
            </div>

            <footer className="rounded-xl border border-ink-100 bg-paper-0 p-4 text-caption text-ink-500">
              טיוטת מחקר — נדרשת בדיקת עורך דין. מאגר: {result.repositoryKind === "supabase" ? "Supabase פיתוח" : "זיכרון מקומי (fallback)"}.
            </footer>
          </section>
        )}
      </div>
    </main>
  );
}
