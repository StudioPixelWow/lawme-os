import type { ReactNode } from "react";
import { AppShell } from "@/modules/shell";

/** The Operating System — every workspace page lives inside the shell. */
export default function OsLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
