# LawME Domain Glossary — Canonical Language (FROZEN)

This is the single source of truth for LawME's domain language. Every entity, table, type, UI label, and conversation uses these words with these meanings. When code and this glossary disagree, this glossary wins and the code is corrected.

**Frozen by founder decision** (Capability 2 · Slice 2 domain freeze). Changes require an explicit founder ruling.

**Implementation status legend:** `existing` = already built and shipped · `Slice 2` = in the prepared, not-yet-applied Slice 2 migration · `future` = deferred, defined here so the language is stable before it is built.

Two hard rules that the whole language protects:
1. **Identity is not involvement.** *Who someone is* (Contact) is separate from *what they do in a matter* (Matter Participant). "Client" and "opposing party" are **roles**, never identity entities. No `clients` identity table may ever be created.
2. **An allegation is never automatically a Fact; a Fact is never automatically a Legal Position; a Legal Position is never automatically legal truth.**

---

## 1. Matter
- **Hebrew (user-facing):** תיק
- **Definition:** The firm's unit of engagement — one client problem the firm is retained to handle.
- **Owns:** the matter root; procedure type, forum, stage, status; and (Slice 2) its own `confidentiality` and `ai_policy`.
- **Does not own:** identities (those are Contacts), the operational work process (that is a Workflow Run).
- **Lifecycle owner:** opened at intake, closed/archived by the responsible attorney; never deleted.
- **Relationships:** root parent of Matter Participants, Facts, Deadlines, Documents, Tasks, Activity, etc.
- **Common confusion:** "Matter" ≠ "Case." Matter is broader — it also covers advisory/non-litigation engagements.
- **Status:** existing.

## 2. Contact
- **Hebrew:** איש קשר
- **Definition:** A reusable firm-level identity representing a person or organization (client, prospective client, opposing individual/company, witness, expert, insurer, external counsel, mediator, vendor, regulator contact).
- **Owns:** identity data only — name, person/organization kind, identification information, contact information, organization-level archival state.
- **Does not own:** matter role, matter-specific notes, legal position, a matter's confidentiality, a matter's AI policy.
- **Lifecycle owner:** created at intake (or first encounter); archived at the organization level; **never hard-deleted**.
- **Relationships:** linked into any number of Matters through Matter Participant.
- **Common confusion:** a Contact is **not** a "client" — *client* is a role it may play in one matter while being an opposing party in another. Do not create a competing clients table.
- **Status:** Slice 2 (`contacts`).

## 3. Matter Participant
- **Hebrew:** משתתף בתיק
- **Definition:** The relationship between a Contact and a specific Matter — the role that contact plays in that matter.
- **Owns:** the Matter↔Contact link, the Participant Role, matter-specific notes, responsiveness, and involvement state (active/archived).
- **Does not own:** the identity itself (that is the Contact), the person's identity fields.
- **Lifecycle owner:** created when a Contact is added to a Matter; archived to unwind involvement without erasing history.
- **Relationships:** Matter 1—* Matter Participant *—1 Contact.
- **Common confusion:** it is the *involvement*, not the *person*. Reuse across matters means many Matter Participant rows pointing at one Contact.
- **Status:** Slice 2 (`matter_participants`).

## 4. Participant Role
- **Hebrew:** תפקיד משתתף
- **Definition:** The role a Contact holds within a Matter. Approved initial values: `client`, `opposing_party`, `related_party`, `witness`, `expert`, `counsel`, `mediator`, `insurer`.
- **Owns:** nothing on its own — it is an attribute of a Matter Participant.
- **Does not own:** identity. `client` and `opposing_party` are roles here, never separate identity entities.
- **Lifecycle owner:** set/changed on the Matter Participant by the responsible attorney (admin-gated write).
- **Relationships:** one Contact may hold **different** legitimate roles in the same Matter (e.g. witness *and* related_party); it may not hold the *same* role twice.
- **Common confusion:** adding a role is not creating a new identity — it is one more hat an existing Contact wears.
- **Status:** Slice 2 (enum on `matter_participants`).

