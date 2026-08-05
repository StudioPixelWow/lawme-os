/**
 * URL normalization + SSRF guard for the audit engine.
 * Every audit probe URL passes through assertFetchableUrl() first.
 */

export class SsrfBlockedError extends Error {
  constructor(reason: string) { super(`SSRF blocked: ${reason}`); this.name = "SsrfBlockedError"; }
}

/** Lowercase host, strip default ports, drop fragments, collapse trailing slash. */
export function normalizeUrl(input: string): string {
  const u = new URL(input);
  u.hash = "";
  u.hostname = u.hostname.toLowerCase();
  if ((u.protocol === "https:" && u.port === "443") || (u.protocol === "http:" && u.port === "80")) u.port = "";
  if (u.pathname.length > 1 && u.pathname.endsWith("/")) u.pathname = u.pathname.replace(/\/+$/, "");
  return u.toString();
}

/** Registrable-ish domain: host without a leading "www." (lowercased). */
export function normalizedDomain(input: string): string {
  const host = new URL(input).hostname.toLowerCase();
  return host.replace(/^www\./, "");
}

export function extractDomain(input: string): string {
  return new URL(input).hostname.toLowerCase();
}

export function isHttps(input: string): boolean {
  return new URL(input).protocol === "https:";
}

// Private / loopback / link-local / unique-local ranges we must never fetch.
function isBlockedHost(host: string): string | null {
  const h = host.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost")) return "localhost";
  if (h === "127.0.0.1" || h.startsWith("127.")) return "loopback";
  if (h === "0.0.0.0") return "unspecified";
  if (h === "::1" || h === "[::1]") return "ipv6-loopback";
  if (h.endsWith(".internal") || h.endsWith(".local")) return "internal-tld";
  // Metadata endpoints
  if (h === "169.254.169.254" || h === "metadata.google.internal") return "cloud-metadata";
  // IPv4 private ranges
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const a = Number(m[1]), b = Number(m[2]);
    if (a === 10) return "private-10";
    if (a === 192 && b === 168) return "private-192.168";
    if (a === 172 && b >= 16 && b <= 31) return "private-172.16/12";
    if (a === 169 && b === 254) return "link-local";
    if (a === 100 && b >= 64 && b <= 127) return "cgnat-100.64/10";
  }
  // IPv6 unique-local / link-local
  if (/^\[?f[cd][0-9a-f]{2}:/i.test(h)) return "ipv6-ula";
  if (/^\[?fe80:/i.test(h)) return "ipv6-link-local";
  return null;
}

/**
 * Assert a URL is safe to fetch from a server-side audit job:
 * https/http only, no credentials, host not in a private/loopback/metadata range,
 * and (when an allowlist is given) the host is on it.
 */
export function assertFetchableUrl(input: string, allowlist?: string[]): URL {
  let u: URL;
  try { u = new URL(input); } catch { throw new SsrfBlockedError("unparseable url"); }
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new SsrfBlockedError(`protocol ${u.protocol}`);
  if (u.username || u.password) throw new SsrfBlockedError("embedded credentials");
  const blocked = isBlockedHost(u.hostname);
  if (blocked) throw new SsrfBlockedError(blocked);
  if (allowlist && allowlist.length > 0) {
    const host = u.hostname.toLowerCase();
    const ok = allowlist.some((d) => host === d.toLowerCase() || host.endsWith(`.${d.toLowerCase()}`));
    if (!ok) throw new SsrfBlockedError(`host ${host} not in allowlist`);
  }
  return u;
}
