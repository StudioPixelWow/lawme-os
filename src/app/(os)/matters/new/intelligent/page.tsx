"use client";

/**
 * /matters/new/intelligent — Intelligent Matter Intake (Capability 2, Slice 2A).
 *
 * A STRUCTURED intake workspace (not a chat window): input → analysis → review →
 * confirmation. The attorney describes the matter in free text (or pastes an
 * email); the deterministic pipeline returns a reviewable MatterIntakeDraft.
 * Nothing is a confirmed fact and nothing is persisted until the attorney
 * explicitly approves it. The canonical write plan is shown before creation.
 */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Workspace } from "@/design-system/patterns/workspace";
import { PageHeader } from "@/design-system/patterns/page-header";
import { Button } from "@/design-system/primitives/button";
import type { MatterIntakeDraft } from "@/modules/matter/intake/contracts";
import { buildConfirmationPlan, type CanonicalWritePlan, type IntakeApprovals } from "@/modules/matter/intake/confirm-plan";
import type { IntakeFactStatus, ParticipantRole } from "@/modules/matter/intake/contracts";

type Phase = "idle" | "analyzing" | "review" | "error";

const STATUS_HE: Record<string, string> = {
  client_alleged: "טענת הלקוח",
  opposing_alleged: "טענת הצד שכנגד",
  disputed: "שנוי במחלוקת",
  unknown: "לא ידוע",
};
const ROLE_HE: Record<ParticipantRole, string> = {
  client: "לקוח",
  opposing_party: "צד שכנגד",
  related_party: "צד קשור",
  witness: "עד",
  expert: "מומחה",
  counsel: "בא כוח",
  mediator: "מגשר",
  insurer: "מבטח",
};

const field =
  "mt-1 w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-small text-foreground outline-none focus:border-ink-500";
const label = "block text-caption text-foreground-soft";
const chip = "inline-flex items-center rounded-full px-2 py-0.5 text-micro";

function ConfBadge({ band }: { band: string }) {
  const tone =
    band === "high" ? "bg-gold-100 text-ink-900" : band === "moderate" ? "bg-surface-sunken text-foreground-soft" : "bg-status-risk-wash/60 text-status-risk";
  return <span className={`${chip} ${tone}`}>ביטחון: {band}</span>;
}

