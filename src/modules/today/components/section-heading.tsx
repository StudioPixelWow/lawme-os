import Link from "next/link";
import type { ReactNode } from "react";

/** Shared header for workspace sections: title · caption · optional link. */
export function SectionHeading({
  title,
  caption,
  href,
  linkLabel,
  children,
}: {
  title: string;
  caption?: string;
  href?: string;
  linkLabel?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <div>
        <h2 className="flex items-center gap-3 text-heading font-semibold tracking-tight text-foreground">
          <span aria-hidden className="h-4 w-0.5 rounded-pill bg-accent" />
          {title}
        </h2>
        {caption ? (
          <p className="mt-1 text-caption text-foreground-faint">{caption}</p>
        ) : null}
      </div>
      {href && linkLabel ? (
        <Link
          href={href}
          className="shrink-0 rounded-xs text-small font-medium text-foreground-soft transition-colors hover:text-foreground"
          style={{ transitionDuration: "var(--motion-quick)" }}
        >
          {linkLabel}
        </Link>
      ) : null}
      {children}
    </div>
  );
}
