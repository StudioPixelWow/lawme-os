# CLDM — Entity Catalog

Every entity **carries the Canonical Envelope** (identity, provenance,
versioning, quality, extension blocks — see `00-overview.md`). The catalog below
lists only what is *distinctive* per entity: purpose, primary external-id
schemes, required and optional fields, key relationships (full edges in `02`),
search fields, likely AI derivations (`06`), and validation rules. "Required"
means required for a record to reach `lifecycle_state = active`; a record may
exist as `draft` with less.

Field-type shorthand: `text`, `text[]`, `date`, `tstz`, `range`, `num`, `bool`,
`ref(X)` = typed reference to a canonical entity of type X, `enum(...)` =
controlled value drawn from a Reference-domain vocabulary (never a DB enum),
`jsonb` = structured sub-object.

---

## Domain 1 — Judicial

### Case (`judicial.case`)
- **Purpose.** The dispute/matter as a real-world proceeding-container; the
  identity that decisions, proceedings, and parties attach to.
- **External-id schemes.** `net_hamishpat_case_no`, court-local docket numbers,
  national citation keys.
- **Required.** `case_number`, `court` ref(Court), `case_type` enum, `filed_date`,
  `status` enum(open/closed/appeal/…), `jurisdiction` enum.
- **Optional.** `title`, `subject_summary`, `instance_level` enum(supreme/district/
  magistrate/labor/tribunal/religious), `related_cases` ref(Case)[], `sealed` bool,
  `outcome_summary`, `monetary_value` num, `filing_district` ref(Location).
- **Relationships.** hasDecision→Decision; hasProceeding→Proceeding;
  heardBy→Court; hasParty→Party; onAppealFrom/onAppealTo→Case; aboutTopic→Topic.
- **Search.** FTS: title, subject_summary. Structured/filter: court, case_type,
  status, instance_level, filed_date, jurisdiction. Vector: title+summary.
- **AI derivations.** Timeline, key issues, procedural posture, risk indicators.
- **Validation.** case_number unique within (court, year); filed_date ≤ any
  decision date; instance_level consistent with court.

### Decision (`judicial.decision`)
- **Purpose.** A ruling/judgment document issued in a Case — the primary legal
  text. **Immutable content.**
- **External-id schemes.** publication IDs, national citation, `doc_sha256`.
- **Required.** `case` ref(Case), `decision_date`, `court` ref(Court),
  `decision_type` enum(judgment/interim/order/dismissal), `document` ref(Document
  Source)/text body, `language` enum.
- **Optional.** `panel` ref(Panel), `authoring_judge` ref(Judge), `disposition`
  enum, `is_published` bool, `is_precedent` bool, `headnote`, `page_count`,
  `signed_date`, `publication_date`.
- **Relationships.** inCase→Case; decidedBy→Panel/Judge; cites→Citation→(Decision|
  Law Section); appliesLaw→Section; containsOpinion→Opinion; hasHolding→Holding;
  affectsParty→Party.
- **Search.** FTS: full body, headnote. Filter: decision_date, court,
  decision_type, disposition, is_published, is_precedent, language. Vector: body
  chunks, headnote.
- **AI derivations.** Summary, holdings extraction, issues, cited-authorities
  graph, disposition classification, legal-topic tags.
- **Validation.** decision_date ≥ case.filed_date; content immutable once
  `human_verified`; a published Decision must reference a Document Source.

### Proceeding (`judicial.proceeding`)
- **Purpose.** A procedural event/step within a Case (hearing, motion, ruling
  event) — builds the case timeline.
- **Required.** `case` ref(Case), `event_type` enum, `event_date`.
- **Optional.** `court` ref(Court), `presiding` ref(Judge)[], `outcome`,
  `document` ref(Document Source), `parties_present` ref(Party)[], `next_date`.
- **Relationships.** inCase→Case; before→Judge/Court; producedDecision→Decision.
- **Search.** Filter: event_type, event_date, case. FTS: outcome text.
- **AI derivations.** Timeline node, procedural-stage label.
- **Validation.** event_date within case active range; ordered by event_date.

### Court (`judicial.court`) — *reference-like, cross-cited*
- **Purpose.** A judicial forum. Canonical registry of courts.
- **External-id schemes.** court codes, gov.il unit IDs.
- **Required.** `name`, `court_type` enum(supreme/district/magistrate/labor/
  religious/military/tribunal), `jurisdiction` enum, `location` ref(Location).
