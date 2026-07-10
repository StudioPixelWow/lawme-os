import type { ReactNode } from "react";
import { cx } from "../utils/cx";

/**
 * The workspace canvas — every OS page renders inside this.
 * One centered readable column, generous breathing room, long scroll.
 * `width="wide"` is for dense operational workspaces (the morning).
 * Docs: docs/design-system/04-space-grid-layout.md
 */
export function Workspace({
  children,
  className,
  width = "page",
}: {
  children: ReactNode;
  className?: string;
  width?: "page" | "wide";
}) {
  return (
    <div
      className={cx(
        "mx-auto w-full px-5 pb-24 md:px-8",
        width === "wide"
          ? "max-w-wide pt-5 md:pt-8"
          : "max-w-page pt-10 md:pt-16",
        className,
      )}
    >
      {children}
    </div>
  );
}
