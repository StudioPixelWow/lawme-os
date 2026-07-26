# Matter App — Role Model (Epic 5.1)

The Matter App is one composition that adapts by role — same room, different emphasis
and gating. Roles map to the shared `MatterTeamMember` roles + firm functions.

## What each role sees first

| Role | First emphasis | Notes |
|---|---|---|
| Partner | posture + risk + review routes + strategy | the supervising view; sees everything, drills into exceptions |
| Senior lawyer | posture + blockers + next actions + legal coverage | runs the matter; strategy visible |
| Lawyer (responsible) | the Decision Core + spine + evidence/documents/deadlines | the default operational view |
| Intern | the current node's concrete tasks + evidence/documents | narrowed to assigned work; no strategy/finance |
| Office manager | deadlines + team ownership + document filing readiness | operational, cross-cutting; no legal strategy detail |
| Finance user | the Finance lens (billing/collection) | finance-first; matter legal detail read-only/limited |
| Compliance user | review routes + policy/confidentiality + audit/provenance | oversight; sees routing and provenance, not drafting |

## Visibility & gating matrix

| Surface | Partner | Senior | Lawyer | Intern | Office mgr | Finance | Compliance |
|---|---|---|---|---|---|---|---|
| Decision Core | ✓ | ✓ | ✓ | ✓ (task-scoped) | ✓ | ✓ (limited) | ✓ |
| Milestone Spine | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Score Lens | ✓ | ✓ | ✓ | partial | partial | risk/finance dims | ✓ |
| Strategy | ✓ | ✓ | ✓ | — | — | — | — |
| Legal coverage | ✓ | ✓ | ✓ | read | — | — | ✓ |
| Evidence/Documents | ✓ | ✓ | ✓ | ✓ | ✓ | — | read |
| Client & communication | ✓ | ✓ | ✓ | limited | ✓ | — | read |
| Client risk | ✓ | ✓ | ✓ | — | — | — | ✓ |
| Team | ✓ | ✓ | ✓ | own | ✓ | — | read |
| **Finance** | ✓ | gated | gated | — | ✓ | ✓ | read |
| Confidential/privileged docs | ✓ | ✓ | if assigned | if assigned | — | — | ✓ |
| Provenance/audit | ✓ | ✓ | ✓ | limited | limited | limited | ✓ |
| Dino on-request | ✓ | ✓ | ✓ | limited | — | — | — |

Gating is enforced server-side (RLS + role); the UI simply does not render a gated
surface. A gated panel that a role lacks shows nothing (not "restricted" noise) —
except finance, which shows a single "מוגבל להרשאה" line if the role sees the matter
but not finance.

## Default collapse per role

- Lawyer: spine open, evidence/documents/deadlines lenses one-tap, finance hidden.
- Partner: spine open, risk + review + score lenses surfaced; strategy available.
- Intern: the current node's tasks expanded, everything else collapsed.
- Office manager: deadlines + documents lenses surfaced; legal collapsed.
- Finance: the Finance lens is the default focus; the rest read-only/collapsed.

## Finance panel decision (approved constraint)

**Finance is role- and confidentiality-gated. It never occupies permanent visual
space for every user.** It is a lens, hidden entirely for roles without finance
permission, shown as the default focus only for finance/managing-partner roles, and
rendered "unavailable" (never zero) if the finance engine/integration is down. This
matches the Bible (finance lives in the Finance Workspace; charts are never permanent
residents elsewhere — forbidden #44).

## Confidentiality overlay

Independent of role: a `privileged` matter tightens what provenance exposes and what
any draft may include; `client_confidential` restricts export; the AI policy
(`prohibited`/`restricted…`) suppresses AI surfaces regardless of role. Role
determines *which panels*; confidentiality + AI policy determine *what content* within
them.
