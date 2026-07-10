import type { ReactNode } from "react";

/**
 * The editorial opening of every page:
 * one serif display line + one quiet line of context.
 */
export function PageHeader({
  title,
  context,
  children,
}: {
  title: string;
  context?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="animate-rise">
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
