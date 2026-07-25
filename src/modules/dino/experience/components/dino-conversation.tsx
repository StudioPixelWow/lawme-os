"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { cx } from "@/design-system/utils/cx";
import { SparkleGlyph } from "@/design-system/icons/glyphs";
import type { GroundedResponse, ConfidenceView } from "../types";

/** Derive the Dino context from the current route (no mode is ever chosen). */
function useDinoContext(): { matterId: string | null; labelHe: string } {
  const pathname = usePathname();
  const m = pathname.match(/\/matters\/([^/?#]+)/);
  const matterId = m && m[1] !== "new" ? m[1] : null;
  return { matterId, labelHe: matterId ? "הקשר: התיק הנוכחי" : "מחקר משפטי כללי" };
}

type Turn = { id: number; question: string; response: GroundedResponse | null; error: string | null };

const CONFIDENCE_TONE: Record<ConfidenceView["level"], string> = {
  high: "text-status-completed", moderate: "text-status-today", low: "text-status-risk", none: "text-foreground-faint",
};

function Chip({ children, tone }: { children: React.ReactNode; tone?: string }) {
  return <span className={cx("inline-flex items-center rounded-xs bg-surface-sunken px-1.5 py-0.5 text-micro font-medium", tone ?? "text-foreground-soft")}>{children}</span>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <div className="text-micro font-semibold tracking-wide text-foreground-faint">{title}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

export function ResponseCard({ r }: { r: GroundedResponse }) {
  return (
    <div className="rounded-md border-s-2 border-accent bg-gold-100/60 p-4 text-small text-foreground">
      {r.noticeHe ? (
        <p className="mb-2 rounded-sm bg-surface-raised/80 px-2.5 py-1.5 text-caption text-foreground-soft">{r.noticeHe}</p>
      ) : null}

      <p className="font-semibold text-pretty">{r.executiveSummaryHe}</p>
      {r.legalAnalysisHe ? <p className="mt-2 whitespace-pre-line text-pretty text-foreground-soft">{r.legalAnalysisHe}</p> : null}

      {r.legislation.length > 0 ? (
        <Section title="חקיקה רלוונטית">
          <ul className="space-y-1.5">
            {r.legislation.map((l) => (
              <li key={l.recordId} className="flex flex-wrap items-center gap-1.5">
                {l.url ? <a href={l.url} target="_blank" rel="noreferrer" className="text-foreground underline decoration-line-strong underline-offset-2">{l.citationHe}</a> : <span>{l.citationHe}</span>}
                {l.binding ? <Chip tone="text-status-completed">מחייבת</Chip> : null}
                {l.verification !== "verified" ? <Chip tone="text-status-risk">טעון אימות</Chip> : <Chip tone="text-status-completed">מאומת</Chip>}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {r.caseLaw.length > 0 ? (
        <Section title="פסיקה">
          <ul className="space-y-1.5">
            {r.caseLaw.map((c) => (
              <li key={c.recordId}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span>{c.citationHe}</span>
                  {c.court ? <Chip>{c.court}</Chip> : null}
                </div>
                {c.caveatHe ? <p className="text-caption text-status-risk">{c.caveatHe}</p> : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {r.conflicts.length > 0 ? (
        <Section title="אסמכתאות מתנגשות">
          <ul className="space-y-1">
            {r.conflicts.map((c, i) => (
              <li key={i} className={cx("text-caption", c.severity === "critical" ? "text-status-urgent" : "text-status-today")}>{c.descriptionHe}</li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="רמת ביטחון">
        <span className={cx("text-small font-semibold", CONFIDENCE_TONE[r.confidence.level])}>{r.confidence.labelHe}</span>
        {r.confidence.reasonsHe.length > 0 ? <span className="text-caption text-foreground-faint"> · {r.confidence.reasonsHe.join(" · ")}</span> : null}
      </Section>

      {r.sources.length > 0 ? (
        <Section title="מקורות">
          <ul className="space-y-0.5 text-caption text-foreground-soft">
            {r.sources.map((s) => (
              <li key={s.recordId}>
                {s.url ? <a href={s.url} target="_blank" rel="noreferrer" className="underline decoration-line-strong underline-offset-2">{s.citationHe}</a> : s.citationHe}
                {s.verification !== "verified" ? <span className="text-status-risk"> (טעון אימות)</span> : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {r.followUpQuestions.length > 0 ? (
        <Section title="כדי להמשיך — שאלות הבהרה">
          <ul className="list-disc space-y-0.5 ps-4 text-caption text-foreground-soft">
            {r.followUpQuestions.map((q) => <li key={q.code}>{q.questionHe}</li>)}
          </ul>
        </Section>
      ) : null}

      <p className="mt-3 flex items-center gap-1.5 text-micro text-foreground-faint">
        <SparkleGlyph size={11} className="text-gold-600" />
        דינו · {r.meta.proseProvider === "anthropic" ? "מנוסח בסיוע מודל, מבוסס על מקורות מאומתים בלבד" : "ריכוז ממצאים מאומתים"} · אין להסתמך ללא בדיקת עורך דין
      </p>
    </div>
  );
}

/** The live Dino conversation — the body of the global Dino panel. */
export function DinoConversation() {
  const { matterId, labelHe } = useDinoContext();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy]);

  const ask = useCallback(async (question: string) => {
    const id = turns.length + 1;
    setTurns((t) => [...t, { id, question, response: null, error: null }]);
    setBusy(true);
    try {
      const res = await fetch("/api/dino/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question, matterId, page: window.location.pathname }),
      });
      if (!res.ok) throw new Error(`http_${res.status}`);
      const response = (await res.json()) as GroundedResponse;
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, response } : x)));
    } catch {
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, error: "אירעה שגיאה. נסה שוב." } : x)));
    } finally {
      setBusy(false);
    }
  }, [turns.length, matterId]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (q.length < 2 || busy) return;
    setInput("");
    void ask(q);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-line px-5 py-2">
        <span className="text-caption text-foreground-faint">{labelHe}</span>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
        {turns.length === 0 ? (
          <div className="rounded-md border-s-2 border-accent bg-gold-100 p-4">
            <p className="text-small text-foreground">שלום, אני דינו. שאל אותי שאלה משפטית בדיני עבודה — אבצע מחקר מבוסס מקורות ואשיב עם החקיקה, הפסיקה ורמת הביטחון.</p>
          </div>
        ) : null}

        {turns.map((t) => (
          <div key={t.id} className="space-y-2">
            <div className="ms-auto w-fit max-w-[85%] rounded-md bg-surface-sunken px-3 py-2 text-small text-foreground">{t.question}</div>
            {t.response ? <ResponseCard r={t.response} /> : t.error ? (
              <p className="text-caption text-status-urgent">{t.error}</p>
            ) : (
              <p className="flex items-center gap-1.5 text-caption text-foreground-faint">
                <SparkleGlyph size={12} className="animate-breath text-gold-600" /> דינו חוקר…
              </p>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={onSubmit} className="border-t border-line p-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
          placeholder="שאל את דינו שאלה משפטית…"
          className="h-11 w-full rounded-sm bg-surface-raised px-4 text-small text-foreground shadow-hairline outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-60"
        />
      </form>
    </div>
  );
}
