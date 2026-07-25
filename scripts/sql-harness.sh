#!/usr/bin/env bash
# Capability 1 — permanent SQL security gate.
# Spins up disposable PostgreSQL clusters, applies the Bootstrap migration chain,
# and runs every SQL harness in its authored model. Fails on ANY failure.
# NEVER silently skips: if PostgreSQL tooling is unavailable it exits non-zero
# with a clear setup error. No `|| true`.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIG="$ROOT/supabase/migrations"
TST="$ROOT/supabase/tests"
TMP="$(mktemp -d)"
PORT_BASE="${SQL_HARNESS_PORT_BASE:-5610}"
PGUSER_RUN="${SQL_HARNESS_PG_OS_USER:-postgres}"   # OS user that owns disposable datadirs

# Locate PostgreSQL 16+ binaries (fail clearly if absent).
PGBIN=""
for cand in "$(dirname "$(command -v initdb 2>/dev/null || true)")" /usr/lib/postgresql/*/bin /usr/pgsql-*/bin; do
  if [ -n "$cand" ] && [ -x "$cand/initdb" ] && [ -x "$cand/pg_ctl" ] && [ -x "$cand/psql" ]; then PGBIN="$cand"; break; fi
done
if [ -z "$PGBIN" ]; then
  echo "SETUP ERROR: PostgreSQL server tooling (initdb/pg_ctl/psql) not found." >&2
  echo "  Install PostgreSQL 16 (e.g. 'apt-get install postgresql-16') so the SQL security gate can run." >&2
  exit 2
fi

# Run privileged pg commands as an OS user that may own the datadir.
if [ "$(id -un)" = "root" ] && id "$PGUSER_RUN" >/dev/null 2>&1; then
  AS=(sudo -u "$PGUSER_RUN"); OWN="$PGUSER_RUN"
else
  AS=(); OWN="$(id -un)"
fi

CLUSTERS=()
cleanup() {
  for d in "${CLUSTERS[@]:-}"; do "${AS[@]}" "$PGBIN/pg_ctl" -D "$d" -m immediate stop >/dev/null 2>&1 || true; done
  rm -rf "$TMP" >/dev/null 2>&1 || true
}
trap cleanup EXIT

# Stage SQL into a world-readable location so the pg OS user can read it
# regardless of the repository's parent-directory permissions.
chmod 755 "$TMP" 2>/dev/null || true
STAGE="$TMP/sql"; mkdir -p "$STAGE/migrations" "$STAGE/tests"
cp "$MIG"/*.sql "$STAGE/migrations/" 2>/dev/null || true
cp "$TST"/*.sql "$STAGE/tests/" 2>/dev/null || true
chmod -R a+rX "$STAGE"
MIG="$STAGE/migrations"; TST="$STAGE/tests"

FAILED=0
new_cluster() { # $1=port -> echoes datadir
  local port="$1"
  local dd="$TMP/pg_$port"
  rm -rf "$dd"; mkdir -p "$dd"; chown "$OWN" "$dd" 2>/dev/null || true
  "${AS[@]}" "$PGBIN/initdb" -D "$dd" -A trust -U postgres >/dev/null 2>&1
  "${AS[@]}" "$PGBIN/pg_ctl" -D "$dd" -o "-p $port -k /tmp -c listen_addresses=''" -l "$dd/log" -w start >/dev/null 2>&1
  CLUSTERS+=("$dd"); echo "$dd"
}
psql_f() { "${AS[@]}" "$PGBIN/psql" -v ON_ERROR_STOP=1 -X -q "host=/tmp port=$1 dbname=postgres user=postgres" -f "$2"; }
psql_c() { "${AS[@]}" "$PGBIN/psql" -v ON_ERROR_STOP=1 -X -q "host=/tmp port=$1 dbname=postgres user=postgres" -c "$2"; }
# make repo files readable by the pg OS user
chmod -R a+rX "$TST" "$MIG" 2>/dev/null || true

M3="$MIG/20260724120000_capability1_bootstrap_persistence_primitives.sql"
M4="$MIG/20260724130000_capability1_bootstrap_matter_rpc.sql"
M4B="$MIG/20260724140000_capability1_bootstrap_actor_resolution_fix.sql"
M5="$MIG/20260724150000_capability1_bootstrap_public_gateway.sql"
MF="$MIG/20260724160000_capability1_bootstrap_production_hardening.sql"

report() { if [ "$2" -eq 0 ]; then echo "  PASS  $1"; else echo "  FAIL  $1"; FAILED=1; fi; }

echo "== SQL gate: RLS alignment (Capability 0.8) =="
P=$((PORT_BASE+1)); DD="$(new_cluster $P)"
psql_f $P "$TST/rls_alignment_setup.sql" >/dev/null 2>&1
psql_f $P "$TST/rls_alignment_tests.sql" >/dev/null 2>&1; report "rls_alignment" $?

echo "== SQL gate: Bootstrap primitives =="
P=$((PORT_BASE+2)); DD="$(new_cluster $P)"
psql_f $P "$TST/bootstrap_primitives_setup.sql" >/dev/null 2>&1
psql_f $P "$M3" >/dev/null 2>&1
psql_f $P "$TST/bootstrap_primitives_tests.sql" >/dev/null 2>&1; report "bootstrap_primitives" $?

echo "== SQL gate: RPC chain (rpc, actor-resolution, hardening, alignment) =="
P=$((PORT_BASE+3)); DD="$(new_cluster $P)"
psql_f $P "$TST/bootstrap_rpc_setup.sql" >/dev/null 2>&1
psql_f $P "$M3" >/dev/null 2>&1; psql_f $P "$M4" >/dev/null 2>&1
psql_c $P "revoke usage on schema auth from lawme_bootstrap;" >/dev/null 2>&1
psql_f $P "$M4B" >/dev/null 2>&1; psql_f $P "$MF" >/dev/null 2>&1
psql_f $P "$TST/bootstrap_rpc_tests.sql" >/dev/null 2>&1; report "bootstrap_rpc" $?
psql_f $P "$TST/bootstrap_actor_resolution_tests.sql" >/dev/null 2>&1; report "actor_resolution" $?
psql_f $P "$TST/bootstrap_production_hardening_tests.sql" >/dev/null 2>&1; report "production_hardening" $?
psql_f $P "$TST/bootstrap_alignment_tests.sql" >/dev/null 2>&1; report "alignment_sql" $?

echo "== SQL gate: public gateway (Development privilege model) =="
P=$((PORT_BASE+4)); DD="$(new_cluster $P)"
psql_f $P "$TST/bootstrap_rpc_setup.sql" >/dev/null 2>&1
psql_c $P "revoke usage on schema app from authenticated, anon, service_role;" >/dev/null 2>&1
psql_f $P "$M3" >/dev/null 2>&1; psql_f $P "$M4" >/dev/null 2>&1
psql_c $P "revoke usage on schema auth from lawme_bootstrap;" >/dev/null 2>&1
psql_f $P "$M4B" >/dev/null 2>&1; psql_f $P "$M5" >/dev/null 2>&1; psql_f $P "$MF" >/dev/null 2>&1
psql_f $P "$TST/bootstrap_public_gateway_tests.sql" >/dev/null 2>&1; report "public_gateway" $?

if [ "$FAILED" -ne 0 ]; then echo "SQL security gate: FAILED"; exit 1; fi
echo "SQL security gate: all harnesses passed."
