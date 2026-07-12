/** Question-classification types (Epic 3A, Phase 5). */

export interface QuestionClassification {
  domain: string;                    // relevance-gate domain key
  domainLabelHe: string;
  subdomain: string | null;          // e.g. "pregnancy_dismissal"
  jurisdiction: string;              // "IL" for the POC
  proceduralOrSubstantive: "procedural" | "substantive" | "mixed";
  questionNature: "factual" | "legal" | "mixed";
  temporalScope: "current_law" | "historical_law" | "mixed";
  requirements: {
    primarySource: boolean;
    caseLaw: boolean;
    regulation: boolean;
    extensionOrder: boolean;
    officialGuidance: boolean;
    internalFirmKnowledge: boolean;
  };
  urgency: "routine" | "urgent" | "deadline_critical";
  riskLevel: "low" | "medium" | "high";
  complexity: "simple" | "moderate" | "complex";
  likelyAmbiguity: string[];
  confidence: number;
  limitationsHe: string[];
}
