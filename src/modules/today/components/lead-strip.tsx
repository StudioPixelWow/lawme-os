import { TrendGlyph } from "@/design-system/icons/glyphs";
import { StatusText } from "@/design-system/primitives/indicators";
import { cx } from "@/design-system/utils/cx";
import { LEAD_ITEMS, LEADS_SUMMARY } from "../office";
import { SectionHeading } from "./section-heading";

/**
 * לקוחות חדשים — a compact opportunity pipeline, secondary to legal
 * work but visible to office management. One line of pipeline truth,
 * three meaningful opportunities, one action each.
 */
export function LeadStrip() {
  return (
    <section id="section-leads" aria-label="לקוחות חדשים">
      <SectionHeading
        title="לקוחות חדשים"
        caption={`${LEADS_SUMMARY.newLeads} לידים חדשים · ${LEADS_SUMMARY.unanswered} לא נענו · ${LEADS_SUMMARY.consultationsToday} פגישות ייעוץ היום`}
      />

      <ul className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-3">
        {LEAD_ITEMS.map((lead) => {
          const hot = lead.status === "urgent";
          return (
            <li key={lead.id}>
              <article
                className={cx(
                  "living-edge relative h-full rounded-xl p-5",
                  hot ? "surface-paper-raised bg-gold-100/40" : "surface-paper",
                )}
                data-live={hot || undefined}
              >
                {hot ? (
                  <span
                    aria-hidden
                    className="absolute inset-y-4 start-0 w-0.5 rounded-pill bg-gold-500/80"
                  />
                ) : null}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-small font-semibold text-foreground">
                      {lead.name}
                    </h3>
                    <p className="mt-0.5 truncate text-caption text-foreground-soft">
                      {lead.topic}
                    </p>
                  </div>
                  <StatusText status={lead.status} className="shrink-0 text-micro">
                    {lead.statusLabel}
                  </StatusText>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-micro text-foreground-faint">
                  <span>{lead.source}</span>
                  <span
                    className={cx(
                      hot && "font-semibold text-status-urgent",
                    )}
                  >
                    {lead.sinceLastResponse}
                  </span>
                </div>
                <div className="mt-3.5 flex items-center justify-between gap-3 border-t border-line/60 pt-3">
                  {lead.value ? (
                    <span className="flex items-center gap-1.5 text-small font-bold tracking-tight tabular-nums text-foreground">
                      <TrendGlyph size={13} className="text-foreground-faint" />
                      {lead.value}
                    </span>
                  ) : (
                    <span className="text-micro text-foreground-faint">—</span>
                  )}
                  <button
                    type="button"
                    className={cx(
                      "rounded-xs text-caption font-semibold transition-colors",
                      hot
                        ? "text-gold-700 hover:text-gold-600"
                        : "text-foreground-soft hover:text-foreground",
                    )}
                    style={{ transitionDuration: "var(--motion-quick)" }}
                  >
                    {lead.action} ←
                  </button>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
