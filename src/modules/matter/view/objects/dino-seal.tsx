"use client";

import { useState } from "react";
import { cx } from "@/design-system/utils/cx";
import { DinoMark } from "@/design-system/primitives/indicators";
import type { DinoSealVM } from "../types";

/**
 * Level 5 — the Dino seal.
 * The single quiet intelligence mark in the room. Never a chatbot, never a
 * glowing widget: one sourced insight, always traceable. Clicking reveals the
 * provenance (the assessments/findings it is sourced to) and the AI-policy note.
 */
export function DinoSeal({ dino }: { dino: DinoSealVM }) {
  const [open, setOpen] = useState(false);
  return (
    <aside className="rounded-lg border border-gold-400/25 bg-gold-400/5 p-4">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-2.5 text-start"
      >
        <span className="mt-0.5 shrink-0">
          <DinoMark />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-small leading-snug text-foreground">{dino.insightHe}</span>
          {dino.policyNoteHe ? (
            <span className="mt-1 block text-caption text-foreground-faint">{dino.policyNoteHe}</span>
          ) : null}
        </span>
        <span className={cx("mt-0.5 shrink-0 text-caption text-foreground-faint transition-transform", open && "rotate-180")}>
          מקורות ⌄
        </span>
      </button>

      {open ? (
        <ul className="mt-3 space-y-1 border-t border-gold-400/20 pt-3 text-caption text-foreground-soft">
          {dino.provenanceHe.map((p, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden className="text-foreground-faint">•</span>
              <span className="min-w-0">{p}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </aside>
  );
}
