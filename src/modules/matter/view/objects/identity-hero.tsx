import { cx } from "@/design-system/utils/cx";
import { AlertGlyph } from "@/design-system/icons/glyphs";
import { DOT_NAVY } from "./tone";
import type { IdentityVM, PostureVM, ReviewVM } from "../types";

/**
 * Level 1 — the matter hero (approved concept).
 * A deep-navy band: breadcrumb and the posture chip on the top edge, the matter
 * name centered as the hero, and the file-number meta line with the specialist
 * seal along the bottom edge.
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
  const meta = [
    identity.fileNoHe ? `תיק: ${identity.fileNoHe}` : null,
    `לקוח: ${identity.clientHe}`,
    identity.ownerHe ? `אחראי: ${identity.ownerHe}` : null,
    identity.stageTitleHe ? `שלב: ${identity.stageTitleHe}` : null,
  ].filter((p): p is string => Boolean(p));

  return (
    <section
      aria-labelledby="matter-name"
      className="surface-navy rounded-xl px-6 py-4 shadow-raised md:px-8 md:py-5"
    >
      <div className="flex items-center justify-between gap-4">
        <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-caption text-ink-300">
          <span>{identity.practiceAreaHe}</span>
          {identity.forumHe ? (
            <>
              <span aria-hidden className="text-ink-500">›</span>
              <span className="truncate">{identity.forumHe}</span>
            </>
          ) : null}
        </p>

        <span className="inline-flex shrink-0 items-center gap-2 rounded-pill border border-gold-400/50 px-3 py-1 text-caption font-semibold text-gold-200">
          <span aria-hidden className={cx("h-1.5 w-1.5 rounded-pill", DOT_NAVY[posture.tone])} />
          {posture.labelHe}
        </span>
      </div>

      <h1
        id="matter-name"
        className="mt-2.5 text-balance text-center text-title font-semibold leading-tight tracking-tight text-paper-0"
      >
        {identity.titleHe}
      </h1>

      <div className="mt-3 flex items-center justify-between gap-4">
        <p className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-small text-ink-200">
          {meta.map((part, i) => (
            <span key={part} className="flex items-center gap-3">
              {i > 0 ? <span aria-hidden className="text-ink-500">|</span> : null}
              <span className="truncate">{part}</span>
            </span>
          ))}
        </p>

        {review ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 text-caption text-ink-300">
            <AlertGlyph size={14} className="text-gold-400/80" />
            {review.targetHe}
          </span>
        ) : null}
      </div>
    </section>
  );
}
