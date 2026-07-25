import { DocumentGlyph, PreviewGlyph } from "@/design-system/icons/glyphs";
import { IconContainer } from "@/design-system/primitives/icon-container";
import type { WorkspaceDocuments, DocumentView } from "../types";
import { WorkspaceSection, EmptyNote, ToneChip } from "./section";

function DocumentRow({ d }: { d: DocumentView }) {
  return (
    <li className="group flex items-center gap-3 py-3">
      <IconContainer variant="document" size="md">
        <DocumentGlyph size={16} />
      </IconContainer>
      <div className="min-w-0 flex-1">
        <div className="truncate text-small font-medium text-foreground">{d.titleHe}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-caption text-foreground-faint">
          <span>{d.documentTypeLabelHe}</span>
          <span aria-hidden className="text-line-strong">·</span>
          <span>{d.evidenceTypeLabelHe}</span>
          {d.dateLabelHe ? (
            <>
              <span aria-hidden className="text-line-strong">·</span>
              <span className="tabular-nums">{d.dateLabelHe}</span>
            </>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <ToneChip tone={d.approvalTone}>{d.approvalLabelHe}</ToneChip>
        <span
          aria-hidden
          className="text-foreground-faint opacity-0 transition-opacity group-hover:opacity-100"
          style={{ transitionDuration: "var(--motion-quick)" }}
        >
          <PreviewGlyph size={16} />
        </span>
      </div>
    </li>
  );
}

export function DocumentsSection({ documents }: { documents: WorkspaceDocuments }) {
  const meta =
    documents.total > documents.shown
      ? `${documents.shown} מתוך ${documents.total}`
      : documents.total > 0
        ? `${documents.total} מסמכים`
        : undefined;
  return (
    <WorkspaceSection title="מסמכים אחרונים" icon={<DocumentGlyph size={16} />} iconVariant="document" meta={meta}>
      {documents.total === 0 ? (
        <EmptyNote line="טרם הועלו מסמכים. המסמכים האחרונים יופיעו כאן, מוכנים לתצוגה." />
      ) : (
        <ul className="divide-y divide-line-strong">
          {documents.items.map((d) => (
            <DocumentRow key={d.id} d={d} />
          ))}
        </ul>
      )}
    </WorkspaceSection>
  );
}
