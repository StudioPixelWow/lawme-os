/**
 * Client Intelligence Engine (Epic 4). Reads the client dimension: how
 * responsive they are, their AI-processing policy, confidentiality level, and
 * contact recency. The AI policy directly constrains what LawME may do with the
 * matter, so a "prohibited" policy is a hard, surfaced constraint.
 */
import type { EngineAssessment, Finding, Matter, MatterEngine, RecommendedAction } from "../types.ts";
import { action, assessment, daysBetween, finding, score01 } from "./framework.ts";

export const CLIENT_ENGINE_VERSION = "matter-client-1.0.0";

export const clientEngine: MatterEngine = {
  name: "matter-client",
  version: CLIENT_ENGINE_VERSION,
  assess(matter: Matter): EngineAssessment {
    const c = matter.client;
    const findings: Finding[] = [];
    const actions: RecommendedAction[] = [];
    let penalty = 0;

    if (c.aiPolicy === "prohibited") {
      findings.push(finding("client-ai-prohibited", "high",
        "הלקוח אוסר עיבוד AI על תיק זה — יש לפעול ידנית בלבד", "blocking"));
      penalty += 0.3;
    } else if (c.aiPolicy === "restricted_no_private_context") {
      findings.push(finding("client-ai-restricted", "medium",
        "מותר עיבוד AI ללא הקשר פרטי/מזהה של הלקוח", "why"));
      penalty += 0.1;
    } else if (c.aiPolicy === "allowed_with_review") {
      findings.push(finding("client-ai-review", "low",
        "עיבוד AI מותר בכפוף לסקירה אנושית", "why"));
    }

    if (c.responsiveness === "unreachable") {
      findings.push(finding("client-unreachable", "high", "הלקוח אינו זמין", "who"));
      actions.push(action("client-reengage", "ליזום ערוץ קשר חלופי עם הלקוח", "paralegal",
        "היעדר זמינות הלקוח מעכב קידום", "high"));
      penalty += 0.3;
    } else if (c.responsiveness === "slow") {
      findings.push(finding("client-slow", "medium", "היענות איטית של הלקוח", "who"));
      penalty += 0.15;
    }

    const daysSinceContact = daysBetween(c.lastContactAt, matter.asOf);
    if (daysSinceContact !== null && daysSinceContact > 30) {
      findings.push(finding("client-contact-stale", "low",
        `לא תועד קשר עם הלקוח ${daysSinceContact} ימים`, "who"));
    }

    if (c.confidentiality === "privileged") {
      findings.push(finding("client-privileged", "info", "תיק חסוי/חוסה בחיסיון — יש להקפיד על סיווג", "why"));
    }

    return assessment(this.name, this.version, {
      score: score01(1 - penalty),
      findings,
      actions,
      data: {
        responsiveness: c.responsiveness,
        aiPolicy: c.aiPolicy,
        confidentiality: c.confidentiality,
        daysSinceContact,
      },
      confidence: 0.85,
      requiresHumanReview: c.aiPolicy === "prohibited",
    });
  },
};