- **Optional.** `parent_court` ref(Court), `established_date`, `abolished_date`,
  `aliases` text[], `official_url`.
- **Relationships.** partOf→Court (hierarchy); locatedIn→Location; hasJudge→Judge.
- **Search.** FTS: name, aliases. Filter: court_type, jurisdiction, location.
- **AI derivations.** Alias/normalization candidates.
- **Validation.** name+jurisdiction unique; type consistent with parent.

### Judge (`judicial.judge`) — *Person specialization*
- **Purpose.** A judicial officer. A role-specialization of Reference `Person`.
- **External-id schemes.** appointment records, court rosters.
- **Required.** `person` ref(Person), `title` enum(justice/judge/registrar).
- **Optional.** `courts_served` ref(Court)[], `appointment_date`, `retirement_date`,
  `seniority`, `specializations` ref(Legal Domain)[].
- **Relationships.** isA→Person; sitsOn→Court/Panel; authored→Decision/Opinion.
- **Search.** FTS: person.name. Filter: title, court, active dates.
- **AI derivations.** Authored-decision stats, topic affinity (non-authoritative).
- **Validation.** links to exactly one Person; date ranges non-overlapping per role.

### Panel (`judicial.panel`)
- **Purpose.** The specific bench (set of judges) that decided a Decision.
- **Required.** `members` ref(Judge)[] (≥1), `decision`/`case` ref.
- **Optional.** `presiding` ref(Judge), `panel_size` num, `composition_note`.
- **Relationships.** composedOf→Judge; decided→Decision.
- **Search.** Filter: members, panel_size. 
- **Validation.** presiding ∈ members; panel_size = |members|.

### Party (`judicial.party`)
- **Purpose.** A participant-role in a Case (plaintiff, defendant, appellant,
  respondent, intervener). A *role*, linking a Case to a Person/Organization.
- **Required.** `case` ref(Case), `role` enum, `party_ref` ref(Person|Organization|
  Company).
- **Optional.** `represented_by` ref(Attorney)[], `party_order` num, `status`.
- **Relationships.** inCase→Case; isEntity→Person/Organization/Company;
  representedBy→Attorney.
- **Search.** Filter: role, case. FTS: display name (from linked entity).
- **Validation.** role valid for case_type; party_ref resolves to one entity.

### Attorney (`judicial.attorney`) — *Person specialization*
- **Purpose.** Legal representative in a proceeding. Role-specialization of Person.
- **Required.** `person` ref(Person), `bar_number` (optional if unknown).
- **Optional.** `firm` ref(Organization), `represented_parties` ref(Party)[],
  `admission_date`, `specializations` ref(Legal Domain)[].
- **Relationships.** isA→Person; worksAt→Organization; represents→Party.
- **Search.** FTS: person.name, firm. Filter: bar_number, firm.
- **Validation.** bar_number unique when present; links to one Person.

### Citation (`judicial.citation`)
- **Purpose.** A *reference edge as data*: an in-text citation from a Decision/
  Opinion to another authority (Decision, Law Section, Regulation, Article).
  Modeled as an entity so unresolved/dangling citations are retained.
- **Required.** `citing` ref(Decision|Opinion), `citation_text`, `citation_type`
  enum(case/statute/regulation/secondary).
- **Optional.** `cited_target` ref(any) [null until resolved], `pinpoint`
  (section/paragraph), `treatment` enum(followed/distinguished/overruled/cited),
  `resolution_confidence` num.
- **Relationships.** from→Decision; to→(Decision|Section|Regulation|Article|null).
- **Search.** FTS: citation_text. Filter: citation_type, treatment, resolved(bool).
- **AI derivations.** Target resolution, treatment classification.
- **Validation.** unresolved allowed; if resolved, cited_target type matches
  citation_type.

### Opinion (`judicial.opinion`)
- **Purpose.** An individual judge's opinion within a Decision (majority,
  concurring, dissenting). **Immutable content.**
- **Required.** `decision` ref(Decision), `author` ref(Judge), `opinion_type`
  enum(majority/concurrence/dissent/plurality), `body`/`document` ref.
