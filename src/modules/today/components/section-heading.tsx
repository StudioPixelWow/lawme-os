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
        <h2 className="text-heading font-semibold tracking-tight text-foreground">
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

/** Small status chip: dot + word — never a loud badge. */
export function ToneChip({
  label,
  tone,
}: {
  label: string;
  tone: "critical" | "caution" | "positive" | "neutral";
}) {
  const tones = {
    critical: "bg-critical-wash text-critical",
    caution: "bg-caution-wash text-caution",
    positive: "bg-positive-wash text-positive",
    neutral: "bg-surface-sunken text-foreground-soft",
  } as const;
  const dots = {
    critical: "bg-critical",
    caution: "bg-caution",
    positive: "bg-positive",
    neutral: "bg-ink-300",
  } as const;

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-micro font-medium ${tones[tone]}`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-pill ${dots[tone]}`} />
      {label}
    </span>
  );
}
