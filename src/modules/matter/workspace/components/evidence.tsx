import { EvidenceGlyph } from "@/design-system/icons/glyphs";
import type { WorkspaceEvidence, EvidenceView } from "../types";
import { WorkspaceSection, EmptyNote, ToneChip } from "./section";

function EvidenceRow({ e }: { e: EvidenceView }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <div className="truncate text-small font-medium text-foreground">{e.labelHe}</div>
        <div className="text-caption text-foreground-faint">{e.evidenceTypeLabelHe}</div>
      </div>
      <ToneChip tone={e.tone}>{e.statusLabelHe}</ToneChip>
    </li>
  );
}

export function EvidenceSection({ evidence }: { evidence: WorkspaceEvidence }) {
  const meta = evidence.total > 0 ? `${evidence.total} פריטים` : undefined;
  return (
    <WorkspaceSection title="ראיות" icon={<EvidenceGlyph size={16} />} iconVariant="research" meta={meta}>
      {evidence.total === 0 ? (
        <EmptyNote line="טרם הוגדרו דרישות ראייתיות. ראיות החובה והמשלימות יופיעו כאן." />
      ) : (
        <div className="space-y-4">
          {evidence.groups.map((group) => (
            <div key={group.key}>
              <div className="mb-1 flex items-center justify-between text-caption font-semibold text-foreground-soft">
                <span>{group.labelHe}</span>
                <span className="tabular-nums text-foreground-faint">
                  {group.collected}/{group.total} נאספו
                </span>
              </div>
              <ul className="divide-y divide-line/70">
                {group.items.map((e) => (
                  <EvidenceRow key={e.id} e={e} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </WorkspaceSection>
  );
}
