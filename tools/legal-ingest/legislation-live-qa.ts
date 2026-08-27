#!/usr/bin/env node
/**
 * LAW ME — Phase 1 proof: 20 live legal questions against the REAL published
 * legislation corpus, through the REAL Dino pipeline. NO fixtures.
 *
 * Per question it runs the exact reasoned-pipeline stages the /api/dino/ask route
 * uses — buildConversationContext → runLegalResearch → buildLegalOpinion — but
 * with the real-only legislation adapter (legalaiLegislationAdapter), so every
 * legislation citation is grounded in stored, published law. It also runs a
 * direct corpus retrieval probe (raw FTS) so we can separate "does the corpus
 * return real law?" from "does the domain gate admit the question?".
 *
 * Requires SUPABASE_URL + SUPABASE_SECRET_KEY (CI). Emits _legislation-qa.json.
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { runLegalResearch } from "../../src/modules/legal-research/orchestrator.ts";
import { buildLegalOpinion } from "../../src/modules/legal-reasoning/engine.ts";
import { buildConversationContext } from "../../src/modules/dino/conversation/engine.ts";
import { legalaiLegislationAdapter } from "../../src/modules/legal-ai-israel/retrieval/legalai-legislation-adapter.ts";
import type { SearchPlan } from "../../src/modules/legal-research/types.ts";

const NOW = "2026-08-09T09:00:00+03:00";

const QUESTIONS: string[] = [
  "מהי תקופת ההודעה המוקדמת לפני פיטורים?",
  "מה קובע החוק לגבי שכר מינימום לעובד?",
  "כמה ימי חופשה שנתית מגיעים לעובד?",
  "מהם התנאים לפיצויי פיטורים?",
  "מה חובת המעסיק למסור הודעה על תנאי העבודה?",
  "מה קובע החוק לגבי דמי הבראה?",
  "מהן זכויות עובדת בהיריון מפני פיטורים?",
  "מה ההגדרה של עובד ומעסיק בחוק?",
  "מהי תקופת ההתיישנות של תביעה אזרחית?",
  "מה דין הפרת חוזה לפי חוק החוזים?",
  "מהן זכויות היוצרים על יצירה מקורית?",
  "מה קובע החוק לגבי שעות עבודה ומנוחה?",
  "מהם דיני השכירות להגנת הדייר?",
  "מה החובה לשלם דמי מחלה לעובד?",
  "מהם התנאים לרישום זכות במקרקעין?",
  "מה קובע החוק לגבי הטרדה מינית במקום העבודה?",
  "מהי חובת תום הלב במשא ומתן לחוזה?",
  "מה דין פיצויים בגין נזק לפי דיני הנזיקין?",
  "מהן זכויות הצרכן לפי חוק הגנת הצרכן?",
  "מה קובע החוק לגבי שוויון הזדמנויות בעבודה?",
];

const WORD = /[֐-׿A-Za-z0-9]{2,}/g;
function planFor(q: string): SearchPlan {
  const terms = [...new Set((q.match(WORD) ?? []))];
  return {
    id: "probe", sourceId: legalaiLegislationAdapter.id, sourceKind: "legislation",
    queryTerms: terms, topics: [], sections: [], refIds: [],
    filters: { authorityPreference: "balanced", courtLevels: [], dateFromISO: null, dateToISO: null, onlyVerified: false },
    rationaleHe: "בדיקת אחזור ישירה מהקורפוס",
  };
}

async function main(): Promise<void> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    process.stderr.write("legislation-live-qa: SUPABASE_URL + SUPABASE_SECRET_KEY required (CI).\n"); process.exit(2);
  }
  const OUT = process.env.GATE_OUT ?? "tools/legal-ingest/.staging-hybrid";
  const results: unknown[] = [];
  let answerable = 0, retrievedAny = 0, totalCitations = 0, unsupportedTotal = 0;

  for (let i = 0; i < QUESTIONS.length; i++) {
    const question = QUESTIONS[i];
    // --- direct corpus retrieval probe (raw FTS over published chunks) ---
    const probe = await legalaiLegislationAdapter.search(planFor(question));
    // --- real reasoned pipeline, real-only legislation adapter ---
    const conversationContext = buildConversationContext({ intelligence: null, message: question, history: [], nowISO: NOW });
    const research = await runLegalResearch({ question, asOfISO: NOW }, [legalaiLegislationAdapter]);
    const opinion = buildLegalOpinion({ matterIntelligence: null, conversationContext, legalResearch: research, nowISO: NOW });

    const citations = research.matchedLegislation.map((s) => ({
      recordId: s.recordId, citationHe: s.citationHe, sectionHe: s.sectionHe, url: s.url,
      verification: s.verification, usableForClaim: s.usableForClaim,
    }));
    const canConclude = opinion.applicableLegislation.some((a) => a.bindingClass === "binding" && a.usableForClaim);
    if (probe.matchedCount > 0) retrievedAny++;
    if (canConclude) answerable++;
    totalCitations += citations.length;
    unsupportedTotal += opinion.unsupportedStatements.length;

    results.push({
      n: i + 1, question,
      domain_in_scope: research.domain.inScope,
      probe_hits: probe.matchedCount,
      probe_top: probe.sources.slice(0, 3).map((s) => ({ citationHe: s.citationHe, sectionHe: s.sectionHe, url: s.url })),
      pipeline_matched_legislation: research.matchedLegislation.length,
      citations: citations.slice(0, 5),
      research_confidence: research.confidence.level,
      can_conclude: canConclude,
      preliminary_conclusion: opinion.preliminaryConclusion ?? null,
      opinion_confidence: opinion.confidence,
      unsupported_statements: opinion.unsupportedStatements.length,
      disclosure_present: probe.sources.some((s) => s.limitationsHe.length > 0),
    });
    process.stdout.write(`Q${i + 1}: probe=${probe.matchedCount} pipeline=${research.matchedLegislation.length} scope=${research.domain.inScope} conclude=${canConclude}\n`);
  }

  const summary = {
    kind: "LEGISLATION LIVE QA (real corpus, real pipeline, no fixtures)",
    questions: QUESTIONS.length,
    questions_with_corpus_retrieval: retrievedAny,
    questions_answerable_binding: answerable,
    avg_citations_per_answerable: answerable ? +(totalCitations / answerable).toFixed(2) : 0,
    total_unsupported_statements: unsupportedTotal,
    now: NOW,
    results,
  };
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}/_legislation-qa.json`, JSON.stringify(summary, null, 2));
  process.stdout.write(`\nLIVE QA — ${retrievedAny}/${QUESTIONS.length} retrieved from corpus · ${answerable}/${QUESTIONS.length} answerable with binding law · unsupported=${unsupportedTotal}\n→ ${OUT}/_legislation-qa.json\n`);
}

main().catch((e) => { process.stderr.write(`legislation-live-qa failed: ${(e as Error).message}\n`); process.exit(1); });
