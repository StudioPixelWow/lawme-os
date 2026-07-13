import type { ReactNode } from "react";
import { ShellProvider } from "./shell-provider";
import { TopBar } from "./top-bar";
import { SideRail } from "./side-rail";
import { ShellCanvas } from "./shell-canvas";
import { MobileNav } from "./mobile-nav";
import { CommandBar } from "./command-bar";
import { AssistantPanel } from "./assistant-panel";

/**
 * The LawME three-zone workspace:
 * permanent navy sidebar (start) · central working canvas ·
 * persistent utility rail (end) — with an integrated top bar
 * spanning the canvas. Mobile: bottom navigation, no side zones.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ShellProvider>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:start-2 focus:z-50 focus:rounded-sm focus:bg-surface-raised focus:px-4 focus:py-2 focus:text-small focus:shadow-float"
      >
        דילוג לתוכן הראשי
      </a>
      <SideRail />
      <TopBar />
      <ShellCanvas>{children}</ShellCanvas>
      <MobileNav />
      <CommandBar />
      <AssistantPanel />
    </ShellProvider>
  );
}