- **Optional.** `joined_by` ref(Judge)[], `word_count`.
- **Relationships.** inDecision→Decision; authoredBy→Judge; cites→Citation;
  statesHolding→Holding.
- **Search.** FTS: body. Filter: opinion_type, author. Vector: body chunks.
- **AI derivations.** Summary, reasoning extraction, holding attribution.
- **Validation.** author ∈ decision.panel; one majority per decision (soft).

### Holding (`judicial.holding`)
- **Purpose.** A discrete legal rule/ratio established by a Decision — the
  reusable legal proposition. May be AI-*proposed* but is a first-class,
  reviewable entity.
- **Required.** `decision` ref(Decision), `statement`, `legal_domain` ref(Legal
  Domain).
- **Optional.** `holding_type` enum(ratio/obiter), `applies_sections` ref(Section)[],
  `precedential_weight` enum, `source_opinion` ref(Opinion).
- **Relationships.** fromDecision→Decision; interpretsSection→Section;
  aboutTopic→Topic; supersedes→Holding.
- **Search.** FTS: statement. Filter: legal_domain, holding_type. Vector: statement.
- **AI derivations.** Extraction/candidate holdings (default `unverified`).
- **Validation.** must trace to a Decision; precedential weight requires
  human_verified.

---

## Domain 2 — Legislation

### Law (`legislation.law`)
- **Purpose.** A primary statute as an identity across all its versions/amendments.
- **External-id schemes.** `knesset_law_id` (KNS_IsraelLaw), Reshumot publication
  refs, official book-of-laws numbers.
- **Required.** `title`, `law_type` enum(basic_law/statute/ordinance),
  `enactment_date`, `status` enum(in_force/repealed/pending).
- **Optional.** `short_title`, `official_number`, `initiating_bill` ref(Bill),
  `repealed_date`, `responsible_ministry` ref(Ministry), `domains` ref(Legal
  Domain)[].
- **Relationships.** hasChapter→Chapter; hasSection→Section; amendedBy→Amendment;
  originatedFrom→Bill; administeredBy→Ministry; supersedes→Law.
- **Search.** FTS: title, short_title. Filter: law_type, status, enactment_date,
  ministry, domain. Vector: title.
- **AI derivations.** Plain-language summary, domain classification, cross-refs.
- **Validation.** title unique per enactment_date; status/ repealed_date consistent.

### Section (`legislation.section`)
- **Purpose.** An individual section/article of a Law — the atomic citable unit
  of statutory text. **Immutable per version.**
- **External-id schemes.** `knesset_document_id` (KNS_DocumentIsraelLaw), law_id +
  section number.
- **Required.** `law` ref(Law), `section_number`, `text`, `valid_time` range.
- **Optional.** `chapter` ref(Chapter), `heading`, `parent_section` ref(Section),
  `subsections` jsonb, `amended_by` ref(Amendment), `notes`.
- **Relationships.** partOf→Law/Chapter; amendedBy→Amendment; interpretedBy→
  Holding/Decision; referencedBy→Regulation/Order; supersedes→Section.
- **Search.** FTS: text, heading. Filter: law, section_number, in-force-at(valid_time).
- **AI derivations.** Summary, cross-reference extraction, defined-terms.
- **Validation.** (law, section_number, version) unique; text immutable per version;
  point-in-time retrievable via valid_time.

### Chapter (`legislation.chapter`)
- **Purpose.** Structural grouping of Sections within a Law.
- **Required.** `law` ref(Law), `chapter_number`, `title`.
- **Optional.** `parent_chapter` ref(Chapter), `order` num.
- **Relationships.** partOf→Law; contains→Section; partOf→Chapter.
- **Search.** FTS: title. Filter: law, chapter_number.
- **Validation.** (law, chapter_number) unique; ordering consistent.

### Amendment (`legislation.amendment`)
- **Purpose.** A change event to a Law/Section — the mechanism that produces new
  Section versions. **Immutable event.**
- **External-id schemes.** amending-law refs, Reshumot publication.
- **Required.** `amending_law` ref(Law), `target_law` ref(Law), `effective_date`,
  `amendment_type` enum(insert/replace/repeal).
- **Optional.** `affected_sections` ref(Section)[], `text_of_change`,
  `transitional_provisions`.
