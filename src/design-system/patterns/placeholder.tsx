import { cx } from "../utils/cx";

/**
 * A designed invitation — the Sprint 0 placeholder.
 * Empty states are the product's best typography with nothing
 * competing against it. Docs: docs/design-system/10-states.md
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
        "rounded-lg bg-surface-raised px-8 py-16 text-center shadow-hairline",
        ai && "border-s-2 border-accent bg-gold-100",
      )}
    >
      <p className="font-display text-heading font-normal text-foreground">
        {headline}
      </p>
      <p className="mx-auto mt-3 max-w-reading text-small text-foreground-soft">
        {line}
      </p>
    </div>
  );
}
