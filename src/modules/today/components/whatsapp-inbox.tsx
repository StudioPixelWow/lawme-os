"use client";

import { useState } from "react";
import { ChatGlyph, PenGlyph, PreviewGlyph } from "@/design-system/icons/glyphs";
import { ICON } from "@/design-system/icons/tokens";
import { AIMark, StatusText } from "@/design-system/primitives/indicators";
import { cx } from "@/design-system/utils/cx";
import type {
  SuggestionStatus,
  WhatsAppMessage,
  WhatsAppStatus,
} from "../office";

type Filter = "all" | "urgent" | "clients" | "leads";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "הכל" },
  { id: "urgent", label: "דחוף" },
  { id: "clients", label: "לקוחות" },
  { id: "leads", label: "לידים" },
];

const BADGE: Record<WhatsAppStatus, { label: string; status: "new" | "urgent" | "waiting" }> = {
  new: { label: "חדש", status: "new" },
  urgent: { label: "דחוף", status: "urgent" },
  waiting: { label: "ממתין", status: "waiting" },
};

/** Local, per-card interaction state (mock — no live API yet). */
type CardState = {
  suggestion?: string;
  status: SuggestionStatus | "sent";
  editing: boolean;
};

function WhatsAppInboxHeader({
  count,
  filter,
  onFilter,
}: {
  count: number;
  filter: Filter;
  onFilter: (f: Filter) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2.5 text-heading font-semibold tracking-tight text-foreground">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-sunken text-status-completed shadow-seat">
            <ChatGlyph size={ICON.nav} />
          </span>
          WhatsApp — מענה חכם עם דינו
        </h2>
        <p className="mt-1 text-caption text-foreground-faint">
          הודעות שממתינות למענה והצעות תגובה מוכנות לשליחה ·{" "}
          <span className="font-semibold text-foreground">{count} ממתינות</span>
        </p>
      </div>

      {/* filters */}
      <div
        role="group"
        aria-label="סינון הודעות"
        className="flex items-center gap-1 rounded-lg bg-surface-sunken/70 p-1"
      >
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onFilter(f.id)}
            aria-pressed={filter === f.id}
            className={cx(
              "rounded-md px-3 py-1.5 text-caption font-medium transition-colors",
              filter === f.id
                ? "bg-surface-raised text-foreground shadow-seat"
                : "text-foreground-faint hover:text-foreground",
            )}
            style={{ transitionDuration: "var(--motion-quick)" }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="ms-auto shrink-0 rounded-xs text-caption font-semibold text-gold-700 transition-colors hover:text-gold-600"
        style={{ transitionDuration: "var(--motion-quick)" }}
      >
        הצג את כל השיחות ←
      </button>
    </div>
  );
}

function DinoReplySuggestion({
  message,
  state,
  onGenerate,
  onEdit,
  onSaveEdit,
  onSend,
}: {
  message: WhatsAppMessage;
  state: CardState;
  onGenerate: () => void;
  onEdit: () => void;
  onSaveEdit: (text: string) => void;
  onSend: () => void;
}) {
  const [draft, setDraft] = useState(state.suggestion ?? "");

  if (state.status === "sent") {
    return (
      <div
        role="status"
        className="mt-4 flex items-center gap-2 rounded-lg bg-status-completed-wash px-4 py-3 text-caption font-semibold text-status-completed"
      >
        <ChatGlyph size={ICON.inline} aria-hidden />
        נשלח בהצלחה ל{message.contactName}
      </div>
    );
  }

  if (state.status === "idle") {
    return (
      <button
        type="button"
        onClick={onGenerate}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-line-strong bg-surface-raised px-4 py-3 text-caption font-semibold text-foreground transition-all hover:-translate-y-px hover:shadow-lift"
        style={{ transitionDuration: "var(--motion-quick)" }}
      >
        <AIMark />
        צור הצעה עם דינו
      </button>
    );
  }

  if (state.status === "generating") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="mt-4 rounded-lg bg-ink-100/50 px-4 py-3"
      >
        <p className="flex items-center gap-2 text-caption font-medium text-foreground-soft">
          <AIMark className="animate-breath" />
          דינו מכין תגובה…
        </p>
        <div aria-hidden className="mt-2.5 flex flex-col gap-1.5">
          <span className="h-1.5 w-4/5 rounded-pill bg-ink-100" />
          <span className="h-1.5 w-3/5 rounded-pill bg-ink-100" />
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mt-4 rounded-lg bg-status-urgent-wash px-4 py-3">
        <p className="text-caption font-medium text-status-urgent">
          לא הצלחנו ליצור הצעה.
        </p>
        <button
          type="button"
          onClick={onGenerate}
          className="mt-1.5 rounded-xs text-caption font-semibold text-foreground hover:text-ink-700"
        >
          נסה שוב ←
        </button>
      </div>
    );
  }

  /* ready / edited */
  return (
    <div className="mt-4">
      <p className="flex items-center gap-2 text-micro font-semibold tracking-wide text-foreground-faint">
        <AIMark />
        הצעת תגובה של דינו
        {state.status === "edited" ? (
          <span className="rounded-xs bg-surface-sunken px-1.5 py-0.5 font-medium text-foreground-soft">
            נערך על ידך
          </span>
        ) : null}
      </p>

      {state.editing ? (
        <div className="mt-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            aria-label="עריכת הצעת התגובה"
            className="focus-gold w-full resize-none rounded-lg border border-line-strong bg-surface-raised p-3 text-caption leading-relaxed text-foreground"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => onSaveEdit(draft)}
              className="rounded-md bg-ink-900 px-4 py-1.5 text-caption font-semibold text-paper-0"
            >
              שמור
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-2 rounded-lg bg-ink-100/50 p-3.5 text-caption leading-relaxed text-foreground">
          {state.suggestion}
        </p>
      )}

      {!state.editing ? (
        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onSend}
            aria-label={`שלח ב-WhatsApp ל${message.contactName}`}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-ink-900 px-5 text-caption font-semibold text-paper-0 shadow-raised transition-all hover:-translate-y-px hover:bg-ink-800 hover:shadow-lift sm:w-auto"
            style={{ transitionDuration: "var(--motion-quick)" }}
          >
            <ChatGlyph size={ICON.inline} className="text-status-completed-onnavy" aria-hidden />
            שלח ב-WhatsApp
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(state.suggestion ?? "");
              onEdit();
            }}
            className="inline-flex h-10 items-center gap-1.5 rounded-md px-3 text-caption font-medium text-foreground-soft transition-colors hover:text-foreground"
            style={{ transitionDuration: "var(--motion-quick)" }}
          >
            <PenGlyph size={ICON.metadata} aria-hidden />
            ערוך
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center gap-1.5 rounded-md px-3 text-caption font-medium text-foreground-soft transition-colors hover:text-foreground"
            style={{ transitionDuration: "var(--motion-quick)" }}
          >
            <PreviewGlyph size={ICON.metadata} aria-hidden />
            פתח שיחה
          </button>
        </div>
      ) : null}
    </div>
  );
}

