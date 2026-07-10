"use client";

import { useState, type ReactNode } from "react";
import {
  AlertGlyph,
  BellGlyph,
  BriefcaseGlyph,
  ClockGlyph,
  DocumentGlyph,
  LedgerGlyph,
  UserGlyph,
} from "@/design-system/icons/glyphs";
import { AIMark, StatusText } from "@/design-system/primitives/indicators";
import { cx } from "@/design-system/utils/cx";
import {
  DEADLINE_RISKS,
  OFFICE_ATTENTION,
  type OfficeAttentionItem,
} from "../office";

const ICONS: Record<OfficeAttentionItem["icon"], ReactNode> = {
  matter: <BriefcaseGlyph size={15} />,
  deadline: <ClockGlyph size={15} />,
  client: <UserGlyph size={15} />,
  document: <DocumentGlyph size={15} />,
  billing: <LedgerGlyph size={15} />,
  message: <BellGlyph size={15} />,
};

const FIGURE_TEXT: Record<string, string> = {
  urgent: "text-status-urgent",
  today: "text-status-today",
  waiting: "text-status-waiting",
  progress: "text-status-progress",
  new: "text-status-new",
  scheduled: "text-foreground",
};

function scrollTo(target: string) {
  document
    .getElementById(`section-${target}`)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * The Office Attention Strip — the health of the firm in one
 * horizontal intelligence line. Operational language, not KPI cards.
 * The critical item carries the restrained champagne highlight and
 * expands the legal-risk ledger in place.
 */
export function OfficeAttentionStrip() {
  const [risksOpen, setRisksOpen] = useState(false);

  return (
    <section aria-label="תשומת הלב של המשרד">
      <div className="surface-paper flex flex-wrap items-stretch gap-y-1 rounded-xl px-2 py-1.5">
        {OFFICE_ATTENTION.map((item, i) => {
          const critical = item.severity === "critical";
          const inner = (
            <>
              <span
                className={cx(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-sm",
                  critical
                    ? "bg-gold-500/15 text-gold-700"
                    : "bg-surface-sunken text-foreground-soft",
                )}
              >
                {ICONS[item.icon]}
              </span>
              <span className="min-w-0 flex-1 text-start">
                <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
                  <span
                    className={cx(
                      "text-subheading font-bold tracking-tight tabular-nums",
                      FIGURE_TEXT[item.status] ?? "text-foreground",
                    )}
                  >
                    {item.figure}
                  </span>
                  <span
                    className={cx(
                      "text-caption leading-tight font-medium",
                      critical ? "text-foreground" : "text-foreground-soft",
                    )}
                  >
                    {item.text}
                  </span>
                </span>
                <span className="mt-0.5 block text-micro text-foreground-faint">
                  {critical
                    ? risksOpen
                      ? "סגור את פירוט הסיכונים"
                      : `אחראית: ${item.owner} · פתח פירוט`
                    : item.owner
                      ? `אחראי: ${item.owner}`
                      : "עבור למקטע ←"}
                </span>
              </span>
            </>
          );
          return (
            <div
              key={item.id}
              className="flex min-w-0 flex-1 basis-44 items-stretch"
            >
              {i > 0 ? (
                <span
                  aria-hidden
                  className="my-2 hidden w-px shrink-0 self-stretch bg-line/70 sm:block"
                />
              ) : null}
              <button
                type="button"
                onClick={() =>
                  critical ? setRisksOpen((v) => !v) : scrollTo(item.target)
                }
                aria-expanded={critical ? risksOpen : undefined}
                className={cx(
                  "living-edge flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-3 py-2.5 transition-colors",
                  critical
                    ? "bg-gold-100/50 shadow-gold-glow"
                    : "hover:bg-surface-sunken/50",
                )}
                data-live={critical || undefined}
                style={{ transitionDuration: "var(--motion-quick)" }}
              >
                {inner}
              </button>
            </div>
          );
        })}
      </div>

      {/* ── the legal-risk ledger — expands from the critical item ── */}
      {risksOpen ? (
        <div
          id="section-risks"
          className="animate-rise mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2"
        >
          {DEADLINE_RISKS.map((risk) => (
            <article
              key={risk.id}
              className="surface-paper-raised relative rounded-lg p-5"
            >
              <span
                aria-hidden
                className={cx(
                  "absolute inset-y-4 start-0 w-0.5 rounded-pill",
                  risk.status === "urgent"
                    ? "bg-status-urgent"
                    : "bg-status-today",
                )}
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2">
                  <AlertGlyph
                    size={15}
                    className={
                      risk.status === "urgent"
                        ? "text-status-urgent"
                        : "text-status-today"
                    }
                  />
                  <StatusText status={risk.status} className="text-caption">
                    {risk.kindLabel}
                  </StatusText>
                </p>
                <p className="text-caption font-semibold tabular-nums text-foreground">
                  {risk.deadline}
                  <span
                    className={cx(
                      "ms-2 font-bold",
                      risk.status === "urgent"
                        ? "text-status-urgent"
                        : "text-status-today",
                    )}
                  >
                    נותרו {risk.timeLeft}
                  </span>
                </p>
              </div>
              <h3 className="mt-2 text-subheading font-semibold tracking-tight text-foreground">
                {risk.matter}
              </h3>
              <p className="mt-1.5 max-w-2xl text-small leading-relaxed text-foreground-soft">
                {risk.why}
              </p>
              <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-caption text-foreground-soft">
                  <span className="flex h-6 w-6 items-center justify-center rounded-pill bg-ink-900 text-micro text-paper-0">
                    {risk.owner.slice(0, 1)}
                  </span>
                  {risk.owner}
                  {risk.id === "risk-2" ? <AIMark className="ms-1" /> : null}
                </span>
                <button
                  type="button"
                  className="inline-flex h-9 items-center rounded-md bg-ink-900 px-4 text-caption font-semibold text-paper-0 shadow-raised transition-all hover:-translate-y-px hover:bg-ink-800 hover:shadow-lift"
                  style={{ transitionDuration: "var(--motion-quick)" }}
                >
                  {risk.action}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
