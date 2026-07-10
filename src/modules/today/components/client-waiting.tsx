"use client";

import { useState, type ReactNode } from "react";
import { ChatGlyph, MailGlyph, PhoneGlyph } from "@/design-system/icons/glyphs";
import { AIMark, StatusText } from "@/design-system/primitives/indicators";
import { cx } from "@/design-system/utils/cx";
import { CLIENT_COMMS, type CommChannel } from "../office";
import { SectionHeading } from "./section-heading";

const CHANNEL_ICON: Record<CommChannel, ReactNode> = {
  whatsapp: <ChatGlyph size={16} />,
  email: <MailGlyph size={16} />,
  phone: <PhoneGlyph size={16} />,
};

/**
 * לקוחות שממתינים — an action inbox, not an inbox. Only communication
 * that requires a decision, each with דינו's prepared response one
 * selection away. Answer, approve, move on.
 */
export function ClientWaiting() {
  const [selected, setSelected] = useState<string>("");

  return (
    <section id="section-clients" aria-label="לקוחות שממתינים">
      <SectionHeading
        title="לקוחות שממתינים"
        caption={`${CLIENT_COMMS.length} פניות דורשות מענה · דינו הכין טיוטות לכולן`}
      />

      <ul className="mt-6 flex flex-col gap-3">
        {CLIENT_COMMS.map((comm) => {
          const open = comm.id === selected;
          return (
            <li key={comm.id}>
              <article
                className={cx(
                  "living-edge surface-paper relative rounded-xl transition-shadow",
                  open && "surface-paper-raised",
                )}
                data-live={open || undefined}
              >
                <button
                  type="button"
                  onClick={() => setSelected(open ? "" : comm.id)}
                  aria-expanded={open}
                  className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 rounded-xl px-5 py-4 text-start"
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-surface-sunken text-foreground-soft"
                    title={comm.channelLabel}
                  >
                    {CHANNEL_ICON[comm.channel]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                      <span className="text-small font-semibold text-foreground">
                        {comm.client}
                      </span>
                      <span className="text-micro text-foreground-faint">
                        {comm.matter}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-caption text-foreground-soft">
                      {comm.summary}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <StatusText status={comm.status} className="text-micro">
                      ממתין {comm.waiting}
                    </StatusText>
                    <span className="text-micro text-foreground-faint">
                      {comm.channelLabel}
                    </span>
                  </span>
                </button>

                {/* דינו's prepared response — revealed on selection */}
                {open ? (
                  <div className="animate-rise border-t border-line/60 px-5 pt-3.5 pb-4">
                    <p className="flex items-start gap-2 text-caption leading-relaxed text-foreground">
                      <AIMark className="mt-1 shrink-0" />
                      <span className="min-w-0 max-w-3xl rounded-md bg-gold-100/50 p-3">
                        {comm.dinoReply}
                      </span>
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-4">
                      <button
                        type="button"
                        className="inline-flex h-9 items-center rounded-md bg-ink-900 px-4 text-caption font-semibold text-paper-0 shadow-raised transition-all hover:-translate-y-px hover:bg-ink-800 hover:shadow-lift"
                        style={{ transitionDuration: "var(--motion-quick)" }}
                      >
                        {comm.action}
                      </button>
                      <button
                        type="button"
                        className="rounded-xs text-caption font-medium text-foreground-soft transition-colors hover:text-foreground"
                        style={{ transitionDuration: "var(--motion-quick)" }}
                      >
                        ערוך טיוטה
                      </button>
                      <span className="ms-auto text-micro text-foreground-faint">
                        טיוטה של דינו · לפי היסטוריית התיק
                      </span>
                    </div>
                  </div>
                ) : null}
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
