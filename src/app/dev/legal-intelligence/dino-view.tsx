/**
 * Dino pipeline view (Epic 3A, Phase 28) — development only.
 * Renders ONLY structured audit artifacts. NEVER exposes model
 * chain-of-thought: each stage shows status, purpose, safe summaries,
 * provenance, warnings and stop conditions. Collapsible per stage.
 */
import type { DinoRunResult } from "../../../modules/dino/core/pipeline-result";
import type { DinoStageStatus } from "../../../modules/dino/core/pipeline-types";

const STATUS_LABEL: Record<DinoStageStatus, string> = {
  pending: "ממתין",
  running: "רץ",
  passed: "PASS",
  failed: "FAIL",
  skipped: "דולג",
  requires_clarification: "נדרשת הבהרה",
  insufficient_evidence: "ראיות לא מספיקות",
  domain_mismatch: "אי-התאמת תחום",
  requires_human_review: "נדרשת בדיקה אנושית",
  blocked_by_policy: "חסום ע\"י מדיניות",
};

function statusClass(s: DinoStageStatus): string {
  if (s === "passed") return "bg-ink-900 text-paper-0";
  if (s === "failed" || s === "blocked_by_policy" || s === "domain_mismatch") return "bg-status-pending-wash text-status-pending";
  if (s === "skipped") return "bg-ink-900/5 text-ink-500";
  return "bg-gold-400/15 text-ink-700";
}

const OUTCOME_LABEL: Record<string, string> = {
  completed: "הושלם — טיוטת מחקר טעונה בדיקת עו\"ד",
  stopped_clarification: "נעצר — נדרשות הבהרות",
  stopped_domain_mismatch: "נעצר — מחוץ לתחום הקורפוס",
  stopped_insufficient_evidence: "נעצר — אין מקור רלוונטי מספיק",
  stopped_policy: "נעצר — מדיניות אוסרת",
  stopped_citation_failure: "נעצר — כשל אימות ציטוט",
  stopped_qa_failure: "נעצר — כשל בקרת איכות",
  stopped_red_team: "נעצר — ממצא Red Team חוסם",
  stopped_unsupported_intent: "נעצר — בקשה לא נתמכת",
  stopped_internal_failure: "נעצר — כשל פנימי",
};

