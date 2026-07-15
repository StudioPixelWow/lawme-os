"use client";

/**
 * /matters/new — create a real matter (Capability 2, Slice 1).
 * A small, honest intake: title, procedure type, and optional file no / forum.
 * Posts to the server route (server-side finalization) and opens the new room.
 * Rich intake (facts, parties, deadlines) is a later slice — a new matter
 * legitimately starts with no facts, which the room reports honestly.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Workspace } from "@/design-system/patterns/workspace";
import { PageHeader } from "@/design-system/patterns/page-header";
import { Button } from "@/design-system/primitives/button";

const PROCEDURES: { value: string; he: string }[] = [
  { value: "pregnancy_dismissal", he: "פיטורי עובדת בהיריון" },
  { value: "pre_dismissal_dispute", he: "מחלוקת טרום־פיטורים" },
  { value: "hearing_before_dismissal", he: "שימוע לפני פיטורים" },
  { value: "severance_claim", he: "תביעת פיצויי פיטורים" },
  { value: "wage_overtime_claim", he: "תביעת שכר ושעות נוספות" },
  { value: "pension_rights_claim", he: "תביעת זכויות פנסיה" },
  { value: "discrimination_claim", he: "תביעת אפליה" },
  { value: "harassment_complaint", he: "תלונת הטרדה" },
  { value: "regional_labor_court_civil", he: "הליך אזרחי — אזורי לעבודה" },
  { value: "appeal_to_national_labor_court", he: "ערעור לארצי לעבודה" },
  { value: "national_insurance_claim", he: "תביעת ביטוח לאומי" },
  { value: "settlement_enforcement", he: "אכיפת פשרה" },
];

export default function NewMatterPage() {
  const router = useRouter();
  const [titleHe, setTitleHe] = useState("");
  const [procedureType, setProcedureType] = useState(PROCEDURES[0].value);
  const [fileNoHe, setFileNoHe] = useState("");
  const [forumHe, setForumHe] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/matters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titleHe, procedureType, fileNoHe, forumHe }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.messageHe || "יצירת התיק נכשלה."); setBusy(false); return; }
      router.push(json.href);
    } catch {
      setError("יצירת התיק נכשלה. נסה שוב.");
      setBusy(false);
    }
  }

  const field = "mt-1 w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-small text-foreground outline-none focus:border-ink-500";
  const label = "block text-caption text-foreground-soft";

  return (
    <Workspace>
      <PageHeader title="תיק חדש" context="פתיחת תיק חדש. הפרטים המהותיים — עובדות, ראיות, מועדים — יתווספו בתוך החדר." />
      <form onSubmit={submit} dir="rtl" className="mt-6 max-w-xl space-y-4">
        <div>
          <label className={label} htmlFor="title">כותרת התיק</label>
          <input id="title" required value={titleHe} onChange={(e) => setTitleHe(e.target.value)}
            placeholder="למשל: כהן נ׳ טק־לייף" className={field} />
        </div>
        <div>
          <label className={label} htmlFor="proc">סוג הליך</label>
          <select id="proc" value={procedureType} onChange={(e) => setProcedureType(e.target.value)} className={field}>
            {PROCEDURES.map((p) => <option key={p.value} value={p.value}>{p.he}</option>)}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="fileno">מספר תיק (אופציונלי)</label>
            <input id="fileno" value={fileNoHe} onChange={(e) => setFileNoHe(e.target.value)} className={field} />
          </div>
          <div>
            <label className={label} htmlFor="forum">פורום (אופציונלי)</label>
            <input id="forum" value={forumHe} onChange={(e) => setForumHe(e.target.value)}
              placeholder="בית הדין האזורי לעבודה…" className={field} />
          </div>
        </div>
        {error && (
          <p role="alert" className="rounded-lg border border-status-risk/30 bg-status-risk-wash/50 p-3 text-small text-status-risk">{error}</p>
        )}
        <div className="flex gap-2 pt-2">
          <Button intent="primary" disabled={busy || titleHe.trim().length < 2}>{busy ? "פותח…" : "פתח תיק"}</Button>
          <Button type="button" onClick={() => router.push("/matters")}>ביטול</Button>
        </div>
      </form>
    </Workspace>
  );
}
