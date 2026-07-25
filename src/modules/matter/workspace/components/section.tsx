import type { ReactNode } from "react";
import { cx } from "@/design-system/utils/cx";
import { IconContainer, type IconContainerVariant } from "@/design-system/primitives/icon-container";
import { StatusText, StatusTag, type Status } from "@/design-system/primitives/indicators";
import type { Tone } from "../types";

/* A design-system `Tone` IS a `Status`; this keeps the mapping honest. */
export function toStatus(tone: Tone): Status {
  return tone;
}

/**
 * A workspace section — a calm operational card. Space and one hairline seat,
 * never decoration. The section is quiet until its content asks for attention.
 */
export function WorkspaceSection({
  title,
  icon,
  iconVariant = "neutral",
  meta,
  children,
  className,
}: {
  title: string;
  icon: ReactNode;
  iconVariant?: IconContainerVariant;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cx(
        "rounded-xl border border-line-strong bg-surface p-5 shadow-lift md:p-6",
        className,
      )}
    >
      <header className="flex items-center gap-3">
        <IconContainer variant={iconVariant} size="sm">
          {icon}
        </IconContainer>
        <h2 className="min-w-0 flex-1 text-heading font-semibold text-foreground">{title}</h2>
        {meta ? <div className="shrink-0 text-caption text-foreground-faint">{meta}</div> : null}
      </header>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** A compact, calm empty state — never a blank, never "broken". */
export function EmptyNote({ line }: { line: string }) {
  return (
    <p className="rounded-lg bg-surface-sunken/60 px-4 py-6 text-center text-small text-foreground-soft">
      {line}
    </p>
  );
}

/** A quiet metadata pill for the hero — label over value. */
export function MetaField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-micro font-medium tracking-wide text-ink-300">{label}</div>
      <div className="mt-0.5 truncate text-small font-medium text-paper-0">{value}</div>
    </div>
  );
}

/** Tone chip on light surfaces. */
export function ToneChip({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <StatusTag status={toStatus(tone)}>{children}</StatusTag>;
}

/** Tone written-state (dot + word) — the default treatment. */
export function ToneText({
  tone,
  surface = "light",
  children,
}: {
  tone: Tone;
  surface?: "light" | "navy";
  children: ReactNode;
}) {
  return (
    <StatusText status={toStatus(tone)} surface={surface}>
      {children}
    </StatusText>
  );
}
