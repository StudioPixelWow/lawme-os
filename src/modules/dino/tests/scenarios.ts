/**
 * Deterministic test scenarios A-G (Epic 3A, Phase 29).
 * Shared fixtures so the test suite and the benchmark use identical cases.
 */
import type { DinoRequest } from "../core/request.ts";
import type { SyntheticMatterFixture } from "../context/matter-context-assembler.ts";

export interface DinoScenario {
  id: string;
  labelHe: string;
  request: DinoRequest;
  fixture: SyntheticMatterFixture | null;
  expected: {
    outcome: string;               // DinoRunOutcome
    domainMatch?: boolean;
    minIssues?: number;
    requiresClarification?: boolean;
    noAnswer?: boolean;
    requiresHumanReview?: boolean;
  };
}

/** A matter fixture where all pregnancy-dismissal critical facts are known. */
const PREGNANCY_MATTER_COMPLETE: SyntheticMatterFixture = {
  matterId: "matter-preg-001",
  clientId: "client-001",
  matterTitleHe: "פלונית נ' מעסיק — פיטורי היריון",
  items: [
    { field: "employment_duration", statementHe: "העובדת הועסקה 14 חודשים", status: "document_derived_fact" },
    { field: "employment_relationship", statementHe: "מתקיימים יחסי עובד-מעסיק", status: "confirmed_fact" },
    { field: "pregnancy_status", statementHe: "העובדת בהיריון", status: "confirmed_fact" },
    { field: "employer_knowledge", statementHe: "המעסיק ידע על ההיריון", status: "client_allegation" },
    { field: "permit_status", statementHe: "לא ניתן היתר", status: "client_allegation" },
    { field: "hearing_held", statementHe: "לא נערך שימוע", status: "client_allegation" },
    { field: "dismissal_date", statementHe: "פוטרה ב-01/06/2026", status: "document_derived_fact" },
    { field: "salary", statementHe: "שכר חודשי 12,000 ₪", status: "document_derived_fact" },
  ],
};

/** An AI-prohibited matter. */
const AI_PROHIBITED_MATTER: SyntheticMatterFixture = {
  matterId: "matter-ai-block",
  clientId: "client-restricted",
  matterTitleHe: "לקוח בהגבלת AI",
  aiPolicy: "prohibited",
  items: [],
};

export const SCENARIOS: DinoScenario[] = [
  {
    id: "A",
    labelHe: "כיסוי חזק בדיני עבודה",
    request: {
      question: "עובדת פוטרה בהיריון ללא שימוע — מה זכויותיה?",
      legalDomain: "labor",
      matterId: PREGNANCY_MATTER_COMPLETE.matterId,
    },
    fixture: PREGNANCY_MATTER_COMPLETE,
    expected: { outcome: "completed", domainMatch: true, minIssues: 5, requiresHumanReview: true },
  },
  {
    id: "B",
    labelHe: "מחוץ לתחום — ירושה",
    request: { question: "מה הזכויות של יורש בדירה שהותיר אביו?", legalDomain: "labor" },
    fixture: null,
    expected: { outcome: "stopped_domain_mismatch", domainMatch: false, noAnswer: true },
  },
  {
    id: "C",
    labelHe: "עובדות קריטיות חסרות",
    request: { question: "פיטרו אותי בהיריון, האם זה חוקי?", legalDomain: "labor" },
    fixture: null,
    expected: { outcome: "stopped_clarification", requiresClarification: true },
  },
  {
    id: "D",
    labelHe: "כיסוי משני בלבד",
    request: { question: "כמה ימי חופשה שנתית מגיעים לעובד בשנה הרביעית?", legalDomain: "labor" },
    fixture: null,
    // secondary-only coverage → no confident conclusion (insufficient
    // evidence stop or completed-with-discovery; both are honest)
    expected: { outcome: "stopped_insufficient_evidence" },
  },
  {
    id: "E",
    labelHe: "מקורות סותרים",
    request: { question: "האם מגיע פיצוי בגין עוגמת נפש והלנת שכר בדיון מהיר?", legalDomain: "labor" },
    fixture: null,
    // conflicting-authority fixture exists in the corpus → contradiction
    // surfaced, human review required (completed_with_review or red-team stop)
    expected: { outcome: "completed", requiresHumanReview: true },
  },
  {
    id: "G",
    labelHe: "תיק בהגבלת AI",
    request: {
      question: "עובדת פוטרה בהיריון — מה זכויותיה?",
      legalDomain: "labor",
      matterId: AI_PROHIBITED_MATTER.matterId,
      aiPolicy: "prohibited",
    },
    fixture: AI_PROHIBITED_MATTER,
    expected: { outcome: "stopped_policy" },
  },
];
