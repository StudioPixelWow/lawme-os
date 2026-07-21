/** Capability 0.8 Slice 0.8.1 — capabilities + role map (tests 15–21). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { CAPABILITIES, ALL_CAPABILITIES, requiresResourceAuthorization, isCapability } from "../capabilities.ts";
import { ROLE_CAPABILITIES, capabilitiesForRole, isOrganizationRole, CAPABILITY_MAP_VERSION, type OrganizationRole } from "../role-capabilities.ts";

const ROLES: OrganizationRole[] = ["owner", "partner", "admin", "lawyer", "paralegal"];

test("C15: each actual organization role maps deterministically to capabilities", () => {
  for (const role of ROLES) {
    const a = capabilitiesForRole(role);
    const b = capabilitiesForRole(role);
    assert.ok(a && b && a.size > 0);
    assert.deepEqual([...a].sort(), [...b].sort());
    // every mapped capability is a known capability
    for (const c of a) assert.ok(isCapability(c));
  }
});

test("C16: unknown role fails closed", () => {
  assert.equal(isOrganizationRole("superuser"), false);
  assert.equal(capabilitiesForRole("superuser"), null);
  assert.equal(capabilitiesForRole(""), null);
});

test("C17: the capability map has a version", () => {
  assert.equal(typeof CAPABILITY_MAP_VERSION, "string");
  assert.ok(CAPABILITY_MAP_VERSION.length > 0);
});

test("C18: no role bundle contains duplicate capabilities", () => {
  for (const role of ROLES) {
    const arr = ROLE_CAPABILITIES[role];
    assert.equal(arr.length, new Set(arr).size, `duplicate in ${role}`);
  }
});

test("C19: resource-scoped capabilities are marked correctly", () => {
  assert.equal(requiresResourceAuthorization("matters.read"), true);
  assert.equal(requiresResourceAuthorization("intake.review"), true);
  assert.equal(requiresResourceAuthorization("matters.assign_owner"), true);
  assert.equal(requiresResourceAuthorization("matters.create"), false);
  assert.equal(requiresResourceAuthorization("intake.create"), false);
  // every metadata entry is self-consistent
  for (const c of ALL_CAPABILITIES) {
    const meta = CAPABILITIES[c];
    assert.equal(meta.capability, c);
    assert.ok(["organization_scoped", "resource_scoped", "organization_and_resource"].includes(meta.scope));
    assert.equal(meta.resourceAuthorizationRequired, meta.scope !== "organization_scoped");
  }
});

test("C20: admin bundle encodes no confidentiality bypass / legal-approval authority", () => {
  const admin = new Set(ROLE_CAPABILITIES.admin);
  for (const denied of ["intake.confirm", "evidence.approve", "documents.approve", "ai.review_high_risk"] as const) {
    assert.equal(admin.has(denied), false, `admin must not have ${denied}`);
  }
  // no capability string is a blanket "bypass"
  for (const c of ALL_CAPABILITIES) assert.ok(!c.includes("bypass"));
});

test("C21: a review-capable role (lawyer) does not automatically receive intake.confirm", () => {
  assert.equal(ROLE_CAPABILITIES.lawyer.includes("intake.confirm"), false);
  assert.equal(ROLE_CAPABILITIES.lawyer.includes("intake.review"), true);
  // legal authority is owner/partner only
  assert.equal(ROLE_CAPABILITIES.owner.includes("intake.confirm"), true);
  assert.equal(ROLE_CAPABILITIES.partner.includes("intake.confirm"), true);
});
