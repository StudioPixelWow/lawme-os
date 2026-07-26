"use client";

import { useState } from "react";
import { cx } from "@/design-system/utils/cx";
import { LegislationGlyph, ShieldGlyph, CheckGlyph } from "@/design-system/icons/glyphs";
import type { VerifiedLegislationAnswer, LegislationAnswerStatus } from "../answer";
import type { CitationView } from "../citation-format";

const STATUS_TONE: Record<LegislationAnswerStatus, string> = {
  answered: "bg-status-completed-wash text-status-completed",
  needs_facts: "bg-status-scheduled-wash text-status-scheduled",
  no_verified_authority: "bg-status-risk-wash text-status-risk",
  insufficient_coverage: "bg-status-waiting-wash text-status-waiting",
  out_of_scope: "bg-surface-sunken text-foreground-soft",
};
const STATUS_LABEL: Record<LegislationAnswerStatus, string> = {
  answered: "נענתה",
  needs_facts: "דרושות עובדות",
  no_verified_authority: "אין אסמכתה מאומתת",
  insufficient_coverage: "כיסוי חלקי",
  out_of_scope: "מחוץ לתחום",
};
const COVERAGE_LABEL: Record<string, string> = { substantial: "מהותי", partial: "חלקי", insufficient: "לא מספק" };

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { void navigator.clipboard?.writeText(text).then(() => { setDone(true); window.setTimeout(() => setDone(false), 1500); }); }}
      className="rounded-xs border border-line px-2 py-0.5 text-micro font-medium text-foreground-soft hover:bg-surface-sunken"
    >
      {done ? "הועתק ✓" : label}
    </button>
  );
}

function CitationCard({ c }: { c: CitationView }) {
  return (
    <li className="rounded-md border border-line-strong bg-surface p-4 shadow-hairline">
      <div className="flex flex-wrap items-center gap-1.5">
        <LegislationGlyph size={14} className="text-gold-600" />
        {c.link ? (
          <a href={c.link} target="_blank" rel="noreferrer" className="text-small font-semibold text-foreground underline decoration-line-strong underline-offset-2">{c.displayFormHe}</a>
        ) : (
          <span className="text-small font-semibold text-foreground">{c.displayFormHe}</span>
        )}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-xs bg-status-completed-wash px-1.5 py-0.5 text-micro font-medium text-status-completed"><CheckGlyph size={10} />{c.verifiedBadgeHe}</span>
        <span className="rounded-xs bg-surface-sunken px-1.5 py-0.5 text-micro font-medium text-foreground-soft">מחייב</span>
        {c.officialSourceLabelHe ? <span className="rounded-xs bg-status-progress-wash px-1.5 py-0.5 text-micro font-medium text-status-progress">{c.officialSourceLabelHe}</span> : null}
        {c.effectiveDateHe ? <span className="text-micro text-foreground-faint">נוסח תקף: {c.effectiveDateHe}</span> : null}
      </div>
      {c.excerptHe ? (
        <p className="mt-2 border-s-2 border-gold-200 bg-gold-50 px-3 py-2 text-caption leading-relaxed text-foreground">
          “{c.excerptHe}{c.excerptTruncated ? "…" : ""}”
        </p>
      ) : null}
      {c.pinpointStatementHe ? <p className="mt-1.5 text-micro text-foreground-faint">{c.pinpointStatementHe}</p> : null}
      <div className="mt-2 flex flex-wrap gap-1.5">
        <CopyButton text={c.copyableForm} label="העתק ציטוט" />
        {c.link ? <CopyButton text={c.link} label="העתק קישור" /> : null}
      </div>
    </li>
  );
}

export function LegislationAnswer({ a }: { a: VerifiedLegislationAnswer }) {
  return (
    <div className="rounded-xl border border-line-strong bg-surface p-5 shadow-lift" dir="rtl">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cx("rounded-pill px-2 py-0.5 text-micro font-semibold", STATUS_TONE[a.status])}>{STATUS_LABEL[a.status]}</span>
        {a.badgeTextHe ? (
          <span className="inline-flex items-center gap-1 rounded-pill bg-gold-100 px-2 py-0.5 text-micro font-semibold text-gold-800"><ShieldGlyph size={11} />{a.badgeTextHe}</span>
        ) : null}
      </div>

      <p className="mt-3 text-body font-medium leading-relaxed text-foreground">{a.bottomLineHe}</p>

      {a.citations.length > 0 ? (
        <section className="mt-4">
          <h4 className="text-micro font-semibold tracking-wide text-foreground-faint">מקורות מאומתים</h4>
          <ul className="mt-2 space-y-2">{a.citations.map((c) => <CitationCard key={c.citationId} c={c} />)}</ul>
        </section>
      ) : null}

      {a.coverage ? (
        <section className="mt-4">
          <h4 className="text-micro font-semibold tracking-wide text-foreground-faint">כיסוי</h4>
          <p className="mt-1 text-caption text-foreground-soft">
            רמת כיסוי: <span className="font-medium text-foreground">{COVERAGE_LABEL[a.coverage.coverageLevel]}</span>
            {a.coverage.gaps.length > 0 ? <span className="text-foreground-faint"> · חסר: {a.coverage.gaps.length} הוראות נדרשות</span> : null}
          </p>
          <p className="mt-0.5 text-micro text-foreground-faint">{a.coverage.permittedClaimHe}</p>
        </section>
      ) : null}

      {a.wordExportBlock ? (
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-3">
          <CopyButton text={a.wordExportBlock} label="ייצוא לוורד (בלוק ציטוט)" />
          <span className="text-micro text-foreground-faint">גרסת קורפוס: {a.corpusVersion}</span>
        </div>
      ) : null}

      {/* currentness — never imply the numbers are guaranteed current */}
      {a.citations.length > 0 ? (
        <p className="mt-2 text-micro leading-relaxed text-foreground-faint">
          הנתונים נכונים למועד האימות המצוין; אין ערובה לעדכניות מאוחרת יותר. יש לוודא מול הפרסום הרשמי (רשומות) לפני הסתמכות.
        </p>
      ) : null}
    </div>
  );
}
