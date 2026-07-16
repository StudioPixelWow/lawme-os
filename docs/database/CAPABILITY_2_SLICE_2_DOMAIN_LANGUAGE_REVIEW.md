> **Superseded on naming by the frozen glossary.** The founder adopted recommendation **B** with corrections — notably the firm-level identity is **Contact** (not "Participant"), and the involvement link is **Matter Participant**. The canonical, frozen language lives in `docs/domain/LAWME_DOMAIN_GLOSSARY.md`; where this review and the glossary differ on names, the glossary wins. This document is kept as the reasoning trail.

# Capability 2 · Slice 2 — Domain **Language** Review (for founder review)

**This is not a schema review.** No SQL, no Postgres, no Supabase. The question for every entity is only: *is this the right business concept, in the right words, for the operating system of an Israeli labor-law firm — today and in ten years?*

**Status:** analysis only. No SQL changed, no migration created, no code written.

Two ownership terms used throughout:
- **Business owner** — the firm role that owns the *meaning and content* of the concept (whose judgment it encodes).
- **Lifecycle owner** — what governs its *creation → change → retirement* (intake, the evidence gate, the court, the system clock, etc.).

Build status is noted per entity because it changes the stakes: renaming something **Built** is a real change; sharpening something **Deferred** is free.

---

## The spine that should hold the whole language together

Before the entity-by-entity pass, one structural observation that most of the naming findings flow from. A law firm's world splits cleanly into **three planes**, and the language is strongest when each entity sits unambiguously in exactly one:

1. **People plane** — who is involved. *External* people/orgs vs *internal* firm staff.
2. **Substance plane** — the legal content of the case: facts, claims, issues, positions, evidence, rulings, deadlines.
3. **System plane** — how the software records work: activity, audit, tasks, approvals.

Most of my findings are cases where an entity's *name* implies one plane while its *contents* live in another. Fixing those is naming work, not redesign.

---

## Entity-by-entity

