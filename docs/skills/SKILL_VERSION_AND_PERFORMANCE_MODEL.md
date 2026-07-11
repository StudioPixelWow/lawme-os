# LawME — Skill Version & Performance Model (design)

**Status: framework design (Epic 0, Phase 16). No UI, no automatic
updates — all updates remain founder-approved per LAWME SKILLS POLICY.**
Extends: LAWME_SKILLS_REGISTRY.md, UPDATE_AND_ROLLBACK.md,
FUTURE_SKILL_CENTER.md.

## The capability record (future structured form of a registry row)

| Field group | Fields | Source today | Source in product |
|---|---|---|---|
| Version | installed_version · latest_version · update_available · update_risk (major/minor/patch + changed permissions) · changelog_ref · rollback_version (git commit) | registry MD + `git ls-remote --tags` | background version checker |
| Dependencies | workspace_dependencies (which workspaces activate it) · skill_dependencies (skills it assumes, e.g. document-generator ⇢ rtl-best-practices) · conflicts (CONFLICT_MATRIX rows) | WORKSPACE_SKILL_MAP + CONFLICT_MATRIX | capability graph |
| Usage | activation_frequency · last_used · recommended_activation (auto-suggest per task type) · disabled_reason | not tracked yet | activation telemetry |
| Cost | token_impact (avg tokens the skill adds per session) · latency_impact (ms added) | not tracked yet | per-activation measurement |
| Quality | success_rate (task completed without skill-related failure) · benchmark_score (LILB category scores where applicable) · lawyer_correction_rate for legal skills | not tracked yet | benchmark harness + review telemetry |
| Trust | trust_score (composite below) · security_review_ref · last_security_review | SECURITY_REVIEW.md | recomputed per update |

## trust_score (0–100)
maintainer reputation (org-maintained 30 / community 15) + security
review recency (reviewed this version 25 / prior version 10 / never 0) +
permission surface (no shell no network 20 / shell only 12 / network 5 /
credentialed 0) + operational history (no incidents ×15) + benchmark
evidence (measured 10 / none 0). Any unresolved security finding caps the
score at 25 and freezes activation.

## Rules carried into the framework (non-negotiable)
1. **No automatic updates.** The checker only marks `update_available`;
   installing is a founder action via UPDATE_AND_ROLLBACK.md.
2. **Update risk gates review depth:** patch → re-run content scan;
   minor → scan + changelog review; major or ANY permission change →
   full security re-review as if new.
3. Every update writes: previous version, new version, review ref,
   rollback commit — the rollback path is recorded BEFORE activation.
4. A skill with falling success_rate or rising lawyer_correction_rate
   gets flagged, not silently tolerated.
5. Measurement never sends firm data anywhere — telemetry is counts and
   latencies, local to the firm's tenancy.

## Measurement plan (when implementation is approved)
- Activation log: (skill, workspace, task type, timestamp) per session.
- Token/latency: measured by the session harness around skill loading.
- success_rate: task-completion signal + explicit failure attribution.
- benchmark_score: LILB runs tag which skills were active — skills
  become an experimental variable (e.g. does hebrew-legal-research
  improve research-category scores?).

## Relationship to the Future Skill Center
This model is the data layer FUTURE_SKILL_CENTER.md renders. Epic-0
scope ends at this document; no tables, no UI, no telemetry code.