- **Relationships.** amends→Law/Section; enactedBy→Law; producesVersion→Section.
- **Search.** FTS: text_of_change. Filter: effective_date, amendment_type, target.
- **AI derivations.** Diff summary, impact analysis.
- **Validation.** effective_date present; target sections belong to target_law.

### Regulation (`legislation.regulation`)
- **Purpose.** Secondary legislation (תקנות) made under a Law.
- **External-id schemes.** Reshumot refs, `ckan:regulationdatabase` keys.
- **Required.** `title`, `enabling_law` ref(Law), `made_date`, `status` enum.
- **Optional.** `regulator` ref(Ministry|Authority), `sections` ref(Section)[],
  `official_number`, `effective_date`.
- **Relationships.** underLaw→Law; issuedBy→Ministry/Authority; hasSection→Section.
- **Search.** FTS: title. Filter: enabling_law, regulator, status, made_date.
- **AI derivations.** Summary, obligation extraction.
- **Validation.** enabling_law in force at made_date (soft warning if not).

### Order (`legislation.order`)
- **Purpose.** A statutory order/צו (narrower than regulation; often executive).
- **Required.** `title`, `issuing_authority` ref(Authority|Ministry), `issue_date`,
  `order_type` enum.
- **Optional.** `enabling_law` ref(Law), `expiry_date`, `scope` ref(Location)[].
- **Relationships.** issuedBy→Authority/Ministry; underLaw→Law.
- **Search.** FTS: title. Filter: order_type, authority, issue_date.
- **Validation.** issue_date ≤ expiry_date.

### Bill (`legislation.bill`)
- **Purpose.** Proposed legislation moving through the Knesset (pre-enactment).
- **External-id schemes.** `knesset_bill_id` (KNS_Bill), `ckan:my-bills`.
- **Required.** `title`, `bill_type` enum(government/private/committee),
  `knesset_number` num, `status` enum(proposed/first_reading/…/passed/failed).
- **Optional.** `initiators` ref(Person)[], `committee` ref(Committee),
  `resulting_law` ref(Law), `readings` jsonb.
- **Relationships.** initiatedBy→Person; inCommittee→Committee; becameLaw→Law.
- **Search.** FTS: title. Filter: bill_type, knesset_number, status.
- **AI derivations.** Summary, status timeline.
- **Validation.** resulting_law only when status=passed.

---

## Domain 3 — Regulatory

### Authority (`regulatory.authority`) — *Organization specialization*
- **Purpose.** A regulator (ISA, Bank of Israel, CMA, Competition, Privacy, Tax).
- **External-id schemes.** gov.il unit IDs, org registry.
- **Required.** `name`, `authority_type` enum, `domains` ref(Legal Domain)[].
- **Optional.** `parent` ref(Ministry), `established_date`, `official_url`,
  `aliases` text[].
- **Relationships.** isA→Organization; issues→Regulatory Decision/Circular/
  Guideline/Enforcement Action; partOf→Ministry.
- **Search.** FTS: name, aliases. Filter: authority_type, domain.
- **Validation.** name unique; domains non-empty.

### Regulatory Decision (`regulatory.decision`)
- **Purpose.** A binding decision issued by an Authority. **Immutable content.**
- **Required.** `authority` ref(Authority), `decision_date`, `subject`,
  `decision_type` enum, `document` ref(Document Source).
- **Optional.** `affected_entities` ref(Company|Person|Organization)[], `sanctions`
  jsonb, `legal_basis` ref(Law|Section)[], `status` enum(in_force/appealed/revoked).
- **Relationships.** issuedBy→Authority; basedOn→Law/Section; affects→Company/Person;
  cites→Citation; appealedIn→Case.
- **Search.** FTS: subject, body. Filter: authority, decision_type, decision_date,
  status. Vector: subject+body.
- **AI derivations.** Summary, sanction extraction, obligation/risk indicators.
- **Validation.** legal_basis present for enforcement types.

### Circular (`regulatory.circular`)
- **Purpose.** A regulator circular/חוזר — interpretive/operative guidance to a
  regulated sector.
- **Required.** `authority` ref(Authority), `title`, `issue_date`, `status` enum.
- **Optional.** `supersedes` ref(Circular), `sector` ref(Legal Domain),
  `document` ref(Document Source), `effective_date`.