function WhatsAppMessageCard({ message }: { message: WhatsAppMessage }) {
  const [state, setState] = useState<CardState>({
    suggestion: message.dinoSuggestion,
    status: message.suggestionStatus,
    editing: false,
  });
  const badge = BADGE[message.status];

  return (
    <article
      className="living-edge flex h-full flex-col rounded-xl border border-ink-900/10 bg-surface-raised p-5 transition-all hover:-translate-y-0.5 hover:shadow-lift"
      style={{
        transitionDuration: "var(--motion-quick)",
        boxShadow: "0 8px 24px rgb(10 29 54 / 0.05)",
      }}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-ink-900 text-small font-medium text-paper-0 shadow-seat"
        >
          {message.initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="text-small font-semibold text-foreground">
              {message.contactName}
            </span>
            <StatusText status={badge.status} className="text-micro">
              {badge.label}
            </StatusText>
            <time className="ms-auto text-micro tabular-nums text-foreground-faint">
              {message.timestamp}
            </time>
          </div>
          {message.caseName ? (
            <p className="mt-0.5 truncate text-micro text-foreground-faint">
              {message.caseName}
            </p>
          ) : null}
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-caption leading-relaxed text-foreground-soft">
        {message.messagePreview}
      </p>

      <div className="mt-auto">
        <DinoReplySuggestion
          message={message}
          state={state}
          onGenerate={() => {
            setState((s) => ({ ...s, status: "generating" }));
            window.setTimeout(() => {
              setState({
                suggestion:
                  "שלום אורי, שמחנו על השיחה. הצעת שכר הטרחה מוכנה ותישלח אליך היום — נשמח לקבוע שיחה קצרה לעבור עליה יחד.",
                status: "ready",
                editing: false,
              });
            }, 900);
          }}
          onEdit={() => setState((s) => ({ ...s, editing: true }))}
          onSaveEdit={(text) =>
            setState({ suggestion: text, status: "edited", editing: false })
          }
          onSend={() => setState((s) => ({ ...s, status: "sent" }))}
        />
      </div>
    </article>
  );
}

/**
 * WhatsAppAIInbox — the smart inbox inside the workspace. Light
 * surface only (never navy): waiting messages, דינו's prepared
 * replies, and full user control before anything is sent.
 * Data arrives as props; mock until the WhatsApp endpoint exists.
 */
export function WhatsAppAIInbox({ messages }: { messages: WhatsAppMessage[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const visible = messages.filter((m) => {
    if (filter === "urgent") return m.status === "urgent";
    if (filter === "clients") return m.kind === "client";
    if (filter === "leads") return m.kind === "lead";
    return true;
  });

  return (
    <section
      id="section-whatsapp"
      aria-label="WhatsApp — מענה חכם עם דינו"
      className="surface-paper rounded-xl p-6 md:p-7"
    >
      <WhatsAppInboxHeader
        count={messages.length}
        filter={filter}
        onFilter={setFilter}
      />

      {visible.length > 0 ? (
        <ul className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((message) => (
            <li key={message.id} className="min-w-0">
              <WhatsAppMessageCard message={message} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 rounded-lg bg-surface-sunken/60 px-4 py-6 text-center text-caption text-foreground-faint">
          אין הודעות בסינון הזה — הכול נענה.
        </p>
      )}
    </section>
  );
}
