/**
 * Injectable HTTP for collectors — fail-closed, no bypass.
 *
 * Collectors never call `fetch` directly; they take a JsonHttp. The default
 * implementation is honest and identified (real project UA), respects a 403/429
 * as terminal (NEVER retried with spoofing/rotation), and retries ONCE on 5xx /
 * network error only. Tests inject a fixture http so the whole pipeline runs
 * offline with zero network — satisfying "no live network in CI".
 */

export class HttpAccessBlockedError extends Error {
  readonly status: number;
  constructor(url: string, status: number) {
    super(`access blocked (${status}) for ${url} — not bypassed`);
    this.name = "HttpAccessBlockedError";
    this.status = status;
  }
}

export interface JsonHttp {
  getJson(url: string): Promise<unknown>;
  getText(url: string): Promise<string>;
}

export interface RealHttpOptions {
  userAgent: string;
  timeoutMs: number;
}

export const DEFAULT_HTTP_OPTIONS: RealHttpOptions = {
  userAgent: "LegalAIIsrael-Research/0.1 (+contact: founder-provided)",
  timeoutMs: 30000,
};

async function once(url: string, opts: RealHttpOptions): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
  try {
    return await fetch(url, {
      headers: { "user-agent": opts.userAgent, accept: "application/json,text/*" },
      redirect: "follow",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Real HTTP. Blocked statuses (401/403/429) are terminal — never bypassed. */
export function createRealHttp(options: RealHttpOptions = DEFAULT_HTTP_OPTIONS): JsonHttp {
  const doFetch = async (url: string): Promise<Response> => {
    let res: Response;
    try {
      res = await once(url, options);
    } catch {
      // one retry on network error only
      res = await once(url, options);
    }
    if (res.status === 401 || res.status === 403 || res.status === 429) {
      throw new HttpAccessBlockedError(url, res.status);
    }
    if (res.status >= 500) {
      // one retry on server error
      const retry = await once(url, options);
      if (!retry.ok) throw new Error(`http ${retry.status} for ${url}`);
      return retry;
    }
    if (!res.ok) throw new Error(`http ${res.status} for ${url}`);
    return res;
  };
  return {
    async getJson(url) { return (await doFetch(url)).json(); },
    async getText(url) { return (await doFetch(url)).text(); },
  };
}
