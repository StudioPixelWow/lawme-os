import type { ReactNode } from "react";
import {
  BriefcaseGlyph,
  BuildingGlyph,
  CourtGlyph,
  LegislationGlyph,
  PenGlyph,
  ShieldGlyph,
} from "./glyphs";

/**
 * Practice-area iconography — professional symbolic marks, mapped
 * from the matter's Hebrew practice area. Falls back to the matter
 * briefcase.
 */
export function practiceGlyph(practiceArea: string, size = 17): ReactNode {
  switch (practiceArea) {
    case "ליטיגציה":
      return <CourtGlyph size={size} />;
    case "מקרקעין":
      return <BuildingGlyph size={size} />;
    case "מסחרי":
      return <PenGlyph size={size} />;
    case "ירושה":
      return <LegislationGlyph size={size} />;
    case "ביטוח":
      return <ShieldGlyph size={size} />;
    default:
      return <BriefcaseGlyph size={size} />;
  }
}
