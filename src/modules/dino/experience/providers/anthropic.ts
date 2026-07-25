/**
 * Anthropic provider adapter (Slice 3.2.0). SERVER-ONLY.
 *
 * The FIRST model adapter. It consumes ONLY the ConversationContext, the
 * optional MatterIntelligence, and the verified LegalResearchResult — it NEVER
 * queries a legal database. It writes only the prose (executive summary + legal
 * analysis) strictly over the verified sources handed to it; grounding is
 * already decided by LawME. The API key is read from the environment and never
 * hardcoded; when absent the adapter is simply `available: false` and the
 * pipeline uses the deterministic provider instead.
 *
 * The HTTP transport is injectable so the request-building and response-parsing
 * are unit-testable without a network or a key.
 */
import type { DinoProvider, ProviderInput, ProviderProse } from "../types.ts";
import type { CanonicalSource } from "../../../legal-research/types.ts";

export interface AnthropicTransport {
  (req: { url: string; headers: Record<string, string>; body: string }): Promise<{ status: number; json: unknown }>;
}

export interface AnthropicConfig {
  readonly apiKey?: string;
  readonly model?: string;
  readonly baseUrl?: string;
  readonly apiVersion?: string;
  readonly maxTokens?: number;
  readonly transport?: AnthropicTransport;
}

const DEFAULT_MODEL = "claude-3-5-sonnet-latest";
const DEFAULT_BASE_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_API_VERSION = "2023-06-01";

const SYSTEM_PROMPT = [
  "אתה דינו, עוזר מחקר משפטי של LawME לדיני עבודה בישראל.",
  "הסתמך אך ורק על המקורות המאומתים שסופקו לך בהודעת המשתמש. אין לגשת למקורות חיצוניים ואין להמציא חקיקה, פסיקה, מספרי הליך או ציטוטים.",
  "כל טענה משפטית חייבת להתבסס על מקור מהרשימה, לפי מזהה (recordId).",
  "הבחן בין חקיקה מחייבת לבין פסיקה לגילוי שטרם אומתה. פסיקה שאינה מאומתת אינה מבססת מסקנה מחייבת — ציין זאת.",
  "אם אין תמיכה מאומתת מספקת, אמור זאת במפורש ואל תציג השערה כדין מבוסס.",
  "אינך מבצע פעולות, אינך מנסח מסמכים סופיים ואינך ממליץ על צעד בלתי הפיך ללא אישור אנושי.",
  "החזר אך ורק JSON תקין במבנה: {\"executiveSummaryHe\": string, \"legalAnalysisHe\": string, \"usedRecordIds\": string[]}. ללא טקסט נוסף.",
].join("\n");

function allowedSources(input: ProviderInput): { legislation: readonly CanonicalSource[]; cases: readonly CanonicalSource[] } {
  return { legislation: input.legalResearchResult.matchedLegislation, cases: input.legalResearchResult.matchedCases };
}

/** Build the exact request body sent to the Messages API (pure, testable). */
export function buildAnthropicRequest(input: ProviderInput, model: string, maxTokens: number): {
  model: string; max_tokens: number; system: string; messages: { role: "user"; content: string }[];
} {
  const { legislation, cases } = allowedSources(input);
  const sourceBlock = {
    legislation: legislation.map((s) => ({ recordId: s.recordId, citationHe: s.citationHe, sectionHe: s.sectionHe, binding: s.bindingClass === "binding", verification: s.verification, usableForClaim: s.usableForClaim })),
    caseLaw: cases.map((s) => ({ recordId: s.recordId, citationHe: s.citationHe, court: s.court, verification: s.verification, usableForClaim: s.usableForClaim, status: s.status })),
    conflicts: input.legalResearchResult.conflicts,
    confidence: input.legalResearchResult.confidence,
  };
  const cc = input.conversationContext;
  const userText = [
    `שאלת המשתמש: ${cc.userMessage}`,
    input.matterIntelligence ? `הקשר התיק: ${input.matterIntelligence.identity.titleHe} — ${input.matterIntelligence.identity.procedureLabelHe}, שלב ${input.matterIntelligence.stage.stageLabelHe}.` : "אין הקשר תיק — מחקר משפטי כללי.",
    cc.recommendedPromptInputs.openQuestions.length ? `שאלות פתוחות: ${cc.recommendedPromptInputs.openQuestions.join("; ")}` : "",
    "המקורות המאומתים (השתמש רק בהם):",
    JSON.stringify(sourceBlock),
    "כתוב תקציר מנהלים וניתוח משפטי בעברית, בהתבסס על המקורות בלבד, והחזר JSON כפי שהוגדר.",
  ].filter(Boolean).join("\n\n");

  return { model, max_tokens: maxTokens, system: SYSTEM_PROMPT, messages: [{ role: "user", content: userText }] };
}

function extractText(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const content = (json as { content?: unknown }).content;
  if (!Array.isArray(content)) return null;
  for (const block of content) {
    if (block && typeof block === "object" && (block as { type?: string }).type === "text") {
      const t = (block as { text?: unknown }).text;
      if (typeof t === "string") return t;
    }
  }
  return null;
}

function parseProse(text: string, allowedIds: Set<string>): { executiveSummaryHe: string; legalAnalysisHe: string; usedRecordIds: string[] } | null {
  let obj: unknown;
  try { obj = JSON.parse(text); } catch { return null; }
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;
  if (typeof o.executiveSummaryHe !== "string" || typeof o.legalAnalysisHe !== "string") return null;
  const used = Array.isArray(o.usedRecordIds) ? o.usedRecordIds.filter((x): x is string => typeof x === "string" && allowedIds.has(x)) : [];
  return { executiveSummaryHe: o.executiveSummaryHe, legalAnalysisHe: o.legalAnalysisHe, usedRecordIds: used };
}

const fetchTransport: AnthropicTransport = async (req) => {
  const res = await fetch(req.url, { method: "POST", headers: req.headers, body: req.body });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
};

/** Build the Anthropic provider. `available` reflects whether a key is present. */
export function createAnthropicProvider(config: AnthropicConfig = {}): DinoProvider {
  const apiKey = config.apiKey ?? process.env.ANTHROPIC_API_KEY ?? "";
  const model = config.model ?? process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  const apiVersion = config.apiVersion ?? DEFAULT_API_VERSION;
  const maxTokens = config.maxTokens ?? 1024;
  const transport = config.transport ?? fetchTransport;

  return {
    id: "anthropic",
    available: apiKey.length > 0,
    async generate(input: ProviderInput): Promise<ProviderProse> {
      if (apiKey.length === 0) throw new Error("anthropic_not_configured");
      const request = buildAnthropicRequest(input, model, maxTokens);
      const { status, json } = await transport({
        url: baseUrl,
        headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": apiVersion },
        body: JSON.stringify(request),
      });
      if (status < 200 || status >= 300) throw new Error(`anthropic_http_${status}`);
      const text = extractText(json);
      if (!text) throw new Error("anthropic_no_text");
      const { legislation, cases } = allowedSources(input);
      const allowedIds = new Set<string>([...legislation, ...cases].map((s) => s.recordId));
      const parsed = parseProse(text, allowedIds);
      if (!parsed) throw new Error("anthropic_bad_json");
      return { ...parsed, providerId: "anthropic" };
    },
  };
}
