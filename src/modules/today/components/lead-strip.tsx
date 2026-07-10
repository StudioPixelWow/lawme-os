import { TrendGlyph } from "@/design-system/icons/glyphs";
import { StatusText } from "@/design-system/primitives/indicators";
import { cx } from "@/design-system/utils/cx";
import { LEAD_ITEMS, LEADS_SUMMARY } from "../office";
import { SectionHeading } from "./section-heading";

/**
 * לקוחות חדשים — a compact opportunity pipeline. One line of truth,
 * the hot lead surfaced, the rest folded behind one disclosure.
 * Secondary by design: office management sees it, legal work owns
 * the page.
 */
export function LeadStrip() {
  const hot = LEAD_ITEMS[0];
  const rest = LEAD_ITEMS.slice(1);

  return (
    <section id="section-leads" aria-label="לקוחות חדשים">
      <SectionHeading
        title="לקוחות חדשים"
        caption={`${LEADS_SUMMARY.newLeads} לידים חדשים · ${LEADS_SUMMARY.unanswered} לא נענו · ${LEADS_SUMMARY.consultationsToday} פגישות ייעוץ היום`}
      />

      {/* the one lead that cannot wait */}
      <article
        className="living-edge surface-paper-raised relative mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl bg-gold-100/40 px-5 py-4"
        data-live="true"
      >
        <span
          aria-hidden
          className="absolute inset-y-3.5 start-0 w-0.5 rounded-pill bg-gold-500/80"
        />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <span className="text-small font-semibold text-foreground">
              {hot.name}
            </span>
            <span className="text-caption text-foreground-soft">{hot.topic}</span>
          </p>
          <p className="mt-0.5 text-micro text-foreground-faint">
            {hot.source} ·{" "}
            <span className="font-semibold text-status-urgent">
              {hot.sinceLastResponse}
            </span>
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-subheading font-bold tracking-tight tabular-nums text-foreground">
          <TrendGlyph size={15} className="text-foreground-faint" />
          {hot.value}
        </span>
        <button
          type="button"
          className="inline-flex h-9 shrink-0 items-center rounded-md bg-ink-900 px-4 text-caption font-semibold text-paper-0 shadow-raised transition-all hover:-translate-y-px hover:bg-ink-800 hover:shadow-lift"
          style={{ transitionDuration: "var(--motion-quick)" }}
        >
          {hot.action}
        </button>
      </article>

      {/* the rest of the pipeline — folded */}
      <details className="group/leads mt-3">
        <summary
          className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-xs text-caption font-medium text-foreground-faint transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden"
          style={{ transitionDuration: "var(--motion-quick)" }}
        >
          עוד {rest.length} בצנרת
          <span
            aria-hidden
            className="transition-transform group-open/leads:rotate-90"
          >
            ‹
          </span>
        </summary>
        <ul className="animate-rise mt-3 flex flex-col gap-2">
          {rest.map((lead) => (
            <li
              key={lead.id}
              className="living-edge surface-paper flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-lg px-4 py-3"
            >
              <span className="min-w-0 flex-1">
                <span className="text-caption font-semibold text-foreground">
                  {lead.name}
                </span>
                <span className="ms-2 text-caption text-foreground-soft">
                  {lead.topic}
                </span>
                <span className="ms-2 text-micro text-foreground-faint">
                  {lead.source} · {lead.sinceLastResponse}
                </span>
              </span>
              {lead.value ? (
                <span className="text-caption font-semibold tabular-nums text-foreground">
                  {lead.value}
                </span>
              ) : null}
              <StatusText status={lead.status} className="text-micro">
                {lead.statusLabel}
              </StatusText>
              <button
                type="button"
                className={cx(
                  "rounded-xs text-caption font-medium text-foreground-soft transition-colors hover:text-foreground",
                )}
                style={{ transitionDuration: "var(--motion-quick)" }}
              >
                {lead.action} ←
              </button>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
