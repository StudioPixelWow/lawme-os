import type { ReactNode } from "react";
import { ShellProvider } from "./shell-provider";
import { TopBar } from "./top-bar";
import { SideRail } from "./side-rail";
import { ShellCanvas } from "./shell-canvas";
import { MobileNav } from "./mobile-nav";
import { CommandBar } from "./command-bar";
import { AssistantPanel } from "./assistant-panel";

/** Safe identity for display only — no capabilities/tokens; role is not authorization. */
export interface ShellIdentity {
  readonly profileDisplayName?: string;
  readonly organizationDisplayName?: string;
  readonly roleLabel: string;
}

/**
 * The LawME three-zone workspace:
 * permanent navy sidebar (start) · central working canvas ·
 * persistent utility rail (end) — with an integrated top bar
 * spanning the canvas. Mobile: bottom navigation, no side zones.
 */
export function AppShell({ children, identity }: { children: ReactNode; identity?: ShellIdentity }) {
  return (
    <ShellProvider>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:start-2 focus:z-50 focus:rounded-sm focus:bg-surface-raised focus:px-4 focus:py-2 focus:text-small focus:shadow-float"
      >
        דילוג לתוכן הראשי
      </a>
      {identity ? (
        <div className="sr-only" aria-live="polite" data-testid="active-identity">
          {[identity.profileDisplayName, identity.organizationDisplayName, identity.roleLabel]
            .filter((v): v is string => typeof v === "string" && v.length > 0)
            .join(" · ")}
        </div>
      ) : null}
      <SideRail />
      <TopBar />
      <ShellCanvas>{children}</ShellCanvas>
      <MobileNav />
      <CommandBar />
      <AssistantPanel />
    </ShellProvider>
  );
}
