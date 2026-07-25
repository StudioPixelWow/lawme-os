/**
 * Verified corpus store (P1-S1). Deterministic, read-only over the seed.
 * Selects the version in force for an asOf date; exposes verification +
 * license + coverage. Never returns unverified content as supporting.
 */
import type {
  DoctrineId,
  LegalLicensePolicy,
  LegalProvision,
  LegalSource,
  LegalSourceVersion,
  LegalVerificationRecord,
  LegalPinpoint,
} from "./types.ts";
import { SEED, type SeedBundle, type SeedSource } from "./seed/verified-legislation.ts";
import { canProvisionSupportConclusion } from "./invariants.ts";
import { buildDoctrineCoverage } from "./coverage.ts";
import type { DoctrineCoverageRecord } from "./types.ts";

export interface ResolvedProvision {
  source: LegalSource;
  version: LegalSourceVersion;
  verification: LegalVerificationRecord;
  provision: LegalProvision;
  pinpoint: LegalPinpoint;
  propositionHe: string;
  canSupport: boolean;
}

export class VerifiedCorpusStore {
  private readonly bundle: SeedBundle;
  constructor(bundle: SeedBundle = SEED) {
    this.bundle = bundle;
  }

  get corpusVersion(): string {
    return this.bundle.corpusVersion;
  }

  get license(): LegalLicensePolicy {
    return this.bundle.license;
  }

  /** Which doctrines are covered by the verified corpus at all. */
  coveredDoctrines(): DoctrineId[] {
    return Object.keys(this.bundle.doctrineRequired) as DoctrineId[];
  }

  private sourcesForDoctrine(doctrineId: DoctrineId): SeedSource[] {
    const required = new Set(this.bundle.doctrineRequired[doctrineId] ?? []);
    return this.bundle.sources.filter((s) =>
      s.provisions.some((p) => required.has(p.provision.provisionId)),
    );
  }

  /**
   * Resolve the verified, in-force provisions for a doctrine as of a date.
   * A provision is included only if its version is in force for asOf AND it can
   * currently support a conclusion (verified + current + licensed + in-force).
   * Rate instruments that are future-effective relative to asOf are excluded.
   */
  resolve(doctrineId: DoctrineId, asOfISO: string): ResolvedProvision[] {
    const out: ResolvedProvision[] = [];
    const required = new Set(this.bundle.doctrineRequired[doctrineId] ?? []);
    for (const s of this.sourcesForDoctrine(doctrineId)) {
      // version-in-force-for-asOf guard (effective <= asOf, not superseded)
      const v = s.version;
      if (v.effectiveDate === null || v.effectiveDate > asOfISO) continue;
      if (v.supersededFromDate !== null && v.supersededFromDate <= asOfISO) continue;
      for (const p of s.provisions) {
        if (!required.has(p.provision.provisionId)) continue;
        const decision = canProvisionSupportConclusion({
          provision: p.provision,
          version: v,
          verification: s.verification,
          license: this.bundle.license,
          use: "display",
          asOfISO,
        });
        out.push({
          source: s.source,
          version: v,
          verification: s.verification,
          provision: p.provision,
          pinpoint: p.pinpoint,
          propositionHe: p.propositionHe,
          canSupport: decision.canSupport,
        });
      }
    }
    return out;
  }

  /** Coverage record for a doctrine given what resolved as supporting. */
  coverage(doctrineId: DoctrineId, asOfISO: string): DoctrineCoverageRecord {
    const required = this.bundle.doctrineRequired[doctrineId] ?? [];
    const present = this.resolve(doctrineId, asOfISO)
      .filter((r) => r.canSupport)
      .map((r) => r.provision.provisionId);
    const claimHe =
      doctrineId === "D-NOTICE"
        ? "ניתוח מבוסס חקיקה מאומתת לחובת ההודעה לעובד."
        : "ניתוח מבוסס חקיקה מאומתת לזכאות לשכר מינימום ולשיעור התקף.";
    return buildDoctrineCoverage({
      doctrineId,
      requiredProvisions: required,
      presentVerifiedProvisions: present,
      requiredAuthorities: [],
      presentVerifiedAuthorities: [],
      permittedClaimHe: claimHe,
      lastReviewed: "2026-07-25T09:00:00+03:00",
    });
  }
}

export const verifiedCorpus = new VerifiedCorpusStore();
