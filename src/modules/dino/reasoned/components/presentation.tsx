"use client";

/**
 * Shared presentation pieces for the Reasoned Dino experience.
 * Sprint 1 (clarity) + Sprint 2 (delight & trust). Presentation/interaction
 * ONLY over the existing ReasonedDinoResponse contract — no reasoning, research,
 * provider, corpus, AI, or data changes. Every piece is immediately visible.
 */
import { useState } from "react";
import type { ReactNode } from "react";
import { cx } from "@/design-system/utils/cx";
import {
  CheckGlyph, AlertGlyph, ShieldGlyph, ClockGlyph, CompareGlyph, PreviewGlyph,
} from "@/design-system/icons/glyphs";
import type { ReasonedDinoResponse, ReasonedStatus, CitationView } from "../types";

export const STATUS_TONE: Record<ReasonedStatus, string> = {
  answered: "bg-status-completed-wash text-status-completed",
  provisional: "bg-status-today-wash text-status-today",
  needs_facts: "bg-status-scheduled-wash text-status-scheduled",
  no_verified_authority: "bg-status-risk-wash text-status-risk",
  conflicting_authority: "bg-status-urgent-wash text-status-urgent",
  insufficient_coverage: "bg-status-waiting-wash text-status-waiting",
  out_of_scope: "bg-surface-sunken text-foreground-soft",
};
export const CONF_TONE: Record<string, string> = {
  high: "text-status-completed", moderate: "text-status-today", low: "text-status-risk", none: "text-foreground-faint",
};
const CONF_FILL: Record<string, string> = {
  high: "bg-status-completed", moderate: "bg-status-today", low: "bg-status-risk", none: "bg-line-strong",
};
const CONF_STEPS: Record<string, number> = { none: 0, low: 1, moderate: 2, high: 3 };
const COVERAGE_FILL: Record<string, number> = { complete: 4, substantial: 3, partial: 2, insufficient: 1 };

export function formatHeDate(iso: string): string {
  const datePart = (iso ?? "").split("T")[0] ?? "";
  const [y, m, d] = datePart.split("-");
  return y && m && d ? `${d}.${m}.${y}` : (iso ?? "—");
}

/* -------------------------------------------------- reveal (micro-animation) */

export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return <div className={cx("animate-rise", className)} style={{ animationDelay: `${delay}ms` }}>{children}</div>;
}

/* -------------------------------------------------- copy button */

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { void navigator.clipboard?.writeText(text).then(() => { setDone(true); window.setTimeout(() => setDone(false), 1400); }); }}
      className="rounded-xs border border-line px-2 py-0.5 text-micro font-medium text-foreground-soft transition-colors hover:bg-surface-sunken"
      style={{ transitionDuration: "var(--motion-quick)" }}
    >
      {done ? "הועתק ✓" : label}
    </button>
  );
}

/* -------------------------------------------------- meters */

export function ConfidenceMeter({ level }: { level: string }) {
  const filled = CONF_STEPS[level] ?? 0;
  return (
    <span className="inline-flex items-end gap-0.5" aria-hidden>
      {[1, 2, 3].map((i) => (
        <span key={i} className={cx("w-1.5 rounded-xs transition-colors", i <= filled ? CONF_FILL[level] : "bg-line", i === 1 ? "h-2" : i === 2 ? "h-3" : "h-4")} />
      ))}
    </span>
  );
}

export function CoverageMeter({ level, labelHe }: { level: string; labelHe: string }) {
  const filled = COVERAGE_FILL[level] ?? 1;
  const tone = filled >= 3 ? "bg-status-completed" : filled === 2 ? "bg-status-today" : "bg-status-risk";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex gap-0.5" aria-hidden>
        {[1, 2, 3, 4].map((i) => <span key={i} className={cx("h-1.5 w-4 rounded-xs", i <= filled ? tone : "bg-line")} />)}
      </span>
      <span className="text-micro text-foreground-faint">{labelHe}</span>
    </span>
  );
}

/* -------------------------------------------------- Sprint 2 · Trust Header */

function TrustItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="flex flex-col leading-tight">
      <span className="text-[0.62rem] tracking-wide text-foreground-faint">{label}</span>
      <span className="text-micro font-medium text-foreground">{children}</span>
    </span>
  );
}

