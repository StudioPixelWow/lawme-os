import type { ButtonHTMLAttributes } from "react";
import { cx } from "../utils/cx";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Semantic intent — never visual color props. */
  intent?: "primary" | "quiet";
};

/**
 * The LawME button is quiet by default: ink on paper.
 * Focus ring is the global gold :focus-visible.
 * Docs: docs/design-system/09-components.md
 */
export function Button({
  intent = "quiet",
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        "inline-flex h-11 items-center justify-center gap-2 rounded-sm px-5",
        "text-small font-medium transition-colors duration-150",
        "disabled:cursor-not-allowed disabled:opacity-50",
        intent === "primary" &&
          "bg-ink-900 text-paper-0 hover:bg-ink-800 active:bg-ink-950",
        intent === "quiet" &&
          "text-foreground shadow-hairline hover:bg-surface-sunken active:bg-paper-200",
        className,
      )}
      {...rest}
    />
  );
}
