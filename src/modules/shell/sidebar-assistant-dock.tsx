"use client";

import Image from "next/image";
import { cx } from "@/design-system/utils/cx";
import { useShell } from "./shell-provider";

/**
 * SidebarAssistantDock — דינו's permanent home at the foot of the
 * navy sidebar. Not a navigation item: a fixed assistant dock with
 * its own reserved height; the navigation scrolls independently
 * above it. Click toggles the assistant chat. Collapsed sidebar
 * shows the avatar alone (tooltip: דינו).
 */
export function SidebarAssistantDock({
  hasNewMessage = false,
}: {
  hasNewMessage?: boolean;
}) {
  const { assistantOpen, setAssistantOpen } = useShell();

  return (
    <div className="shrink-0 border-t border-paper-0/10 bg-ink-950/50 p-3 lg:p-4">
      <button
        type="button"
        onClick={() => setAssistantOpen(!assistantOpen)}
        aria-pressed={assistantOpen}
        aria-label={assistantOpen ? "סגור את הצ'אט עם דינו" : "דינו — פתח את הצ'אט"}
        title="דינו"
        className={cx(
          "group flex w-full items-center justify-center gap-3 rounded-xl p-2 text-start transition-all lg:justify-start lg:p-2.5",
          "hover:-translate-y-0.5 hover:bg-paper-0/8 hover:shadow-lift",
          assistantOpen && "bg-paper-0/8 shadow-gold-glow",
        )}
        style={{ transitionDuration: "var(--motion-quick)" }}
        data-live={assistantOpen || undefined}
      >
        {/* the avatar — the provided asset, untouched */}
        <span
          className={cx(
            "relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-pill shadow-seat transition-transform group-hover:scale-105 lg:h-12 lg:w-12",
            hasNewMessage && "shadow-gold-breath",
          )}
          style={{ transitionDuration: "var(--motion-quick)" }}
        >
          <Image
            src="/brand/DINO-BOT.png"
            alt=""
            width={96}
            height={96}
            className="h-full w-full scale-[1.12] object-cover"
          />
          {/* hover glow around the avatar */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-pill opacity-0 transition-opacity group-hover:opacity-100"
            style={{
              transitionDuration: "var(--motion-quick)",
              boxShadow: "inset 0 0 0 1px rgb(201 169 97 / 0.55), 0 0 14px rgb(201 169 97 / 0.35)",
            }}
          />
          {/* new-message pulse — soft gold, premium only */}
          {hasNewMessage ? (
            <span
              aria-hidden
              className="animate-breath pointer-events-none absolute inset-0 rounded-pill"
              style={{ boxShadow: "0 0 0 1px rgb(201 169 97 / 0.45)" }}
            />
          ) : null}
        </span>

        {/* identity — full sidebar only */}
        <span className="hidden min-w-0 flex-1 lg:block">
          <span className="block truncate text-small font-semibold text-paper-0">
            דינו
          </span>
          <span className="block truncate text-micro text-ink-200">
            היועץ המשפטי AI שלך
          </span>
        </span>

        {/* the live AI indicator */}
        <span
          aria-hidden
          className="relative hidden h-2 w-2 shrink-0 lg:block"
        >
          <span className="absolute inset-0 rounded-pill bg-gold-400" />
          <span className="animate-breath absolute -inset-1 rounded-pill bg-gold-400/30" />
        </span>
      </button>
    </div>
  );
}