export function TrustHeader(props: {
  verified: boolean;
  verifiedLabelHe: string;
  versionValue: string;
  verifiedAtHe: string;
  coverageLevel: string;
  coverageLabelHe: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-t-md border border-line-strong bg-gradient-to-l from-gold-100/70 to-surface px-3.5 py-2.5">
      <span className={cx(
        "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-micro font-semibold animate-rise",
        props.verified ? "bg-status-completed-wash text-status-completed" : "bg-gold-100 text-gold-800",
      )}>
        <ShieldGlyph size={12} /> {props.verifiedLabelHe}
      </span>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <TrustItem label="גרסת קורפוס">{props.versionValue}</TrustItem>
        <span className="h-6 w-px bg-line" aria-hidden />
        <TrustItem label="אומת לאחרונה"><span className="inline-flex items-center gap-1"><ClockGlyph size={10} className="text-foreground-faint" />{props.verifiedAtHe}</span></TrustItem>
        <span className="h-6 w-px bg-line" aria-hidden />
        <TrustItem label="כיסוי"><CoverageMeter level={props.coverageLevel} labelHe={props.coverageLabelHe} /></TrustItem>
      </div>
    </div>
  );
}

export function ResponseTrustHeader({ r }: { r: ReasonedDinoResponse }) {
  const verified = r.citations.verified.length > 0;
  return (
    <TrustHeader
      verified={verified}
      verifiedLabelHe={verified ? "תשובה מבוססת מקורות מאומתים" : "מבוסס מקורות · ראה הסתייגויות"}
      versionValue={r.meta.version}
      verifiedAtHe={formatHeDate(r.meta.generatedAtISO)}
      coverageLevel={r.coverage.level}
      coverageLabelHe={r.coverage.labelHe}
    />
  );
}

/* -------------------------------------------------- Sprint 2 · Premium source card */

export function PremiumSourceCard({ c }: { c: CitationView }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="overflow-hidden rounded-md border border-line-strong bg-surface shadow-hairline">
      <div className="p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-small font-semibold text-foreground">{c.citationHe}</span>
          {c.sectionHe ? <span className="rounded-xs bg-surface-sunken px-1.5 py-0.5 text-micro text-foreground-soft">{c.sectionHe}</span> : null}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className={cx("rounded-xs px-1.5 py-0.5 text-micro font-medium", c.authorityLabelHe === "מחייב" ? "bg-status-completed-wash text-status-completed" : "bg-surface-sunken text-foreground-soft")}>{c.authorityLabelHe}</span>
          <span className={cx("inline-flex items-center gap-1 rounded-xs px-1.5 py-0.5 text-micro font-medium animate-rise", c.verification === "verified" ? "bg-status-completed-wash text-status-completed" : "bg-status-risk-wash text-status-risk")}>
            {c.verification === "verified" ? <CheckGlyph size={9} /> : null}{c.verificationLabelHe}
          </span>
          {c.officialSource ? <span className="rounded-xs bg-status-progress-wash px-1.5 py-0.5 text-micro font-medium text-status-progress">מקור רשמי</span> : null}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1 rounded-xs border border-line px-2 py-0.5 text-micro font-medium text-foreground-soft transition-colors hover:bg-surface-sunken" style={{ transitionDuration: "var(--motion-quick)" }}>
            <PreviewGlyph size={10} /> {open ? "הסתר פרטים" : "פרטי מקור"}
          </button>
          <CopyButton text={`${c.citationHe}${c.sectionHe ? `, ${c.sectionHe}` : ""}`} label="העתק ציטוט" />
          {c.url ? <a href={c.url} target="_blank" rel="noreferrer" className="rounded-xs border border-line px-2 py-0.5 text-micro font-medium text-gold-700 transition-colors hover:bg-surface-sunken">פתח מקור ↗</a> : null}
        </div>
      </div>
      {open ? (
        <div className="animate-rise border-t border-line bg-surface-raised/50 p-3 text-caption text-foreground-soft">
          <p><span className="text-foreground-faint">סעיף:</span> {c.sectionHe ?? "—"}</p>
          <p className="mt-0.5"><span className="text-foreground-faint">הפניה נקודתית:</span> {c.pinpointHe ?? c.pinpointStatusHe}</p>
          <p className="mt-0.5"><span className="text-foreground-faint">מעמד:</span> {c.authorityLabelHe} · {c.verificationLabelHe}{c.usableForClaim ? "" : " · אינו מבסס מסקנה"}</p>
        </div>
      ) : null}
    </li>
  );
}

/** Back-compat alias. */
export const RichCitation = PremiumSourceCard;

export function primaryCitation(r: ReasonedDinoResponse): CitationView | null {
  return r.citations.verified[0] ?? r.governingLaw.legislation[0] ?? null;
}

/* -------------------------------------------------- matter application (P0-2) */