- **Relationships.** issuedBy→Authority; supersedes→Circular; refersTo→Law/Section.
- **Search.** FTS: title, body. Filter: authority, status, issue_date, sector.
- **AI derivations.** Summary, obligations checklist.
- **Validation.** superseded circular becomes lifecycle superseded.

### Guideline (`regulatory.guideline`)
- **Purpose.** Non-binding best-practice guidance from an Authority.
- **Required.** `authority` ref(Authority), `title`, `issue_date`.
- **Optional.** `binding` bool(=false), `topic` ref(Topic)[], `document` ref.
- **Relationships.** issuedBy→Authority; aboutTopic→Topic.
- **Search.** FTS: title, body. Filter: authority, topic.
- **Validation.** binding defaults false; if true, re-classify as Circular/Decision.

### Enforcement Action (`regulatory.enforcement_action`)
- **Purpose.** A concrete enforcement/sanction event by an Authority against a
  target.
- **Required.** `authority` ref(Authority), `target` ref(Company|Person|
  Organization), `action_type` enum(fine/license_revocation/warning/injunction),
  `action_date`.
- **Optional.** `amount` num, `related_decision` ref(Regulatory Decision),
  `legal_basis` ref(Law|Section)[], `status` enum, `appeal` ref(Case).
- **Relationships.** by→Authority; against→Company/Person; underDecision→Regulatory
  Decision; basedOn→Law/Section; appealedIn→Case.
- **Search.** FTS: description. Filter: authority, action_type, action_date, target.
- **AI derivations.** Risk indicator, penalty-severity classification.
- **Validation.** amount present for fine; target resolves to one entity.

---

## Domain 4 — Registry

Registry entities are **structured records, not primary legal documents** — the
model marks them as reference/diligence data, never as authority.

### Company (`registry.company`) — *Organization specialization*
- **Purpose.** A registered company (רשם החברות).
- **External-id schemes.** `company_registrar_no`, `ckan:ica_companies`.
- **Required.** `registrar_number`, `name`, `company_status` enum(active/
  liquidation/dissolved), `registration_date`.
- **Optional.** `company_type` enum, `address` ref(Location), `officers`
  ref(Person)[], `former_names` text[], `dissolution_date`, `purposes` text.
- **Relationships.** isA→Organization; hasOfficer→Person; partyIn→Case;
  subjectOf→Enforcement Action; relatedTo→Partnership.
- **Search.** FTS: name, former_names. Filter: registrar_number, status, type,
  registration_date.
- **AI derivations.** Entity-resolution candidates, risk flags (litigation count).
- **Validation.** registrar_number unique; status transitions monotonic.

### Nonprofit (`registry.nonprofit`) — *Organization specialization*
- **Purpose.** A registered amuta/nonprofit (`ckan:moj-amutot`).
- **Required.** `registrar_number`, `name`, `status` enum, `registration_date`.
- **Optional.** `purposes` text, `officers` ref(Person)[], `address` ref(Location),
  `proper_management_status`.
- **Relationships.** isA→Organization; hasOfficer→Person; subjectOf→Enforcement
  Action.
- **Search.** FTS: name, purposes. Filter: registrar_number, status.
- **Validation.** registrar_number unique.

### Partnership (`registry.partnership`) — *Organization specialization*
- **Purpose.** A registered partnership (`ckan:ica_partnerships`).
- **Required.** `registrar_number`, `name`, `status` enum, `registration_date`.
- **Optional.** `partners` ref(Person|Company)[], `partnership_type` enum.
- **Relationships.** isA→Organization; hasPartner→Person/Company.
- **Search.** FTS: name. Filter: registrar_number, status, type.
- **Validation.** registrar_number unique; ≥1 partner.

### Patent (`registry.patent`)
- **Purpose.** A patent record (`ckan:mamtziim_patents`).
- **External-id schemes.** patent number, ILPO IDs.
- **Required.** `patent_number`, `title`, `status` enum, `filing_date`.
- **Optional.** `inventors` ref(Person)[], `assignee` ref(Company|Person),
  `grant_date`, `ipc_classes` text[], `abstract`.
- **Relationships.** ownedBy→Company/Person; inventedBy→Person; disputedIn→Case.
- **Search.** FTS: title, abstract. Filter: patent_number, status, filing_date,
  ipc_classes. Vector: abstract.
- **Validation.** patent_number unique; grant_date ≥ filing_date.

