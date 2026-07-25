import { cx } from "@/design-system/utils/cx";
import { IconContainer } from "@/design-system/primitives/icon-container";
import { BriefcaseGlyph, LockGlyph } from "@/design-system/icons/glyphs";
import type { WorkspaceHero } from "../types";
import { MetaField, ToneText } from "./section";

const PRIORITY_NAVY: Record<WorkspaceHero["priority"]["level"], string> = {
  urgent: "border-status-urgent-onnavy/50 text-status-urgent-onnavy",
  high: "border-status-today-onnavy/50 text-status-today-onnavy",
  normal: "border-paper-0/20 text-ink-200",
};

/**
 * The Matter Hero — the one place that answers "what is this and where does it
 * stand" in a glance. A single navy band; identity leads, one status chip and
 * (only when it earns it) the priority own the color.
 */
export function MatterHeroBand({ hero }: { hero: WorkspaceHero }) {
  return (
    <section className="surface-navy rounded-xl px-6 py-6 shadow-raised md:px-8 md:py-7">
      <div className="flex flex-wrap items-start gap-4">
        <IconContainer variant="matter" size="xl" surface="navy" className="mt-0.5">
          <BriefcaseGlyph size={24} />
        </IconContainer>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-caption text-ink-300">
            <span>{hero.legalDomainHe}</span>
            <span aria-hidden className="text-ink-500">›</span>
            <span className="truncate">{hero.procedureLabelHe}</span>
          </div>
          <h1 className="mt-1 text-title font-semibold tracking-tight text-balance text-paper-0">
            {hero.titleHe}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <ToneText tone={hero.statusTone} surface="navy">{hero.statusLabelHe}</ToneText>
            <span
              className={cx(
                "inline-flex items-center rounded-pill border px-3 py-0.5 text-micro font-medium",
                PRIORITY_NAVY[hero.priority.level],
              )}
            >
              עדיפות: {hero.priority.labelHe}
            </span>
            {hero.confidentialityHe ? (
              <span className="inline-flex items-center gap-1.5 text-micro font-medium text-gold-300">
                <LockGlyph size={13} aria-hidden />
                {hero.confidentialityHe}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-6 border-t border-paper-0/10 pt-5">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3 lg:grid-cols-4">
          <MetaField label="לקוח" value={hero.clientNameHe} />
          <MetaField label="עורך הדין האחראי" value={hero.responsibleLawyerHe} />
          <MetaField label="שלב" value={hero.stageLabelHe} />
          <MetaField label="נפתח" value={hero.createdLabelHe} />
          {hero.fileNoHe ? <MetaField label="מספר תיק" value={hero.fileNoHe} /> : null}
          {hero.forumHe ? <MetaField label="פורום" value={hero.forumHe} /> : null}
        </dl>
      </div>
    </section>
  );
}
