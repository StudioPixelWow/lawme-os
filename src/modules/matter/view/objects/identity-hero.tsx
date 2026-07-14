import { cx } from "@/design-system/utils/cx";
import { AlertGlyph } from "@/design-system/icons/glyphs";
import { DOT_NAVY } from "./tone";
import type { IdentityVM, PostureVM, ReviewVM } from "../types";

type OpenFn = (kind: string, param?: string | null) => void;

/**
 * Level 1 — the matter hero (approved concept).
 * A deep-navy band: breadcrumb and the posture chip on the top edge, the matter
 * name centered as the hero, and the file-number meta line with the specialist
 * seal along the bottom edge. Interactive elements open their detail panels;
 * plain context labels stay non-interactive (no false affordance).
 */
export function IdentityHero({
  identity,
  posture,
  review,
  open,
}: {
  identity: IdentityVM;
  posture: PostureVM;
  review: ReviewVM | null;
  open?: OpenFn;
}) {
  type MetaPart = { textHe: string; act?: string; param?: string | null };
  const rawMeta: (MetaPart | null)[] = [
    identity.fileNoHe ? { textHe: `תיק: ${identity.fileNoHe}`, act: "identity" } : null,
    { textHe: `לקוח: ${identity.clientHe}`, act: "identity" },
    identity.ownerHe ? { textHe: `אחראי: ${identity.ownerHe}`, act: "owner" } : null,
    identity.stageTitleHe ? { textHe: `שלב: ${identity.stageTitleHe}`, act: "milestone" } : null,
  ];
  const meta = rawMeta.filter((p): p is MetaPart => p !== null);

  return (
    <section aria-labelledby="matter-name" className="surface-navy rounded-xl px-6 py-4 shadow-raised md:px-8 md:py-5">
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

        <button
          type="button"
          onClick={open ? () => open("posture") : undefined}
          aria-label={`מצב התיק: ${posture.labelHe} — הצג הסבר`}
          className="inline-flex shrink-0 items-center gap-2 rounded-pill border border-gold-400/50 px-3 py-1 text-caption font-semibold text-gold-200 transition-colors hover:bg-gold-400/10"
        >
          <span aria-hidden className={cx("h-1.5 w-1.5 rounded-pill", DOT_NAVY[posture.tone])} />
          {posture.labelHe}
        </button>
      </div>

      <h1 id="matter-name" className="mt-2.5 text-center text-title font-semibold leading-tight tracking-tight text-paper-0 text-balance">
        <button
          type="button"
          onClick={open ? () => open("identity") : undefined}
          className="rounded-md px-2 text-inherit transition-colors hover:bg-paper-0/5"
        >
          {identity.titleHe}
        </button>
      </h1>

      <div className="mt-3 flex items-center justify-between gap-4">
        <p className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-small text-ink-200">
          {meta.map((part, i) => (
            <span key={part.textHe} className="flex items-center gap-3">
              {i > 0 ? <span aria-hidden className="text-ink-500">|</span> : null}
              {open && part.act ? (
                <button type="button" onClick={() => open(part.act!, part.param)} className="truncate rounded-sm px-1 transition-colors hover:bg-paper-0/5 hover:text-paper-0">
                  {part.textHe}
                </button>
              ) : (
                <span className="truncate">{part.textHe}</span>
              )}
            </span>
          ))}
        </p>

        {review ? (
          <button
            type="button"
            onClick={open ? () => open("review") : undefined}
            aria-label={`בדיקה נדרשת: ${review.targetHe} — הצג מסלול`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-pill px-2 py-1 text-caption text-ink-300 transition-colors hover:bg-paper-0/5"
          >
            <AlertGlyph size={14} className="text-gold-400/80" />
            {review.targetHe}
          </button>
        ) : null}
      </div>
    </section>
  );
}
