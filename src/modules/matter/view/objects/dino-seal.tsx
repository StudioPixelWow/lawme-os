"use client";

import { useState } from "react";
import { cx } from "@/design-system/utils/cx";
import { DinoMark } from "@/design-system/primitives/indicators";
import type { DinoSealVM } from "../types";

/**
 * The Dino seal — almost invisible, always felt.
 * Not a chatbot, not a widget, not a boxed panel: a single quiet line carrying
 * one sourced observation, with the meridian mark as the only sign that an
 * expert is continuously watching the matter. Clicking reveals its provenance.
 */
export function DinoSeal({ dino }: { dino: DinoSealVM }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-start text-caption text-foreground-faint transition-colors hover:text-foreground-soft"
      >
        <DinoMark />
        <span className="min-w-0 flex-1 truncate">
          {dino.insightHe}
          {dino.policyNoteHe ? <span className="text-foreground-faint"> · {dino.policyNoteHe}</span> : null}
        </span>
        <span className={cx("shrink-0 transition-transform", open && "rotate-180")}>מקורות ⌄</span>
      </button>

      {open ? (
        <ul className="mt-2.5 space-y-1 border-t border-ink-900/8 pt-2.5 text-caption text-foreground-soft">
          {dino.provenanceHe.map((p, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden className="text-foreground-faint">•</span>
              <span className="min-w-0">{p}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
