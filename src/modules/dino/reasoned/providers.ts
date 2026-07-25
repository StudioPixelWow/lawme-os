/**
 * Reasoned providers (Slice 4.1.0). The provider is a legal-language RENDERER.
 * It consumes only the LegalOpinion (via ReasonedAnswerInput) and converts it to
 * Hebrew. It never re-derives reasoning, never queries a source. SERVER-side for
 * the Anthropic transport; the deterministic renderer is pure.
 */
import type { LegalOpinion } from "../../legal-reasoning/types.ts";
import type { ReasonedProvider, ReasonedAnswerInput, ReasonedProse } from "./types.ts";

const CONF_HE: Record<string, string> = { high: "גבוהה", moderate: "בינונית", low: "נמוכה", none: "לא ניתנת לקביעה" };

function usableCitationIds(o: LegalOpinion): string[] {
  return [...o.applicableLegislation, ...o.applicableCaseLaw].filter((a) => a.verification === "verified" && a.usableForClaim).map((a) => a.recordId);
}

/* ---------------- deterministic structured renderer ---------------- */

export const deterministicReasonedProvider: ReasonedProvider = {
  id: "deterministic",
  available: true,
  async generate(input: ReasonedAnswerInput): Promise<ReasonedProse> {
    const o = input.opinion;
    const est = o.establishedFacts.map((f) => f.statementHe);
    const dis = [...o.allegedFacts, ...o.disputedFacts].map((f) => f.statementHe);
    const missing = o.missingFacts.map((m) => m.labelHe);
    const bind = o.applicableLegislation.filter((a) => a.bindingClass === "binding").map((a) => a.citationHe);
    const topChallenge = o.challenges.find((c) => c.disposition === "accepted") ?? o.challenges.find((c) => c.disposition === "unresolved") ?? o.challenges[0];

    return {
      bottomLineHe: o.preliminaryConclusion.statementHe,
      applicationToMatterHe: [
        est.length ? `עובדות מבוססות: ${est.join("; ")}.` : "טרם בוססו עובדות מהותיות.",
        dis.length ? `שנוי/טענה: ${dis.join("; ")}.` : "",
        missing.length ? `חסרים רכיבים: ${missing.join("; ")}.` : "",
      ].filter(Boolean).join(" "),
      governingLawHe: (bind.length ? `החקיקה המחייבת: ${bind.join("; ")}. ` : "") + o.authorityHierarchyHe + (o.jurisprudence.reasonHe ? ` ${o.jurisprudence.reasonHe}` : ""),
      caseLawHe: o.applicableCaseLaw.length ? `פסיקה שאותרה: ${o.applicableCaseLaw.map((a) => a.citationHe).join("; ")} — ${o.jurisprudence.state === "undetermined" ? "טעונה אימות; אינה מבססת מסקנה." : o.jurisprudence.reasonHe}` : "לא אותרה פסיקה מאומתת.",
      opposingArgumentHe: topChallenge ? `הטענה הנגדית החזקה: ${topChallenge.argumentHe} (${topChallenge.disposition === "accepted" ? "התקבלה" : topChallenge.disposition === "rebutted" ? "נדחתה" : "לא הוכרעה"}) — ${topChallenge.effectHe}` : "לא אותרה טענה נגדית מהותית.",
      risksHe: [...o.legalRisks, ...o.practicalRisks].slice(0, 4).map((r) => r.statementHe).join(" ") || "לא זוהו סיכונים מהותיים ברשומה.",
      conclusionDirection: o.preliminaryConclusion.direction,
      confidenceLevel: o.confidence.level,
      usedCitationIds: usableCitationIds(o),
      providerId: "deterministic",
    };
  },
};

/* ---------------- Anthropic legal-language renderer ---------------- */

export interface AnthropicTransport {
  (req: { url: string; headers: Record<string, string>; body: string }): Promise<{ status: number; json: unknown }>;
}
export interface AnthropicReasonedConfig {
  readonly apiKey?: string;
  readonly model?: string;
  readonly baseUrl?: string;
  readonly apiVersion?: string;
  readonly maxTokens?: number;
  readonly transport?: AnthropicTransport;
}

const SYSTEM_PROMPT = [
  "אתה דינו — מנסח חוות דעת משפטית בעברית עבור עורכי דין. אתה מנסח בלבד; ההנמקה המשפטית כבר קבועה ונמסרת לך כ-LegalOpinion.",
  "אסור לך: לשנות את מסקנת חוות הדעת, לשנות את רמת הביטחון, לשדרג אסמכתה שאינה מאומתת, להפוך הסקה לדין מבוסס, להסתיר עובדות חסרות, להוסיף אסמכתה משפטית, או להמעיט באי-ודאות.",
  "מותר לך רק לצטט מזהי אסמכתה (recordId) מתוך הרשימה שסופקה. אין להמציא אסמכתאות.",
  "שמר על הבחנת עובדות (מבוסס/טענה/מחלוקת/חסר), על סיווג האסמכתאות (מחייב/מנחה/טעון אימות), ועל הטענה הנגדית החזקה כפי שנמסרו.",
  "החזר JSON תקין בלבד: {\"bottomLineHe\":string,\"applicationToMatterHe\":string,\"governingLawHe\":string,\"caseLawHe\":string,\"opposingArgumentHe\":string,\"risksHe\":string,\"conclusionDirection\":string,\"confidenceLevel\":string,\"usedCitationIds\":string[]}.",
].join("\n");

