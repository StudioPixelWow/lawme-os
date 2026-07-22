/** Slice 0.8.3 — Audit policy (tests 63–67). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { authorizeAudit } from "../audit-policy.ts";
import type { AuditPolicyFacts } from "../contracts.ts";
import { ACTOR, ORG_A, ORG_B, caps, matterFacts, userActor } from "./_support.ts";

function audit(o?: Partial<AuditPolicyFacts>): AuditPolicyFacts {
  return { organizationId: ORG_A, classification: "organization", ...o };
}

test("63: audit.read WITHOUT Matter access is denied a Matter audit", () => {
  // The actor holds matters.read (like every oversight role) but has no access
  // to THIS matter — so it is matter ACCESS, not the capability, that is missing.
  const actor = userActor({ capabilities: caps("audit.read", "matters.read") });
  const d = authorizeAudit(actor, "audit.read", audit({ classification: "matter", matterId: "00000000-0000-4000-8000-0000000000d1", matterPolicy: matterFacts() }));
  assert.equal(d.allowed, false);
  assert.equal(d.code, "RESOURCE_AUDIT_ACCESS_DENIED");
});

test("64: audit.read WITH Matter access allows a Matter audit", () => {
  const actor = userActor({ capabilities: caps("audit.read", "matters.read") });
  const d = authorizeAudit(actor, "audit.read", audit({ classification: "matter", matterId: "00000000-0000-4000-8000-0000000000d1", matterPolicy: matterFacts({ ownerProfileId: ACTOR }) }));
  assert.equal(d.allowed, true);
});

test("65: organization audit requires same tenant + audit.read", () => {
  const withCap = userActor({ capabilities: caps("audit.read") });
  assert.equal(authorizeAudit(withCap, "audit.read", audit({ classification: "organization" })).allowed, true);
  const noCap = userActor({ capabilities: caps() });
  assert.equal(authorizeAudit(noCap, "audit.read", audit({ classification: "security" })).code, "RESOURCE_CAPABILITY_DENIED");
});

test("66: cross-tenant is denied", () => {
  const actor = userActor({ organizationId: ORG_A, capabilities: caps("audit.read") });
  assert.equal(authorizeAudit(actor, "audit.read", audit({ organizationId: ORG_B })).code, "RESOURCE_TENANT_MISMATCH");
});

test("67: an unknown/absent classification fails closed and no payload is exposed", () => {
  const actor = userActor({ capabilities: caps("audit.read") });
  assert.equal(authorizeAudit(actor, "audit.read", audit({ classification: undefined })).code, "RESOURCE_INVALID_POLICY_FACTS");
  const ok = authorizeAudit(actor, "audit.read", audit({ classification: "organization" }));
  assert.ok(!/payload|content|body/i.test(JSON.stringify(ok)));
});
