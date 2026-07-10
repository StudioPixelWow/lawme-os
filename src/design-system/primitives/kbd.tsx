import type { ReactNode } from "react";

/** Keyboard hint chip — e.g. ⌘K. */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd
      dir="ltr"
      className="inline-flex h-5 min-w-5 items-center justify-center rounded-xs bg-surface-sunken px-1.5 font-sans text-micro text-foreground-soft shadow-hairline"
    >
      {children}
    </kbd>
  );
}
