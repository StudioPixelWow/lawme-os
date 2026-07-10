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

export function UserGlyph({ size, ...rest }: GlyphProps) {
  return (
    <svg {...base(size)} {...rest}>
      <circle cx="12" cy="8.5" r="3.3" />
      <path d="M5.5 19.5c.7-3.5 3.2-5.3 6.5-5.3s5.8 1.8 6.5 5.3" />
    </svg>
  );
}

/** בית משפט — institution columns. No gavels, no scales-of-justice cliché. */
export function CourtGlyph({ size, ...rest }: GlyphProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="m12 3.5 8 4H4l8-4Z" />
      <path d="M6 10.5V17M10 10.5V17M14 10.5V17M18 10.5V17" />
      <path d="M4.5 20.5h15M5.5 17.5h13" />
    </svg>
  );
}

export function PhoneGlyph({ size, ...rest }: GlyphProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M7.5 4h3l1 4-2 1.4a11 11 0 0 0 5.1 5.1L16 12.5l4 1v3a2 2 0 0 1-2.2 2A14.8 14.8 0 0 1 5.5 6.2 2 2 0 0 1 7.5 4Z" />
    </svg>
  );
}

export function AlertGlyph({ size, ...rest }: GlyphProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M12 4 3.5 19h17L12 4Z" />
      <path d="M12 10v4.2M12 16.8v.2" />
    </svg>
  );
}

/** Trend "forward-up" — drawn up-toward-left because forward = left in RTL. */
export function TrendGlyph({ size, ...rest }: GlyphProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M20 17 14 10.5l-3.5 3L4 7" />
      <path d="M8.5 7H4v4.5" />
    </svg>
  );
}

export function TaskGlyph({ size, ...rest }: GlyphProps) {
  return (
    <svg {...base(size)} {...rest}>
      <circle cx="12" cy="12" r="8.2" />
      <path d="m8.5 12.2 2.4 2.4 4.6-5" />
    </svg>
  );
}

export function CheckGlyph({ size, ...rest }: GlyphProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="m5.5 12.5 4.2 4.2 8.8-9.4" />
    </svg>
  );
}

/** Signature pen. */
export function PenGlyph({ size, ...rest }: GlyphProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="m14.5 5.5 4 4L8 20H4v-4L14.5 5.5Z" />
      <path d="m12.5 7.5 4 4" />
    </svg>
  );
}

/** Precedent / knowledge. */
export function BookGlyph({ size, ...rest }: GlyphProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M12 6.5c-1.6-1.4-3.8-2-7-2v13c3.2 0 5.4.6 7 2 1.6-1.4 3.8-2 7-2v-13c-3.2 0-5.4.6-7 2Z" />
      <path d="M12 6.5v13" />
    </svg>
  );
}

export function HourglassGlyph({ size, ...rest }: GlyphProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M7 4h10M7 20h10" />
      <path d="M8 4c0 3.2 1.5 5 4 8-2.5 3-4 4.8-4 8M16 4c0 3.2-1.5 5-4 8 2.5 3 4 4.8 4 8" />
    </svg>
  );
}

export function GearGlyph({ size, ...rest }: GlyphProps) {
  return (
    <svg {...base(size)} {...rest}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M18 6l-1.6 1.6M7.6 16.4 6 18M18 18l-1.6-1.6M7.6 7.6 6 6" />
    </svg>
  );
}

/** Billing / hours. */
export function LedgerGlyph({ size, ...rest }: GlyphProps) {
  return (
    <svg {...base(size)} {...rest}>
      <rect x="5" y="3.5" width="14" height="17" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h3.5" />
    </svg>
  );
}
