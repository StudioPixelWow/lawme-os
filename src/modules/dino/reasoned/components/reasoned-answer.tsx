"use client";

import type { ReactNode } from "react";
import { cx } from "@/design-system/utils/cx";
import { SparkleGlyph, ShieldGlyph } from "@/design-system/icons/glyphs";
import type {
  ReasonedDinoResponse, ReasonedStatus, CitationView, OpposingArgumentView,
} from "../types";

const STATUS_TONE: Record<ReasonedStatus, string> = {
  answered: "bg-status-completed-wash text-status-completed",
  provisional: "bg-status-today-wash text-status-today",
  needs_facts: "bg-status-scheduled-wash text-status-scheduled",
  no_verified_authority: "bg-status-risk-wash text-status-risk",
  conflicting_authority: "bg-status-urgent-wash text-status-urgent",
  insufficient_coverage: "bg-status-waiting-wash text-status-waiting",
  out_of_scope: "bg-surface-sunken text-foreground-soft",
};
const CONF_TONE: Record<string, string> = { high: "text-status-completed", moderate: "text-status-today", low: "text-status-risk", none: "text-foreground-faint" };

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-5">
      <h4 className="text-micro font-semibold tracking-wide text-foreground-faint">{title}</h4>
      <div className="mt-1.5">{children}</div>
    </section>
  );
}

function Citation({ c }: { c: CitationView }) {
  return (
    <li className="flex flex-col gap-0.5 py-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {c.url ? <a href={c.url} target="_blank" rel="noreferrer" className="text-small font-medium text-foreground underline decoration-line-strong underline-offset-2">{c.citationHe}</a> : <span className="text-small font-medium text-foreground">{c.citationHe}</span>}
        <span className={cx("rounded-xs px-1.5 py-0.5 text-micro font-medium", c.authorityLabelHe === "מחייב" ? "bg-status-completed-wash text-status-completed" : "bg-surface-sunken text-foreground-soft")}>{c.authorityLabelHe}</span>
        <span className={cx("rounded-xs px-1.5 py-0.5 text-micro font-medium", c.verification === "verified" ? "bg-status-completed-wash text-status-completed" : "bg-status-risk-wash text-status-risk")}>{c.verificationLabelHe}</span>
        {c.officialSource ? <span className="rounded-xs bg-status-progress-wash px-1.5 py-0.5 text-micro font-medium text-status-progress">מקור רשמי</span> : null}
      </div>
      <span className="text-caption text-foreground-faint">{c.pinpointStatusHe}</span>
    </li>
  );
}

function Opposing({ a }: { a: OpposingArgumentView }) {
  const tone = a.disposition === "accepted" ? "text-status-risk" : a.disposition === "unresolved" ? "text-status-today" : "text-foreground-soft";
  return (
    <li className="py-1.5">
      <div className="flex items-center gap-1.5">
        <span className="rounded-xs bg-surface-sunken px-1.5 py-0.5 text-micro font-medium text-foreground-soft">{a.categoryLabelHe}</span>
        <span className={cx("text-micro font-medium", tone)}>{a.dispositionLabelHe}</span>
      </div>
      <p className="mt-0.5 text-small text-pretty text-foreground">{a.argumentHe}</p>
      <p className="text-caption text-foreground-faint">{a.effectHe}</p>
    </li>
  );
}

