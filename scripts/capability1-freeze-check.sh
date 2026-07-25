#!/usr/bin/env bash
# Capability 1 — Matter Bootstrap Engine — FREEZE GATE.
# The single command that must pass for Capability 1 to remain frozen. Runs the
# application checks and the permanent SQL security gate. Fails on ANY failure;
# no `|| true`, no silent skips.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

step() { echo ""; echo "### $1"; }

step "lint";        npm run lint
step "typecheck";   npm run typecheck
step "build";       npm run build

step "Bootstrap Validation + Aggregate Planning + aggregate limits"
node --test --experimental-strip-types "src/modules/matter/bootstrap/__tests__/"*.test.ts

step "Bootstrap application integration + cross-layer alignment + gateway forwards-only"
node --test --experimental-strip-types "src/modules/matter/bootstrap-integration/__tests__/"*.test.ts

step "Identity / authorization / capabilities"
npm run identity:test
npm run identity:authz:test

step "Matter core / view / workflow / documents"
npm run matter:test
npm run matter:view:test
npm run matter:workflow:test
npm run matter:documents:test

step "Permanent SQL security gate (RLS, primitives, RPC, actor-resolution, gateway forwards-only, hardening, alignment)"
bash "$ROOT/scripts/sql-harness.sh"

echo ""
echo "capability1:freeze-check — ALL GATES PASSED."
