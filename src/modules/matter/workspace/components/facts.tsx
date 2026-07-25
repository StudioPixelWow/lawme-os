import { BookGlyph } from "@/design-system/icons/glyphs";
import type { WorkspaceFacts, FactView } from "../types";
import { WorkspaceSection, EmptyNote, ToneChip, ToneText } from "./section";

function FactItem({ fact }: { fact: FactView }) {
  return (
    <details className="group border-t border-line-strong py-3 first:border-t-0">
      <summary className="flex cursor-pointer list-none items-start gap-3 [&::-webkit-details-marker]:hidden">
        <ToneChip tone={fact.tone}>{fact.statusLabelHe}</ToneChip>
        <span className="min-w-0 flex-1 text-small text-pretty text-foreground">{fact.statementHe}</span>
        <span
          aria-hidden
          className="mt-0.5 shrink-0 text-foreground-faint transition-transform group-open:-rotate-90"
          style={{ transitionDuration: "var(--motion-quick)" }}
        >
          ‹
        </span>
      </summary>
      <div className="mt-2 ps-1 text-caption text-foreground-faint">
        <span className="text-foreground-soft">מקור:</span> {fact.sourceHe ?? "לא תועד מקור"}
        <span className="mx-2 text-line-strong">·</span>
        <span className="font-mono text-micro">{fact.factKey}</span>
      </div>
    </details>
  );
}

export function FactsSection({ facts }: { facts: WorkspaceFacts }) {
  const meta = facts.total > 0 ? `${facts.total} עובדות` : undefined;
  return (
    <WorkspaceSection title="עובדות" icon={<BookGlyph size={16} />} iconVariant="info" meta={meta}>
      {facts.total === 0 ? (
        <EmptyNote line="טרם הוזנו עובדות. עובדות התיק והסיווג האפיסטמי שלהן יופיעו כאן." />
      ) : (
        <div className="space-y-5">
          {facts.groups.map((group) => (
            <div key={group.key}>
              <div className="mb-1 flex items-center justify-between">
                <ToneText tone={group.tone}>{group.labelHe}</ToneText>
                <span className="text-micro tabular-nums text-foreground-faint">{group.facts.length}</span>
              </div>
              <div>
                {group.facts.map((fact) => (
                  <FactItem key={fact.id} fact={fact} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </WorkspaceSection>
  );
}