export default function IntelligentIntakePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [storyHe, setStoryHe] = useState("");
  const [pastedHe, setPastedHe] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<MatterIntakeDraft | null>(null);
  const [openSpan, setOpenSpan] = useState<string | null>(null);

  // Approval state (nothing approved by default — explicit human confirmation).
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [factStatus, setFactStatus] = useState<Record<string, IntakeFactStatus>>({});
  const [confidentiality, setConfidentiality] = useState<IntakeApprovals["matter"]["confidentiality"]>("client_confidential");
  const [aiPolicy, setAiPolicy] = useState<IntakeApprovals["matter"]["aiPolicy"]>("allowed_with_review");
  const [plan, setPlan] = useState<CanonicalWritePlan | null>(null);

  function toggle(id: string) {
    setApproved((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function analyze() {
    if (!storyHe.trim() && !pastedHe.trim()) return;
    setPhase("analyzing");
    setError(null);
    setPlan(null);
    try {
      const res = await fetch("/api/matters/intake/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyHe, pastedHe }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.messageHe || "הניתוח נכשל.");
        setPhase("error");
        return;
      }
      setDraft(json.draft as MatterIntakeDraft);
      setApproved(new Set());
      setPhase("review");
    } catch {
      setError("הניתוח נכשל. נסו שוב.");
      setPhase("error");
    }
  }

  const title = useMemo(() => {
    const client = draft?.contacts.find((c) => c.value.suggestedRole === "client")?.value.displayNameHe;
    const opp = draft?.contacts.find((c) => c.value.suggestedRole === "opposing_party")?.value.displayNameHe;
    return client && opp ? `${client} נ׳ ${opp}` : client ?? "תיק חדש";
  }, [draft]);

  function buildPlan() {
    if (!draft) return;
    const approvals: IntakeApprovals = {
      matter: { titleHe: title, procedureType: draft.suggestedProcedure, forumHe: draft.suggestedForumHe, confidentiality, aiPolicy },
      participants: draft.contacts
        .filter((c) => approved.has(c.id) && c.value.suggestedRole)
        .map((c) => ({ itemId: c.id, role: c.value.suggestedRole as ParticipantRole })),
      facts: draft.facts.filter((f) => approved.has(f.id)).map((f) => ({ itemId: f.id, status: factStatus[f.id] ?? f.value.suggestedStatus })),
      deadlines: draft.deadlines.filter((d) => approved.has(d.id)).map((d) => ({ itemId: d.id })),
      evidenceRequirements: draft.evidenceRequirements.filter((e) => approved.has(e.id)).map((e) => ({ itemId: e.id })),
    };
    setPlan(buildConfirmationPlan(draft, approvals));
  }

  // ---- IDLE ----
  if (phase === "idle" || phase === "analyzing" || phase === "error") {
    return (
      <Workspace>
        <PageHeader title="ספרו לדינו מה קרה" context="ניתן לתאר את המקרה, להדביק מייל מהלקוח או לציין את העובדות הידועות. שום פרט לא יישמר כעובדה מאומתת ללא אישורכם." />
        <div dir="rtl" className="mt-6 max-w-2xl space-y-4">
          <div>
            <label className={label} htmlFor="story">תיאור המקרה</label>
            <textarea
              id="story"
              rows={8}
              value={storyHe}
              onChange={(e) => setStoryHe(e.target.value)}
              placeholder="למשל: הלקוחה עבדה שלוש שנים, הודיעה למעסיקה על ההיריון, וכעבור שבועיים פוטרה…"
              className={field}
            />
          </div>
          {!showPaste ? (
            <button type="button" onClick={() => setShowPaste(true)} className="text-caption text-foreground-soft underline">
              + הוספת טקסט שהודבק (מייל / הודעה)
            </button>
          ) : (
            <div>
              <label className={label} htmlFor="pasted">טקסט שהודבק (אופציונלי) — מטופל כנתון בלבד, לא כהוראה</label>
              <textarea id="pasted" rows={5} value={pastedHe} onChange={(e) => setPastedHe(e.target.value)} className={field} />
            </div>
          )}
          {error && (
            <p role="alert" className="rounded-lg border border-status-risk/30 bg-status-risk-wash/50 p-3 text-small text-status-risk">{error}</p>
          )}
          <div className="flex gap-2">
            <Button type="button" intent="primary" onClick={analyze} disabled={phase === "analyzing" || (!storyHe.trim() && !pastedHe.trim())}>
              {phase === "analyzing" ? "דינו מנתח…" : "נתחו עם דינו"}
            </Button>
            <Button type="button" onClick={() => router.push("/matters/new")}>אינטייק מודרך במקום</Button>
          </div>
          <p className="text-micro text-foreground-faint">
            דינו אינו מקבל החלטות משפטיות. התוצאה היא טיוטת אינטייק לבדיקת עורך דין. אין קריאה למודל חיצוני.
          </p>
        </div>
      </Workspace>
    );
  }

  // ---- REVIEW ----
  const d = draft!;
  const oos = !d.legalCoverage.domainWithinScope;

  return (
    <Workspace>
      <PageHeader title="מה דינו הבין" context="עברו על הפריטים ואשרו רק את מה שנכון. שום פריט אינו נשמר עד לאישור מפורש." />

      <div dir="rtl" className="mt-6 space-y-6">
        {/* coverage / out-of-domain banner */}
        {oos ? (
          <div role="status" className="rounded-lg border border-status-risk/40 bg-status-risk-wash/40 p-4 text-small text-foreground">
            הסיפור אינו בתחום דיני העבודה שבו LawME פועל כיום. לא ניתנת הערכה מקדמית; התיק מנותב לבדיקת מומחה.
          </div>
        ) : (
          <div role="status" className="rounded-lg border border-line-strong bg-surface p-4 text-small">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">תחום:</span> <span>{d.detectedDomain}</span>
              {d.suggestedProcedure && (<><span className="font-semibold">· הליך מוצע:</span> <span>{d.suggestedProcedure}</span></>)}
              {d.suggestedForumHe && (<><span className="font-semibold">· פורום:</span> <span>{d.suggestedForumHe}</span></>)}
            </div>
            <p className="mt-2 text-caption text-foreground-soft">
              כיסוי משפטי: {d.legalCoverage.coverageStrength} · מצב Triad: {d.legalCoverage.coverageState}. {d.legalCoverage.caseLawCoverageHe}
            </p>
          </div>
        )}

        {/* clarification questions */}
        {d.clarificationQuestions.length > 0 && (
          <section>
            <h2 className="text-title font-semibold">שאלות הבהרה</h2>
            <ul className="mt-3 space-y-2">
              {d.clarificationQuestions.map((q) => (
                <li key={q.questionId} className="rounded-lg border border-line-strong bg-surface p-3 text-small">
                  <p className="font-medium">{q.questionHe}</p>
                  <p className="mt-1 text-caption text-foreground-soft">למה זה חשוב: {q.whyItMattersHe}</p>
                  <p className="text-micro text-foreground-faint">{q.skippable ? "ניתן לדלג" : "חובה"} · אם ידולג: {q.ifSkippedHe}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* participants */}
        <ReviewList
          titleHe="משתתפים"
          emptyHe="לא זוהו משתתפים."
          items={d.contacts.map((c) => ({
            id: c.id,
            headHe: `${c.value.displayNameHe} — ${c.value.suggestedRole ? ROLE_HE[c.value.suggestedRole] : "תפקיד לא ידוע"}`,
            band: c.confidence.band,
            span: c.span?.quoteHe ?? null,
            missing: c.missingInformation,
          }))}
          approved={approved}
          onToggle={toggle}
          openSpan={openSpan}
          setOpenSpan={setOpenSpan}
        />

        {/* facts / allegations */}
        <section>
          <h2 className="text-title font-semibold">אמירות מהותיות (טענות)</h2>
          <p className="text-caption text-foreground-soft">כל אמירה היא טענה שטרם אומתה — לעולם לא «עובדה מאומתת» באינטייק.</p>
          <ul className="mt-3 space-y-2">
            {d.facts.length === 0 && <li className="text-small text-foreground-soft">לא חולצו אמירות מהותיות.</li>}
            {d.facts.map((f) => (
              <li key={f.id} className="rounded-lg border border-line-strong bg-surface p-3 text-small">
                <div className="flex items-start justify-between gap-3">
                  <label className="flex items-start gap-2">
                    <input type="checkbox" checked={approved.has(f.id)} onChange={() => toggle(f.id)} className="mt-1" />
                    <span>{f.value.statementHe}</span>
                  </label>
                  <ConfBadge band={f.confidence.band} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label className="text-micro text-foreground-soft">סטטוס:</label>
                  <select
                    value={factStatus[f.id] ?? f.value.suggestedStatus}
                    onChange={(e) => setFactStatus((p) => ({ ...p, [f.id]: e.target.value as IntakeFactStatus }))}
                    className="rounded-md border border-line-strong bg-surface px-2 py-1 text-micro"
                  >
                    {(["client_alleged", "opposing_alleged", "disputed", "unknown"] as IntakeFactStatus[]).map((s) => (
                      <option key={s} value={s}>{STATUS_HE[s]}</option>
                    ))}
                  </select>
                  {f.span && (
                    <button type="button" className="text-micro underline text-foreground-faint" onClick={() => setOpenSpan(openSpan === f.id ? null : f.id)}>
                      {openSpan === f.id ? "הסתר מקור" : "הצג מקור"}
                    </button>
                  )}
                </div>
                {openSpan === f.id && f.span && (
                  <blockquote className="mt-2 border-r-2 border-accent pr-2 text-micro text-foreground-soft">«{f.span.quoteHe}»</blockquote>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* deadlines */}
        <ReviewList
          titleHe="תאריכים ומועדים"
          emptyHe="לא זוהו תאריכים."
          items={d.deadlines.map((dl) => ({
            id: dl.id,
            headHe: `${dl.value.labelHe}${dl.value.dueAt ? ` — ${dl.value.dueAt.slice(0, 10)}` : " — ללא תאריך ודאי"}`,
            band: dl.confidence.band,
            span: dl.span?.quoteHe ?? null,
            missing: dl.value.dueAt === null,
            noteHe: dl.value.ambiguityWarningHe ?? undefined,
          }))}
          approved={approved}
          onToggle={toggle}
          openSpan={openSpan}
          setOpenSpan={setOpenSpan}
        />

        {/* mentioned documents */}
        <ReviewList
          titleHe="מסמכים שהוזכרו"
          emptyHe="לא הוזכרו מסמכים."
          selectable={false}
          items={d.mentionedDocuments.map((m) => ({
            id: m.id,
            headHe: `${m.value.labelHe} — ${m.value.state === "reportedly_held" ? "נמסר שקיים" : m.value.state === "reportedly_missing" ? "נמסר שחסר" : "הוזכר"}`,
            band: m.confidence.band,
            span: m.span?.quoteHe ?? null,
            noteHe: "אזכור מסמך אינו ממלא דרישת ראיה",
          }))}
          approved={approved}
          onToggle={toggle}
          openSpan={openSpan}
          setOpenSpan={setOpenSpan}
        />

        {/* evidence requirements */}
        <ReviewList
          titleHe="דרישות ראיה"
          emptyHe="אין דרישות ראיה נגזרות."
          items={d.evidenceRequirements.map((e) => ({
            id: e.id,
            headHe: `${e.value.labelHe}${e.value.mandatory ? " (חובה)" : ""}`,
            band: e.confidence.band,
            span: null,
          }))}
          approved={approved}
          onToggle={toggle}
          openSpan={openSpan}
          setOpenSpan={setOpenSpan}
        />

        {/* preliminary legal issues */}
        <section>
          <h2 className="text-title font-semibold">סוגיות משפטיות מקדמיות</h2>
          <ul className="mt-3 space-y-2">
            {d.preliminaryLegalIssues.length === 0 && <li className="text-small text-foreground-soft">לא זוהו סוגיות מקדמיות.</li>}
            {d.preliminaryLegalIssues.map((i) => (
              <li key={i.id} className="rounded-lg border border-line-strong bg-surface p-3 text-small">{i.value.questionHe}</li>
            ))}
          </ul>
        </section>

        {/* coverage limitations + review route */}
        <section className="rounded-lg border border-line-strong bg-surface-sunken p-4 text-small">
          <h2 className="text-subheading font-semibold">כיסוי משפטי ומגבלות</h2>
          <ul className="mt-2 list-disc pr-5 text-caption text-foreground-soft">
            {d.legalCoverage.limitationsHe.map((l, i) => <li key={i}>{l}</li>)}
          </ul>
          <p className="mt-2 text-caption"><span className="font-semibold">ניתוב לבדיקה:</span> {d.reviewRoute.primaryTarget} — {d.reviewRoute.reasonsHe.join("; ")}</p>
          {d.warningsHe.length > 0 && (
            <ul className="mt-2 list-disc pr-5 text-micro text-status-risk">{d.warningsHe.map((w, i) => <li key={i}>{w}</li>)}</ul>
          )}
        </section>

        {/* matter policy + confirmation */}
        {!oos && (
          <section className="rounded-lg border border-line-strong bg-surface p-4">
            <h2 className="text-subheading font-semibold">מדיניות התיק ויצירה</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <label className={label} htmlFor="conf">סיווג חיסיון</label>
                <select id="conf" value={confidentiality} onChange={(e) => setConfidentiality(e.target.value as typeof confidentiality)} className={field}>
                  <option value="internal">פנימי</option>
                  <option value="client_confidential">חסוי — לקוח</option>
                  <option value="privileged">חסוי מוחלט</option>
                </select>
              </div>
              <div>
                <label className={label} htmlFor="ai">מדיניות AI</label>
                <select id="ai" value={aiPolicy} onChange={(e) => setAiPolicy(e.target.value as typeof aiPolicy)} className={field}>
                  <option value="allowed">מותר</option>
                  <option value="allowed_with_review">מותר עם בקרה</option>
                  <option value="prohibited">אסור</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button type="button" intent="primary" onClick={buildPlan}>הצג תוכנית יצירת תיק</Button>
              <Button type="button" onClick={() => { setPhase("idle"); setDraft(null); }}>התחל מחדש</Button>
            </div>
          </section>
        )}

        {/* the canonical write plan (dry-run) */}
        {plan && (
          <section className="rounded-lg border border-accent/40 bg-gold-100/40 p-4 text-small">
            <h2 className="text-subheading font-semibold">תוכנית יצירה — לאישור סופי</h2>
            <p className="mt-1 text-caption text-foreground-soft">ייווצרו רק הפריטים שאושרו. אף עובדה אינה נשמרת כ«מאומתת».</p>
            <ul className="mt-2 text-caption">
              <li>תיק: {plan.matter.titleHe} · {plan.matter.procedureType ?? "ללא הליך"} · חיסיון {plan.matter.confidentiality} · AI {plan.matter.aiPolicy}</li>
              <li>אנשי קשר/משתתפים: {plan.contacts.length}</li>
              <li>עובדות (טענות בלבד): {plan.facts.length}</li>
              <li>מועדים: {plan.deadlines.length}</li>
              <li>דרישות ראיה: {plan.evidenceRequirements.length}</li>
            </ul>
            {plan.audit.droppedForSafety.length > 0 && (
              <p className="mt-2 text-micro text-status-risk">נדחו מטעמי בטיחות: {plan.audit.droppedForSafety.join("; ")}</p>
            )}
            {plan.warningsHe.length > 0 && (
              <ul className="mt-1 list-disc pr-5 text-micro text-foreground-soft">{plan.warningsHe.map((w, i) => <li key={i}>{w}</li>)}</ul>
            )}
            <p className="mt-3 text-micro text-foreground-faint">
              יצירת התיק בפועל (כתיבה למסד) מתבצעת בשלב הבא, לאחר אישור המייסד — כדי לשמור על הפרדת אישור/כתיבה.
            </p>
          </section>
        )}
      </div>
    </Workspace>
  );
}

/* A small reusable, accessible review list with approve toggles + source span. */
function ReviewList(props: {
  titleHe: string;
  emptyHe: string;
  items: Array<{ id: string; headHe: string; band: string; span: string | null; missing?: boolean; noteHe?: string }>;
  approved: Set<string>;
  onToggle: (id: string) => void;
  openSpan: string | null;
  setOpenSpan: (id: string | null) => void;
  selectable?: boolean;
}) {
  const selectable = props.selectable !== false;
  return (
    <section>
      <h2 className="text-title font-semibold">{props.titleHe}</h2>
      <ul className="mt-3 space-y-2">
        {props.items.length === 0 && <li className="text-small text-foreground-soft">{props.emptyHe}</li>}
        {props.items.map((it) => (
          <li key={it.id} className="rounded-lg border border-line-strong bg-surface p-3 text-small">
            <div className="flex items-start justify-between gap-3">
              <label className="flex items-start gap-2">
                {selectable && <input type="checkbox" checked={props.approved.has(it.id)} onChange={() => props.onToggle(it.id)} className="mt-1" />}
                <span>{it.headHe}</span>
              </label>
              <span className={`${chip} bg-surface-sunken text-foreground-soft`}>ביטחון: {it.band}</span>
            </div>
            {it.noteHe && <p className="mt-1 text-micro text-foreground-faint">{it.noteHe}</p>}
            {it.missing && <p className="mt-1 text-micro text-status-risk">מידע חסר — נדרשת השלמה</p>}
            {it.span && (
              <button type="button" className="mt-1 text-micro underline text-foreground-faint" onClick={() => props.setOpenSpan(props.openSpan === it.id ? null : it.id)}>
                {props.openSpan === it.id ? "הסתר מקור" : "הצג מקור"}
              </button>
            )}
            {props.openSpan === it.id && it.span && (
              <blockquote className="mt-2 border-r-2 border-accent pr-2 text-micro text-foreground-soft">«{it.span}»</blockquote>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
