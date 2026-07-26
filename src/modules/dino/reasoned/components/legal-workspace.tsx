"use client";

/**
 * Legal Workspace (Workbench) — one CONTINUOUS legal workspace (Premium sprint).
 * The answer becomes the beginning of legal work. Presentation ONLY: every
 * section is DERIVED from the existing ReasonedDinoResponse — no new reasoning,
 * corpus, AI, functionality, or navigation. This sprint replaces the tab bar
 * with a single continuous editorial surface; the derived sections, data, and
 * order are unchanged.
 */
import type { ReactNode } from "react";
import { cx } from "@/design-system/utils/cx";
import { TaskGlyph } from "@/design-system/icons/glyphs";
import type { ReasonedDinoResponse } from "../types";
import { CopyButton, deriveNextActions } from "./presentation";

/* ============================================================ derivations */

interface EvidenceItem { labelHe: string; keywords: string[] }
const EVIDENCE_CATALOG: EvidenceItem[] = [
  { labelHe: "הסכם עבודה", keywords: ["הסכם", "חוזה"] },
  { labelHe: "הודעה על תנאי עבודה", keywords: ["הודעה", "תנאי עבוד"] },
  { labelHe: "תלושי שכר", keywords: ["שכר", "תלוש", "מינימום", "שעתי"] },
  { labelHe: "דוחות נוכחות ושעות עבודה", keywords: ["שעות", "נוכחות", "דיווח", "עבודה נוספת"] },
  { labelHe: "התכתבות עם המעסיק", keywords: ["מכתב", "התכתב", "פיטור", "הודעה מוקדמת", "שימוע", "התראה"] },
  { labelHe: "מכתב פיטורים / הודעת סיום", keywords: ["פיטור", "סיום", "הפסקת"] },
  { labelHe: "אישורים רפואיים / מסמכי היריון", keywords: ["מחלה", "היריון", "רפואי", "טיפול", "לידה"] },
];

function haystack(r: ReasonedDinoResponse): string {
  const am = r.applicationToMatter;
  return [
    r.researchTrace.domainHe, r.legalIssue.statementHe, ...r.researchTrace.concepts,
    ...am.missing.map((m) => `${m.labelHe} ${m.whyRequiredHe}`),
    ...am.established.map((f) => f.labelHe), ...am.disputed.map((f) => f.labelHe), ...am.alleged.map((f) => f.labelHe),
    ...r.missingFacts.map((q) => q.questionHe),
  ].join(" · ");
}

export function evidenceChecklist(r: ReasonedDinoResponse): string[] {
  if (!r.applicationToMatter.hasMatter) return [];
  const hay = haystack(r);
  const matched = EVIDENCE_CATALOG.filter((e) => e.keywords.some((k) => hay.includes(k))).map((e) => e.labelHe);
  const core = ["הסכם עבודה", "הודעה על תנאי עבודה", "תלושי שכר"];
  const set = new Set<string>([...matched, ...core]);
  return EVIDENCE_CATALOG.map((e) => e.labelHe).filter((l) => set.has(l));
}

export interface ClientQuestions { criticalHe: string[]; importantHe: string[]; niceHe: string[] }
export function clientQuestions(r: ReasonedDinoResponse): ClientQuestions {
  const criticalHe = r.applicationToMatter.missing.map((m) => `${m.labelHe}${m.whyRequiredHe ? ` — ${m.whyRequiredHe}` : ""}`);
  const importantHe = r.missingFacts.map((q) => q.questionHe);
  const niceHe = r.suggestedFollowUps.map((q) => q.questionHe).filter((q) => !importantHe.includes(q));
  return { criticalHe, importantHe, niceHe };
}

export function employerQuestions(r: ReasonedDinoResponse): string[] {
  const disputed = [...r.applicationToMatter.disputed, ...r.applicationToMatter.alleged];
  const out = disputed.map((f) => `בקש הבהרה בעניין: ${f.labelHe}`);
  for (const e of evidenceChecklist(r).slice(0, 4)) out.push(`בקש להעביר: ${e}`);
  return out;
}

