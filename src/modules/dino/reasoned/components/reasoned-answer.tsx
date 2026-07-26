"use client";

/**
 * Full Research Mode — the deep legal workspace (Sprint 1).
 * The COMPACT panel answer lives in compact-answer.tsx; this view is the
 * substantially deeper companion: full reasoning, all citations with copy,
 * source pinpoint honesty, counter-arguments, the confidence explainer, and the
 * research trace. Presentation only over ReasonedDinoResponse.
 */
import type { ReactNode } from "react";
import { cx } from "@/design-system/utils/cx";
import { SparkleGlyph } from "@/design-system/icons/glyphs";
import type { ReasonedDinoResponse, OpposingArgumentView } from "../types";
import {
  STATUS_TONE, CONF_TONE, ConfidenceMeter, CoverageMeter, RichCitation,
  MatterApplication, NextActions, ConfidenceExplainer, TrustChip,
} from "./presentation";

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-5">
      <h4 className="text-micro font-semibold tracking-wide text-foreground-faint">{title}</h4>
      <div className="mt-1.5">{children}</div>
    </section>
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
  return (
    <div className="rounded-md border-s-2 border-accent bg-gold-100/40 p-4">
      {/* self-contained header */}
      <div className="flex items-center justify-between gap-2">
        <span className={cx("rounded-pill px-2.5 py-0.5 text-micro font-semibold", STATUS_TONE[r.status])}>{r.bottomLine.statusLabelHe}</span>
        <TrustChip r={r} />
      </div>
      <p className="mt-2 text-body font-semibold text-pretty text-foreground">{r.bottomLine.statementHe}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="inline-flex items-center gap-1.5"><ConfidenceMeter level={r.confidence.level} /><span className={cx("text-micro font-medium", CONF_TONE[r.confidence.level])}>ביטחון: {r.confidence.labelHe}</span></span>
        <span className="inline-flex items-center gap-1.5 text-micro text-foreground-faint">כיסוי: <CoverageMeter level={r.coverage.level} labelHe={r.coverage.labelHe} /></span>
      </div>

      {/* matter application — established / disputed / MISSING (focus) */}
      {r.applicationToMatter.hasMatter ? (
        <Block title="יישום על התיק"><MatterApplication r={r} /></Block>
      ) : null}

      {/* recommended next steps */}
      {r.applicationToMatter.hasMatter ? (
        <Block title="מה הלאה"><NextActions r={r} /></Block>
      ) : null}

      {/* governing law */}
      {r.governingLaw.legislation.length > 0 || r.prose.governingLawHe ? (
        <Block title="המסגרת החוקית">
          {r.prose.governingLawHe ? <p className="text-small text-pretty text-foreground-soft">{r.prose.governingLawHe}</p> : null}
          {r.governingLaw.legislation.length > 0 ? <ul className="mt-1.5 space-y-1.5">{r.governingLaw.legislation.map((c) => <RichCitation key={c.recordId} c={c} />)}</ul> : null}
          {r.governingLaw.statutoryExceptionsHe.length > 0 ? <p className="mt-1 text-caption text-foreground-faint">חריגים אפשריים: {r.governingLaw.statutoryExceptionsHe.join("; ")}</p> : null}
        </Block>
      ) : null}

      {/* case law */}
      {r.caseLaw.binding.length + r.caseLaw.persuasive.length > 0 ? (
        <Block title="פסיקה">
          <p className="text-caption text-foreground-faint">{r.caseLaw.jurisprudenceHe}</p>
          <ul className="mt-1.5 space-y-1.5">{[...r.caseLaw.binding, ...r.caseLaw.persuasive].map((c) => <RichCitation key={c.recordId} c={c} />)}</ul>
          {r.caseLaw.contraryHe.length > 0 ? <p className="mt-1 text-caption text-status-urgent">אסמכתאות סותרות: {r.caseLaw.contraryHe.join("; ")}</p> : null}
        </Block>
      ) : null}

      {/* strongest opposing argument */}
      {r.opposingArgument.length > 0 ? (
        <Block title="הטענה הנגדית החזקה">
          <ul className="divide-y divide-line/70">{r.opposingArgument.slice(0, 4).map((a, i) => <Opposing key={i} a={a} />)}</ul>
        </Block>
      ) : null}

      {/* risks & uncertainty */}
      {r.riskAssessment.legal.length + r.riskAssessment.practical.length > 0 ? (
        <Block title="סיכונים ואי-ודאות">
          <ul className="space-y-1">
            {[...r.riskAssessment.legal, ...r.riskAssessment.practical].slice(0, 5).map((x, i) => (
              <li key={i} className="text-caption"><span className={cx("font-medium", x.severity === "critical" || x.severity === "high" ? "text-status-risk" : "text-foreground-soft")}>[{x.severityLabelHe}]</span> <span className="text-foreground-soft">{x.statementHe}</span></li>
            ))}
          </ul>
        </Block>
      ) : null}

      {/* confidence explainer + coverage detail */}
      <Block title="רמת ביטחון וכיסוי">
        <ConfidenceExplainer r={r} />
        {r.coverage.uncoveredHe.length > 0 ? <p className="mt-2 text-caption text-foreground-faint">טרם כוסה: {r.coverage.uncoveredHe.join("; ")}.</p> : null}
      </Block>

      {/* sources: verified vs discovery-only */}
      {r.citations.verified.length > 0 ? (
        <Block title="מקורות מאומתים"><ul className="space-y-1.5">{r.citations.verified.map((c) => <RichCitation key={c.recordId} c={c} />)}</ul></Block>
      ) : null}
      {r.citations.discoveryOnly.length > 0 ? (
        <Block title="לגילוי בלבד — אינם מבססים מסקנה"><ul className="space-y-1.5 opacity-80">{r.citations.discoveryOnly.map((c) => <RichCitation key={c.recordId} c={c} />)}</ul></Block>
      ) : null}

      {/* research trace */}
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

      <p className="mt-3 flex items-center gap-1.5 text-micro text-foreground-faint">
        <SparkleGlyph size={11} className="text-gold-600" /> {r.provider.labelHe} · אין להסתמך ללא בדיקת עורך דין
      </p>
    </div>
  );
}
