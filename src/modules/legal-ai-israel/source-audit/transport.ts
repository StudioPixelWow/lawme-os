/**
 * Guarded HTTP transport for audit probes. Injectable so tests use a mock and
 * NO live requests run in CI. The real transport enforces: SSRF guard + optional
 * per-job allowlist, http(s) only, timeout, redirect limit, response-size limit,
 * content-type awareness, ONE retry (network/5xx only — never on 4xx), and it
 * FAILS CLOSED: a 403/429 is returned as-is for the engine to act on. It never
 * rotates IPs, spoofs identities, or attempts to defeat a WAF/CAPTCHA.
 */
import { assertFetchableUrl } from "./url.ts";

export interface HttpResponse {
  url: string;
  status: number | null; // null = network failure (DNS/timeout/etc.)
  headers: Record<string, string>;
  body: string;
  truncated: boolean;
  redirects: string[];
  error: string | null;
}

export interface HttpTransport {
  get(url: string): Promise<HttpResponse>;
}

export interface TransportConfig {
  userAgent: string;
  timeoutMs: number;
  maxRedirects: number;
  maxResponseBytes: number;
  allowlist?: string[]; // if set, only these registrable domains are fetchable
}

export const DEFAULT_TRANSPORT_CONFIG: TransportConfig = {
  userAgent: "LawMeLegalResearch/1.0 (+audit; contact configured)",
  timeoutMs: 12000,
  maxRedirects: 3,
  maxResponseBytes: 5_000_000,
};

type FetchFn = (url: string, init: RequestInit) => Promise<Response>;

/** 4xx are terminal (no retry). 5xx / network get exactly one retry. */
function isRetriable(status: number | null): boolean {
  if (status === null) return true; // network error
  return status >= 500 && status <= 599;
}

async function readCapped(res: Response, maxBytes: number): Promise<{ body: string; truncated: boolean }> {
  const reader = res.body?.getReader();
  if (!reader) return { body: await res.text().catch(() => ""), truncated: false };
  const chunks: Uint8Array[] = [];
  let total = 0, truncated = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > maxBytes) { truncated = true; try { await reader.cancel(); } catch { /* ignore */ } break; }
      chunks.push(value);
    }
  }
  const buf = new Uint8Array(chunks.reduce((n, c) => n + c.byteLength, 0));
  let off = 0; for (const c of chunks) { buf.set(c, off); off += c.byteLength; }
  return { body: new TextDecoder("utf-8", { fatal: false }).decode(buf), truncated };
}

function headerObj(res: Response): Record<string, string> {
  const out: Record<string, string> = {};
  res.headers.forEach((v, k) => { out[k.toLowerCase()] = v; });
  return out;
}

export function createGuardedFetchTransport(
  config: TransportConfig = DEFAULT_TRANSPORT_CONFIG,
  fetchImpl?: FetchFn,
): HttpTransport {
  const doFetch: FetchFn = fetchImpl ?? ((u, init) => fetch(u, init));

  async function once(url: string): Promise<HttpResponse> {
    const redirects: string[] = [];
    let current = url;
    for (let hop = 0; hop <= config.maxRedirects; hop += 1) {
      assertFetchableUrl(current, config.allowlist); // re-check EVERY hop (SSRF via redirect)
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.timeoutMs);
      try {
        const res = await doFetch(current, {
          method: "GET",
          redirect: "manual",
          signal: controller.signal,
          headers: { "user-agent": config.userAgent, accept: "text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8" },
        });
        if (res.status >= 300 && res.status < 400) {
          const loc = res.headers.get("location");
          if (!loc) return { url: current, status: res.status, headers: headerObj(res), body: "", truncated: false, redirects, error: null };
          const next = new URL(loc, current).toString();
          redirects.push(next);
          current = next;
          continue;
        }
        const { body, truncated } = await readCapped(res, config.maxResponseBytes);
        return { url: current, status: res.status, headers: headerObj(res), body, truncated, redirects, error: null };
      } catch (e) {
        return { url: current, status: null, headers: {}, body: "", truncated: false, redirects, error: String((e as Error).message ?? e) };
      } finally {
        clearTimeout(timer);
      }
    }
    return { url: current, status: null, headers: {}, body: "", truncated: false, redirects, error: "too many redirects" };
  }

  return {
    async get(url: string): Promise<HttpResponse> {
      const first = await once(url);
      if (isRetriable(first.status)) {
        // exactly one polite retry; 4xx (incl. 403/429) never reach here
        return once(url);
      }
      return first;
    },
  };
}