export interface RiskSummary { legalHe: string[]; evidenceHe: string[]; missingInfoHe: string[]; confidenceImpactHe: string }
export function riskSummary(r: ReasonedDinoResponse): RiskSummary {
  const legalHe = [...r.riskAssessment.legal, ...r.riskAssessment.practical].slice(0, 4).map((x) => `${x.severityLabelHe} — ${x.statementHe}`);
  const disputed = [...r.applicationToMatter.disputed, ...r.applicationToMatter.alleged];
  const evidenceHe = disputed.map((f) => `ראיה שנויה במחלוקת: ${f.labelHe}`);
  if (r.applicationToMatter.hasMatter) evidenceHe.push(`${evidenceChecklist(r).length} סוגי מסמכים לאיסוף`);
  const missingInfoHe = r.applicationToMatter.missing.map((m) => m.labelHe);
  const confidenceImpactHe = `רמת הביטחון: ${r.confidence.labelHe}${r.applicationToMatter.missing.length ? ` — ${r.applicationToMatter.missing.length} עובדות חסרות מגבילות אותה` : ""}.`;
  return { legalHe, evidenceHe, missingInfoHe, confidenceImpactHe };
}

export interface TimelineEvent { labelHe: string; state: "known" | "contested" | "unknown" }
export function timelineEvents(r: ReasonedDinoResponse): TimelineEvent[] {
  const am = r.applicationToMatter;
  const out: TimelineEvent[] = [];
  for (const f of am.established) out.push({ labelHe: f.labelHe, state: "known" });
  for (const f of [...am.disputed, ...am.alleged]) out.push({ labelHe: f.labelHe, state: "contested" });
  for (const m of am.missing) out.push({ labelHe: m.labelHe, state: "unknown" });
  return out;
}

export function openIssues(r: ReasonedDinoResponse): string[] {
  const out: string[] = [];
  for (const m of r.applicationToMatter.missing) out.push(`עובדה חסרה: ${m.labelHe}`);
  for (const u of r.uncertaintiesHe) out.push(u);
  for (const a of r.opposingArgument) if (a.disposition === "unresolved") out.push(`טענה נגדית לא הוכרעה: ${a.argumentHe}`);
  for (const c of r.coverage.uncoveredHe) out.push(`פער כיסוי: ${c}`);
  return Array.from(new Set(out));
}

/* ============================================================ UI — continuous surface */

function WSection({ titleHe, action, children }: { titleHe: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-t border-line/50 pt-6 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-micro uppercase tracking-widest text-foreground-faint">{titleHe}</h4>
        {action ?? null}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Checklist({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2.5 text-caption leading-relaxed text-foreground">
          <span className="mt-0.5 text-foreground-faint" aria-hidden>☐</span><span className="max-w-[64ch]">{it}</span>
        </li>
      ))}
    </ul>
  );
}

