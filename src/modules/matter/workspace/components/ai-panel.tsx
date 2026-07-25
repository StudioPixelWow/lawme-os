import { IconContainer } from "@/design-system/primitives/icon-container";
import { DinoGlyph, SparkleGlyph } from "@/design-system/icons/glyphs";

/**
 * דינו — reserved AI region (Slice 2.0.0). UI ONLY. No chat, no pipeline, no
 * model, no auto-run. This region reserves the on-request intelligence surface
 * so the layout is stable when the assistant lands in a later capability.
 */
export function AiPanelPlaceholder() {
  return (
    <section
      className="rounded-xl border border-line-strong border-s-2 border-s-accent bg-gold-100/60 p-5 shadow-lift md:p-6"
      aria-label="דינו — עוזר משפטי (שמור להמשך)"
    >
      <header className="flex items-center gap-3">
        <IconContainer variant="dino" size="sm">
          <DinoGlyph size={16} />
        </IconContainer>
        <h2 className="min-w-0 flex-1 text-heading font-semibold text-foreground">דינו — עוזר משפטי</h2>
        <span className="inline-flex items-center gap-1 rounded-pill bg-gold-200/80 px-2.5 py-0.5 text-micro font-medium text-gold-700">
          <SparkleGlyph size={12} aria-hidden />
          בקרוב
        </span>
      </header>

      <p className="mt-4 max-w-reading text-small text-pretty text-foreground-soft">
        כאן יופיע העוזר המשפטי של LawME — לשאלות על התיק, איתור מקורות מאומתים והכנת טיוטות,
        תמיד עם ציטוט מקור ובכפוף לאישור אנושי. האזור שמור ואינו פעיל בשלב זה.
      </p>

      <div
        className="mt-4 flex items-center justify-between gap-3 rounded-md border border-line-strong bg-surface-raised/70 px-4 py-3 text-small text-foreground-faint"
        aria-hidden
      >
        <span>שאל שאלה על התיק…</span>
        <span className="rounded-sm bg-surface-sunken px-3 py-1 text-micro text-foreground-faint">שמור</span>
      </div>
    </section>
  );
}
