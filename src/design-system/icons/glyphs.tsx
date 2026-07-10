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

export function HomeGlyph({ size, ...rest }: GlyphProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M4.5 10.5 12 4l7.5 6.5" />
      <path d="M6.5 9v10h11V9" />
      <path d="M10 19v-5h4v5" />
    </svg>
  );
}

export function BriefcaseGlyph({ size, ...rest }: GlyphProps) {
  return (
    <svg {...base(size)} {...rest}>
      <rect x="4" y="7.5" width="16" height="12" rx="2" />
      <path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5" />
      <path d="M4 12.5h16" />
    </svg>
  );
}

export function UsersGlyph({ size, ...rest }: GlyphProps) {
  return (
    <svg {...base(size)} {...rest}>
      <circle cx="9.5" cy="8.5" r="3" />
      <path d="M4 19c.5-3 2.7-4.5 5.5-4.5S14.5 16 15 19" />
      <path d="M15.5 5.9a3 3 0 0 1 0 5.2M17.5 14.9c1.5.7 2.3 2 2.5 4.1" />
    </svg>
  );
}

export function CalendarGlyph({ size, ...rest }: GlyphProps) {
  return (
    <svg {...base(size)} {...rest}>
      <rect x="4" y="5.5" width="16" height="14" rx="2" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </svg>
  );
}

export function DocumentGlyph({ size, ...rest }: GlyphProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
      <path d="M14 3.5V8h4" />
      <path d="M9.5 12.5h5M9.5 16h5" />
    </svg>
  );
}

export function BellGlyph({ size, ...rest }: GlyphProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M6.5 10a5.5 5.5 0 0 1 11 0c0 3 .8 4.6 1.6 5.6a.6.6 0 0 1-.47 1H5.37a.6.6 0 0 1-.47-1c.8-1 1.6-2.6 1.6-5.6Z" />
      <path d="M10 19.5a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function ClockGlyph({ size, ...rest }: GlyphProps) {
  return (
    <svg {...base(size)} {...rest}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4.2l2.8 1.6" />
    </svg>
  );
}

export function PinGlyph({ size, ...rest }: GlyphProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M12 21s6.5-5.3 6.5-10.5a6.5 6.5 0 1 0-13 0C5.5 15.7 12 21 12 21Z" />
      <circle cx="12" cy="10.5" r="2.2" />
    </svg>
  );
}