export function LegalWorkspace({ r }: { r: ReasonedDinoResponse }) {
  const hasMatter = r.applicationToMatter.hasMatter;
  const actions = deriveNextActions(r);
  const evidence = evidenceChecklist(r);
  const client = clientQuestions(r);
  const employer = employerQuestions(r);
  const risk = riskSummary(r);
  const timeline = timelineEvents(r);
  const issues = openIssues(r);

  const clientCopy = [
    ...client.criticalHe.map((q) => `• [קריטי] ${q}`),
    ...client.importantHe.map((q) => `• [חשוב] ${q}`),
    ...client.niceHe.map((q) => `• [רצוי] ${q}`),
  ].join("\n");
  const hasClient = client.criticalHe.length + client.importantHe.length + client.niceHe.length > 0;

  return (
    <div data-testid="legal-workspace" className="mt-8 rounded-lg border border-line-strong bg-surface-raised/30">
      <div className="flex items-baseline gap-2.5 px-6 pt-5">
        <TaskGlyph size={15} className="text-gold-600" />
        <p className="font-display text-subheading font-semibold text-foreground">שולחן עבודה משפטי</p>
        <span className="text-micro text-foreground-faint">התשובה היא נקודת ההתחלה של העבודה</span>
      </div>

      <div className="space-y-6 px-6 pb-6 pt-5">
        {actions.length > 0 ? (
          <WSection titleHe="צעדים מומלצים">
            <ol className="space-y-2.5">
              {actions.map((a, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-pill bg-gold-100 text-micro font-semibold text-gold-800">{i + 1}</span>
                  <span className="max-w-[64ch]">
                    <span className="text-caption font-medium text-foreground">{a.textHe}</span>
                    {a.whyHe ? <span className="block text-micro leading-relaxed text-foreground-faint">{a.whyHe}</span> : null}
                  </span>
                </li>
              ))}
            </ol>
          </WSection>
        ) : null}

        {hasMatter && evidence.length > 0 ? (
          <WSection titleHe="ראיות לאיסוף" action={<CopyButton text={evidence.map((e) => `☐ ${e}`).join("\n")} label="העתק רשימה" />}>
            <Checklist items={evidence} />
          </WSection>
        ) : null}

        {hasClient ? (
          <WSection titleHe="שאלות ללקוח" action={<CopyButton text={clientCopy} label="העתק שאלות" />}>
            {client.criticalHe.length > 0 ? (
              <div className="mb-3">
                <p className="mb-1 text-micro font-semibold text-status-risk">קריטי — חוסם מסקנה</p>
                <Checklist items={client.criticalHe} />
              </div>
            ) : null}
            {client.importantHe.length > 0 ? (
              <div className="mb-3">
                <p className="mb-1 text-micro font-semibold text-status-today">חשוב</p>
                <Checklist items={client.importantHe} />
              </div>
            ) : null}
            {client.niceHe.length > 0 ? (
              <div>
                <p className="mb-1 text-micro font-semibold text-foreground-faint">רצוי לדעת</p>
                <Checklist items={client.niceHe} />
              </div>
            ) : null}
          </WSection>
        ) : null}

        {hasMatter && employer.length > 0 ? (
          <WSection titleHe="שאלות למעסיק" action={<CopyButton text={employer.map((e) => `• ${e}`).join("\n")} label="העתק" />}>
            <Checklist items={employer} />
          </WSection>
        ) : null}

        <WSection titleHe="סיכונים">
          <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <div>
              <p className="text-micro font-semibold text-status-risk">סיכון משפטי</p>
              {risk.legalHe.length ? <ul className="mt-1.5 space-y-1 text-caption leading-relaxed text-foreground-soft">{risk.legalHe.map((x, i) => <li key={i}>{x}</li>)}</ul> : <p className="mt-1.5 text-caption text-foreground-faint">—</p>}
            </div>
            <div>
              <p className="text-micro font-semibold text-status-today">סיכון ראייתי</p>
              {risk.evidenceHe.length ? <ul className="mt-1.5 space-y-1 text-caption leading-relaxed text-foreground-soft">{risk.evidenceHe.map((x, i) => <li key={i}>{x}</li>)}</ul> : <p className="mt-1.5 text-caption text-foreground-faint">—</p>}
            </div>
            <div>
              <p className="text-micro font-semibold text-status-waiting">סיכון מידע חסר</p>
              {risk.missingInfoHe.length ? <ul className="mt-1.5 space-y-1 text-caption leading-relaxed text-foreground-soft">{risk.missingInfoHe.map((x, i) => <li key={i}>• {x}</li>)}</ul> : <p className="mt-1.5 text-caption text-foreground-faint">—</p>}
            </div>
            <div>
              <p className="text-micro font-semibold text-foreground">השפעה על הביטחון</p>
              <p className="mt-1.5 text-caption leading-relaxed text-foreground-soft">{risk.confidenceImpactHe}</p>
            </div>
          </div>
        </WSection>

        {hasMatter && timeline.length > 0 ? (
          <WSection titleHe="ציר זמן">
            <p className="mb-2.5 text-micro text-foreground-faint">אירועי התיק — תאריכים מדויקים ייקבעו לאחר השלמת המסמכים</p>
            <ol className="space-y-2">
              {timeline.map((e, i) => (
                <li key={i} className="flex items-center gap-2.5">
                  <span className={cx("h-1.5 w-1.5 shrink-0 rounded-pill", e.state === "known" ? "bg-status-completed" : e.state === "contested" ? "bg-status-today" : "bg-status-risk")} />
                  <span className={cx("text-caption", e.state === "unknown" ? "font-medium text-status-risk" : "text-foreground")}>
                    {e.labelHe}{e.state === "unknown" ? " — תאריך לא ידוע" : e.state === "contested" ? " — שנוי במחלוקת" : ""}
                  </span>
                </li>
              ))}
            </ol>
          </WSection>
        ) : null}

        {issues.length > 0 ? (
          <WSection titleHe="סוגיות פתוחות">
            <p className="mb-2.5 text-micro text-foreground-faint">כל מה שמונע חוות דעת חד-משמעית</p>
            <ul className="space-y-2">
              {issues.map((x, i) => (
                <li key={i} className="flex items-start gap-2.5 text-caption leading-relaxed text-foreground"><span className="mt-1 h-1 w-1 shrink-0 rounded-pill bg-status-risk" /><span className="max-w-[64ch]">{x}</span></li>
              ))}
            </ul>
          </WSection>
        ) : null}
      </div>
    </div>
  );
}