### Trademark (`registry.trademark`)
- **Purpose.** A trademark record (`ckan:trademarks_nice`, `simaneymisahr`).
- **Required.** `mark_number`, `mark_text`/`mark_image` ref, `status` enum,
  `filing_date`.
- **Optional.** `owner` ref(Company|Person), `nice_classes` text[], `registration_date`.
- **Relationships.** ownedBy→Company/Person; disputedIn→Case.
- **Search.** FTS: mark_text. Filter: mark_number, status, nice_classes.
- **Validation.** mark_number unique.

### Trust (`registry.trust`)
- **Purpose.** An endowment/hekdesh record (`ckan:hekdeshot`).
- **Required.** `trust_number`, `name`, `status` enum, `registration_date`.
- **Optional.** `trustees` ref(Person)[], `purposes` text, `assets_note`.
- **Relationships.** hasTrustee→Person; subjectOf→Case.
- **Search.** FTS: name, purposes. Filter: trust_number, status.
- **Validation.** trust_number unique.

### Estate (`registry.estate`)
- **Purpose.** An inheritance/succession record (`ckan:yerusha`).
- **Required.** `file_number`, `status` enum, `filing_date`.
- **Optional.** `deceased` ref(Person), `heirs` ref(Person)[], `executor`
  ref(Person|Attorney), `court` ref(Court), `order_type` enum(succession/probate).
- **Relationships.** concernsPerson→Person(deceased); hasHeir→Person; handledBy→
  Court; representedBy→Attorney.
- **Search.** FTS: deceased name. Filter: file_number, status, order_type, court.
- **Validation.** file_number unique; deceased resolves to one Person.

---

## Domain 5 — Government

### Ministry (`government.ministry`) — *Organization specialization*
- **Purpose.** A government ministry/unit.
- **External-id schemes.** gov.il unit IDs.
- **Required.** `name`, `unit_type` enum(ministry/agency/unit), `status` enum.
- **Optional.** `parent` ref(Ministry), `official_url`, `aliases` text[],
  `responsible_domains` ref(Legal Domain)[].
- **Relationships.** isA→Organization; partOf→Ministry; administers→Law;
  issues→Directive/Government Decision; oversees→Authority.
- **Search.** FTS: name, aliases. Filter: unit_type, status.
- **Validation.** name unique; hierarchy acyclic.

### Government Decision (`government.decision`)
- **Purpose.** A government resolution (החלטת ממשלה). **Immutable content.**
  (Coverage note: gov.il is WAF-blocked — populated only via an official feed.)
- **Required.** `decision_number`, `government_number` num, `decision_date`,
  `title`, `document` ref(Document Source).
- **Optional.** `responsible_ministries` ref(Ministry)[], `budget_impact` num,
  `status` enum(active/superseded/implemented), `related_laws` ref(Law)[].
- **Relationships.** by→Ministry(gov); implements/relatesTo→Law; supersedes→
  Government Decision; cites→Citation.
- **Search.** FTS: title, body. Filter: decision_number, government_number, date.
  Vector: title+body.
- **AI derivations.** Summary, obligation/deadline extraction, timeline.
- **Validation.** (government_number, decision_number) unique.

### Committee (`government.committee`)
- **Purpose.** A Knesset or government committee.
- **External-id schemes.** `knesset_committee_id`.
- **Required.** `name`, `committee_type` enum(knesset/government/inter-ministerial),
  `status` enum.
- **Optional.** `parent` ref(Committee|Ministry), `members` ref(Person)[],
  `knesset_number` num, `mandate`.
- **Relationships.** partOf→Ministry/Knesset; hasMember→Person; reviews→Bill;
  produces→Procedure/Directive.
- **Search.** FTS: name, mandate. Filter: committee_type, status, knesset_number.
- **Validation.** name unique per knesset_number.

### Procedure (`government.procedure`)
- **Purpose.** An official administrative procedure/נוהל.
- **Required.** `title`, `issuing_body` ref(Ministry|Authority), `issue_date`,
  `status` enum.
- **Optional.** `supersedes` ref(Procedure), `scope`, `document` ref.
- **Relationships.** issuedBy→Ministry/Authority; supersedes→Procedure;
  refersTo→Law/Section.