## 5. Fact
- **Hebrew:** עובדה
- **Definition:** A statement about what happened, carrying an epistemic status and provenance (e.g. "the employee informed the manager about the pregnancy"; "salary was not paid in May").
- **Owns:** the statement, its epistemic status, its provenance, and (once established) its link to a Document.
- **Does not own:** legal conclusions (those are Legal Positions), demands (those are Claims).
- **Lifecycle owner:** created at intake as an allegation; **only the evidence gate** may promote it to `confirmed`/`document_derived`.
- **Relationships:** supports Claims; informs Legal Issues; may be established by Evidence.
- **Common confusion:** an allegation is never automatically a Fact-as-established; intake cannot create `confirmed` or `document_derived`.
- **Status:** Slice 2 (`matter_facts`).

## 6. Claim
- **Hebrew:** עילת תביעה
- **Definition:** A requested legal cause of action or remedy asserted by a party (e.g. unlawful dismissal, unpaid wages, breach of contract).
- **Owns:** the asserted cause of action and the remedy sought.
- **Does not own:** the underlying facts (Facts) or the legal questions it raises (Legal Issues).
- **Lifecycle owner:** framed by the attorney as the case theory forms; retired if abandoned.
- **Relationships:** depends on Facts and Legal Issues.
- **Common confusion:** a Claim is *what we demand*, not *what happened* (Fact) and not *our argument* (Legal Position).
- **Status:** future.

## 7. Legal Issue
- **Hebrew:** שאלה משפטית
- **Definition:** A question of law requiring analysis (e.g. whether a permit was required; whether the hearing complied with the law).
- **Owns:** the open legal question.
- **Does not own:** the answer/argument (Legal Position) or the demand (Claim).
- **Lifecycle owner:** framed by the attorney; resolved by argument or a Court Decision.
- **Relationships:** Claims rest on Legal Issues; Legal Positions argue Legal Issues; Research informs them.
- **Common confusion:** an Issue is the *question*, not anyone's *answer*.
- **Status:** future.

## 8. Legal Position
- **Hebrew:** עמדה משפטית
- **Definition:** A party's argued interpretation or conclusion regarding a Legal Issue (claimant's position, respondent's position, internal firm position).
- **Owns:** the argued stance and its supporting reasoning.
- **Does not own:** legal truth — a Legal Position is never automatically correct.
- **Lifecycle owner:** authored by the attorney; revised through the case; can be superseded.
- **Relationships:** argues a Legal Issue; supported by Facts and Research.
- **Common confusion:** a Position is *our argument*, distinct from the *question* (Issue) and the *demand* (Claim). Facts are never Positions.
- **Status:** future.

## 9. Document
- **Hebrew:** מסמך
- **Definition:** A stored artifact (PDF, email, WhatsApp screenshot, contract, court filing).
- **Owns:** the file, its metadata, immutable versions, and its reviewed document decision.
- **Does not own:** the requirement it might satisfy (Evidence Requirement) or its evidentiary link to a fact (Evidence).
- **Lifecycle owner:** created on upload; versioned immutably; soft-deleted, never destroyed.
- **Relationships:** may become Evidence for a Fact or Claim.
- **Common confusion:** a Document is **not automatically evidence** — it becomes Evidence only when reviewed and linked.
- **Status:** existing (`matter_documents`).

## 10. Evidence Requirement
- **Hebrew:** דרישת ראיה
- **Definition:** A description of what must be established or obtained (e.g. "proof that the employer knew about the pregnancy").
- **Owns:** the description of the proof gap and its satisfaction state (derived).
- **Does not own:** the artifact (Document) or the evidentiary judgment (Evidence).
- **Lifecycle owner:** created when a proof gap is identified; satisfied when linked, approved Documents establish it.
- **Relationships:** points at the Fact/Claim it would prove.
- **Common confusion:** a *need* is not a *thing* — never shorten "Evidence Requirement" to "Evidence."
- **Status:** existing (`matter_evidence`, requirement/input side).

## 11. Evidence
- **Hebrew:** ראיה
- **Definition:** The reviewed, provenance-preserving relationship showing how one or more approved Documents support, contradict, or fail to establish a Fact or Claim.
- **Owns:** the evidentiary judgment linking Document(s) → Fact/Claim.
- **Does not own:** the artifact (Document) or the need (Evidence Requirement).
- **Lifecycle owner:** established through the evidence gate; auditable.
- **Relationships:** Document —(Evidence)→ Fact/Claim.
- **Common confusion:** "Evidence" is the *link/judgment*, not the file. **Current implementation:** the reviewed document decision lives on `matter_documents`; the requirement lives on `matter_evidence`. The richer Evidence relationship is additive later — **no new Evidence table in Slice 2.**
- **Status:** existing (partial, via `matter_documents` decision) + future (richer relationship).

