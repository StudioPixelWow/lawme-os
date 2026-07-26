/**
 * VERIFIED LEGISLATION SEED — D-NOTICE + D-MINWAGE (P1-S1).
 *
 * Gate A is CLOSED (founder authorization): the approved source rights are
 * treated as verified. The operative provisions below were retrieved and
 * editorially cross-checked against authoritative Israeli legal-information
 * sources (Kol-Zchut) on the ingestion date; each carries a verification
 * record. Content is the OPERATIVE RULE only (short, faithful) — not a full
 * reproduction. Unknowns (e.g. an official subsection deep-anchor) remain
 * unknown and are surfaced honestly, never fabricated.
 *
 * Scope: EXACTLY D-NOTICE and D-MINWAGE. No other doctrine. No case law.
 *
 * Provenance of the current minimum-wage rate: ₪6,443.85/month, ₪35.40/hour,
 * effective 2026-04-01 (Kol-Zchut, confirmed current as of the reference date).
 */
import type {
  DoctrineId,
  LegalLicensePolicy,
  LegalProvision,
  LegalSource,
  LegalSourceVersion,
  LegalVerificationRecord,
  LegalPinpoint,
} from "../types.ts";
import { sha256Hex } from "../hash.ts";
import { deepFreeze } from "../deep-freeze.ts";
import { recordVerification } from "../verification.ts";

export const CORPUS_VERSION = "vlc-2026-07-25-p1s1";
const INGESTED_AT = "2026-07-25T09:00:00+03:00";
const EDITOR = "editorial:lawme-legal";

const ALL_CHECKED = {
  title: true, enactmentIdentity: true, sectionIdentity: true, effectiveDate: true,
  amendmentStatus: true, permalink: true, sourceTextHash: true, sourceVersion: true, licensePolicy: true,
} as const;

/** Kol-Zchut-backed permitted source page (accessible, not the official gazette). */
const KOLZCHUT_NOTICE = "https://www.kolzchut.org.il/he/הודעה_על_תנאי_העבודה";
const KOLZCHUT_MINWAGE = "https://www.kolzchut.org.il/he/שכר_מינימום";

// ---------------------------------------------------------------------------
// License policy (approved source rights — Gate A closed)
// ---------------------------------------------------------------------------

export const approvedLicense: LegalLicensePolicy = deepFreeze({
  policyId: "lic-approved-legislation",
  provider: "APPROVED-LEGISLATION-SOURCE",
  ingestionAllowed: true,
  displayAllowed: true,
  maxExcerptChars: 400,
  redistributionAllowed: false,
  exportToWorkProductAllowed: true,
  attributionRequired: true,
  attributionTextHe: "המקור אומת מול מאגר זכויות ציבורי (Kol-Zchut); אינו הפרסום הרשמי (רשומות).",
  retentionObligations: null,
  territory: "IL",
  termsRef: "reuse-basis:founder-confirmed-2026-07",
  verifiedInWriting: true,
});

// ---------------------------------------------------------------------------
// Types for the seed bundle
// ---------------------------------------------------------------------------

export interface SeedProvision {
  provision: LegalProvision;
  pinpoint: LegalPinpoint;
  /** The verified operative proposition this provision supports, in Hebrew. */
  propositionHe: string;
}

export interface SeedSource {
  source: LegalSource;
  version: LegalSourceVersion;
  verification: LegalVerificationRecord;
  provisions: SeedProvision[];
}

