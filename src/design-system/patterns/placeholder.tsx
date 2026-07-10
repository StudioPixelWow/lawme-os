import { cx } from "../utils/cx";

/**
 * A designed invitation — the Sprint 0 placeholder.
 * A quiet well sunk into the paper, not a card: empty states are
 * the product's best typography with nothing competing against it.
 * Docs: docs/design-system/10-states.md
 */
export function Placeholder({
  headline,
  line,
  ai = false,
}: {
  headline: string;
  line: string;
  /** AI placeholders carry the gold mark (docs 11). */
  ai?: boolean;
}) {
  return (
    <div
      className={cx(
        "rounded-xl px-8 py-20 text-center",
        ai
          ? "border-s-2 border-accent bg-gold-100/70"
          : "bg-surface-sunken/60",
      )}
    >
      <p className="text-heading text-balance text-foreground">{headline}</p>
      <p className="mx-auto mt-3 max-w-reading text-small text-pretty text-foreground-soft">
        {line}
      </p>
    </div>
  );
}
