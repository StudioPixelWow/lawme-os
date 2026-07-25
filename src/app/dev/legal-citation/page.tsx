/**
 * /dev/legal-citation — development-only preview of the P1-S1 verified
 * legislation citation experience (D-NOTICE + D-MINWAGE). Renders the real
 * deterministic answer builder over the verified corpus seed. Gated out of
 * production. `?scenario=notice|minwage-current|minwage-historical|needs-facts|out-of-scope`.
 */
import { notFound } from "next/navigation";
import { LegislationGlyph } from "@/design-system/icons/glyphs";
import { buildVerifiedLegislationAnswer, type AnswerRequest } from "@/modules/legal-corpus/answer";
import { LegislationAnswer } from "@/modules/legal-corpus/components/legislation-answer";
import { isDevInterfaceEnabled } from "../legal-intelligence/gate";

export const dynamic = "force-dynamic";

const NOW = "2026-07-25T09:00:00+03:00";

const SCENARIOS: { key: string; labelHe: string; req: AnswerRequest }[] = [
  { key: "notice", labelHe: "הודעה על תנאי עבודה — נענתה", req: { question: "האם מעסיק חייב למסור לעובד הודעה בכתב על תנאי העבודה?", contextKind: "general", asOfISO: NOW } },
  { key: "minwage-current", labelHe: "שכר מינימום — שיעור תקף", req: { question: "מהו שכר המינימום החל כיום?", contextKind: "general", asOfISO: NOW } },
  { key: "minwage-historical", labelHe: "שכר מינימום — שאלה היסטורית (לפני 1.4.2026)", req: { question: "מה היה שכר המינימום במרץ 2026?", contextKind: "general", asOfISO: "2026-03-15T09:00:00+03:00" } },
  { key: "needs-facts", labelHe: "שאלת תיק ללא עובדות מכריעות", req: { question: "האם ההודעה על תנאי העבודה בתיק נמסרה כדין?", contextKind: "matter", factsPresent: false, asOfISO: NOW } },
  { key: "out-of-scope", labelHe: "מחוץ לתחום המכוסה", req: { question: "האם מגיעים פיצויי פיטורים?", contextKind: "general", asOfISO: NOW } },
];

export default async function LegalCitationPreview({ searchParams }: { searchParams: Promise<{ scenario?: string }> }) {
  if (!isDevInterfaceEnabled(process.env)) notFound();
  const { scenario } = await searchParams;
  const shown = scenario ? SCENARIOS.filter((s) => s.key === scenario) : SCENARIOS;

  return (
    <div className="min-h-screen bg-environment p-6" dir="rtl">
      <div className="mx-auto max-w-2xl">
        <header className="mb-5 flex items-center gap-3">
          <LegislationGlyph size={20} className="text-gold-600" />
          <div>
            <p className="text-subheading font-semibold text-foreground">חקיקה מאומתת — First Trust Release</p>
            <p className="text-caption text-foreground-faint">P1-S1 · הודעה על תנאי עבודה + שכר מינימום · מקורות מאומתים בלבד</p>
          </div>
        </header>
        <div className="space-y-6">
          {shown.map((s) => (
            <div key={s.key}>
              <p className="mb-1.5 text-caption font-medium text-foreground-soft">{s.labelHe}</p>
              <p className="mb-2 text-micro text-foreground-faint">שאלה: {s.req.question}</p>
              <LegislationAnswer a={buildVerifiedLegislationAnswer(s.req)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