export interface SeedBundle {
  corpusVersion: string;
  license: LegalLicensePolicy;
  sources: SeedSource[];
  /** doctrine → required provision ids (for coverage). */
  doctrineRequired: Record<DoctrineId, string[]>;
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function honestSectionPinpoint(id: string, sectionHe: string): LegalPinpoint {
  return deepFreeze({
    pinpointId: id,
    provisionOrParagraph: sectionHe,
    anchorType: "section",
    resolvableAnchor: null, // no verified deep-anchor to the subsection
    pinpointStatus: "none",
    pinpointStatementHe:
      "ההפניה הנקודתית היא לסעיף עצמו; הקישור החיצוני נפתח בעמוד המקור ואינו קופץ ישירות לסעיף.",
  });
}

function verify(versionId: string, reVerifyDueDate: string | null): LegalVerificationRecord {
  return recordVerification({
    verificationId: `vr-${versionId}`,
    versionId,
    verifier: EDITOR,
    method: "editorial-crosscheck-authoritative-source",
    checkedFields: { ...ALL_CHECKED },
    timestamp: INGESTED_AT,
    reVerifyDueDate,
    notes: "אומת מול מקור משני (Kol-Zchut); לא הפרסום הרשמי; טקסט הוראה תמציתי בלבד.",
  });
}

// ---------------------------------------------------------------------------
// D-NOTICE — Notice to Employee Law 2002, §1 (30-day written notice)
// ---------------------------------------------------------------------------

const NOTICE_TEXT =
  "מעסיק ימסור לעובד, לא יאוחר משלושים ימים מיום תחילת העבודה, הודעה בכתב שבה יפרט את תנאי העבודה של העובד; " +
  "לגבי עובד שטרם מלאו לו 18 שנים — לא יאוחר משבעה ימים.";

const noticeSource: SeedSource = {
  source: deepFreeze({
    sourceId: "vlc-notice-2002",
    sourceType: "statute",
    provider: "APPROVED-LEGISLATION-SOURCE",
    providerSourceId: "notice-to-employee-law-2002",
    officialStatus: "official",
    jurisdiction: "IL",
    authorityStrength: "binding",
    bindingStatus: "binding",
    courtHierarchy: null,
    provenance: "אומת מול Kol-Zchut בתאריך האינג'סט.",
    licensePolicyRef: "lic-approved-legislation",
    corpusVersion: CORPUS_VERSION,
  }),
  version: deepFreeze({
    versionId: "vlc-notice-2002-v1",
    sourceId: "vlc-notice-2002",
    versionLabel: "נוסח מאוחד — הוראת §1",
    effectiveDate: "2002-06-01",
    commencementDate: "2002-06-01",
    publicationDate: "2002-02-11",
    supersededByVersionId: null,
    supersededFromDate: null,
    sourceTextHash: sha256Hex(NOTICE_TEXT),
    permalink: KOLZCHUT_NOTICE,
    directLink: KOLZCHUT_NOTICE,
    ingestionTimestamp: INGESTED_AT,
    lastVerifiedTimestamp: INGESTED_AT,
    verificationStatus: "verified",
  }),
  verification: verify("vlc-notice-2002-v1", "2027-07-25"),
  provisions: [
    {
      provision: deepFreeze({
        provisionId: "vlc-notice-2002-s1",
        versionId: "vlc-notice-2002-v1",
        path: "§1",
        heading: "מסירת הודעה עקב תחילת עבודה",
        text: NOTICE_TEXT,
        textHash: sha256Hex(NOTICE_TEXT),
        inForce: "in_force",
        pinpointRef: "pin-notice-s1",
      }),
      pinpoint: honestSectionPinpoint("pin-notice-s1", "סעיף 1"),
      propositionHe:
        "מעסיק חייב למסור לעובד הודעה בכתב על תנאי העבודה לא יאוחר מ-30 ימים מתחילת העבודה (7 ימים לגבי עובד שטרם מלאו לו 18).",
    },
  ],
};

// ---------------------------------------------------------------------------
// D-MINWAGE — Minimum Wage Law 1987, §2 (entitlement) + rate instrument
// ---------------------------------------------------------------------------

const MINWAGE_ENTITLEMENT_TEXT =
  "עובד שמלאו לו 18 שנים המועסק במשרה מלאה זכאי לקבל ממעסיקו שכר עבודה שלא יפחת משכר המינימום.";

const minwageStatute: SeedSource = {
  source: deepFreeze({
    sourceId: "vlc-minwage-1987",
    sourceType: "statute",
    provider: "APPROVED-LEGISLATION-SOURCE",
    providerSourceId: "minimum-wage-law-1987",
    officialStatus: "official",
    jurisdiction: "IL",
    authorityStrength: "binding",
    bindingStatus: "binding",
    courtHierarchy: null,
    provenance: "אומת מול Kol-Zchut בתאריך האינג'סט.",
    licensePolicyRef: "lic-approved-legislation",
    corpusVersion: CORPUS_VERSION,
  }),
  version: deepFreeze({
    versionId: "vlc-minwage-1987-v1",
    sourceId: "vlc-minwage-1987",
    versionLabel: "נוסח מאוחד — הוראת §2",
    effectiveDate: "1987-10-01",
    commencementDate: "1987-10-01",
    publicationDate: "1987-06-01",
    supersededByVersionId: null,
    supersededFromDate: null,
    sourceTextHash: sha256Hex(MINWAGE_ENTITLEMENT_TEXT),
    permalink: KOLZCHUT_MINWAGE,
    directLink: KOLZCHUT_MINWAGE,
    ingestionTimestamp: INGESTED_AT,
    lastVerifiedTimestamp: INGESTED_AT,
    verificationStatus: "verified",
  }),
  verification: verify("vlc-minwage-1987-v1", "2027-07-25"),
  provisions: [
    {
      provision: deepFreeze({
        provisionId: "vlc-minwage-1987-s2",
        versionId: "vlc-minwage-1987-v1",
        path: "§2",
        heading: "הזכות לשכר מינימום",
        text: MINWAGE_ENTITLEMENT_TEXT,
        textHash: sha256Hex(MINWAGE_ENTITLEMENT_TEXT),
        inForce: "in_force",
        pinpointRef: "pin-minwage-s2",
      }),
      pinpoint: honestSectionPinpoint("pin-minwage-s2", "סעיף 2"),
      propositionHe:
        "עובד שמלאו לו 18 המועסק במשרה מלאה זכאי לשכר שלא יפחת משכר המינימום.",
    },
  ],
};

const RATE_TEXT = "שכר מינימום חודשי: 6,443.85 ₪ למשרה מלאה; שכר מינימום לשעה: 35.40 ₪.";

const minwageRate: SeedSource = {
  source: deepFreeze({
    sourceId: "vlc-minwage-rate",
    sourceType: "rate_instrument",
    provider: "APPROVED-LEGISLATION-SOURCE",
    providerSourceId: "minimum-wage-rate-2026-04",
    officialStatus: "official",
    jurisdiction: "IL",
    authorityStrength: "binding",
    bindingStatus: "binding",
    courtHierarchy: null,
    provenance: "שיעור עדכני שאומת מול Kol-Zchut; תוקף 1.4.2026.",
    licensePolicyRef: "lic-approved-legislation",
    corpusVersion: CORPUS_VERSION,
  }),
  version: deepFreeze({
    versionId: "vlc-minwage-rate-2026-04",
    sourceId: "vlc-minwage-rate",
    versionLabel: "שיעור שכר מינימום — החל מ-1.4.2026",
    effectiveDate: "2026-04-01",
    commencementDate: "2026-04-01",
    publicationDate: "2026-04-01",
    supersededByVersionId: null,
    supersededFromDate: null,
    sourceTextHash: sha256Hex(RATE_TEXT),
    permalink: KOLZCHUT_MINWAGE,
    directLink: KOLZCHUT_MINWAGE,
    ingestionTimestamp: INGESTED_AT,
    lastVerifiedTimestamp: INGESTED_AT,
    verificationStatus: "verified",
  }),
  // rate currentness re-verified on a short cadence (outcome-determinative)
  verification: verify("vlc-minwage-rate-2026-04", "2026-10-01"),
  provisions: [
    {
      provision: deepFreeze({
        provisionId: "vlc-minwage-rate-2026-04-p",
        versionId: "vlc-minwage-rate-2026-04",
        path: "שיעור",
        heading: "שיעור שכר המינימום התקף",
        text: RATE_TEXT,
        textHash: sha256Hex(RATE_TEXT),
        inForce: "in_force",
        pinpointRef: "pin-minwage-rate",
      }),
      pinpoint: deepFreeze({
        pinpointId: "pin-minwage-rate",
        provisionOrParagraph: "שיעור עדכני",
        anchorType: "paragraph",
        resolvableAnchor: null,
        pinpointStatus: "none",
        pinpointStatementHe: "השיעור אומת מול מקור מוסמך; ההפניה היא לעמוד המקור.",
      }),
      propositionHe:
        "שכר המינימום החל מ-1.4.2026: 6,443.85 ₪ לחודש (משרה מלאה) ו-35.40 ₪ לשעה.",
    },
  ],
};

// ---------------------------------------------------------------------------
// The bundle
// ---------------------------------------------------------------------------

export const SEED: SeedBundle = deepFreeze({
  corpusVersion: CORPUS_VERSION,
  license: approvedLicense,
  sources: [noticeSource, minwageStatute, minwageRate],
  doctrineRequired: {
    "D-NOTICE": ["vlc-notice-2002-s1"],
    "D-MINWAGE": ["vlc-minwage-1987-s2", "vlc-minwage-rate-2026-04-p"],
  },
});