## 12. Deadline
- **Hebrew:** מועד
- **Definition:** A time obligation — a date by which something must be done, with honest confidence (known/estimated/unknown), never invented.
- **Owns:** the obligation, its date (or honest absence), strictness, source, and confidence.
- **Does not own:** the court event (Hearing) or the ruling (Court Decision) that may generate it.
- **Lifecycle owner:** created from a statute, contract, court decision, estimate, or user input; recomputed as inputs change.
- **Relationships:** later links to the Court Decision that created it; contributes dated events to the Timeline.
- **Common confusion:** a Deadline is a *due date*, not a *court event* (Hearing).
- **Status:** Slice 2 (`matter_deadlines`).

## 13. Hearing
- **Hebrew:** דיון
- **Definition:** A scheduled court event — an occurrence with a forum, judge, time, and location.
- **Owns:** the event, its schedule, and (future) its outcome.
- **Does not own:** the due dates it may generate (Deadlines) or the rulings it produces (Court Decisions).
- **Lifecycle owner:** set by the court; recorded and tracked by the firm.
- **Relationships:** belongs to a Matter/Forum; may follow a Court Decision and generate Deadlines.
- **Common confusion:** a Hearing is an *event*, not a *due date*.
- **Status:** future.

## 14. Court Decision
- **Hebrew:** החלטת בית משפט (subtype labels: החלטה · צו · פסק דין)
- **Definition:** A judicial output. The broad canonical parent — it may be a procedural decision, an order, an interim decision, a judgment, or a ruling. The subtype is stored separately when built.
- **Owns:** the judicial instrument and its subtype.
- **Does not own:** deadlines or hearings it creates (those are their own entities linking back to it).
- **Lifecycle owner:** external (the court); the firm records it immutably.
- **Relationships:** may create Deadlines and schedule Hearings; may resolve Legal Issues.
- **Common confusion:** do **not** collapse to "Court Order" — "order" (צו) is only one subtype. Hebrew UI uses the legally accurate subtype label.
- **Status:** future (additive; not in Slice 2).

## 15. Task
- **Hebrew:** משימה
- **Definition:** A single unit of work someone must do.
- **Owns:** the to-do, its assignee, status, priority, and due date.
- **Does not own:** the legal/procedural journey (Legal Procedure) or the operational process template (Workflow).
- **Lifecycle owner:** open → done by the assignee; may be spawned by a Workflow Run.
- **Relationships:** belongs to a Matter; may attach to a Workflow Run step, a Deadline, or a blocker.
- **Common confusion:** a Task is one action, not a multi-step process (that is a Workflow).
- **Status:** existing (`matter_tasks`).

## 16. Workflow Definition
- **Hebrew:** תבנית תהליך עבודה
- **Definition:** A reusable template for an operational work process inside LawME (create, assign, execute, pause, submit, approve, reject, complete, reopen).
- **Owns:** the reusable process template and its steps/transitions.
- **Does not own:** the legal journey of a matter (that is Legal Procedure), nor any specific execution (that is a Workflow Run).
- **Lifecycle owner:** the existing Workflow Engine; authored once, reused.
- **Relationships:** instantiated as Workflow Runs.
- **Common confusion:** **Workflow ≠ Legal Procedure.** Workflow is the *operational work process*; Legal Procedure is the *legal/procedural journey*. Never interchangeable. (Legal Procedure is owned by the Procedure Graph + milestones, not by this glossary entry.)
- **Status:** existing (Workflow Engine — not renamed by this task).

## 17. Workflow Run
- **Hebrew:** הרצת תהליך עבודה
- **Definition:** An active execution instance of a Workflow Definition.
- **Owns:** the live state of one execution — current step, transitions taken, actors, and its Approval Decisions.
- **Does not own:** the template (Workflow Definition) or the legal journey (Legal Procedure).
- **Lifecycle owner:** the Workflow Engine; created when a process starts in a Matter.
- **Relationships:** instance-of a Workflow Definition; spawns Tasks; emits Approval Decisions and Audit Events.
- **Common confusion:** a Run is one execution; the reusable template is the Definition.
- **Status:** existing (Workflow Engine).

