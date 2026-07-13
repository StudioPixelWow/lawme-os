import { cx } from "@/design-system/utils/cx";
import { DOT, TEXT } from "./tone";
import { DinoSeal } from "./dino-seal";
import type { DeadlineVM, DinoSealVM } from "../types";

/**
 * The briefing — the senior partner speaking before entering court.
 * The room's dominant text (presence over title scale): the situation on the
 * gold meridian — what is happening, why, what is blocking — with the tempo
 * beneath it and Dino's quiet supervising note in the margin. This is the
 * strongest operational element on the page.
 */
export function Briefing({
  briefingHe,
  deadline,
  dino,
}: {
  briefingHe: string[];
  deadline: DeadlineVM | null;
  dino: DinoSealVM | null;
}) {
  return (
    <section className="mt-6 border-s-2 border-gold-500 ps-5 md:mt-7 md:ps-7" aria-label="מצב התיק">
      {briefingHe.map((sentence, i) => (
        <p
          key={i}
          className={cx(
            i === 0
              ? "max-w-[52ch] text-balance text-title font-semibold leading-snug tracking-tight text-foreground"
              : "mt-3 max-w-[56ch] text-body leading-relaxed text-foreground-soft",
          )}
        >
          {sentence}
        </p>
      ))}

      {deadline ? (
        <p className="mt-4 flex items-center gap-2 text-small">
          <span aria-hidden className={cx("h-1.5 w-1.5 rounded-pill", DOT[deadline.tone])} />
          <span className={cx("font-semibold", TEXT[deadline.tone])}>{deadline.whenHe}</span>
          <span className="text-foreground-faint">
            · {deadline.labelHe}
            {deadline.strict ? " · מועד קשיח" : ""}
          </span>
        </p>
      ) : null}

      {dino ? <DinoSeal dino={dino} /> : null}
    </section>
  );
}
