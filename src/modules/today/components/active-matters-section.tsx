import { ACTIVE_MATTERS } from "../data";
import { SectionHeading, ToneChip } from "./section-heading";

/**
 * תיקים פעילים — an editorial index: name, client, stage,
 * next event. Rows, hairlines, no card grid.
 */
export function ActiveMattersSection() {
  return (
    <section aria-label="תיקים פעילים" className="flex h-full flex-col">
      <SectionHeading
        title="תיקים פעילים"
        caption="5 תיקים · ממוינים לפי דחיפות"
        href="/matters"
        linkLabel="כל התיקים"
      />
      <ul className="mt-5 flex-1 rounded-xl bg-surface-raised shadow-hairline">
        {ACTIVE_MATTERS.map((matter, index) => (
          <li
            key={matter.id}
            className={`group relative px-5 py-3.5 transition-colors hover:bg-surface-sunken/50 ${
              index > 0 ? "border-t border-line/60" : ""
            }`}
            style={{ transitionDuration: "var(--motion-quick)" }}
          >
            <span
              aria-hidden
              className={`absolute inset-y-3 start-0 w-0.5 rounded-pill ${
                matter.tone === "critical"
                  ? "bg-critical"
                  : matter.tone === "caution"
                    ? "bg-caution"
                    : matter.tone === "positive"
                      ? "bg-positive"
                      : "bg-ink-200"
              }`}
            />
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-small font-semibold text-foreground">
                {matter.name}
              </p>
              <ToneChip label={matter.stage} tone={matter.tone} />
            </div>
            <p className="mt-1 truncate text-caption text-foreground-soft">
              {matter.client} · {matter.nextEvent}
            </p>
            <p className="mt-0.5 text-micro text-foreground-faint">
              עדכון אחרון: {matter.lastUpdate}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
