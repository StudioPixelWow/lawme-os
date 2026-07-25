/**
 * /dev/dino — development-only preview of the Reasoned Dino experience
 * (Capability 4, Slice 4.1.0). Renders the real pipeline output (deterministic
 * provider — no key, no network) inside the panel chrome, so the grounded legal
 * opinion can be reviewed/screenshotted without auth. Gated out of production.
 * `?scenario=matter|general|missing|out_of_scope|provider_fallback`,
 * `?view=full` for the full research view.
 */
import { notFound } from "next/navigation";
import { SparkleGlyph } from "@/design-system/icons/glyphs";
import { reasonedFixtureResponse, type ReasonedScenario } from "@/modules/dino/reasoned/fixtures";
import { ReasonedAnswer } from "@/modules/dino/reasoned/components/reasoned-answer";
import { isDevInterfaceEnabled } from "../legal-intelligence/gate";

export const dynamic = "force-dynamic";

const SCENARIOS: ReasonedScenario[] = ["matter", "general", "missing", "out_of_scope", "provider_fallback"];

export default async function ReasonedDinoPreview({ searchParams }: { searchParams: Promise<{ scenario?: string; view?: string }> }) {
  if (!isDevInterfaceEnabled(process.env)) notFound();
  const { scenario, view } = await searchParams;
  const name: ReasonedScenario = SCENARIOS.includes(scenario as ReasonedScenario) ? (scenario as ReasonedScenario) : "matter";
  const r = await reasonedFixtureResponse(name);
  const full = view === "full";

  const header = (
    <header className="flex items-center gap-3 border-b border-line px-5 py-4">
      <SparkleGlyph size={18} className="text-gold-600" />
      <div className="flex-1">
        <p className="text-subheading font-semibold text-foreground">דינו</p>
        <p className="text-caption text-foreground-faint">עוזר משפטי · חוות דעת מבוססת מקורות</p>
      </div>
    </header>
  );

  if (full) {
    return (
      <div className="min-h-screen bg-environment p-6">
        <div className="mx-auto max-w-3xl rounded-xl bg-surface p-6 shadow-raised md:p-8">
          <p className="mb-3 text-caption text-foreground-faint">תצוגת מחקר מלאה</p>
          <p className="mb-3 text-small font-medium text-foreground">{r.question}</p>
          <ReasonedAnswer r={r} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-environment p-6">
      <div className="glass mx-auto flex min-h-[calc(100vh-3rem)] w-[27rem] max-w-full flex-col rounded-xl">
        {header}
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div className="ms-auto w-fit max-w-[85%] rounded-md bg-surface-sunken px-3 py-2 text-small text-foreground">{r.question}</div>
          <ReasonedAnswer r={r} />
        </div>
      </div>
    </div>
  );
}
