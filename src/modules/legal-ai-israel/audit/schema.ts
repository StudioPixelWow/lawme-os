/**
 * Versioned Source-Audit artifact schema (LEGAL AI ISRAEL — Phase 2).
 * The local operator audit tool emits JSON conforming to this schema; the
 * import command validates against it before any human-reviewed change.
 */
import { z } from "zod";

export const AUDIT_SCHEMA_VERSION = "1";

export const SourceAuditArtifact = z.object({
  schemaVersion: z.literal(AUDIT_SCHEMA_VERSION),
  sourceCode: z.string().min(1),
  auditedAt: z.string().min(1),
  userAgent: z.string().min(1),
  requestCount: z.number().int().min(0).max(15), // hard cap: ≤15 diagnostic requests
  dns: z.object({ resolved: z.boolean(), addresses: z.array(z.string()).default([]) }),
  tls: z.object({ ok: z.boolean(), protocol: z.string().nullable() }),
  http: z.object({
    status: z.number().int().nullable(),
    redirects: z.array(z.string()).default([]),
    contentType: z.string().nullable(),
    headers: z.record(z.string(), z.string()).default({}),
    rateLimitHeaders: z.record(z.string(), z.string()).default({}),
    retryAfter: z.string().nullable().default(null),
  }),
  robots: z.object({ found: z.boolean(), sha256: z.string().nullable(), disallowsRelevantPaths: z.boolean().nullable() }),
  policies: z.object({
    termsUrl: z.string().nullable(),
    privacyUrl: z.string().nullable(),
    sitemapUrl: z.string().nullable(),
    termsSha256: z.string().nullable(),
  }),
  access: z.object({
    hasPublicSearch: z.boolean(),
    apiHints: z.array(z.string()).default([]),
    cookiesRequired: z.boolean(),
    loginRequired: z.boolean(),
    captchaDetected: z.boolean(),
    publicDocumentOpenableWithoutAuth: z.boolean().nullable(),
    sampleDocumentUrl: z.string().nullable(),
    stableIdentifiersFound: z.boolean(),
    formFields: z.array(z.string()).default([]),
    jsEndpointHints: z.array(z.string()).default([]),
  }),
  sampleDocumentsFetched: z.number().int().min(0).max(3), // hard cap: ≤3 samples
  operatorNotes: z.string().default(""),
});

export type SourceAuditArtifact = z.infer<typeof SourceAuditArtifact>;

export function parseAuditArtifact(json: unknown):
  | { ok: true; value: SourceAuditArtifact }
  | { ok: false; errors: string[] } {
  const r = SourceAuditArtifact.safeParse(json);
  if (r.success) return { ok: true, value: r.data };
  return { ok: false, errors: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
}
