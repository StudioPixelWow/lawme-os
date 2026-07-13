import Image from "next/image";
import { SparkleGlyph } from "@/design-system/icons/glyphs";
import type { DinoSealVM } from "../types";

/**
 * The Dino card (approved concept) — the expert supervising the matter.
 * A sourced observation with what it is based on, and a route to the full
 * analysis. Never a chatbot; always traceable, always human-reviewed.
 */
export function DinoSeal({ dino }: { dino: DinoSealVM }) {
  return (
    <section className="flex flex-col rounded-xl border border-line-strong bg-surface p-5 shadow-lift" aria-label="דינו">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-caption font-semibold text-foreground-soft">דינו</h2>
        <SparkleGlyph size={16} className="text-gold-500" />
      </div>

      <p className="mt-3.5 text-small leading-relaxed text-foreground">{dino.insightHe}</p>

      <div className="mt-4 flex gap-3 border-t border-line-strong pt-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-pill bg-ink-950 ring-1 ring-gold-400/40">
          <Image src="/brand/Dino-Bot.png" alt="" width={44} height={44} className="h-11 w-11 object-cover" />
        </span>
        <div className="min-w-0">
          <div className="text-caption text-foreground-faint">מבוסס על:</div>
          <ul className="mt-1 space-y-0.5 text-caption text-foreground-soft">
            {dino.provenanceHe.map((p, i) => (
              <li key={i} className="flex gap-1.5">
                <span aria-hidden className="text-foreground-faint">·</span>
                <span className="min-w-0">{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <button
        type="button"
        className="mt-auto inline-flex items-center gap-1.5 self-start pt-4 text-small font-medium text-foreground-soft transition-colors hover:text-foreground"
      >
        הצג ניתוח מלא <span aria-hidden>‹</span>
      </button>
    </section>
  );
}
