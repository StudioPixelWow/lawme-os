/**
 * /dev/dino — development-only preview of the Dino grounded response
 * (Capability 3, Slice 3.2.0). Renders the real pipeline output (deterministic
 * provider — no key, no network) inside the panel chrome, so the grounded
 * experience can be reviewed/screenshotted without auth. Gated out of
 * production. The live surface is the global Dino panel (⌘K → דינו).
 */
import { notFound } from "next/navigation";
import { SparkleGlyph } from "@/design-system/icons/glyphs";
import { runDinoTurn, deterministicProvider } from "@/modules/dino/experience";
import { ResponseCard } from "@/modules/dino/experience/components/dino-conversation";
import { buildMatterIntelligence } from "@/modules/matter/intelligence/derive";
import { workspaceFixtureInput } from "@/modules/matter/workspace/fixtures";
import { isDevInterfaceEnabled } from "../legal-intelligence/gate";

export const dynamic = "force-dynamic";

const QUESTION = "האם נדרש היתר לפי סעיף 9 לחוק עבודת נשים לפיטורי עובדת בהריון?";

export default async function DinoPreviewPage() {
  if (!isDevInterfaceEnabled(process.env)) notFound();
  const mi = buildMatterIntelligence(workspaceFixtureInput());
  const deps = { provider: deterministicProvider, fallbackProvider: deterministicProvider };
  const response = await runDinoTurn(
    { question: QUESTION, matterIntelligence: mi, contextKind: "matter", matterId: mi.identity.matterId, nowISO: "2026-07-25T09:00:00+03:00" },
    deps,
  );

  return (
    <div className="min-h-screen bg-environment p-6">
      <div className="glass mx-auto flex h-[calc(100vh-3rem)] w-[26rem] max-w-full flex-col rounded-xl">
        <header className="flex items-center gap-3 border-b border-line px-5 py-4">
          <SparkleGlyph size={18} className="text-gold-600" />
          <div className="flex-1">
            <p className="text-subheading font-semibold text-foreground">דינו</p>
            <p className="text-caption text-foreground-faint">הדינו המשפטי של המשרד</p>
          </div>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div className="ms-auto w-fit max-w-[85%] rounded-md bg-surface-sunken px-3 py-2 text-small text-foreground">{QUESTION}</div>
          <ResponseCard r={response} />
        </div>
      </div>
    </div>
  );
}