const GROUP = {
  established: { icon: "✓", labelHe: "עובדות מבוססות", wrap: "border-status-completed/40 bg-status-completed-wash/40", chip: "text-status-completed" },
  disputed: { icon: "⚠", labelHe: "עובדות שנויות במחלוקת", wrap: "border-status-today/40 bg-status-today-wash/40", chip: "text-status-today" },
  missing: { icon: "❓", labelHe: "עובדות חסרות", wrap: "border-status-risk/60 bg-status-risk-wash/60", chip: "text-status-risk" },
};

export function MatterApplication({ r }: { r: ReasonedDinoResponse }) {
  const am = r.applicationToMatter;
  if (!am.hasMatter) return null;
  const disputed = [...am.disputed, ...am.alleged];
  return (
    <div className="space-y-2">
      {am.summaryHe ? <p className="text-small leading-relaxed text-pretty text-foreground-soft">{am.summaryHe}</p> : null}
      {am.established.length > 0 ? (
        <div className={cx("rounded-md border-s-2 p-2.5", GROUP.established.wrap)}>
          <p className={cx("text-micro font-semibold", GROUP.established.chip)}>{GROUP.established.icon} {GROUP.established.labelHe} ({am.established.length})</p>
          <ul className="mt-1 space-y-0.5">{am.established.map((f) => <li key={f.id} className="text-caption text-foreground">{f.labelHe}</li>)}</ul>
        </div>
      ) : null}
      {disputed.length > 0 ? (
        <div className={cx("rounded-md border-s-2 p-2.5", GROUP.disputed.wrap)}>
          <p className={cx("text-micro font-semibold", GROUP.disputed.chip)}>{GROUP.disputed.icon} {GROUP.disputed.labelHe} ({disputed.length})</p>
          <ul className="mt-1 space-y-0.5">{disputed.map((f) => <li key={f.id} className="text-caption text-foreground">{f.labelHe}</li>)}</ul>
        </div>
      ) : null}
      {am.missing.length > 0 ? (
        <div className={cx("rounded-md border-s-4 p-3 shadow-hairline animate-rise", GROUP.missing.wrap)}>
          <p className={cx("flex items-center gap-1.5 text-small font-semibold", GROUP.missing.chip)}>
            <AlertGlyph size={13} /> {GROUP.missing.icon} {GROUP.missing.labelHe} ({am.missing.length})
          </p>
          <p className="mt-0.5 text-micro text-foreground-soft">המידע החסר שמונע חוות דעת חד-משמעית:</p>
          <ul className="mt-1.5 space-y-1.5">
            {am.missing.map((m, i) => (
              <li key={i}>
                <p className="text-caption font-medium text-foreground">• {m.labelHe}</p>
                {m.whyRequiredHe ? <p className="ps-3 text-micro text-foreground-faint">{m.whyRequiredHe}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function MatterStatusLine({ r }: { r: ReasonedDinoResponse }) {
  const am = r.applicationToMatter;
  if (!am.hasMatter) return null;
  const disputed = am.disputed.length + am.alleged.length;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-micro">
      <span className="text-status-completed">✓ {am.established.length} מבוססות</span>
      <span className="text-status-today">⚠ {disputed} שנויות</span>
      <span className={cx(am.missing.length > 0 ? "font-semibold text-status-risk" : "text-foreground-faint")}>❓ {am.missing.length} חסרות</span>
    </div>
  );
}

/* -------------------------------------------------- next actions */

export interface NextAction { textHe: string; whyHe: string }

export function deriveNextActions(r: ReasonedDinoResponse): NextAction[] {
  const out: NextAction[] = [];
  for (const m of r.applicationToMatter.missing) out.push({ textHe: `לברר / להשיג: ${m.labelHe}`, whyHe: m.whyRequiredHe });
  for (const q of r.missingFacts) {
    if (out.some((a) => a.textHe.includes(q.questionHe))) continue;
    out.push({ textHe: `לשאול את הלקוח: ${q.questionHe}`, whyHe: q.whyHe });
  }
  if (r.applicationToMatter.hasMatter && r.applicationToMatter.missing.length > 0) {
    out.push({ textHe: "לפנות ללקוח להשלמת העובדות החסרות לפני גיבוש חוות דעת סופית", whyHe: "" });
  }
  return out.slice(0, 6);
}

export function NextActions({ r }: { r: ReasonedDinoResponse }) {
  const actions = deriveNextActions(r);
  if (actions.length === 0) return null;
  return (
    <div className="rounded-md border border-line-strong bg-surface p-3">
      <p className="text-micro font-semibold tracking-wide text-foreground-faint">צעדים מומלצים</p>
      <ul className="mt-1.5 space-y-1.5">
        {actions.map((a, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-0.5 text-foreground-faint" aria-hidden>☐</span>
            <span>
              <span className="text-caption font-medium text-foreground">{a.textHe}</span>
              {a.whyHe ? <span className="block text-micro text-foreground-faint">{a.whyHe}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* -------------------------------------------------- confidence (Sprint 1 body) */

export function ConfidenceExplainer({ r }: { r: ReasonedDinoResponse }) {
  const c = r.confidence;
  const isHigh = c.level === "high";
  const missing = r.applicationToMatter.missing;
  return (
    <div className="rounded-md border border-line bg-surface-raised/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-small font-semibold text-foreground">{isHigh ? "רמת ביטחון גבוהה" : "מדוע הביטחון אינו גבוה יותר?"}</p>
        <span className="inline-flex items-center gap-1.5"><ConfidenceMeter level={c.level} /><span className={cx("text-micro font-medium", CONF_TONE[c.level])}>{c.labelHe}</span></span>
      </div>
      {c.reasonsHe.length > 0 ? (
        <ul className="mt-1.5 list-disc space-y-0.5 ps-4 text-caption text-foreground-soft">{c.reasonsHe.map((x, i) => <li key={i}>{x}</li>)}</ul>
      ) : null}
      {!isHigh && missing.length > 0 ? (
        <div className="mt-2 rounded-sm bg-status-risk-wash/50 p-2">
          <p className="text-micro font-semibold text-status-risk">העובדות החסרות שיעלו את הביטחון:</p>
          <ul className="mt-0.5 space-y-0.5">{missing.map((m, i) => <li key={i} className="text-micro text-foreground">• {m.labelHe}</li>)}</ul>
        </div>
      ) : null}
      {c.scaleHe ? <p className="mt-1.5 text-micro text-foreground-faint">{c.scaleHe}</p> : null}
    </div>
  );
}

/* -------------------------------------------------- Sprint 2 · Interactive confidence */

export function InteractiveConfidence({ r }: { r: ReasonedDinoResponse }) {
  const [open, setOpen] = useState(false);
  const c = r.confidence;
  return (
    <div className="group inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex cursor-help items-center gap-1.5 rounded-pill border border-line px-2 py-0.5 transition-colors hover:bg-surface-sunken"
        style={{ transitionDuration: "var(--motion-quick)" }}
      >
        <ConfidenceMeter level={c.level} />
        <span className={cx("text-micro font-medium", CONF_TONE[c.level])}>ביטחון: {c.labelHe}</span>
        <span className="text-micro text-foreground-faint">ⓘ</span>
      </button>
      <div className={cx("mt-2 w-full", open ? "block" : "hidden group-hover:block")}>
        <div className="animate-rise"><ConfidenceExplainer r={r} /></div>
      </div>
    </div>
  );
}

/* -------------------------------------------------- Sprint 2 · Research timeline */

interface TimelineStep { labelHe: string }

export function researchTimelineSteps(r: ReasonedDinoResponse): TimelineStep[] {
  const legMatches = r.researchTrace.legislationSearches.reduce((n, s) => n + s.matchedCount, 0);
  const caseMatches = r.researchTrace.caseLawSearches.reduce((n, s) => n + s.matchedCount, 0);
  const steps: TimelineStep[] = [{ labelHe: "התקבלה השאלה" }];
  if (r.researchTrace.domainHe) steps.push({ labelHe: `אותר תחום משפטי: ${r.researchTrace.domainHe}` });
  if (legMatches > 0 || r.governingLaw.legislation.length > 0) steps.push({ labelHe: `נמצאה חקיקה רלוונטית${legMatches ? ` (${legMatches} התאמות)` : ""}` });
  if (r.citations.verified.length > 0) steps.push({ labelHe: `אומתה הוראת חוק (${r.citations.verified.length})` });
  if (caseMatches > 0 || r.caseLaw.binding.length + r.caseLaw.persuasive.length > 0) steps.push({ labelHe: `נסקרה פסיקה${caseMatches ? ` (${caseMatches})` : ""}` });
  if (r.applicationToMatter.hasMatter) steps.push({ labelHe: `נותחו עובדות התיק (${r.applicationToMatter.established.length + r.applicationToMatter.disputed.length + r.applicationToMatter.alleged.length})` });
  if (r.applicationToMatter.missing.length > 0) steps.push({ labelHe: `זוהו עובדות חסרות (${r.applicationToMatter.missing.length})` });
  if (r.opposingArgument.length > 0) steps.push({ labelHe: `נבחנו טענות נגד (${r.opposingArgument.length})` });
  steps.push({ labelHe: "גובשה חוות הדעת" });
  return steps;
}

export function ResearchTimeline({ r }: { r: ReasonedDinoResponse }) {
  const steps = researchTimelineSteps(r);
  return (
    <ol className="relative space-y-2.5 ps-1">
      {steps.map((s, i) => (
        <li key={i} className="animate-rise flex items-center gap-2.5" style={{ animationDelay: `${i * 70}ms` }}>
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-pill bg-status-completed-wash text-status-completed">
            <CheckGlyph size={11} />
          </span>
          <span className="text-caption text-foreground">{s.labelHe}</span>
        </li>
      ))}
    </ol>
  );
}

/* -------------------------------------------------- Sprint 2 · Source comparison */

export function SourceComparison({ r }: { r: ReasonedDinoResponse }) {
  const all: CitationView[] = [...r.citations.verified, ...r.citations.discoveryOnly];
  const hasDisagreement = r.caseLaw.contraryHe.length > 0 || r.researchTrace.conflicts.length > 0;
  if (all.length < 2 && !hasDisagreement) return null;
  return (
    <div>
      {all.length >= 2 ? (
        <div className="grid grid-cols-2 gap-2">
          {all.slice(0, 4).map((c) => (
            <div key={c.recordId} className="rounded-md border border-line bg-surface p-2.5">
              <p className="text-caption font-semibold text-foreground">{c.citationHe}</p>
              {c.sectionHe ? <p className="text-micro text-foreground-faint">{c.sectionHe}</p> : null}
              <div className="mt-1 flex flex-wrap gap-1">
                <span className={cx("rounded-xs px-1.5 py-0.5 text-[0.62rem] font-medium", c.authorityLabelHe === "מחייב" ? "bg-status-completed-wash text-status-completed" : "bg-surface-sunken text-foreground-soft")}>{c.authorityLabelHe}</span>
                <span className={cx("rounded-xs px-1.5 py-0.5 text-[0.62rem] font-medium", c.verification === "verified" ? "bg-status-completed-wash text-status-completed" : "bg-status-risk-wash text-status-risk")}>{c.verificationLabelHe}</span>
              </div>
              <p className="mt-1 text-[0.62rem] text-foreground-faint">{c.usableForClaim ? "מבסס מסקנה" : "לגילוי בלבד"}</p>
            </div>
          ))}
        </div>
      ) : null}
      {hasDisagreement ? (
        <div className="mt-2 rounded-md border-s-2 border-status-urgent bg-status-urgent-wash/40 p-2.5">
          <p className="flex items-center gap-1.5 text-micro font-semibold text-status-urgent"><CompareGlyph size={12} /> קיימת מחלוקת בין המקורות</p>
          <ul className="mt-1 space-y-0.5 text-caption text-foreground-soft">
            {[...r.caseLaw.contraryHe, ...r.researchTrace.conflicts].map((x, i) => <li key={i}>• {x}</li>)}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------- Sprint 2 · Conversation memory */

export function ConversationMemory({ matterActive, factsCount, priorQuestions }: { matterActive: boolean; factsCount: number; priorQuestions: string[] }) {
  if (!matterActive && factsCount === 0 && priorQuestions.length === 0) return null;
  return (
    <div className="rounded-md border border-line bg-surface-raised/50 px-3 py-2">
      <p className="text-micro font-semibold tracking-wide text-foreground-faint">תשובה זו מבוססת על</p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {matterActive ? <span className="rounded-pill bg-surface-sunken px-2 py-0.5 text-micro text-foreground">התיק הנוכחי</span> : null}
        {factsCount > 0 ? <span className="rounded-pill bg-surface-sunken px-2 py-0.5 text-micro text-foreground">{factsCount} עובדות מבוססות</span> : null}
        {priorQuestions.length > 0 ? <span className="rounded-pill bg-surface-sunken px-2 py-0.5 text-micro text-foreground" title={priorQuestions.slice(-3).join(" · ")}>{priorQuestions.length} שאלות קודמות</span> : null}
      </div>
    </div>
  );
}

/* -------------------------------------------------- trust chip */

export function TrustChip({ r }: { r: ReasonedDinoResponse }) {
  const stmt = r.trustStatementsHe[0] ?? "מבוסס מקורות מאומתים.";
  return (
    <span className="inline-flex items-center gap-1 rounded-pill bg-gold-100 px-2 py-0.5 text-micro font-medium text-gold-800">
      <ShieldGlyph size={11} /> {stmt}
    </span>
  );
}
