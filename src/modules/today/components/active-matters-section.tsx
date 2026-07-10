import Link from "next/link";
import { BriefcaseGlyph } from "@/design-system/icons/glyphs";
import { IconContainer } from "@/design-system/primitives/icon-container";
import {
  MicroProgress,
  StateLine,
  StatusText,
} from "@/design-system/primitives/indicators";
import { ACTIVE_MATTERS } from "../data";
import { SectionHeading } from "./section-heading";

/**
 * תיקים פעילים — a premium operational index: state line, icon,
 * matter, client, practice area, owner, status, next event,
 * readiness. Hover exposes the main next action.
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
      <ul className="surface-paper mt-5 flex-1 rounded-xl">
        {ACTIVE_MATTERS.map((matter, index) => (
          <li
            key={matter.id}
            className={`group relative px-5 py-3.5 transition-colors hover:bg-surface-sunken/50 ${
              index > 0 ? "border-t border-line/60" : ""
            }`}
            style={{ transitionDuration: "var(--motion-quick)" }}
          >
            <StateLine status={matter.status} />
            <div className="flex items-center gap-3">
              <IconContainer
                variant={matter.status === "urgent" ? "urgent" : "neutral"}
                size="sm"
                interactive
              >
                <BriefcaseGlyph size={14} />
              </IconContainer>
              <p className="min-w-0 flex-1 truncate text-small font-semibold text-foreground">
                {matter.name}
              </p>
              <StatusText status={matter.status}>
                {matter.statusLabel}
              </StatusText>
            </div>
            <p className="mt-1.5 truncate text-caption text-foreground-soft">
              {matter.client} · {matter.practiceArea} · {matter.nextEvent}
            </p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-micro text-foreground-faint">
                <span>עו״ד {matter.owner}</span>
                <span aria-hidden>·</span>
                <span>{matter.lastUpdate}</span>
              </span>
              <span className="flex items-center gap-3">
                <MicroProgress
                  value={matter.progress}
                  status={matter.progress >= 0.8 ? "completed" : "progress"}
                  label="מוכנות"
                />
                <Link
                  href="/matters"
                  className="rounded-xs text-micro font-medium text-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  style={{ transitionDuration: "var(--motion-quick)" }}
                >
                  {matter.action} ←
                </Link>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
