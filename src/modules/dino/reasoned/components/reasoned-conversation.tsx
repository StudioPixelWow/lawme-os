"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { CloseGlyph } from "@/design-system/icons/glyphs";
import type { ReasonedDinoResponse } from "../types";
import { ReasonedAnswer } from "./reasoned-answer";
import { CompactAnswer } from "./compact-answer";
import { InvestigationProgress } from "./investigation-progress";
import { ConversationMemory } from "./presentation";

function useDinoContext(): { matterId: string | null; labelHe: string } {
  const pathname = usePathname();
  const m = pathname.match(/\/matters\/([^/?#]+)/);
  const matterId = m && m[1] !== "new" ? m[1] : null;
  return { matterId, labelHe: matterId ? "הקשר: התיק הנוכחי" : "מחקר משפטי כללי" };
}

type Turn = { id: number; question: string; response: ReasonedDinoResponse | null; error: string | null };

export function ReasonedConversation() {
  const { matterId, labelHe } = useDinoContext();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [full, setFull] = useState<ReasonedDinoResponse | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [turns, busy]);

  const ask = useCallback(async (question: string) => {
    const id = turns.length + 1;
    // Carry only structured conversation state (question + prior bottom lines).
    const history = turns.flatMap((t) => t.response ? [{ role: "user" as const, content: t.question }, { role: "assistant" as const, content: t.response.bottomLine.statementHe }] : []);
    setTurns((t) => [...t, { id, question, response: null, error: null }]);
    setBusy(true);
    try {
      const res = await fetch("/api/dino/ask", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question, matterId, page: window.location.pathname, history }) });
      if (!res.ok) throw new Error(`http_${res.status}`);
      const response = (await res.json()) as ReasonedDinoResponse;
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, response } : x)));
    } catch {
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, error: "אירעה שגיאה. נסה שוב." } : x)));
    } finally { setBusy(false); }
  }, [turns, matterId]);

  const onSubmit = (e: React.FormEvent) => { e.preventDefault(); const q = input.trim(); if (q.length < 2 || busy) return; setInput(""); void ask(q); };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-line px-5 py-2"><span className="text-caption text-foreground-faint">{labelHe}</span></div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
        {turns.length === 0 ? (
          <div className="rounded-md border-s-2 border-accent bg-gold-100 p-4">
            <p className="text-small text-foreground">שלום, אני דינו. שאל שאלה משפטית בדיני עבודה — אבצע מחקר מבוסס מקורות, אנתח את חוות הדעת מול עובדות התיק, ואשיב עם המסקנה, הטיעון הנגדי ורמת הביטחון.</p>
          </div>
        ) : null}

        {turns.map((t) => (
          <div key={t.id} className="space-y-2">
            <div className="ms-auto w-fit max-w-[85%] rounded-md bg-surface-sunken px-3 py-2 text-small text-foreground">{t.question}</div>
            {t.response ? (
              <CompactAnswer r={t.response} onExpand={() => setFull(t.response)} />
            ) : t.error ? (
              <p className="text-caption text-status-urgent">{t.error}</p>
            ) : (
              <InvestigationProgress />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={onSubmit} className="space-y-2 border-t border-line p-4">
        {turns.length > 0 ? (
          <ConversationMemory
            matterActive={matterId !== null}
            factsCount={[...turns].reverse().find((t) => t.response)?.response?.applicationToMatter.established.length ?? 0}
            priorQuestions={turns.map((t) => t.question)}
          />
        ) : null}
        <input value={input} onChange={(e) => setInput(e.target.value)} disabled={busy} placeholder="שאל את דינו שאלה משפטית…" className="h-11 w-full rounded-sm bg-surface-raised px-4 text-small text-foreground shadow-hairline outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-60" />
      </form>

      {full ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/40 p-4 md:p-10" role="dialog" aria-modal="true" aria-label="תצוגת מחקר מלאה">
          <div className="relative w-full max-w-3xl rounded-xl bg-surface p-6 shadow-raised md:p-8">
            <button type="button" onClick={() => setFull(null)} aria-label="סגירה" className="absolute end-4 top-4 flex h-8 w-8 items-center justify-center rounded-pill text-foreground-soft hover:bg-surface-sunken"><CloseGlyph size={16} /></button>
            <p className="mb-3 text-caption text-foreground-faint">תצוגת מחקר מלאה</p>
            <p className="mb-3 text-small font-medium text-foreground">{full.question}</p>
            <ReasonedAnswer r={full} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
