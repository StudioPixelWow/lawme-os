"use client";

/**
 * Full Research Mode — the deep legal workspace, set as an editorial legal
 * memorandum (Premium sprint). Presentation only over ReasonedDinoResponse:
 * one entrance, quiet section eyebrows, generous reading rhythm, controlled
 * measure, a single trust header, typography-first source rows. No functional,
 * reasoning, data, or contract change.
 */
import type { ReactNode } from "react";
import { cx } from "@/design-system/utils/cx";
import { SparkleGlyph } from "@/design-system/icons/glyphs";
import type { ReasonedDinoResponse, OpposingArgumentView } from "../types";
import {
  STATUS_TONE, ResponseTrustHeader, InteractiveConfidence, CoverageMeter,
  PremiumSourceCard, MatterApplication, NextActions, ConfidenceExplainer,
  ResearchTimeline, SourceComparison,
} from "./presentation";
import { LegalWorkspace } from "./legal-workspace";

/** Quiet editorial section: a letterspaced eyebrow with air above, close below. */
function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h4 className="text-micro uppercase tracking-widest text-foreground-faint">{title}</h4>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

function Opposing({ a }: { a: OpposingArgumentView }) {
  const tone = a.disposition === "accepted" ? "text-status-risk" : a.disposition === "unresolved" ? "text-status-today" : "text-foreground-soft";
  return (
    <li className="py-2.5">
      <div className="flex items-center gap-2">
        <span className="text-caption font-medium text-foreground-soft">{a.categoryLabelHe}</span>
        <span className={cx("text-micro font-medium", tone)}>{a.dispositionLabelHe}</span>
      </div>
      <p className="mt-1 max-w-[64ch] text-small leading-relaxed text-pretty text-foreground">{a.argumentHe}</p>
      <p className="mt-0.5 text-caption leading-relaxed text-foreground-faint">{a.effectHe}</p>
    </li>
  );
}

export function ReasonedAnswer({ r }: { r: ReasonedDinoResponse }) {
  return (
    <div className="animate-rise">
      <ResponseTrustHeader r={r} />
      <div className="rounded-b-lg border-x border-b border-line-strong bg-surface px-6 py-6 md:px-8 md:py-7">
        {/* opening */}
        <span className={cx("inline-block rounded-pill px-2.5 py-0.5 text-micro font-semibold", STATUS_TONE[r.status])}>{r.bottomLine.statusLabelHe}</span>
        <p className="mt-3.5 max-w-[52ch] font-display text-title font-semibold leading-snug text-pretty text-foreground">{r.bottomLine.statementHe}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5">
          <InteractiveConfidence r={r} />
          <span className="inline-flex items-center gap-1.5 text-micro text-foreground-faint">כיסוי: <CoverageMeter level={r.coverage.level} labelHe={r.coverage.labelHe} /></span>
        </div>

        {r.applicationToMatter.hasMatter ? <Block title="יישום על התיק"><MatterApplication r={r} /></Block> : null}
        {r.applicationToMatter.hasMatter ? <Block title="מה הלאה"><NextActions r={r} /></Block> : null}

        {r.governingLaw.legislation.length > 0 || r.prose.governingLawHe ? (
          <Block title="המסגרת החוקית">
            {r.prose.governingLawHe ? <p className="max-w-[64ch] text-small leading-relaxed text-pretty text-foreground-soft">{r.prose.governingLawHe}</p> : null}
            {r.governingLaw.legislation.length > 0 ? <ul className="mt-3 space-y-2">{r.governingLaw.legislation.map((c) => <PremiumSourceCard key={c.recordId} c={c} />)}</ul> : null}
            {r.governingLaw.statutoryExceptionsHe.length > 0 ? <p className="mt-2 text-caption text-foreground-faint">חריגים אפשריים: {r.governingLaw.statutoryExceptionsHe.join("; ")}</p> : null}
          </Block>
        ) : null}

        {r.caseLaw.binding.length + r.caseLaw.persuasive.length > 0 ? (
          <Block title="פסיקה">
            <p className="max-w-[64ch] text-caption leading-relaxed text-foreground-faint">{r.caseLaw.jurisprudenceHe}</p>
            <ul className="mt-3 space-y-2">{[...r.caseLaw.binding, ...r.caseLaw.persuasive].map((c) => <PremiumSourceCard key={c.recordId} c={c} />)}</ul>
          </Block>
        ) : null}

        {[...r.citations.verified, ...r.citations.discoveryOnly].length >= 2 || r.caseLaw.contraryHe.length > 0 || r.researchTrace.conflicts.length > 0 ? (
          <Block title="השוואת מקורות"><SourceComparison r={r} /></Block>
        ) : null}

        {r.opposingArgument.length > 0 ? (
          <Block title="הטענה הנגדית החזקה"><ul className="divide-y divide-line/50">{r.opposingArgument.slice(0, 4).map((a, i) => <Opposing key={i} a={a} />)}</ul></Block>
        ) : null}

        {r.riskAssessment.legal.length + r.riskAssessment.practical.length > 0 ? (
          <Block title="סיכונים ואי-ודאות">
            <ul className="space-y-2">
              {[...r.riskAssessment.legal, ...r.riskAssessment.practical].slice(0, 5).map((x, i) => (
                <li key={i} className="max-w-[64ch] text-caption leading-relaxed"><span className={cx("font-medium", x.severity === "critical" || x.severity === "high" ? "text-status-risk" : "text-foreground-soft")}>{x.severityLabelHe}</span> <span className="text-foreground-soft">— {x.statementHe}</span></li>
              ))}
            </ul>
          </Block>
        ) : null}

        <Block title="רמת ביטחון וכיסוי">
          <ConfidenceExplainer r={r} />
          {r.coverage.uncoveredHe.length > 0 ? <p className="mt-2 text-caption text-foreground-faint">טרם כוסה: {r.coverage.uncoveredHe.join("; ")}.</p> : null}
        </Block>

        {r.citations.verified.length > 0 ? (
          <Block title="מקורות מאומתים"><ul className="space-y-2">{r.citations.verified.map((c) => <PremiumSourceCard key={c.recordId} c={c} />)}</ul></Block>
        ) : null}
        {r.citations.discoveryOnly.length > 0 ? (
          <Block title="לגילוי בלבד — אינם מבססים מסקנה"><ul className="space-y-2 opacity-75">{r.citations.discoveryOnly.map((c) => <PremiumSourceCard key={c.recordId} c={c} />)}</ul></Block>
        ) : null}

        <Block title="כיצד דינו חקר זאת">
          <ResearchTimeline r={r} />
          {r.researchTrace.recommendedFollowUpsHe.length ? <p className="mt-3 text-micro text-foreground-faint">חיפושי המשך מומלצים: {r.researchTrace.recommendedFollowUpsHe.join("; ")}</p> : null}
        </Block>

        {/* Workbench — the answer becomes the beginning of legal work */}
        <LegalWorkspace r={r} />

        <p className="mt-6 flex items-center gap-1.5 border-t border-line/60 pt-4 text-micro text-foreground-faint">
          <SparkleGlyph size={11} className="text-gold-600" /> {r.provider.labelHe} · אין להסתמך ללא בדיקת עורך דין
        </p>
      </div>
    </div>
  );
}
