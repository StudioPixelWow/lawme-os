"use client";

/**
 * Legal Workspace (Workbench Sprint) — turns the answer into the start of work.
 * Presentation ONLY: every section is DERIVED from the existing
 * ReasonedDinoResponse (missing facts, facts, risks, uncertainties, coverage).
 * No new reasoning, corpus, or AI. Nothing here computes law — it re-presents
 * what the opinion already produced as an actionable workbench.
 */
import { useState } from "react";
import { cx } from "@/design-system/utils/cx";
import {
  TaskGlyph, EvidenceGlyph, UsersGlyph, BuildingGlyph, AlertGlyph, ClockGlyph, CompareGlyph,
} from "@/design-system/icons/glyphs";
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
  // A matter always needs the core trio, even if keywords didn't surface them.
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
  const legalHe = [...r.riskAssessment.legal, ...r.riskAssessment.practical].slice(0, 4).map((x) => `[${x.severityLabelHe}] ${x.statementHe}`);
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

/* ============================================================ UI */

type TabKey = "steps" | "evidence" | "client" | "employer" | "risk" | "timeline" | "issues";

function Section({ children }: { children: React.ReactNode }) {
  return <div className="animate-rise">{children}</div>;
}

function Checklist({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2 text-caption text-foreground">
          <span className="mt-0.5 text-foreground-faint" aria-hidden>☐</span><span>{it}</span>
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

  const allTabs: { key: TabKey; labelHe: string; glyph: React.ReactNode; show: boolean; count?: number }[] = [
    { key: "steps", labelHe: "צעדים", glyph: <TaskGlyph size={13} />, show: actions.length > 0, count: actions.length },
    { key: "evidence", labelHe: "ראיות", glyph: <EvidenceGlyph size={13} />, show: hasMatter && evidence.length > 0, count: evidence.length },
    { key: "client", labelHe: "שאלות ללקוח", glyph: <UsersGlyph size={13} />, show: client.criticalHe.length + client.importantHe.length + client.niceHe.length > 0 },
    { key: "employer", labelHe: "שאלות למעסיק", glyph: <BuildingGlyph size={13} />, show: hasMatter && employer.length > 0, count: employer.length },
    { key: "risk", labelHe: "סיכונים", glyph: <AlertGlyph size={13} />, show: true },
    { key: "timeline", labelHe: "ציר זמן", glyph: <ClockGlyph size={13} />, show: hasMatter && timeline.length > 0, count: timeline.length },
    { key: "issues", labelHe: "סוגיות פתוחות", glyph: <CompareGlyph size={13} />, show: issues.length > 0, count: issues.length },
  ];
  const tabs = allTabs.filter((t) => t.show);

  const [active, setActive] = useState<TabKey>(tabs[0]?.key ?? "risk");

  const clientCopy = [
    ...client.criticalHe.map((q) => `• [קריטי] ${q}`),
    ...client.importantHe.map((q) => `• [חשוב] ${q}`),
    ...client.niceHe.map((q) => `• [רצוי] ${q}`),
  ].join("\n");

  return (
    <div data-testid="legal-workspace" className="mt-6 overflow-hidden rounded-md border border-line-strong bg-surface">
      <div className="flex items-center gap-2 border-b border-line bg-surface-raised/60 px-4 py-2.5">
        <TaskGlyph size={15} className="text-gold-600" />
        <p className="text-small font-semibold text-foreground">שולחן עבודה משפטי</p>
        <span className="text-micro text-foreground-faint">התשובה היא נקודת ההתחלה של העבודה</span>
      </div>

      {/* tabs */}
      <div className="flex flex-wrap gap-1 border-b border-line px-3 py-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActive(t.key)}
            className={cx(
              "inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-micro font-medium transition-colors",
              active === t.key ? "bg-gold-100 text-gold-800" : "text-foreground-soft hover:bg-surface-sunken",
            )}
            style={{ transitionDuration: "var(--motion-quick)" }}
          >
            {t.glyph}{t.labelHe}{t.count !== undefined ? <span className="text-foreground-faint">({t.count})</span> : null}
          </button>
        ))}
      </div>

      <div className="p-4">
        {active === "steps" ? (
          <Section>
            <ol className="space-y-2">
              {actions.map((a, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-pill bg-gold-100 text-micro font-semibold text-gold-800">{i + 1}</span>
                  <span>
                    <span className="text-caption font-medium text-foreground">{a.textHe}</span>
                    {a.whyHe ? <span className="block text-micro text-foreground-faint">{a.whyHe}</span> : null}
                  </span>
                </li>
              ))}
            </ol>
          </Section>
        ) : null}

        {active === "evidence" ? (
          <Section>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-micro text-foreground-faint">מסמכים לאיסוף — רלוונטיים לדוקטרינה</p>
              <CopyButton text={evidence.map((e) => `☐ ${e}`).join("\n")} label="העתק רשימה" />
            </div>
            <Checklist items={evidence} />
          </Section>
        ) : null}

        {active === "client" ? (
          <Section>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-micro text-foreground-faint">שאלות לראיון עם הלקוח — לפי עדיפות</p>
              <CopyButton text={clientCopy} label="העתק שאלות" />
            </div>
            {client.criticalHe.length > 0 ? (
              <div className="mb-2">
                <p className="text-micro font-semibold text-status-risk">קריטי (חוסם מסקנה)</p>
                <Checklist items={client.criticalHe} />
              </div>
            ) : null}
            {client.importantHe.length > 0 ? (
              <div className="mb-2">
                <p className="text-micro font-semibold text-status-today">חשוב</p>
                <Checklist items={client.importantHe} />
              </div>
            ) : null}
            {client.niceHe.length > 0 ? (
              <div>
                <p className="text-micro font-semibold text-foreground-faint">רצוי לדעת</p>
                <Checklist items={client.niceHe} />
              </div>
            ) : null}
          </Section>
        ) : null}

        {active === "employer" ? (
          <Section>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-micro text-foreground-faint">בקשות הבהרה מהמעסיק</p>
              <CopyButton text={employer.map((e) => `• ${e}`).join("\n")} label="העתק" />
            </div>
            <Checklist items={employer} />
          </Section>
        ) : null}

        {active === "risk" ? (
          <Section>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-md border border-line p-2.5">
                <p className="text-micro font-semibold text-status-risk">סיכון משפטי</p>
                {risk.legalHe.length ? <ul className="mt-1 space-y-0.5 text-caption text-foreground-soft">{risk.legalHe.map((x, i) => <li key={i}>{x}</li>)}</ul> : <p className="mt-1 text-caption text-foreground-faint">—</p>}
              </div>
              <div className="rounded-md border border-line p-2.5">
                <p className="text-micro font-semibold text-status-today">סיכון ראייתי</p>
                {risk.evidenceHe.length ? <ul className="mt-1 space-y-0.5 text-caption text-foreground-soft">{risk.evidenceHe.map((x, i) => <li key={i}>{x}</li>)}</ul> : <p className="mt-1 text-caption text-foreground-faint">—</p>}
              </div>
              <div className="rounded-md border border-line p-2.5">
                <p className="text-micro font-semibold text-status-waiting">סיכון מידע חסר</p>
                {risk.missingInfoHe.length ? <ul className="mt-1 space-y-0.5 text-caption text-foreground-soft">{risk.missingInfoHe.map((x, i) => <li key={i}>• {x}</li>)}</ul> : <p className="mt-1 text-caption text-foreground-faint">—</p>}
              </div>
              <div className="rounded-md border border-line bg-surface-raised/50 p-2.5">
                <p className="text-micro font-semibold text-foreground">השפעה על הביטחון</p>
                <p className="mt-1 text-caption text-foreground-soft">{risk.confidenceImpactHe}</p>
              </div>
            </div>
          </Section>
        ) : null}

        {active === "timeline" ? (
          <Section>
            <p className="mb-2 text-micro text-foreground-faint">אירועי התיק — תאריכים מדויקים ייקבעו לאחר השלמת המסמכים</p>
            <ol className="space-y-1.5">
              {timeline.map((e, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className={cx("h-2 w-2 shrink-0 rounded-pill", e.state === "known" ? "bg-status-completed" : e.state === "contested" ? "bg-status-today" : "bg-status-risk")} />
                  <span className={cx("text-caption", e.state === "unknown" ? "font-medium text-status-risk" : "text-foreground")}>
                    {e.labelHe}{e.state === "unknown" ? " — תאריך לא ידוע" : e.state === "contested" ? " — שנוי במחלוקת" : ""}
                  </span>
                </li>
              ))}
            </ol>
          </Section>
        ) : null}

        {active === "issues" ? (
          <Section>
            <p className="mb-2 text-micro text-foreground-faint">כל מה שמונע חוות דעת חד-משמעית</p>
            <ul className="space-y-1.5">
              {issues.map((x, i) => (
                <li key={i} className="flex items-start gap-2 text-caption text-foreground"><AlertGlyph size={12} className="mt-0.5 shrink-0 text-status-risk" /><span>{x}</span></li>
              ))}
            </ul>
          </Section>
        ) : null}
      </div>
    </div>
  );
}