export function ReasonedAnswer({ r }: { r: ReasonedDinoResponse }) {
  const am = r.applicationToMatter;
  return (
    <div className="rounded-md border-s-2 border-accent bg-gold-100/50 p-4">
      {/* 1 — bottom line (dominant) */}
      <div className="flex items-start justify-between gap-3">
        <span className={cx("rounded-pill px-2.5 py-0.5 text-micro font-semibold", STATUS_TONE[r.status])}>{r.bottomLine.statusLabelHe}</span>
        <span className={cx("text-micro font-medium", CONF_TONE[r.confidence.level])}>ביטחון: {r.confidence.labelHe}</span>
      </div>
      <p className="mt-2 text-body font-semibold text-pretty text-foreground">{r.bottomLine.statementHe}</p>

      {/* 2 — application to this Matter (the differentiator) */}
      {am.hasMatter ? (
        <Block title="יישום על התיק">
          {am.summaryHe ? <p className="text-small text-pretty text-foreground-soft">{am.summaryHe}</p> : null}
          <ul className="mt-1.5 space-y-1">
            {am.elementFindings.map((e, i) => (
              <li key={i} className="flex items-start gap-2 text-caption">
                <span className={cx("mt-0.5 rounded-xs px-1.5 py-0.5 font-medium", e.status === "satisfied" ? "bg-status-completed-wash text-status-completed" : e.status === "contested" ? "bg-status-today-wash text-status-today" : "bg-status-risk-wash text-status-risk")}>{e.statusLabelHe}</span>
                <span className="text-foreground">{e.labelHe}</span>
              </li>
            ))}
          </ul>
          {am.missing.length > 0 ? <p className="mt-1.5 text-caption text-status-risk">רכיבים חסרים: {am.missing.map((m) => m.labelHe).join("; ")}.</p> : null}
        </Block>
      ) : null}

      {/* 3 — governing law */}
      {r.governingLaw.legislation.length > 0 || r.prose.governingLawHe ? (
        <Block title="המסגרת החוקית">
          {r.prose.governingLawHe ? <p className="text-small text-pretty text-foreground-soft">{r.prose.governingLawHe}</p> : null}
          {r.governingLaw.legislation.length > 0 ? <ul className="mt-1 divide-y divide-line/70">{r.governingLaw.legislation.map((c) => <Citation key={c.recordId} c={c} />)}</ul> : null}
          {r.governingLaw.statutoryExceptionsHe.length > 0 ? <p className="mt-1 text-caption text-foreground-faint">חריגים אפשריים: {r.governingLaw.statutoryExceptionsHe.join("; ")}</p> : null}
        </Block>
      ) : null}

      {/* 4 — case law */}
      {r.caseLaw.binding.length + r.caseLaw.persuasive.length > 0 ? (
        <Block title="פסיקה">
          <p className="text-caption text-foreground-faint">{r.caseLaw.jurisprudenceHe}</p>
          <ul className="mt-1 divide-y divide-line/70">{[...r.caseLaw.binding, ...r.caseLaw.persuasive].map((c) => <Citation key={c.recordId} c={c} />)}</ul>
          {r.caseLaw.contraryHe.length > 0 ? <p className="mt-1 text-caption text-status-urgent">אסמכתאות סותרות: {r.caseLaw.contraryHe.join("; ")}</p> : null}
        </Block>
      ) : null}

      {/* 5 — strongest opposing argument */}
      {r.opposingArgument.length > 0 ? (
        <Block title="הטענה הנגדית החזקה">
          <ul className="divide-y divide-line/70">{r.opposingArgument.slice(0, 4).map((a, i) => <Opposing key={i} a={a} />)}</ul>
        </Block>
      ) : null}

      {/* 6 — risks & uncertainty + confidence explanation */}
      {r.riskAssessment.legal.length + r.riskAssessment.practical.length > 0 ? (
        <Block title="סיכונים ואי-ודאות">
          <ul className="space-y-1">
            {[...r.riskAssessment.legal, ...r.riskAssessment.practical].slice(0, 5).map((x, i) => (
              <li key={i} className="text-caption"><span className={cx("font-medium", x.severity === "critical" || x.severity === "high" ? "text-status-risk" : "text-foreground-soft")}>[{x.severityLabelHe}]</span> <span className="text-foreground-soft">{x.statementHe}</span></li>
            ))}
          </ul>
        </Block>
      ) : null}

      <Block title="רמת ביטחון וכיסוי">
        <p className="text-caption text-foreground-soft"><span className={cx("font-semibold", CONF_TONE[r.confidence.level])}>{r.confidence.labelHe}</span> · כיסוי: {r.coverage.labelHe}</p>
        <ul className="mt-1 list-disc space-y-0.5 ps-4 text-caption text-foreground-faint">{r.confidence.reasonsHe.map((x, i) => <li key={i}>{x}</li>)}</ul>
        {r.coverage.uncoveredHe.length > 0 ? <p className="mt-1 text-caption text-foreground-faint">טרם כוסה: {r.coverage.uncoveredHe.join("; ")}.</p> : null}
      </Block>

      {/* 7 — missing information (substantive questions) */}
      {r.missingFacts.length > 0 ? (
        <Block title="כדי לחזק את המענה — שאלות מהותיות">
          <ul className="list-disc space-y-0.5 ps-4 text-caption text-foreground-soft">{r.missingFacts.map((q) => <li key={q.code}>{q.questionHe}</li>)}</ul>
        </Block>
      ) : null}

      {/* 8 — sources: verified vs discovery-only */}
      {r.citations.verified.length > 0 ? (
        <Block title="מקורות מאומתים">
          <ul className="divide-y divide-line/70">{r.citations.verified.map((c) => <Citation key={c.recordId} c={c} />)}</ul>
        </Block>
      ) : null}
      {r.citations.discoveryOnly.length > 0 ? (
        <Block title="לגילוי בלבד — אינם מבססים מסקנה">
          <ul className="divide-y divide-line/70 opacity-80">{r.citations.discoveryOnly.map((c) => <Citation key={c.recordId} c={c} />)}</ul>
        </Block>
      ) : null}

      {/* research trace (collapsible) */}
      <details className="mt-5 border-t border-line pt-3">
        <summary className="cursor-pointer list-none text-micro font-semibold text-foreground-faint">כיצד דינו חקר זאת</summary>
        <div className="mt-2 space-y-1 text-caption text-foreground-faint">
          <p>תחום: {r.researchTrace.domainHe} · מושגים: {r.researchTrace.concepts.join(", ") || "—"}</p>
          <p>חיפושי חקיקה: {r.researchTrace.legislationSearches.map((s) => `${s.matchedCount} התאמות`).join(" · ") || "—"}</p>
          <p>חיפושי פסיקה: {r.researchTrace.caseLawSearches.map((s) => `${s.matchedCount} התאמות`).join(" · ") || "—"}</p>
          {r.researchTrace.filtersHe.length ? <p>מסננים: {r.researchTrace.filtersHe.join(" · ")}</p> : null}
          {r.researchTrace.conflicts.length ? <p>קונפליקטים: {r.researchTrace.conflicts.join("; ")}</p> : null}
          {r.researchTrace.recommendedFollowUpsHe.length ? <p>חיפושי המשך מומלצים: {r.researchTrace.recommendedFollowUpsHe.join("; ")}</p> : null}
        </div>
      </details>

      {/* trust + provider label */}
      <div className="mt-3 flex items-start gap-1.5 rounded-sm bg-surface-raised/70 px-2.5 py-2">
        <ShieldGlyph size={13} className="mt-0.5 shrink-0 text-gold-600" />
        <p className="text-micro text-foreground-faint">{r.trustStatementsHe.slice(0, 3).join(" ")}</p>
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-micro text-foreground-faint">
        <SparkleGlyph size={11} className="text-gold-600" /> {r.provider.labelHe} · אין להסתמך ללא בדיקת עורך דין
      </p>
    </div>
  );
}
