import type { ReactNode } from "react";
import { cx } from "../utils/cx";

/**
 * The workspace canvas — every OS page renders inside this.
 * One centered readable column, huge breathing room, long scroll.
 * Docs: docs/design-system/04-space-grid-layout.md
 */
export function Workspace({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "mx-auto w-full max-w-page px-6 pt-16 pb-40 md:px-12 md:pt-24",
        className,
      )}
    >
      {children}
    </div>
  );
}