export function buildReasonedRequest(input: ReasonedAnswerInput, model: string, maxTokens: number) {
  const o = input.opinion;
  const opinionBlock = {
    issue: o.issue,
    elements: o.elements.map((e) => ({ labelHe: e.labelHe, status: e.status, authorityIds: e.authorityIds })),
    establishedFacts: o.establishedFacts.map((f) => f.statementHe),
    disputedOrAlleged: [...o.allegedFacts, ...o.disputedFacts].map((f) => f.statementHe),
    missingFacts: o.missingFacts.map((m) => m.labelHe),
    legislation: o.applicableLegislation.map((a) => ({ recordId: a.recordId, citationHe: a.citationHe, sectionHe: a.sectionHe, binding: a.bindingClass === "binding", verification: a.verification, usable: a.usableForClaim })),
    caseLaw: o.applicableCaseLaw.map((a) => ({ recordId: a.recordId, citationHe: a.citationHe, binding: a.bindingClass === "binding", verification: a.verification, usable: a.usableForClaim })),
    authorityHierarchyHe: o.authorityHierarchyHe,
    jurisprudence: o.jurisprudence,
    conflicts: o.conflictingAuthorities,
    challenges: o.challenges,
    legalRisks: o.legalRisks, practicalRisks: o.practicalRisks, assumptions: o.assumptions,
    conclusion: { direction: o.preliminaryConclusion.direction, statementHe: o.preliminaryConclusion.statementHe, isProvisional: o.preliminaryConclusion.isProvisional },
    confidence: { level: o.confidence.level, factorsHe: o.confidence.factorsHe },
  };
  const userText = [
    `נסח חוות דעת בעברית עבור השאלה: ${input.userMessage}`,
    "חוות הדעת הקנונית (השתמש רק בה; אל תסיק מחדש):",
    JSON.stringify(opinionBlock),
    "שמר על הסטטוס, הביטחון והסיווגים. השתמש רק במזהי האסמכתאות שסופקו. החזר JSON כמוגדר.",
  ].join("\n\n");
  return { model, max_tokens: maxTokens, system: SYSTEM_PROMPT, messages: [{ role: "user" as const, content: userText }] };
}

const fetchTransport: AnthropicTransport = async (req) => {
  const res = await fetch(req.url, { method: "POST", headers: req.headers, body: req.body });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
};

function extractText(json: unknown): string | null {
  const content = (json as { content?: unknown })?.content;
  if (!Array.isArray(content)) return null;
  for (const b of content) if (b && typeof b === "object" && (b as { type?: string }).type === "text" && typeof (b as { text?: unknown }).text === "string") return (b as { text: string }).text;
  return null;
}

export function createAnthropicReasonedProvider(config: AnthropicReasonedConfig = {}): ReasonedProvider {
  const apiKey = config.apiKey ?? process.env.ANTHROPIC_API_KEY ?? "";
  const model = config.model ?? process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest";
  const baseUrl = config.baseUrl ?? "https://api.anthropic.com/v1/messages";
  const apiVersion = config.apiVersion ?? "2023-06-01";
  const maxTokens = config.maxTokens ?? 1500;
  const transport = config.transport ?? fetchTransport;

  return {
    id: "anthropic",
    available: apiKey.length > 0,
    async generate(input: ReasonedAnswerInput): Promise<ReasonedProse> {
      if (apiKey.length === 0) throw new Error("anthropic_not_configured");
      const request = buildReasonedRequest(input, model, maxTokens);
      const { status, json } = await transport({ url: baseUrl, headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": apiVersion }, body: JSON.stringify(request) });
      if (status < 200 || status >= 300) throw new Error(`anthropic_http_${status}`);
      const text = extractText(json);
      if (!text) throw new Error("anthropic_no_text");
      let obj: unknown;
      try { obj = JSON.parse(text); } catch { throw new Error("anthropic_bad_json"); }
      const o = obj as Record<string, unknown>;
      const str = (k: string): string => (typeof o[k] === "string" ? (o[k] as string) : "");
      return {
        bottomLineHe: str("bottomLineHe"),
        applicationToMatterHe: str("applicationToMatterHe"),
        governingLawHe: str("governingLawHe"),
        caseLawHe: str("caseLawHe"),
        opposingArgumentHe: str("opposingArgumentHe"),
        risksHe: str("risksHe"),
        conclusionDirection: (str("conclusionDirection") || input.opinion.preliminaryConclusion.direction) as ReasonedProse["conclusionDirection"],
        confidenceLevel: str("confidenceLevel") || input.opinion.confidence.level,
        usedCitationIds: Array.isArray(o.usedCitationIds) ? (o.usedCitationIds as unknown[]).filter((x): x is string => typeof x === "string") : [],
        providerId: "anthropic",
      };
    },
  };
}

export { CONF_HE };
