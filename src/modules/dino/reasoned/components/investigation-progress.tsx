"use client";

/**
 * Sprint 1 · P0-3 — staged investigation progress + skeleton.
 * Purely a loading affordance: it does NOT change the pipeline. The stages
 * animate on a timer while the (single) request is in flight, reinforcing the
 * "visible investigation" trust story. `activeStage` forces a stage for static
 * previews/screenshots.
 */
import { useEffect, useState } from "react";
import { cx } from "@/design-system/utils/cx";
import { CheckGlyph, SparkleGlyph } from "@/design-system/icons/glyphs";

const STAGES = [
  "מחפש בחקיקה",
  "מאמת מקורות",
  "מיישם את הדין על העובדות",
  "בוחן טענות נגד",
  "מגבש חוות דעת",
];

export function InvestigationProgress({ activeStage }: { activeStage?: number }) {
  const [stage, setStage] = useState(activeStage ?? 0);

  useEffect(() => {
    if (activeStage !== undefined) return;
    const t = window.setInterval(() => {
      setStage((s) => (s < STAGES.length - 1 ? s + 1 : s));
    }, 950);
    return () => window.clearInterval(t);
  }, [activeStage]);

  return (
    <div className="rounded-md border-s-2 border-accent bg-gold-100/40 p-4" aria-live="polite" aria-busy>
      <ul className="space-y-1.5">
        {STAGES.map((label, i) => {
          const done = i < stage;
          const active = i === stage;
          return (
            <li key={i} className="flex items-center gap-2">
              <span className={cx(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-pill",
                done ? "bg-status-completed-wash text-status-completed" : active ? "text-gold-600" : "text-line-strong",
              )}>
                {done ? <CheckGlyph size={11} /> : active ? <SparkleGlyph size={12} className="animate-breath" /> : <span className="h-1.5 w-1.5 rounded-pill bg-current" />}
              </span>
              <span className={cx(
                "text-caption",
                done ? "text-foreground-soft line-through decoration-line-strong" : active ? "font-medium text-foreground" : "text-foreground-faint",
              )}>
                {label}{active ? "…" : ""}
              </span>
            </li>
          );
        })}
      </ul>

      {/* lightweight answer skeleton */}
      <div className="mt-4 space-y-2 border-t border-line pt-3">
        <div className="h-2.5 w-24 animate-pulse rounded-xs bg-line" />
        <div className="h-4 w-full animate-pulse rounded-xs bg-line" />
        <div className="h-4 w-4/5 animate-pulse rounded-xs bg-line" />
        <div className="mt-3 h-16 w-full animate-pulse rounded-md bg-line/70" />
      </div>
    </div>
  );
}
