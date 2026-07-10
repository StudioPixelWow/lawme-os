import type { ReactNode } from "react";
import { ShellProvider } from "./shell-provider";
import { TopBar } from "./top-bar";
import { SideRail } from "./side-rail";
import { MobileNav } from "./mobile-nav";
import { CommandBar } from "./command-bar";
import { AssistantPanel } from "./assistant-panel";

/**
 * The LawME application shell:
 * skip-link → top bar → start-edge rail (desktop/tablet) → scrolling
 * canvas → bottom bar (mobile) → command bar → עמית.
 * Mounted once by the (os) route-group layout; navigation between
 * OS pages never re-mounts it.
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
      <TopBar />
      <SideRail />
      <div className="md:ps-28 lg:ps-64">
        <main id="main" className="pb-28 md:pb-0">
          {children}
        </main>
      </div>
      <MobileNav />
      <CommandBar />
      <AssistantPanel />
    </ShellProvider>
  );
}