- **Search.** FTS: title, body. Filter: issuing_body, status, issue_date.
- **AI derivations.** Step extraction, obligations.
- **Validation.** supersede chain acyclic.

### Directive (`government.directive`)
- **Purpose.** A binding internal government directive (הנחיה) — e.g. AG guidelines.
- **Required.** `title`, `issuing_body` ref(Ministry|Authority), `issue_date`,
  `binding` bool.
- **Optional.** `topic` ref(Topic)[], `supersedes` ref(Directive), `document` ref.
- **Relationships.** issuedBy→Ministry/Authority; aboutTopic→Topic; refersTo→Law.
- **Search.** FTS: title, body. Filter: issuing_body, issue_date, binding.
- **Validation.** binding present.

---

## Domain 6 — Academic

Academic entities are **secondary sources** — never primary authority.

### Article (`academic.article`)
- **Purpose.** A scholarly legal article / law-review paper.
- **External-id schemes.** `doi`, repository IDs, OAI-PMH identifiers.
- **Required.** `title`, `authors` ref(Person)[], `publication_date`, `journal`
  ref(Journal)/venue.
- **Optional.** `abstract`, `keywords` ref(Keyword)[], `cited_authorities`
  ref(Citation)[], `full_text` ref(Document Source), `language`, `peer_reviewed` bool.
- **Relationships.** writtenBy→Person; inJournal→Journal; aboutTopic→Topic;
  cites→Citation; discusses→Decision/Law.
- **Search.** FTS: title, abstract, full_text. Filter: publication_date, journal,
  peer_reviewed, keywords. Vector: abstract, full_text chunks.
- **AI derivations.** Summary, topic tags, cited-authorities graph.
- **Validation.** ≥1 author; doi unique when present.

### Commentary (`academic.commentary`)
- **Purpose.** Doctrinal commentary/annotation on a Law, Section, or Decision.
- **Required.** `authors` ref(Person)[], `target` ref(Law|Section|Decision),
  `body`/`document` ref.
- **Optional.** `publication_date`, `topic` ref(Topic)[].
- **Relationships.** annotates→Law/Section/Decision; writtenBy→Person.
- **Search.** FTS: body. Filter: target, author. Vector: body.
- **AI derivations.** Summary, position classification.
- **Validation.** target resolves to one entity.

### Thesis (`academic.thesis`)
- **Purpose.** A dissertation/thesis (university OAI-PMH — coverage UNKNOWN).
- **Required.** `title`, `author` ref(Person), `institution` ref(Organization),
  `degree` enum, `year` num.
- **Optional.** `advisors` ref(Person)[], `abstract`, `keywords` ref(Keyword)[],
  `full_text` ref(Document Source).
- **Relationships.** writtenBy→Person; atInstitution→Organization; aboutTopic→Topic.
- **Search.** FTS: title, abstract. Filter: institution, degree, year. Vector: abstract.
- **Validation.** one author; institution resolves.

### Journal (`academic.journal`)
- **Purpose.** A legal journal / publication venue.
- **External-id schemes.** ISSN.
- **Required.** `name`, `publisher` ref(Organization).
- **Optional.** `issn`, `field` ref(Legal Domain)[], `peer_reviewed` bool.
- **Relationships.** publishedBy→Organization; contains→Article.
- **Search.** FTS: name. Filter: issn, field, peer_reviewed.
- **Validation.** issn unique when present.

### Opinion (`academic.opinion`)
- **Purpose.** An expert/scholarly legal opinion (distinct from a judicial
  Opinion) — e.g. a commissioned position paper.
- **Required.** `authors` ref(Person)[], `subject`, `body`/`document` ref,
  `opinion_date`.
- **Optional.** `commissioned_by` ref(Organization), `topic` ref(Topic)[],
  `cited_authorities` ref(Citation)[].
- **Relationships.** writtenBy→Person; aboutTopic→Topic; cites→Citation.
- **Search.** FTS: subject, body. Filter: opinion_date, author. Vector: body.
- **AI derivations.** Summary, stance.
- **Validation.** ≥1 author; namespaced to avoid collision with judicial.opinion.

---

## Domain 7 — Reference (cross-cutting)

Reference entities hold the controlled vocabularies and shared actors every
other domain points to. They are the enumeration/authority layer.