### 1. Matter — *Built*
- **Purpose:** the firm's unit of engagement — one client problem the firm is retained to handle.
- **Business owner:** the responsible attorney (the matter's lead).
- **Lifecycle owner:** opened at intake, closed/archived by the lead attorney; never deleted.
- **Dependencies:** the root everything else hangs from.
- **Future evolution:** non-litigation matters (advisory, contracts), multi-forum matters, matter-to-matter relations.
- **Verdict:** ✅ Canonical. "Matter" is exactly the word firms use, broader than "case," future-proof, one real thing, instantly obvious to any attorney or new developer. **Freeze.**

### 2. Party → recommend **Participant** — *Built (name at issue)*
- **Purpose:** a firm-level identity of a person or organization the firm encounters, reusable across matters.
- **Business owner:** intake / the attorney who first records them.
- **Lifecycle owner:** created at intake, archived (never deleted) to preserve history.
- **Dependencies:** organization (tenant) only; deliberately holds no matter role.
- **Future evolution:** dedup/merge, conflict-of-interest derivation, government bodies (ביטוח לאומי, משרד העבודה), unions (הסתדרות).
- **Verdict:** ⚠️ **Concept correct, name legally imprecise.** In litigation, "party" means a *named party to the proceeding* — a plaintiff or defendant. But this entity also holds witnesses, experts, mediators, counsel, and insurers, who are **not parties** in the legal sense. A labor litigator will notice that "a witness is a Party" reads wrong. The accurate umbrella is **Participant** (or "Involved Person/Entity"), with *party* reserved for the true parties. This is the same move that made Client a role rather than an entity — apply it one level up. Small rename, large clarity gain. **Adjust name.**

### 3. MatterParty → recommend **Party Role** / **Involvement** — *Built (name at issue)*
- **Purpose:** the role a participant plays *in one matter* (client, opposing, witness, expert, counsel, mediator, insurer).
- **Business owner:** the responsible attorney.
- **Lifecycle owner:** created when a participant is added to a matter; archived to unwind a role without erasing history.
- **Dependencies:** Matter + Participant.
- **Future evolution:** per-role responsiveness, portal access scoped by role, conflict flags derived across matters.
- **Verdict:** ⚠️ **Right concept, developer-plane name.** "MatterParty" is a join-table label, not something an attorney says. In the firm's language this is *"[participant]'s role in the matter"* — best named **Party Role**, **Role Assignment**, or **Involvement**. ("Appearance" is tempting but already means something specific in litigation — avoid.) **Adjust name.**

### 4. Fact — *Built*
- **Purpose:** a single factual statement about the case, carrying an honest epistemic status (alleged / disputed / unknown / — via evidence — established).
- **Business owner:** the attorney; the evidence gate owns *promotion* to an established fact.
- **Lifecycle owner:** created at intake as an allegation; only the evidence gate can confirm it.
- **Dependencies:** Matter; optionally a Document once established.
- **Future evolution:** fact ↔ claim linkage, fact contradiction detection, per-fact provenance chains.
- **Verdict:** ✅ Correct and precise — "an allegation is never a fact" is the firm's core discipline, and this entity encodes it. One real thing, obvious to a developer. **Freeze** — *but see the Fact/Claim/Issue/Position boundary note below.*

### 5. Claim — *Deferred*
- **Purpose:** a legal cause of action the client asserts — the *demand* built on facts + law (e.g., "unlawful dismissal during pregnancy → compensation under the Employment of Women Law").
- **Business owner:** the attorney.
- **Lifecycle owner:** created when the attorney frames the case theory; evolves with strategy; retired if abandoned.
- **Dependencies:** Matter, Facts (it rests on them), Legal Issues.
- **Future evolution:** relief sought, quantum, per-claim strength scoring, claim-by-claim disposition.
- **Verdict:** ⚠️ **Correct concept, but its boundary with Fact / Legal Issue / Legal Position must be locked before build.** A Claim is *what we demand*; a Fact is *what happened*; a Legal Issue is *the contested legal question*; a Legal Position is *our argument on that question*. These four are genuinely distinct to a litigator but collapse easily in software. Don't freeze the word without freezing the four-way boundary. **Define before build.**

### 6. Evidence Requirement — *Built (as the requirement side of matter_evidence)*
- **Purpose:** a *gap* — what the firm still needs in order to establish a fact or support a claim ("we need a payslip").
- **Business owner:** the attorney / paralegal running collection.
- **Lifecycle owner:** created when a proof gap is identified; satisfied (derived) when linked, approved evidence exists.
- **Dependencies:** Matter; the Fact/Claim it would prove.
- **Future evolution:** requirement templates per procedure type, auto-generated from claim elements.
- **Verdict:** ✅ Correct and genuinely distinct from Evidence itself — a *need* is not a *thing*. Attorneys understand "what's still missing." Keep the name explicit ("Evidence **Requirement**," never shortened to "Evidence"). **Freeze.**

### 7. Evidence — *partly Built, name ambiguous*
- **Purpose:** the evidentiary value of some material toward a fact/claim — *this document supports/contradicts that fact*.
- **Business owner:** the reviewing attorney (the evidentiary judgment is legal).
- **Lifecycle owner:** established through the evidence gate; auditable.
- **Dependencies:** a Document (the artifact) **and** a Fact/Claim (what it proves).
- **Future evolution:** the deferred evidence↔document many-to-many; admissibility flags; chain-of-custody.
- **Verdict:** ⚠️ **"Evidence" as a bare noun is the most overloaded word in the model.** It can mean the *requirement* (#6), the *artifact* (#8 Document), or the *evidentiary link* (a document proving a fact). Pick one meaning and hold it: reserve **Evidence** for the *link/judgment* (Document → proves → Fact), keep **Document** for the artifact and **Evidence Requirement** for the need. Without this, a new developer cannot tell the three apart. **Define before build.**

### 8. Document — *Built*
- **Purpose:** a real artifact the firm holds — a file with metadata and immutable versions.
- **Business owner:** whoever uploaded/owns it; the reviewer for its status.
- **Lifecycle owner:** created on upload; versioned immutably; soft-deleted, never destroyed.
- **Dependencies:** Matter; optionally becomes Evidence for a Fact.
- **Future evolution:** OCR/extraction, e-filing links, court-bundle assembly.
- **Verdict:** ✅ One real thing, cleanly separated from its *evidentiary role*. A payslip PDF is a Document; its use to prove salary is Evidence. Obvious to attorneys and developers. **Freeze.**

### 9. Deadline — *Built*
- **Purpose:** a time obligation — a date by which something must be done, with honest confidence (known/estimated/unknown, never invented).
- **Business owner:** the responsible attorney.
- **Lifecycle owner:** created from a statute, contract, court order, or estimate; recomputed as inputs change.
- **Dependencies:** Matter; later, the Court Order that generated it.
- **Future evolution:** deadline → Court Order link, statutory-deadline auto-derivation, calendar sync.
- **Verdict:** ✅ Distinct from Hearing and Court Order, correctly refuses to fabricate dates. Attorney-native. **Freeze.**

### 10. Hearing — *Deferred*
- **Purpose:** a scheduled court event — a calendar occurrence with a forum, judge, time, and location.
- **Business owner:** the attorney; the office manager for logistics.
- **Lifecycle owner:** set by the court; the firm records and tracks it.
- **Dependencies:** Matter; a Forum; often generates Deadlines; may follow a Court Order.
- **Future evolution:** hearing outcomes, attendance, transcript links, adjournment history.
- **Verdict:** ✅ Correct and clearly distinct from Deadline (an *event*, not a *due date*). Name is future-proof. **Freeze concept; build later.**

### 11. Court Order → consider **Ruling** / **Court Decision** — *Deferred (name at issue)*
- **Purpose:** an instrument issued *by the court* — a directive, decision, or judgment.
- **Business owner:** the court issues it; the attorney interprets it.
- **Lifecycle owner:** external (the court); the firm records it immutably.
- **Dependencies:** Matter; often creates Deadlines and schedules Hearings.
- **Future evolution:** appeals chains, compliance tracking, order → deadline auto-generation.
- **Verdict:** ⚠️ **Name may be too narrow for the Israeli forum.** Israeli labor courts issue **החלטה** (decision), **צו** (order/injunction), and **פסק דין** (judgment). "Court Order" in English reads as only the injunctive **צו**. The umbrella concept is better named **Ruling** or **Court Decision**, with "order/injunction/judgment" as kinds. **Adjust name before build.**

### 12. Task — *Built*
- **Purpose:** a single unit of work someone must do.
- **Business owner:** the assignee; the creator for intent.
- **Lifecycle owner:** open → done by the assignee; may be spawned by a Procedure.
- **Dependencies:** Matter; optionally a Procedure step, a Deadline, or a blocker.
- **Future evolution:** dependencies between tasks, SLA/priority automation, workload views.
- **Verdict:** ✅ Universally understood, one real thing. **Freeze.**

### 13. Workflow → recommend **Procedure** (Template vs Run) — *Deferred (name at issue)*
- **Purpose:** a repeatable legal process — the ordered steps for handling a situation (e.g., a §9 pre-dismissal procedure).
- **Business owner:** the firm's knowledge owner (a partner) for the template; the attorney for a running instance.
- **Lifecycle owner:** template authored once; an *instance* runs inside a matter.
- **Dependencies:** Matter (for an instance); spawns Tasks; tied to a procedure type.
- **Future evolution:** procedure libraries, versioned playbooks, outcome analytics.
- **Verdict:** ⚠️ Two problems. (a) "Workflow" is product/engineering language; attorneys say **procedure**, **process**, or **playbook**. (b) The word hides a template-vs-instance ambiguity — is a "Workflow" the *definition* or the *running thing in a matter*? Lock both: **Procedure Template** vs **Matter Procedure** (run). **Adjust name and split the sense before build.**

### 14. Research → recommend sharpening (**Research Session** / **Authority**) — *Built as a link*
- **Purpose:** the legal research done for a matter — the authorities consulted and questions asked.
- **Business owner:** the attorney/intern doing the research.
- **Lifecycle owner:** created when research is run; linked to the matter.
- **Dependencies:** Matter; the existing legal-research engine.
- **Future evolution:** cited-authority tracking, research → position linkage, memo generation.
- **Verdict:** ⚠️ "Research" as a bare noun is under-specified — is it a *session* (an inquiry), an *authority* (a cited source), or a *memo* (the writeup)? Attorneys distinguish these. Name the pieces: **Research Session**, **Authority**, **Research Memo**. Concept valid, granularity vague. **Sharpen.**

### 15. Activity — *Built*
- **Purpose:** the human-readable feed of what happened in a matter ("Ruth uploaded a payslip").
- **Business owner:** the system, on behalf of the acting user.
- **Lifecycle owner:** append-only; written by the system as work occurs.
- **Dependencies:** Matter; every other entity emits into it.
- **Future evolution:** filtering, per-role feeds, digest notifications.
- **Verdict:** ✅ Correct *system-plane* concept — **but see the Activity/Audit/Timeline boundary below.** Consider "Activity **Feed**" to signal it's UX, not the compliance record. **Freeze concept; clarify against Audit.**

### 16. Audit — *Built (audit_events)*
- **Purpose:** the immutable, compliance-grade record of who did what — tamper-evident, legally defensible.
- **Business owner:** compliance / the firm's risk owner.
- **Lifecycle owner:** append-only, immutable by trigger; never editable.
- **Dependencies:** spans all entities and organizations.
- **Future evolution:** retention policy, export for regulators, integrity proofs.
- **Verdict:** ✅ Correct and necessary — distinct from Activity (UX) because Audit answers to *regulators and Amendment 13*, not to users. Keep the distinction explicit in the language. **Freeze.**

### 17. Timeline — *Derived (not stored)*
- **Purpose:** the chronological view of the *case's real-world events* — dismissal date, hearing dates, deadlines — as a projection.
- **Business owner:** the attorney (it's a reading of the substance).
- **Lifecycle owner:** derived at load from Facts, Deadlines, Hearings, Rulings; never persisted.
- **Dependencies:** the substantive entities it projects.
- **Future evolution:** interactive chronology, gap detection, statute-of-limitations visualization.
- **Verdict:** ✅ Correctly *derived*, and correctly about the **case** (substance plane), not the **system** (Activity/Audit). The one trap: never let Timeline, Activity, and Audit blur — they are *case chronology*, *system feed*, and *compliance ledger* respectively. Say so in the glossary. **Freeze as derived.**

### 18. Legal Issue — *Deferred*
- **Purpose:** a contested question of law the matter turns on ("does §9 of the Employment of Women Law bar this dismissal?").
- **Business owner:** the attorney.
- **Lifecycle owner:** framed by the attorney; resolved by argument or ruling.
- **Dependencies:** Matter; Claims rest on Issues; Positions argue Issues; Research informs them.
- **Future evolution:** issue libraries per procedure type, precedent linkage, win-rate analytics.
- **Verdict:** ⚠️ Correct and distinct — but part of the Fact/Claim/Issue/Position quartet that must be defined together before any of the deferred three is built. **Define before build.**

### 19. Legal Position — *Deferred*
- **Purpose:** the firm's argued stance on a Legal Issue ("we argue the dismissal violated §9 because…").
- **Business owner:** the attorney.
- **Lifecycle owner:** authored as strategy forms; revised through the case; can be superseded.
- **Dependencies:** a Legal Issue; supported by Facts and Authorities.
- **Future evolution:** opposing-position tracking, strength scoring, brief generation.
- **Verdict:** ⚠️ Correct concept; most easily confused with Claim and Issue. **Position = our argument; Claim = our demand; Issue = the open question.** Lock the trio. **Define before build.**

### 20. Client — **role, not entity** — *correctly absent*
- **Purpose:** the participant the firm represents in a matter.
- **Business owner:** the responsible attorney.
- **Lifecycle owner:** assigned when a Participant is given the *client* role in a matter.
- **Dependencies:** Participant + Matter (via Party Role).
- **Future evolution:** client portal, client-profile defaults (which must *propose*, never override matter-level policy).
- **Verdict:** ✅ **Must stay a role, never become an entity.** The whole firm-level-identity adjustment exists so "client" is one hat a Participant wears in one matter — the same person may be an opposing party elsewhere. Document this loudly so no future developer re-creates a `clients` table. **Keep as role; write it into the glossary.**

### 21. Team Member — *Built (matter_members)*
- **Purpose:** an *internal* firm person assigned to a matter, with a firm role (partner, lawyer, paralegal…).
- **Business owner:** the matter lead / office manager (staffing).
- **Lifecycle owner:** assigned when staffed onto a matter; changed as staffing changes.
- **Dependencies:** Matter + the underlying firm User/Profile.
- **Future evolution:** capacity/workload, billing roles, review/approval rights.
- **Verdict:** ✅ Correct, and the clean internal mirror of Participant (external). Keep the internal/external split sharp: **Team Member = us; Participant = them.** Minor: it names the *assignment*; the person underneath is a User/Profile — keep those two distinct. **Freeze.**

### 22. Approval — currently a **state**, deserves to be an **event** — *partly Built as states*
- **Purpose:** a firm actor's formal sign-off on something (a document, a filing, a position) — who approved, when, with what decision and scope.
- **Business owner:** the approver (partner / reviewer); compliance cares about the record.
- **Lifecycle owner:** created as an approval act; immutable thereafter.
- **Dependencies:** the approved object; the approver (Team Member); emits to Audit and Activity.
- **Future evolution:** multi-step approval chains, delegated authority, e-signature.
- **Verdict:** ⚠️ Today "approval" lives as scattered *states* (`approval_state` on documents, `can_approve` on members). For a firm OS with real accountability, an **Approval** is a genuine business *event* — "the partner signed off at 14:03" is legally meaningful. Recognize it as a first-class concept (deferred), distinct from but feeding Audit. **Elevate the concept when approval workflows are built.**

---

## Cross-cutting boundaries to write into the glossary (so the language survives contact with new developers)

1. **People:** *Participant* (external) vs *Team Member* (internal). *Client* and *opposing* are **roles**, not entities.
2. **The substance quartet:** *Fact* (what happened) · *Claim* (what we demand) · *Legal Issue* (the open legal question) · *Legal Position* (our argument on it). Four words, four definitions, frozen together.
3. **The evidence trio:** *Evidence Requirement* (the need) · *Document* (the artifact) · *Evidence* (the artifact's proven link to a fact). Never let "evidence" float free.
4. **The time trio:** *Deadline* (a due date) · *Hearing* (a court event) · *Ruling* (what the court issued). A Ruling can create a Deadline and schedule a Hearing.
5. **The record trio:** *Timeline* (the case's chronology — substance) · *Activity* (the system feed — UX) · *Audit* (the compliance ledger — regulators). Same events, three different readers.

---

## Conclusion

**B — Freeze the Domain Language after small naming adjustments.**

The concepts are right. The architecture just validated. Nothing here calls for redesign, so it is not C. But four names would read wrong to an Israeli labor litigator or a new developer, and three concept-clusters need their boundaries locked before the deferred entities are built — so it is not A.

**Adjustments that touch already-built entities (decide now, because we're freezing "permanently"):**
- **Party → Participant** (a witness is not a "party") — with *party* kept as a role.
- **MatterParty → Party Role / Involvement** (retire the join-table name from the business vocabulary).
- **Client and opposing are roles, not entities** — write it into the glossary so no `clients` table is ever born.

**Adjustments to lock before building deferred entities (no code today):**
- Define the **Fact / Claim / Legal Issue / Legal Position** quartet together.
- Define the **Evidence Requirement / Document / Evidence** trio; reserve "Evidence" for the proven link.
- **Court Order → Ruling / Court Decision** (to cover החלטה / צו / פסק דין).
- **Workflow → Procedure**, split into *Template* vs *Matter Procedure* (run).
- **Research** → name its pieces (Session / Authority / Memo).
- **Approval** → recognize as a first-class *event*, not scattered states.

None of these change the Slice 2 schema you approved; they are vocabulary and glossary decisions. On your ruling I can produce a one-page **LawME Domain Glossary** that fixes these names and boundaries as the canonical language — no SQL, no migration, no code — for you to freeze.

Awaiting your review.