## 18. Research Request
- **Hebrew:** בקשת מחקר
- **Definition:** An inquiry asking the research system a legal question for a Matter.
- **Owns:** the question asked and its parameters.
- **Does not own:** the execution (Research Run) or the outputs (Research Result).
- **Lifecycle owner:** the attorney/intern; handed to the research system (Dino/legal-research).
- **Relationships:** a Request triggers a Run which produces Results.
- **Common confusion:** the *ask* is not the *answer*.
- **Status:** existing (Dino/legal-research — not renamed by this task).

## 19. Research Run
- **Hebrew:** הרצת מחקר
- **Definition:** A single execution of a Research Request by the research system.
- **Owns:** the execution instance and its trace. (Internally the run yields Findings, Sources, and Citations.)
- **Does not own:** the human-facing question (Request).
- **Lifecycle owner:** the research engine.
- **Relationships:** run-of a Research Request; produces Research Results.
- **Common confusion:** one Request may have multiple Runs over time.
- **Status:** existing (Dino/legal-research).

## 20. Research Result
- **Hebrew:** תוצאת מחקר
- **Definition:** The reviewable output of a Research Run — findings, sources, and citations, pending human review.
- **Owns:** the result set and its human-review state.
- **Does not own:** legal truth — research output is not authoritative until verified by a licensed human.
- **Lifecycle owner:** produced by the engine; reviewed/approved by an attorney.
- **Relationships:** result-of a Research Run; may inform Legal Issues and Positions.
- **Common confusion:** a Result is *proposed*, never automatically an authority. (Internal sub-concepts: Research Finding, Research Source, Research Citation.)
- **Status:** existing (Dino/legal-research).

## 21. Activity
- **Hebrew:** פעילות
- **Definition:** A human-readable account of meaningful Matter events ("Ruth uploaded a payslip").
- **Owns:** the readable feed of matter events.
- **Does not own:** the compliance record (Audit Event) or the case chronology (Timeline).
- **Lifecycle owner:** the system, on behalf of the acting user; append-only.
- **Relationships:** every entity may emit Activity for a Matter.
- **Common confusion:** Activity is *UX narration*, not the tamper-evident compliance ledger (Audit Event).
- **Status:** existing (`matter_activity`).

## 22. Audit Event
- **Hebrew:** אירוע ביקורת
- **Definition:** An immutable security and state-change record — who did what, tamper-evident, legally defensible.
- **Owns:** the compliance-grade record of actions and state changes.
- **Does not own:** the friendly narration (Activity) or the case chronology (Timeline).
- **Lifecycle owner:** the system; append-only, immutable by trigger; never editable.
- **Relationships:** spans all entities; the source of truth for Approval Decisions and accountability.
- **Common confusion:** Audit answers to regulators and Amendment 13; Activity answers to users. Do not merge them.
- **Status:** existing (`audit_events`).

## 23. Timeline
- **Hebrew:** ציר זמן
- **Definition:** A derived chronological projection over dated domain events (dismissal date, hearing dates, deadlines).
- **Owns:** nothing — it is a **derived view**, not a stored entity.
- **Does not own:** any source data; it reads Facts, Deadlines, Hearings, Court Decisions.
- **Lifecycle owner:** derived at load; never persisted.
- **Relationships:** projects the dated events of the substance entities.
- **Common confusion:** Timeline is the **case's chronology** (substance), not the system feed (Activity) or the compliance ledger (Audit Event). It must never become a generic table merely for display.
- **Status:** existing (derived).

## 24. Team Member
- **Hebrew:** חבר צוות
- **Definition:** An internal firm person assigned to a Matter, with a firm role (partner, lawyer, paralegal…).
- **Owns:** the internal staffing assignment and matter-level rights (review/approve).
- **Does not own:** external identities (those are Contacts) or the underlying user account (a Profile/User).
- **Lifecycle owner:** the matter lead / office manager; assigned and changed as staffing changes.
- **Relationships:** Matter *—* Team Member —1 Profile/User.
- **Common confusion:** Team Member = *us* (internal); Contact/Matter Participant = *them* (external). It names the assignment, not the person account.
- **Status:** existing (`matter_members`).