export function DinoPipelineView({ result }: { result: DinoRunResult }) {
  const a = result.artifacts;
  const isStop = result.outcome !== "completed";

  return (
    <section className="space-y-4">
      {/* run header */}
      <div className={`rounded-xl border p-4 ${isStop ? "border-status-pending/50 bg-status-pending-wash" : "border-ink-100 bg-paper-0"}`}>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-pill bg-gold-400/15 px-3 py-0.5 text-caption font-semibold text-ink-700">Dino</span>
          <h2 className="text-body font-bold">{OUTCOME_LABEL[result.outcome] ?? result.outcome}</h2>
        </div>
        <p className="mt-1 text-caption text-ink-500">
          מנוע {result.engineVersion} · ריצה {result.runId.slice(0, 8)} · {result.durationMs}ms · {result.stages.length} שלבים
        </p>
        <p className="mt-1 text-caption font-semibold text-ink-700">{result.statusLineHe}</p>
        {result.stopConditions.length > 0 && (
          <ul className="mt-2 space-y-1 text-caption text-status-pending">
            {result.stopConditions.map((s) => (
              <li key={s.code}>■ [{s.code}] {s.messageHe} — <span className="text-ink-500">{s.recommendedActionHe}</span></li>
            ))}
          </ul>
        )}
      </div>

      {/* stage timeline (collapsible) */}
      <div className="rounded-xl border border-ink-100 bg-paper-0 p-4">
        <p className="mb-3 text-body font-bold">שלבי הצינור</p>
        <ol className="space-y-1">
          {result.stages.map((s, i) => (
            <li key={`${s.stageId}-${i}`}>
              <details className="rounded-lg border border-ink-100 px-3 py-2">
                <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-caption">
                  <span className="font-mono text-ink-500">{String(i + 1).padStart(2, "0")}</span>
                  <span className={`rounded-pill px-2 py-0.5 text-caption font-semibold ${statusClass(s.status)}`}>{STATUS_LABEL[s.status]}</span>
                  <span className="font-semibold text-ink-900">{s.stageId}</span>
                  <span className="text-ink-500">· {s.purposeHe}</span>
                  {s.durationMs !== null && <span className="text-ink-400">· {s.durationMs}ms</span>}
                </summary>
                <div className="mt-2 space-y-1 text-caption text-ink-500">
                  <p>קלט: {s.audit.inputSummaryHe}</p>
                  <p>פלט: {s.audit.outputSummaryHe}</p>
                  {s.confidence !== null && <p>ביטחון שלב: {s.confidence.toFixed(2)}</p>}
                  <p>ספק: {s.provenance.provider} · כללים: {s.provenance.deterministicRules.map((r) => `${r.name}@${r.version}`).join(", ")}</p>
                  {s.provenance.policyIds.length > 0 && <p>מדיניות: {s.provenance.policyIds.join(", ")}</p>}
                  {s.warnings.map((w) => <p key={w} className="text-status-pending">⚠ {w}</p>)}
                  {s.errors.map((e) => <p key={e.code} className="text-status-pending">✗ {e.messageHe}</p>)}
                </div>
              </details>
            </li>
          ))}
        </ol>
      </div>

      {/* key artifacts */}
      {a.questionClassification && (
        <Artifact title="סיווג שאלה ותחום">
          תחום: {a.questionClassification.domainLabelHe} · תת-סוגיה: {a.questionClassification.subdomain ?? "—"} ·
          {" "}סיכון: {a.questionClassification.riskLevel} · מורכבות: {a.questionClassification.complexity}
        </Artifact>
      )}

      {a.clarification && a.clarification.clarificationQuestions.length > 0 && (
        <Artifact title="שער הבהרה">
          <p className="mb-1">{a.clarification.recommendedNextStepHe}</p>
          <ul className="space-y-1">
            {a.clarification.clarificationQuestions.map((q) => (
              <li key={q.id} className={q.critical ? "font-semibold text-ink-900" : "text-ink-500"}>
                {q.critical ? "◆" : "○"} {q.questionHe} <span className="text-ink-400">— {q.whyHe}</span>
              </li>
            ))}
          </ul>
        </Artifact>
      )}

      {a.researchPlan && (
        <Artifact title="תוכנית מחקר">
          <p className="mb-1">{a.researchPlan.objectiveHe}</p>
          <ol className="list-decimal space-y-0.5 pe-5">
            {a.researchPlan.steps.map((st) => <li key={st.id}>{st.objectiveHe}</li>)}
          </ol>
        </Artifact>
      )}

      {a.issueGraph && (
        <Artifact title={`סוגיות משפטיות (${a.issueGraph.issues.length})`}>
          <ul className="space-y-1">
            {a.issueGraph.issues.map((iss) => (
              <li key={iss.id}>
                <b>{iss.titleHe}</b> — {iss.statementHe}
                <span className="text-ink-400"> · תלוי ב: {iss.dependsOn.length ? iss.dependsOn.join(", ") : "—"} · הכרעה: {iss.resolution}</span>
                {iss.missingFacts.length > 0 && <span className="text-status-pending"> · עובדות חסרות: {iss.missingFacts.join(", ")}</span>}
              </li>
            ))}
          </ul>
        </Artifact>
      )}

      {a.coverage && (
        <Artifact title={`כיסוי: ${a.coverage.overallState}`}>
          <p>סוגיות נתמכות: {a.coverage.issuesSupported}/{a.coverage.issuesIdentified} · כיסוי מקור ראשי: {a.coverage.primarySourceCoverage} · סמכות מחייבת: {a.coverage.bindingAuthorityCoverage}</p>
          {a.coverage.missingSourceCategories.length > 0 && <p className="text-status-pending">מקורות חסרים: {a.coverage.missingSourceCategories.join(", ")}</p>}
        </Artifact>
      )}

      {a.contradictions && a.contradictions.records.length > 0 && (
        <Artifact title={`סתירות (${a.contradictions.records.length}, מהותיות בלתי פתורות: ${a.contradictions.unresolvedMaterialCount})`}>
          <ul className="space-y-1">
            {a.contradictions.records.map((c) => (
              <li key={c.id}>{c.sourceB.titleHe} ({c.resolutionStatus}) — {c.authorityComparisonHe}</li>
            ))}
          </ul>
        </Artifact>
      )}

      {a.evidence && (
        <Artifact title={`פנקס ראיות (${a.evidence.items.length}; עוגנים פסולים שנשמטו: ${a.evidence.invalidAnchorCount})`}>
          <ul className="space-y-1">
            {a.evidence.items.slice(0, 12).map((e) => (
              <li key={e.evidenceId}>
                <b>{e.titleHe}</b> · {e.sourceAuthorityClass} · עוגן {e.anchorKey} ({e.charStart}–{e.charEnd}) · תמיכה {e.supportStrength.toFixed(2)} {e.supportingOrOpposing === "opposing" ? "· מנוגד" : ""}
              </li>
            ))}
          </ul>
        </Artifact>
      )}

      {a.citations && (
        <Artifact title={`אימות ציטוטים (${a.citations.checks.length}; טענות חסומות: ${a.citations.blockedClaimIds.length})`}>
          <p>{a.citations.checks.filter((c) => !c.blocksClaim).length} עברו · {a.citations.checks.filter((c) => c.blocksClaim).length} חוסמים</p>
        </Artifact>
      )}

      {a.draft && (
        <Artifact title={a.draft.titleHe}>
          <p className="mb-2 rounded-pill inline-block bg-gold-400/10 px-3 py-0.5 text-caption font-semibold text-ink-700">{a.draft.mandatoryLabelHe}</p>
          <ol className="space-y-2">
            {a.draft.paragraphs.map((p) => (
              <li key={p.id}>
                <p className="text-ink-900">{p.textHe}</p>
                {p.citationRefs.length > 0 && (
                  <p className="text-caption text-ink-400">מקורות: {p.citationRefs.map((r) => `${r.titleHe} (${r.anchorKey})`).join(" · ")}</p>
                )}
              </li>
            ))}
          </ol>
          {a.draft.omittedClaimIds.length > 0 && <p className="mt-2 text-caption text-ink-500">טענות שהושמטו (לא-בטוחות): {a.draft.omittedClaimIds.length}</p>}
          {a.draft.questionsForReviewHe.length > 0 && (
            <div className="mt-2">
              <p className="text-caption font-semibold">שאלות לבדיקת עורך דין:</p>
              <ul className="text-caption text-ink-500">{a.draft.questionsForReviewHe.map((q) => <li key={q}>· {q}</li>)}</ul>
            </div>
          )}
        </Artifact>
      )}

      {a.qa && (
        <Artifact title={`בקרת איכות: ${a.qa.passed ? "עבר" : "נכשל"}`}>
          {a.qa.blockingFindings.length > 0 && <p className="text-status-pending">ממצאים חוסמים: {a.qa.blockingFindings.map((f) => f.checkHe).join(", ")}</p>}
          <p className="text-ink-500">פעולות אנושיות נדרשות: {a.qa.requiredHumanActionsHe.join(" · ")}</p>
        </Artifact>
      )}

      {a.redTeam && a.redTeam.challenges.length > 0 && (
        <Artifact title={`Red Team (${a.redTeam.challenges.length}; חוסמים: ${a.redTeam.blockingCount})`}>
          <ul className="space-y-1">
            {a.redTeam.challenges.map((c) => (
              <li key={c.id}><b>[{c.severity}]</b> {c.challengeHe} <span className="text-ink-400">— {c.responseHe}</span></li>
            ))}
          </ul>
        </Artifact>
      )}

      {a.confidence && (
        <Artifact title={`ביטחון: ${a.confidence.band}`}>
          <p className="mb-1 text-ink-500">{a.confidence.disclaimerHe}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 sm:grid-cols-3">
            {a.confidence.factors.map((f) => (
              <span key={f.key}>{f.labelHe}: {f.score.toFixed(2)}</span>
            ))}
          </div>
          {a.confidence.reasonsConfidenceCannotBeHigherHe.length > 0 && (
            <p className="mt-1 text-caption text-status-pending">מדוע לא גבוה יותר: {a.confidence.reasonsConfidenceCannotBeHigherHe.join(" · ")}</p>
          )}
        </Artifact>
      )}

      {a.review && (
        <Artifact title="ניתוב לבדיקה אנושית">
          <p><b>{a.review.primaryTarget}</b> {a.review.mandatoryBeforeAction ? "· חובה לפני פעולה" : ""}</p>
          <p className="text-ink-500">{a.review.reasonsHe.join(" · ")}</p>
        </Artifact>
      )}

      <footer className="rounded-xl border border-ink-100 bg-paper-0 p-4 text-caption text-ink-500">
        סביבת POC — נתונים סינתטיים בלבד · אין חשיפת שרשרת חשיבה של מודל · ארטיפקטים מובנים בלבד ·
        מאגר: {result.mode === "development" ? "פיתוח/זיכרון" : result.mode}. טיוטת מחקר משפטי — נדרשת בדיקת עורך דין.
      </footer>
    </section>
  );
}

function Artifact({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="rounded-xl border border-ink-100 bg-paper-0 p-4" open>
      <summary className="cursor-pointer text-body font-bold">{title}</summary>
      <div className="mt-2 text-caption text-ink-700">{children}</div>
    </details>
  );
}
