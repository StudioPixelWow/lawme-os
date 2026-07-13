import { cx } from "@/design-system/utils/cx";
import { DinoMark } from "@/design-system/primitives/indicators";
import { DOT_NAVY } from "./tone";
import type { IdentityVM, PostureVM, ReviewVM } from "../types";

/**
 * Level 1 — Matter presence.
 * The one navy focal surface of the room: entering it should feel like entering
 * the matter itself, not opening a widget about it. Practice + forum eyebrow,
 * the matter name as the hero, client/owner/stage beneath, and — held to the
 * end edge — the posture and the human-review seal.
 */
export function IdentityHero({
  identity,
  posture,
  review,
}: {
  identity: IdentityVM;
  posture: PostureVM;
  review: ReviewVM | null;
}) {
  const eyebrow = [identity.practiceAreaHe, identity.forumHe].filter(Boolean) as string[];
  return (
    <section
      aria-labelledby="matter-name"
      className="surface-navy rounded-xl px-7 py-8 shadow-raised md:px-10 md:py-9"
    >
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between md:gap-10">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-caption text-ink-200">
            {eyebrow.map((part, i) => (
              <span key={part} className="flex items-center gap-2.5">
                {i > 0 ? <span aria-hidden className="text-ink-400">·</span> : null}
                {part}
              </span>
            ))}
          </p>

          <h1
            id="matter-name"
            className="mt-3 text-balance text-title font-semibold leading-tight tracking-tight text-paper-0 md:text-display"
          >
            {identity.titleHe}
          </h1>

          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-small">
            <span className="font-medium text-paper-0">{identity.clientHe}</span>
            {identity.ownerHe ? (
              <span className="text-ink-200">
                אחראי/ת: <span className="text-paper-0">{identity.ownerHe}</span>
              </span>
            ) : null}
            {identity.stageTitleHe ? (
              <span className="text-ink-200">
                שלב: <span className="text-paper-0">{identity.stageTitleHe}</span>
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2.5 md:flex-col md:items-end">
          <span className="inline-flex items-center gap-2 rounded-pill bg-paper-0/10 px-3.5 py-1.5 text-small font-semibold text-paper-0">
            <span aria-hidden className={cx("h-2 w-2 rounded-pill", DOT_NAVY[posture.tone])} />
            {posture.labelHe}
          </span>
          {review ? (
            <span className="inline-flex items-center gap-1.5 rounded-pill border border-gold-400/40 px-3 py-1 text-caption font-medium text-gold-200">
              <DinoMark surface="navy" />
              {review.targetHe}
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}