## 25. Approval Decision
- **Hebrew:** החלטת אישור
- **Definition:** An immutable, authorized decision made within a Workflow Run (approved, rejected, returned for correction).
- **Owns:** the recorded decision, its authorized actor, and its moment.
- **Does not own:** a generalized cross-system approval domain (deferred; do not build a generic Approval table yet).
- **Lifecycle owner:** produced by a Workflow transition by an authorized actor; recorded as an immutable Audit Event.
- **Relationships:** belongs to a Workflow Run; emits an Audit Event.
- **Common confusion:** today it is a Workflow transition + Audit Event, **not** a standalone table. A generalized approval domain arrives only if multiple non-Workflow approval systems genuinely require it.
- **Status:** existing (as Workflow transition + Audit Event).

---

# Mandatory boundary diagrams

### 1. Contact → Matter Participant → Matter
Identity is separate from involvement. One Contact reused across many Matters.

```
   Contact (identity only)                 Matter (engagement)
   name, kind, id number,                  procedure, forum, stage,
   contact info, archival                  confidentiality, ai_policy
        │                                        │
        │             Matter Participant         │
        └──────────►  role, notes, responsiveness, involvement state  ◄──────────┘
                      (client | opposing_party | related_party | witness
                       | expert | counsel | mediator | insurer)

   One Contact ──< many Matter Participants >── one Matter each
   "client" / "opposing_party" are ROLES on the link, never identity tables.
```

### 2. Fact → Claim → Legal Issue → Legal Position
Four distinct concepts; none is automatically another.

```
   Fact                Claim                 Legal Issue           Legal Position
   "what happened"     "what we demand"      "the open legal       "our argument on
   epistemic status →  cause of action /     question"             the question"
   provenance          remedy                                      (never = truth)
      │                   │                      │                      │
      │  supports         │  raises              │  argued by           │
      └─────────────────► └────────────────────► └────────────────────►┘
   allegation ≠ fact   depends on Facts       resolved by argument   Facts ≠ Positions
                       + Legal Issues         or a Court Decision
```

### 3. Evidence Requirement → Document → Evidence
A need, an artifact, and the judgment that links them.

```
   Evidence Requirement          Document                  Evidence
   "what must be                 stored artifact           reviewed link:
    established/obtained"         (PDF, email, filing)      Document(s) support /
        │                            │                      contradict / fail to
        │  identifies the gap        │  may become          establish a Fact/Claim
        │                            │                            │
        └──────────── satisfied when approved Documents ──────────┘
                      establish the requirement

   Slice 2: matter_evidence = requirement · matter_documents = document decision
            richer Evidence relationship is FUTURE (no new Evidence table now)
```

### 4. Legal Procedure ↔ Workflow  (permanently distinct — never interchangeable)
The legal journey of the matter vs the operational work process in LawME.

```
   Legal Procedure                         Workflow
   (legal/procedural journey)              (operational work process)
   intake → pre-filing → filing →          create → assign → execute → pause →
   hearing → evidence → judgment →         submit → approve → reject →
   appeal                                  complete → reopen
   owned by: Procedure Graph,              owned by: Workflow Engine
   milestones, legal/procedural rules        ├── Workflow Definition (template)
                                             └── Workflow Run (execution instance)
                                                   └── emits Approval Decision + Audit Event

   ┌───────────────────────────────────────────────────────────────────┐
   │  Procedure = WHERE the matter is in the law.                        │
   │  Workflow  = HOW the firm does a piece of operational work.         │
   └───────────────────────────────────────────────────────────────────┘
```

### 5. Activity ↔ Audit Event ↔ Timeline
Same underlying events, three different readers.

```
                        ┌──────────── a meaningful event occurs ────────────┐
                        │                     │                             │
                   Activity              Audit Event                    Timeline
              (for the USER)         (for REGULATORS)              (for the CASE)
              readable narration     immutable, tamper-           derived chronological
              of matter events       evident state-change         projection over dated
                                     record (Amendment 13)        domain events
              append-only feed       append-only, immutable       NOT stored — derived
                                     by trigger                    at load; never a table

   System plane ──────────────────────────────┘                             │
   Substance plane (the case's own chronology) ────────────────────────────┘
```

---

*End of canonical glossary. When in doubt, a word means what it says here — nowhere else.*
