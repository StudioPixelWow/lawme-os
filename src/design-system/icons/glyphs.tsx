import type { SVGProps } from "react";

/**
 * Shell glyphs — hand-drawn on the 24px / 1.5px-stroke grid.
 * Line icons, rounded caps, ink by default (currentColor).
 * Docs: docs/design-system/07-iconography.md
 */

type GlyphProps = SVGProps<SVGSVGElement> & { size?: number };

function base(size: number | undefined) {
  return {
    width: size ?? 20,
    height: size ?? 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
}

export function SearchGlyph({ size, ...rest }: GlyphProps) {
  return (
    <svg {...base(size)} {...rest}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

/** עמית's four-point star. Gold when active — AI only. */
export function SparkleGlyph({ size, ...rest }: GlyphProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M12 3.5c.7 3.9 2.9 6.1 6.8 6.8-3.9.7-6.1 2.9-6.8 6.8-.7-3.9-2.9-6.1-6.8-6.8 3.9-.7 6.1-2.9 6.8-6.8Z" />
    </svg>
  );
}

export function CloseGlyph({ size, ...rest }: GlyphProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}
