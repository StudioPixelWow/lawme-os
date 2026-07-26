"use client";

/**
 * Sprint 1 — shared presentation pieces for the Reasoned Dino experience.
 * Presentation/interaction ONLY over the existing ReasonedDinoResponse contract
 * — no reasoning, research, provider, corpus, or data changes. Reused by the
 * compact answer and the full research workspace so nothing feels duplicated.
 */
import { useState } from "react";
import { cx } from "@/design-system/utils/cx";
import { CheckGlyph, AlertGlyph, ShieldGlyph } from "@/design-system/icons/glyphs";
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

/* -------------------------------------------------- copy button */

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { void navigator.clipboard?.writeText(text).then(() => { setDone(true); window.setTimeout(() => setDone(false), 1400); }); }}
      className="rounded-xs border border-line px-2 py-0.5 text-micro font-medium text-foreground-soft transition-colors hover:bg-surface-sunken"
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
        <span key={i} className={cx("w-1.5 rounded-xs", i <= filled ? CONF_FILL[level] : "bg-line", i === 1 ? "h-2" : i === 2 ? "h-3" : "h-4")} />
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

/* -------------------------------------------------- citations */

export function RichCitation({ c }: { c: CitationView }) {
  return (
    <li className="rounded-md border border-line-strong bg-surface p-3 shadow-hairline">
      <div className="flex flex-wrap items-center gap-1.5">
        {c.url
          ? <a href={c.url} target="_blank" rel="noreferrer" className="text-small font-semibold text-foreground underline decoration-line-strong underline-offset-2">{c.citationHe}</a>
          : <span className="text-small font-semibold text-foreground">{c.citationHe}</span>}
        <span className={cx("rounded-xs px-1.5 py-0.5 text-micro font-medium", c.authorityLabelHe === "מחייב" ? "bg-status-completed-wash text-status-completed" : "bg-surface-sunken text-foreground-soft")}>{c.authorityLabelHe}</span>
        <span className={cx("inline-flex items-center gap-1 rounded-xs px-1.5 py-0.5 text-micro font-medium", c.verification === "verified" ? "bg-status-completed-wash text-status-completed" : "bg-status-risk-wash text-status-risk")}>
          {c.verification === "verified" ? <CheckGlyph size={9} /> : null}{c.verificationLabelHe}
        </span>
        {c.officialSource ? <span className="rounded-xs bg-status-progress-wash px-1.5 py-0.5 text-micro font-medium text-status-progress">מקור רשמי</span> : null}
      </div>
      <p className="mt-1 text-micro text-foreground-faint">{c.pinpointStatusHe}</p>
      <div className="mt-1.5"><CopyButton text={c.citationHe} label="העתק ציטוט" /></div>
    </li>
  );
}

/** One primary citation for the compact view — the strongest verified source. */
export function primaryCitation(r: ReasonedDinoResponse): CitationView | null {
  return r.citations.verified[0] ?? r.governingLaw.legislation[0] ?? null;
}

/* -------------------------------------------------- matter application (P0-2) */

const GROUP = {
  established: { icon: "✓", labelHe: "עובדות מבוססות", wrap: "border-status-completed/40 bg-status-completed-wash/40", chip: "text-status-completed" },
  disputed: { icon: "⚠", labelHe: "עובדות שנויות במחלוקת", wrap: "border-status-today/40 bg-status-today-wash/40", chip: "text-status-today" },
  missing: { icon: "❓", labelHe: "עובדות חסרות", wrap: "border-status-risk/60 bg-status-risk-wash/60", chip: "text-status-risk" },
};

export function MatterApplication({ r, focusMissing = true }: { r: ReasonedDinoResponse; focusMissing?: boolean }) {
  const am = r.applicationToMatter;
  if (!am.hasMatter) return null;
  const disputed = [...am.disputed, ...am.alleged];
  return (
    <div className="space-y-2">
      {am.summaryHe ? <p className="text-small text-pretty text-foreground-soft">{am.summaryHe}</p> : null}

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

      {/* Missing — the visual focus: what's blocking a stronger opinion */}
      {am.missing.length > 0 ? (
        <div className={cx("rounded-md border-s-4 p-3", GROUP.missing.wrap, focusMissing && "shadow-hairline")}>
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

/** Compact matter status line for the compact view. */
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
  for (const m of r.applicationToMatter.missing) {
    out.push({ textHe: `לברר / להשיג: ${m.labelHe}`, whyHe: m.whyRequiredHe });
  }
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

/* -------------------------------------------------- confidence explainer (P0) */

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
          <p className="text-micro font-semibold text-status-risk">העובדות החסרות שמונעות ביטחון גבוה:</p>
          <ul className="mt-0.5 space-y-0.5">{missing.map((m, i) => <li key={i} className="text-micro text-foreground">• {m.labelHe}</li>)}</ul>
        </div>
      ) : null}
      {c.scaleHe ? <p className="mt-1.5 text-micro text-foreground-faint">{c.scaleHe}</p> : null}
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
