"use client";

/**
 * Dev-only client wrapper: renders the CompactAnswer with a working expand →
 * Full Research Mode modal, so /dev/dino can preview both states. Not used in
 * production (the shell panel uses reasoned-conversation).
 */
import { useState } from "react";
import { CloseGlyph } from "@/design-system/icons/glyphs";
import type { ReasonedDinoResponse } from "../types";
import { CompactAnswer } from "./compact-answer";
import { ReasonedAnswer } from "./reasoned-answer";

export function DinoDevPreview({ r }: { r: ReasonedDinoResponse }) {
  const [full, setFull] = useState(false);
  return (
    <>
      <CompactAnswer r={r} onExpand={() => setFull(true)} />
      {full ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/40 p-4 md:p-10" role="dialog" aria-modal="true" aria-label="תצוגת מחקר מלאה">
          <div className="relative w-full max-w-3xl rounded-xl bg-surface p-6 shadow-raised md:p-8">
            <button type="button" onClick={() => setFull(false)} aria-label="סגירה" className="absolute end-4 top-4 flex h-8 w-8 items-center justify-center rounded-pill text-foreground-soft hover:bg-surface-sunken"><CloseGlyph size={16} /></button>
            <p className="mb-3 text-caption text-foreground-faint">תצוגת מחקר מלאה</p>
            <p className="mb-3 text-small font-medium text-foreground">{r.question}</p>
            <ReasonedAnswer r={r} />
          </div>
        </div>
      ) : null}
    </>
  );
}
