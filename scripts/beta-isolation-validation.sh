#!/usr/bin/env bash
# ============================================================================
# LawME Beta — Two-Tenant Isolation Validation (Release Ops)
# Run by an OPERATOR who can authenticate as the two real firm accounts.
# Claude cannot run this (it may not create accounts or enter passwords).
#
# ANY non-empty cross-tenant read = P0 → the script exits 2 and prints P0.
# Classification: PASS (all green) · FAIL (a P0 cross-tenant read) · other = NOT VERIFIED.
#
# Fill these from the beta environment, then run:  bash scripts/beta-isolation-validation.sh
# ----------------------------------------------------------------------------
BETA_URL="${BETA_URL:-}"                 # e.g. https://lawme-beta.vercel.app  (no trailing slash)
SUPABASE_URL="${SUPABASE_URL:-}"         # beta project, e.g. https://xxxx.supabase.co
SUPABASE_ANON="${SUPABASE_ANON:-}"       # beta anon/publishable key
A_JWT="${A_JWT:-}"                       # Firm A user access token (from browser session)
B_JWT="${B_JWT:-}"                       # Firm B user access token
A_MATTER="${A_MATTER:-}"                 # a matter id owned by Firm A
B_MATTER="${B_MATTER:-}"                 # a matter id owned by Firm B
# ----------------------------------------------------------------------------
set -u
fail=0; p0=0
green(){ printf '  \033[32mPASS\033[0m  %s\n' "$1"; }
red(){ printf '  \033[31mP0\033[0m    %s\n' "$1"; p0=1; }
warn(){ printf '  \033[33m????\033[0m  %s\n' "$1"; fail=1; }
need(){ [ -z "${!1}" ] && { echo "MISSING $1"; miss=1; }; }

miss=0; for v in BETA_URL SUPABASE_URL SUPABASE_ANON A_JWT B_JWT A_MATTER B_MATTER; do need "$v"; done
[ "$miss" = 1 ] && { echo "→ Fill the variables above. NOT VERIFIED."; exit 3; }

hdr_a=(-H "apikey: $SUPABASE_ANON" -H "Authorization: Bearer $A_JWT")
hdr_b=(-H "apikey: $SUPABASE_ANON" -H "Authorization: Bearer $B_JWT")
rest="$SUPABASE_URL/rest/v1"
# count rows in a REST JSON array response
rows(){ printf '%s' "$1" | grep -o '"id"' | wc -l | tr -d ' '; }

echo "== LawME Beta two-tenant isolation =="

# T0 — unauthenticated API is rejected
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BETA_URL/api/dino/ask" -H 'content-type: application/json' -d '{"question":"בדיקה"}')
[ "$code" = "401" ] && green "T0 unauth /api/dino/ask → 401" || warn "T0 unauth expected 401, got $code"

# T1 — A reads own matters (sanity: RLS not over-blocking)
own=$(curl -s "$rest/matters?select=id&id=eq.$A_MATTER" "${hdr_a[@]}")
[ "$(rows "$own")" = "1" ] && green "T1 A sees own matter" || warn "T1 A cannot see own matter (RLS too strict?)"

# T2 — A reads B's matter (CORE leakage)  → expect 0 rows
xr=$(curl -s "$rest/matters?select=id&id=eq.$B_MATTER" "${hdr_a[@]}")
[ "$(rows "$xr")" = "0" ] && green "T2 A cannot read B matter (REST)" || red "T2 CROSS-TENANT MATTER READ (REST) — $(rows "$xr") row(s)"

# T3 — A reads B's documents  → expect 0
xd=$(curl -s "$rest/matter_documents?select=id&matter_id=eq.$B_MATTER" "${hdr_a[@]}")
[ "$(rows "$xd")" = "0" ] && green "T3 A cannot read B documents" || red "T3 CROSS-TENANT DOCUMENT READ — $(rows "$xd") row(s)"

# T4 — A reads B's facts  → expect 0
xf=$(curl -s "$rest/matter_facts?select=id&matter_id=eq.$B_MATTER" "${hdr_a[@]}")
[ "$(rows "$xf")" = "0" ] && green "T4 A cannot read B facts" || red "T4 CROSS-TENANT FACT READ — $(rows "$xf") row(s)"

# T5 — A queries Dino with B's matterId → must fail-closed to GENERAL (no B data, contextKind general)
dino=$(curl -s -X POST "$BETA_URL/api/dino/ask" -H 'content-type: application/json' \
  -H "Authorization: Bearer $A_JWT" -H "apikey: $SUPABASE_ANON" \
  -d "{\"question\":\"מהו שכר המינימום?\",\"matterId\":\"$B_MATTER\"}")
if printf '%s' "$dino" | grep -q '"contextKind":"general"'; then green "T5 Dino with B matterId → general (fail-closed)"
elif printf '%s' "$dino" | grep -q '"contextKind":"matter"'; then red "T5 Dino RETURNED MATTER CONTEXT for B's matter to A"
else warn "T5 Dino response inconclusive (check auth header format for the app route)"; fi

# T6 — symmetric: B cannot read A's matter
xr2=$(curl -s "$rest/matters?select=id&id=eq.$A_MATTER" "${hdr_b[@]}")
[ "$(rows "$xr2")" = "0" ] && green "T6 B cannot read A matter (symmetry)" || red "T6 CROSS-TENANT (B→A) MATTER READ — $(rows "$xr2") row(s)"

# T7 — anon (no JWT) cannot read any matter
an=$(curl -s "$rest/matters?select=id&id=eq.$A_MATTER" -H "apikey: $SUPABASE_ANON")
[ "$(rows "$an")" = "0" ] && green "T7 anon cannot read matters" || red "T7 ANON READ MATTERS — $(rows "$an") row(s)"

echo "-------------------------------------------"
if [ "$p0" = 1 ]; then echo "RESULT: FAIL — confirmed isolation defect (P0). STOP. Do not onboard firms."; exit 2; fi
if [ "$fail" = 1 ]; then echo "RESULT: NOT VERIFIED — some checks inconclusive (fix inputs/headers and re-run)."; exit 3; fi
echo "RESULT: PASS — no cross-tenant read observed at REST + app layer."
echo "NOTE: also run the DB-layer harness (supabase/tests/remote_rls_validation.sql) against the BETA Supabase,"
echo "and do the browser direct-URL check: as A open \$BETA_URL/matters/\$B_MATTER → expect not-found/redirect."
exit 0
