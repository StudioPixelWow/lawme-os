"use client";

import { useState } from "react";
import { cx } from "@/design-system/utils/cx";
import { DinoMark } from "@/design-system/primitives/indicators";
import type { DinoSealVM } from "../types";

/**
 * The Dino note — presence, not a panel.
 * A single quiet margin line beneath the briefing: the meridian mark plus one
 * sourced observation, as if a senior expert is quietly supervising the matter.
 * Never a chatbot, never a widget. Clicking reveals the provenance.
 */
export function DinoSeal({ dino }: { dino: DinoSealVM }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3.5">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-start text-caption text-foreground-faint transition-colors hover:text-foreground-soft"
      >
        <DinoMark />
        <span className="min-w-0 flex-1 truncate">
          <span className="text-foreground-soft">דינו</span> · {dino.insightHe}
        </span>
        <span className={cx("shrink-0 text-micro transition-transform", open && "rotate-180")}>מקורות ⌄</span>
      </button>

      {open ? (
        <ul className="mt-2 space-y-1 ps-6 text-caption text-foreground-soft">
          {dino.provenanceHe.map((p, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden className="text-foreground-faint">•</span>
              <span className="min-w-0">{p}</span>
            </li>
          ))}
          {dino.policyNoteHe ? (
            <li className="flex gap-2 text-foreground-faint">
              <span aria-hidden>•</span>
              <span>{dino.policyNoteHe}</span>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
