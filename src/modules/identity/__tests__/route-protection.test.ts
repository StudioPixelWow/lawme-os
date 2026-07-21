/**
 * Slice 0.8.2 — route-protection & protected-boundary decision (tests 19–32).
 *
 * Pure security logic: which paths are protected, which are public, the
 * fail-closed boundary redirect, and open-redirect defense on the return path.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isProtectedAppPath,
  isPublicPath,
  protectedBoundaryRedirect,
  safeInternalRedirect,
} from "../infrastructure/route-protection.ts";

test("19: root and every OS prefix are protected", () => {
  assert.equal(isProtectedAppPath("/"), true);
  for (const p of ["/today", "/matters", "/clients", "/calendar", "/documents"]) {
    assert.equal(isProtectedAppPath(p), true, `${p} must be protected`);
    assert.equal(isProtectedAppPath(p + "/123"), true, `${p}/… must be protected`);
  }
});

test("20: public paths are NOT protected", () => {
  for (const p of ["/login", "/logout", "/select-organization"]) {
    assert.equal(isProtectedAppPath(p), false, `${p} must not be protected`);
    assert.equal(isPublicPath(p), true, `${p} must be public`);
  }
});

test("21: a prefix collision is not treated as protected (matters vs mattersX)", () => {
  assert.equal(isProtectedAppPath("/mattersroom"), false);
  assert.equal(isProtectedAppPath("/today-ish"), false);
});

test("22: login is not accidentally protected via startsWith", () => {
  assert.equal(isProtectedAppPath("/login"), false);
  assert.equal(isProtectedAppPath("/login/reset"), false);
});

test("23: boundary sends org-selection codes to /select-organization", () => {
  assert.equal(protectedBoundaryRedirect("NO_ACTIVE_ORGANIZATION"), "/select-organization");
  assert.equal(protectedBoundaryRedirect("ORGANIZATION_SELECTION_REQUIRED"), "/select-organization");
});

test("24: boundary fails closed to /login for auth/expired/unknown codes", () => {
  for (const code of [
    "UNAUTHENTICATED",
    "SESSION_EXPIRED",
    "ACTOR_PROFILE_NOT_FOUND",
    "INACTIVE_MEMBERSHIP",
    "ACTOR_RESOLUTION_FAILED",
    "SOMETHING_UNKNOWN",
    "",
  ]) {
    assert.equal(protectedBoundaryRedirect(code), "/login", `${code} must fail closed to /login`);
  }
});

test("25: safeInternalRedirect keeps a normal same-origin path", () => {
  assert.equal(safeInternalRedirect("/matters/42"), "/matters/42");
  assert.equal(safeInternalRedirect("/today"), "/today");
});

test("26: safeInternalRedirect rejects absolute and protocol-relative URLs (open redirect)", () => {
  assert.equal(safeInternalRedirect("https://evil.example/steal"), "/today");
  assert.equal(safeInternalRedirect("//evil.example"), "/today");
  assert.equal(safeInternalRedirect("http://evil"), "/today");
});

test("27: safeInternalRedirect rejects scheme, backslash, and newline tricks", () => {
  assert.equal(safeInternalRedirect("javascript:alert(1)"), "/today");
  assert.equal(safeInternalRedirect("/a\\b"), "/today");
  assert.equal(safeInternalRedirect("/a\nb"), "/today");
  assert.equal(safeInternalRedirect("mailto:x@y.z"), "/today");
});

test("28: safeInternalRedirect falls back for empty/nullish input", () => {
  assert.equal(safeInternalRedirect(undefined), "/today");
  assert.equal(safeInternalRedirect(null), "/today");
  assert.equal(safeInternalRedirect(""), "/today");
  assert.equal(safeInternalRedirect("relative/no-slash"), "/today");
});

test("29: safeInternalRedirect honors a caller-supplied fallback", () => {
  assert.equal(safeInternalRedirect("https://evil", "/login"), "/login");
});
