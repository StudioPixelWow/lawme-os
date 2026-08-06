/**
 * SSRF-guarded server-side PDF fetch for official ספר החוקים publications.
 *
 * The only PDFs we fetch are the official gazette files on fs.knesset.gov.il.
 * The fetch path is hardened against SSRF and hostile responses:
 *
 *   - HTTPS only; hostname must be on an explicit allowlist;
 *   - literal IPs, userinfo (`user@host`), and non-default ports are rejected;
 *   - a wall-clock timeout, a max redirect count, and a max byte size bound it;
 *   - redirects are re-validated against the allowlist on every hop (no bypass);
 *   - the response must be application/pdf AND begin with the `%PDF-` magic;
 *   - the body is SHA-256'd for content-addressed identity + idempotent storage;
 *   - retry ONLY on network errors / 5xx; NEVER retry 403 / 404 / 429.
 *
 * The actual byte transport is injected (`HttpClient`) so this policy layer is
 * fully offline-testable and reusable across the browser/operator fetch path.
 */
import { sha256Hex } from "./publication-identity.ts";

export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  /** Present for terminal responses; absent for redirects. */
  body?: Uint8Array;
  /** Present for 3xx responses. */
  location?: string;
}

export type HttpClient = (url: string, signal: { timeoutMs: number }) => Promise<HttpResponse>;

export interface PdfFetchPolicy {
  allowedHosts: readonly string[];
  timeoutMs: number;
  maxRedirects: number;
  maxBytes: number;
}

export const DEFAULT_PDF_POLICY: PdfFetchPolicy = {
  allowedHosts: ["fs.knesset.gov.il"],
  timeoutMs: 20_000,
  maxRedirects: 3,
  maxBytes: 40 * 1024 * 1024, // 40 MB
};

export interface PdfFetchOk {
  ok: true;
  finalUrl: string;
  sha256: string;
  bytes: Uint8Array;
  contentType: string;
  size: number;
}
export interface PdfFetchErr {
  ok: false;
  reason: string;
  retriable: boolean;
  status?: number;
}
export type PdfFetchResult = PdfFetchOk | PdfFetchErr;

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

/** Validate a URL against the SSRF policy. Throws on any violation. */
export function assertUrlAllowed(rawUrl: string, policy: PdfFetchPolicy): URL {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    throw new Error(`pdf-fetch: unparseable URL`);
  }
  if (u.protocol !== "https:") throw new Error(`pdf-fetch: non-HTTPS URL rejected`);
  if (u.username || u.password) throw new Error(`pdf-fetch: URL userinfo rejected`);
  if (u.port && u.port !== "443") throw new Error(`pdf-fetch: non-default port rejected`);
  const host = u.hostname.toLowerCase();
  if (IPV4.test(host) || host.includes(":")) throw new Error(`pdf-fetch: literal IP host rejected`);
  if (!policy.allowedHosts.includes(host)) throw new Error(`pdf-fetch: host "${host}" not on allowlist`);
  return u;
}

function isPdfMagic(bytes: Uint8Array): boolean {
  // "%PDF-" — allow a small leading BOM/whitespace window.
  const head = bytes.subarray(0, 8);
  const s = Buffer.from(head).toString("latin1");
  return s.includes("%PDF-");
}

function retriableStatus(status: number): boolean {
  if (status === 403 || status === 404 || status === 429) return false; // never retry
  return status >= 500 && status <= 599;
}

/**
 * Fetch a PDF under the SSRF + response policy. Redirects are followed manually
 * and re-validated each hop. Returns a discriminated result — never throws for
 * expected network/HTTP outcomes (callers branch on `ok`).
 */
export async function fetchPdf(
  rawUrl: string,
  http: HttpClient,
  policy: PdfFetchPolicy = DEFAULT_PDF_POLICY,
): Promise<PdfFetchResult> {
  let current = rawUrl;
  for (let hop = 0; hop <= policy.maxRedirects; hop += 1) {
    let url: URL;
    try {
      url = assertUrlAllowed(current, policy);
    } catch (e) {
      return { ok: false, reason: (e as Error).message, retriable: false };
    }

    let res: HttpResponse;
    try {
      res = await http(url.toString(), { timeoutMs: policy.timeoutMs });
    } catch (e) {
      // Transport failure (timeout, DNS, reset) → retriable.
      return { ok: false, reason: `network: ${(e as Error).message}`, retriable: true };
    }

    if (res.status >= 300 && res.status < 400) {
      if (!res.location) return { ok: false, reason: "redirect without Location", retriable: false, status: res.status };
      if (hop === policy.maxRedirects) return { ok: false, reason: "too many redirects", retriable: false, status: res.status };
      current = new URL(res.location, url).toString();
      continue;
    }

    if (res.status !== 200) {
      return { ok: false, reason: `http ${res.status}`, retriable: retriableStatus(res.status), status: res.status };
    }

    const contentType = (res.headers["content-type"] ?? res.headers["Content-Type"] ?? "").toLowerCase();
    if (!contentType.includes("application/pdf")) {
      return { ok: false, reason: `unexpected content-type "${contentType || "(none)"}"`, retriable: false, status: 200 };
    }
    const body = res.body ?? new Uint8Array();
    if (body.byteLength === 0) return { ok: false, reason: "empty body", retriable: true, status: 200 };
    if (body.byteLength > policy.maxBytes) {
      return { ok: false, reason: `body ${body.byteLength} > maxBytes ${policy.maxBytes}`, retriable: false, status: 200 };
    }
    if (!isPdfMagic(body)) {
      return { ok: false, reason: "missing %PDF- magic bytes", retriable: false, status: 200 };
    }
    return {
      ok: true,
      finalUrl: url.toString(),
      sha256: sha256Hex(body),
      bytes: body,
      contentType,
      size: body.byteLength,
    };
  }
  return { ok: false, reason: "redirect loop exhausted", retriable: false };
}

export interface FetchWithRetryOptions {
  maxAttempts: number;
  backoffMs: (attempt: number) => number;
  sleep: (ms: number) => Promise<void>;
}

/** Fetch with bounded retry — retries ONLY when the result is retriable. */
export async function fetchPdfWithRetry(
  rawUrl: string,
  http: HttpClient,
  policy: PdfFetchPolicy,
  opts: FetchWithRetryOptions,
): Promise<PdfFetchResult> {
  let last: PdfFetchResult = { ok: false, reason: "not attempted", retriable: false };
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt += 1) {
    last = await fetchPdf(rawUrl, http, policy);
    if (last.ok || !last.retriable) return last;
    if (attempt < opts.maxAttempts) await opts.sleep(opts.backoffMs(attempt));
  }
  return last;
}
