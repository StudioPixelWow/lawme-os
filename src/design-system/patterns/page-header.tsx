import type { ReactNode } from "react";
import { riseClass } from "./reveal";

/**
 * The editorial opening of every page:
 * one serif display line + one quiet line of context.
 * `reveal={false}` renders visible on first paint (no opacity-zero entrance).
 */
export function PageHeader({
  title,
  context,
  children,
  reveal = true,
}: {
  title: string;
  context?: ReactNode;
  children?: ReactNode;
  reveal?: boolean;
}) {
  return (
    <header className={riseClass(reveal)}>
      <h1 className="text-display font-semibold tracking-tight text-balance text-foreground">
        {title}
      </h1>
      {context ? (
        <p className="mt-5 max-w-reading text-subheading text-pretty text-foreground-soft">
          {context}
        </p>
      ) : null}
      {children ? <div className="mt-8">{children}</div> : null}
    </header>
  );
}
