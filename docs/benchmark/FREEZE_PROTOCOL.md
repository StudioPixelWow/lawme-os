# LAW ME — Benchmark Freeze Protocol

Freezing converts the 108 human-reviewed pages into an immutable, versioned
regression benchmark. After the freeze, the page set and its ground truth do not
change; a correction requires a new version (v2), never an edit to v1. The Phase
2 scorer refuses to run until `FROZEN-v1.json` exists.

## The gate (defined once)

Freeze eligibility is computed by `annotation-core.freezeIssues()`, the same
function pre-flight uses. `freeze-benchmark.ts` never relaxes it — it only reads
it. A page is freeze-eligible **only** when all of the following hold:

- its state is a final state — APPROVED or UNRESOLVED;
- it has no active conflict;
- its confirmed stratum is set to a known stratum;
- it has been **second-reviewed**: `reviewed_by` and `reviewed_at` are set;
- the reviewer is **not** the annotator;
- it passes full structural + metadata validation for its state (transcription
  present for APPROVED; unresolved reason present for UNRESOLVED; provenance
  matches the manifest; regions well-formed; page alignment and Hebrew-fidelity
  note present; review metadata consistent).

If even one of the 108 pages fails, freeze refuses and prints the blocking
reasons. Nothing is written.

## Order of operations

```bash
# Confirm readiness without side effects. Exit 0 = READY, exit 1 = NOT READY.
node --experimental-strip-types benchmark/knesset-layout/preflight-freeze.ts

# Only when pre-flight says READY:
node --experimental-strip-types benchmark/knesset-layout/freeze-benchmark.ts --freeze --stamp 2026-08-08
```

Use `checkpoint-annotations.ts` freely along the way — it writes a timestamped
hash backup of progress but never freezes and never marks anything immutable.

## What freeze writes

`FROZEN-v1.json` records:

- `frozen_at` stamp and `status: FROZEN — immutable`;
- `page_count`, `approved`, `unresolved`, and per-stratum counts;
- `reviewers` — how many pages each reviewer signed off;
- `manifest_sha256`, a per-file `ground_truth_sha256` map, and a
  `combined_sha256` over all of them.

The combined hash is the benchmark's fingerprint. Commit `FROZEN-v1.json` and
record the `combined_sha256`; any later drift in a ground-truth file will change
it and be caught.

## After freeze

- The scorer (`score-benchmark.ts`) may run. It compares each engine (layout-2
  and every candidate) to the frozen human ground truth and reports
  human-anchored metrics per stratum. It never reads or regenerates ground
  truth.
- The ground-truth files for v1 are treated as immutable. A needed change is a
  v2: add the new/edited pages under a new manifest + freeze, alongside v1.
- `published = 0` remains in force until an engine is selected on this frozen set.

## Invariants

The official PDF is the sole authority; every extractor/OCR output is
machine-derived and is scored against the human ground truth, never the reverse.
No corpus-wide reprocessing happens before an engine is chosen on this set.