### Topic (`reference.topic`)
- **Purpose.** A legal subject-matter node in a curated topic taxonomy.
- **Required.** `label`, `taxonomy` enum, `path` (materialized hierarchy).
- **Optional.** `parent` ref(Topic), `aliases` text[], `definition`, `domain`
  ref(Legal Domain).
- **Relationships.** partOf→Topic; relatedTo→Topic; inDomain→Legal Domain.
- **Search.** FTS: label, aliases, definition. Filter: taxonomy, domain, path.
  Vector: label+definition.
- **Validation.** path acyclic; label unique per parent.

### Keyword (`reference.keyword`)
- **Purpose.** A free-tag/keyword (lighter than Topic; often source- or AI-derived).
- **Required.** `term`, `normalized_term`.
- **Optional.** `language`, `maps_to_topic` ref(Topic), `frequency` num.
- **Relationships.** mapsTo→Topic; taggedOn→(any entity).
- **Search.** FTS: term. Filter: normalized_term, language.
- **Validation.** normalized_term computed; dedup on normalized_term.

### Legal Domain (`reference.legal_domain`)
- **Purpose.** A top-level field of law (labor, corporate, criminal, tax…).
  The taxonomy the Coverage Map is organized by.
- **Required.** `name`, `code`.
- **Optional.** `parent` ref(Legal Domain), `description`, `aliases` text[].
- **Relationships.** partOf→Legal Domain; classifies→(any entity).
- **Search.** FTS: name, description. Filter: code.
- **Validation.** code unique; hierarchy acyclic.

### Organization (`reference.organization`)
- **Purpose.** The generic organization identity that Company, Nonprofit,
  Partnership, Ministry, Authority, Court, Journal *specialize*. Single hub for
  organizational identity resolution.
- **Required.** `name`, `org_type` enum.
- **Optional.** `aliases` text[], `external_ids[]` (registrar, gov unit, ROR),
  `parent` ref(Organization), `location` ref(Location), `status` enum.
- **Relationships.** specializedBy→(Company|Nonprofit|…); partOf→Organization;
  locatedIn→Location.
- **Search.** FTS: name, aliases. Filter: org_type, status.
- **AI derivations.** Duplicate/merge candidates.
- **Validation.** name+type near-unique (subject to identity resolution).

### Person (`reference.person`)
- **Purpose.** The generic person identity that Judge, Attorney, party-persons,
  authors, officers *specialize*. Single hub for person identity resolution.
- **Required.** `full_name`, `name_normalized`.
- **Optional.** `aliases` text[], `external_ids[]` (bar no., ORCID, gov IDs — **no
  sensitive national IDs stored**), `roles` ref(Judge|Attorney|…)[], `birth_year`.
- **Relationships.** playsRole→Judge/Attorney; officerOf→Company; authorOf→Article.
- **Search.** FTS: full_name, aliases. Filter: name_normalized, role.
- **AI derivations.** Disambiguation/merge candidates.
- **Validation.** name_normalized computed; **privacy: never persist national
  ID/SSN-equivalents**; minimize PII (see risks doc).

### Location (`reference.location`)
- **Purpose.** A place (district, city, court seat, address-locality).
- **Required.** `name`, `location_type` enum(country/district/city/address).
- **Optional.** `parent` ref(Location), `coordinates` jsonb, `aliases` text[].
- **Relationships.** partOf→Location.
- **Search.** FTS: name, aliases. Filter: location_type.
- **Validation.** hierarchy acyclic.

### Document Source (`reference.document_source`)
- **Purpose.** A concrete retrieved artifact (the PDF/HTML/CSV file) that backs a
  content entity — the bridge between canonical content and the raw bytes.
  **Immutable.**
- **Required.** `url`, `content_sha256`, `mime_type`, `retrieved_at`,
  `source_platform`, `source_dataset`, `source_resource`.
- **Optional.** `size_bytes`, `storage_ref`, `license` ref, `language`,
  `page_count`, `parser_version`, `redaction_status`.
- **Relationships.** backs→(Decision|Section|Regulatory Decision|Article|…);
  fromPlatform→(platform in Source Registry).
- **Search.** Filter: mime_type, source_platform, retrieved_at, license.
- **Validation.** content_sha256 unique (dedup key); immutable once stored;
  **restriction-flagged documents are never promoted to published content**
  (fail-closed, matches the existing persist pipeline).
