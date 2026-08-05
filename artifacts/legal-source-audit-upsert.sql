-- Legal source audit results — run 75f28657-2ffc-455c-8ed9-be82780ffcc8 (2026-08-05T16:39:12.427Z)
-- Idempotent: updates legalai.legal_sources by code; inserts evidence.
-- Apply to DEV only. No destructive statements.

insert into legalai.ingestion_runs (id, run_type, status, started_at, completed_at, metadata)
values ('75f28657-2ffc-455c-8ed9-be82780ffcc8', 'source_audit', 'succeeded', '2026-08-05T16:39:12.427Z', now(), '{"tool":"run-audits"}'::jsonb)
on conflict (id) do nothing;

-- הרשות השופטת → REVIEW
update legalai.legal_sources set
  normalized_domain='court.gov.il', owner_type='official',
  access_status='public', technical_access_status='open',
  legal_reuse_status='unknown', collector_status='audit_required',
  audit_status='manual_review_required', audit_confidence=0.61,
  requires_login=false, requires_captcha=false,
  robots_status='found', has_api=false,
  has_sitemap=false, has_rss=false, has_atom=false,
  has_public_search=false, estimated_sitemap_urls=null,
  coverage_score=0, access_score=35,
  metadata_quality_score=0, document_quality_score=0,
  legal_clarity_score=0, priority_score=9,
  recommended_access_method=null, last_audited_at=now(), last_successful_access_at=now()
where code='net_hamishpat';
insert into legalai.source_audit_evidence (source_id, audit_run_id, evidence_type, url, status_code, content_hash, summary, observed_at)
  select id, '75f28657-2ffc-455c-8ed9-be82780ffcc8', 'homepage', 'https://www.court.gov.il/', 200, '707061e9831dccc7ddd7fe5ba5a7271eedd0404d5388c2ce6ab442603ca7d734', 'homepage status 200', '2026-08-05T16:39:12.915Z'
  from legalai.legal_sources where code='net_hamishpat';
insert into legalai.source_audit_evidence (source_id, audit_run_id, evidence_type, url, status_code, content_hash, summary, observed_at)
  select id, '75f28657-2ffc-455c-8ed9-be82780ffcc8', 'robots', 'https://www.court.gov.il/robots.txt', 200, 'c415df5752c68954f0d8801d60236dd7b18663748bb68417d7ae0a48dc100a69', 'robots status 200', '2026-08-05T16:39:12.915Z'
  from legalai.legal_sources where code='net_hamishpat';

-- בית המשפט העליון — פסיקה → REVIEW
update legalai.legal_sources set
  normalized_domain='supremedecisions.court.gov.il', owner_type='official',
  access_status='public', technical_access_status='open',
  legal_reuse_status='unknown', collector_status='audit_required',
  audit_status='manual_review_required', audit_confidence=0.61,
  requires_login=false, requires_captcha=false,
  robots_status='found', has_api=false,
  has_sitemap=false, has_rss=false, has_atom=false,
  has_public_search=false, estimated_sitemap_urls=null,
  coverage_score=0, access_score=35,
  metadata_quality_score=0, document_quality_score=0,
  legal_clarity_score=0, priority_score=9,
  recommended_access_method=null, last_audited_at=now(), last_successful_access_at=now()
where code='supreme_court';
insert into legalai.source_audit_evidence (source_id, audit_run_id, evidence_type, url, status_code, content_hash, summary, observed_at)
  select id, '75f28657-2ffc-455c-8ed9-be82780ffcc8', 'homepage', 'https://supremedecisions.court.gov.il/', 200, 'eab6d4822e1b5f1a0f8cbf941ab3e021254011c873ca1e80c92a3900841b7082', 'homepage status 200', '2026-08-05T16:39:14.983Z'
  from legalai.legal_sources where code='supreme_court';
insert into legalai.source_audit_evidence (source_id, audit_run_id, evidence_type, url, status_code, content_hash, summary, observed_at)
  select id, '75f28657-2ffc-455c-8ed9-be82780ffcc8', 'robots', 'https://supremedecisions.court.gov.il/robots.txt', 200, 'a956d63025590f22cdff2d9962deb0734984b708b56292f5abc32a1bf71a364e', 'robots status 200', '2026-08-05T16:39:14.983Z'
  from legalai.legal_sources where code='supreme_court';

-- gov.il — dynamic collectors → BLOCKED
update legalai.legal_sources set
  normalized_domain='gov.il', owner_type='official',
  access_status='blocked', technical_access_status='waf_blocked',
  legal_reuse_status='unknown', collector_status='blocked',
  audit_status='incomplete', audit_confidence=0.3,
  requires_login=false, requires_captcha=false,
  robots_status='not_found', has_api=false,
  has_sitemap=false, has_rss=false, has_atom=false,
  has_public_search=false, estimated_sitemap_urls=null,
  coverage_score=0, access_score=10,
  metadata_quality_score=0, document_quality_score=0,
  legal_clarity_score=0, priority_score=3,
  recommended_access_method=null, last_audited_at=now(), last_successful_access_at=null
where code='gov_il_legal';
insert into legalai.source_audit_evidence (source_id, audit_run_id, evidence_type, url, status_code, content_hash, summary, observed_at)
  select id, '75f28657-2ffc-455c-8ed9-be82780ffcc8', 'homepage', 'https://www.gov.il/', 403, 'f0e4b08263f79d75559ffec0b78771c586de2734d4cfc1c222e0c8e5f6ba4bcb', 'homepage status 403', '2026-08-05T16:39:17.352Z'
  from legalai.legal_sources where code='gov_il_legal';

-- data.gov.il → REVIEW
update legalai.legal_sources set
  normalized_domain='data.gov.il', owner_type='official',
  access_status='public', technical_access_status='open',
  legal_reuse_status='unknown', collector_status='audit_required',
  audit_status='manual_review_required', audit_confidence=0.74,
  requires_login=false, requires_captcha=false,
  robots_status='found', has_api=false,
  has_sitemap=true, has_rss=false, has_atom=false,
  has_public_search=false, estimated_sitemap_urls=5036,
  coverage_score=56, access_score=50,
  metadata_quality_score=0, document_quality_score=0,
  legal_clarity_score=0, priority_score=29,
  recommended_access_method='sitemap-driven fetch', last_audited_at=now(), last_successful_access_at=now()
where code='data_gov_il';
insert into legalai.source_audit_evidence (source_id, audit_run_id, evidence_type, url, status_code, content_hash, summary, observed_at)
  select id, '75f28657-2ffc-455c-8ed9-be82780ffcc8', 'homepage', 'https://data.gov.il/', 200, '51c1372063767d552dbe7959131950275d995141a7d7a29e15447d83916c43cd', 'homepage status 200', '2026-08-05T16:39:18.903Z'
  from legalai.legal_sources where code='data_gov_il';
insert into legalai.source_audit_evidence (source_id, audit_run_id, evidence_type, url, status_code, content_hash, summary, observed_at)
  select id, '75f28657-2ffc-455c-8ed9-be82780ffcc8', 'robots', 'https://data.gov.il/robots.txt', 200, 'e4faa5942c7a35c3560a36987ee9a569225513930c0a09840be4413352ccbf0d', 'robots status 200', '2026-08-05T16:39:18.903Z'
  from legalai.legal_sources where code='data_gov_il';
insert into legalai.source_audit_evidence (source_id, audit_run_id, evidence_type, url, status_code, content_hash, summary, observed_at)
  select id, '75f28657-2ffc-455c-8ed9-be82780ffcc8', 'sitemap', 'https://data.gov.il/sitemap.xml', 200, '71931f6617cfbde5663c6c02afe24b0680a803aa80a2b4029491e3abcc25f2b1', 'sitemap urlset, ~5036 urls', '2026-08-05T16:39:18.903Z'
  from legalai.legal_sources where code='data_gov_il';

-- בתי הדין לעבודה → REVIEW
update legalai.legal_sources set
  normalized_domain='court.gov.il', owner_type='official',
  access_status='public', technical_access_status='open',
  legal_reuse_status='unknown', collector_status='audit_required',
  audit_status='manual_review_required', audit_confidence=0.61,
  requires_login=false, requires_captcha=false,
  robots_status='found', has_api=false,
  has_sitemap=false, has_rss=false, has_atom=false,
  has_public_search=false, estimated_sitemap_urls=null,
  coverage_score=0, access_score=35,
  metadata_quality_score=0, document_quality_score=0,
  legal_clarity_score=0, priority_score=9,
  recommended_access_method=null, last_audited_at=now(), last_successful_access_at=now()
where code='net_hamishpat';
insert into legalai.source_audit_evidence (source_id, audit_run_id, evidence_type, url, status_code, content_hash, summary, observed_at)
  select id, '75f28657-2ffc-455c-8ed9-be82780ffcc8', 'homepage', 'https://www.court.gov.il/', 200, '707061e9831dccc7ddd7fe5ba5a7271eedd0404d5388c2ce6ab442603ca7d734', 'homepage status 200', '2026-08-05T16:39:21.250Z'
  from legalai.legal_sources where code='net_hamishpat';
insert into legalai.source_audit_evidence (source_id, audit_run_id, evidence_type, url, status_code, content_hash, summary, observed_at)
  select id, '75f28657-2ffc-455c-8ed9-be82780ffcc8', 'robots', 'https://www.court.gov.il/robots.txt', 200, '35e17cbac153fea2fd191e8e4baacbb0d238265aa3a40a6b029137206ab25eb5', 'robots status 200', '2026-08-05T16:39:21.250Z'
  from legalai.legal_sources where code='net_hamishpat';

-- בתי הדין הרבניים → BLOCKED
update legalai.legal_sources set
  normalized_domain='gov.il', owner_type='official',
  access_status='blocked', technical_access_status='waf_blocked',
  legal_reuse_status='unknown', collector_status='blocked',
  audit_status='incomplete', audit_confidence=0.3,
  requires_login=false, requires_captcha=false,
  robots_status='not_found', has_api=false,
  has_sitemap=false, has_rss=false, has_atom=false,
  has_public_search=false, estimated_sitemap_urls=null,
  coverage_score=0, access_score=10,
  metadata_quality_score=0, document_quality_score=0,
  legal_clarity_score=0, priority_score=3,
  recommended_access_method=null, last_audited_at=now(), last_successful_access_at=null
where code='gov_il_legal';
insert into legalai.source_audit_evidence (source_id, audit_run_id, evidence_type, url, status_code, content_hash, summary, observed_at)
  select id, '75f28657-2ffc-455c-8ed9-be82780ffcc8', 'homepage', 'https://www.gov.il/he/departments/rbc', 403, '959a0b6a209b054a0bdef1ed9dde807f16b2ca759cf022f9873e246b1513751b', 'homepage status 403', '2026-08-05T16:39:23.278Z'
  from legalai.legal_sources where code='gov_il_legal';

-- המפקחים על רישום מקרקעין → BLOCKED
update legalai.legal_sources set
  normalized_domain='gov.il', owner_type='official',
  access_status='blocked', technical_access_status='waf_blocked',
  legal_reuse_status='unknown', collector_status='blocked',
  audit_status='incomplete', audit_confidence=0.3,
  requires_login=false, requires_captcha=false,
  robots_status='not_found', has_api=false,
  has_sitemap=false, has_rss=false, has_atom=false,
  has_public_search=false, estimated_sitemap_urls=null,
  coverage_score=0, access_score=10,
  metadata_quality_score=0, document_quality_score=0,
  legal_clarity_score=0, priority_score=3,
  recommended_access_method=null, last_audited_at=now(), last_successful_access_at=null
where code='gov_il_legal';
insert into legalai.source_audit_evidence (source_id, audit_run_id, evidence_type, url, status_code, content_hash, summary, observed_at)
  select id, '75f28657-2ffc-455c-8ed9-be82780ffcc8', 'homepage', 'https://www.gov.il/he/departments/dynamiccollectors/tabu_search_verdict', 403, '09341fbd9dd0015ce2add67c928796596d80a972078eeb918f9947e73c170959', 'homepage status 403', '2026-08-05T16:39:24.817Z'
  from legalai.legal_sources where code='gov_il_legal';

-- בתי דין מנהליים / ועדות ערר → BLOCKED
update legalai.legal_sources set
  normalized_domain='gov.il', owner_type='official',
  access_status='blocked', technical_access_status='waf_blocked',
  legal_reuse_status='unknown', collector_status='blocked',
  audit_status='incomplete', audit_confidence=0.3,
  requires_login=false, requires_captcha=false,
  robots_status='not_found', has_api=false,
  has_sitemap=false, has_rss=false, has_atom=false,
  has_public_search=false, estimated_sitemap_urls=null,
  coverage_score=0, access_score=10,
  metadata_quality_score=0, document_quality_score=0,
  legal_clarity_score=0, priority_score=3,
  recommended_access_method=null, last_audited_at=now(), last_successful_access_at=null
where code='gov_il_legal';
insert into legalai.source_audit_evidence (source_id, audit_run_id, evidence_type, url, status_code, content_hash, summary, observed_at)
  select id, '75f28657-2ffc-455c-8ed9-be82780ffcc8', 'homepage', 'https://www.gov.il/', 403, '669ef6909511b2ba8c188a536641c05c967612308a64ae93bfdf9371c4118860', 'homepage status 403', '2026-08-05T16:39:26.339Z'
  from legalai.legal_sources where code='gov_il_legal';

-- רשות התחרות → BLOCKED
update legalai.legal_sources set
  normalized_domain='gov.il', owner_type='official',
  access_status='blocked', technical_access_status='waf_blocked',
  legal_reuse_status='unknown', collector_status='blocked',
  audit_status='incomplete', audit_confidence=0.3,
  requires_login=false, requires_captcha=false,
  robots_status='not_found', has_api=false,
  has_sitemap=false, has_rss=false, has_atom=false,
  has_public_search=false, estimated_sitemap_urls=null,
  coverage_score=0, access_score=10,
  metadata_quality_score=0, document_quality_score=0,
  legal_clarity_score=0, priority_score=3,
  recommended_access_method=null, last_audited_at=now(), last_successful_access_at=null
where code='gov_il_legal';
insert into legalai.source_audit_evidence (source_id, audit_run_id, evidence_type, url, status_code, content_hash, summary, observed_at)
  select id, '75f28657-2ffc-455c-8ed9-be82780ffcc8', 'homepage', 'https://www.gov.il/he/departments/competition_authority', 403, 'a8559dfb52c04e6c469597fc836203dad1f411e1e94da706af69a7826d50241b', 'homepage status 403', '2026-08-05T16:39:27.861Z'
  from legalai.legal_sources where code='gov_il_legal';

-- רשות ניירות ערך → REVIEW
update legalai.legal_sources set
  normalized_domain='isa.gov.il', owner_type='official',
  access_status='public', technical_access_status='open',
  legal_reuse_status='unknown', collector_status='audit_required',
  audit_status='manual_review_required', audit_confidence=0.74,
  requires_login=false, requires_captcha=false,
  robots_status='found', has_api=false,
  has_sitemap=true, has_rss=false, has_atom=false,
  has_public_search=false, estimated_sitemap_urls=null,
  coverage_score=15, access_score=50,
  metadata_quality_score=0, document_quality_score=0,
  legal_clarity_score=0, priority_score=17,
  recommended_access_method='sitemap-driven fetch', last_audited_at=now(), last_successful_access_at=now()
where code='isa_gov_il';
insert into legalai.source_audit_evidence (source_id, audit_run_id, evidence_type, url, status_code, content_hash, summary, observed_at)
  select id, '75f28657-2ffc-455c-8ed9-be82780ffcc8', 'homepage', 'https://www.new.isa.gov.il/', 200, '447225a31c1b5b55a527aebd32453e076da10d52a501510f85f2225030a1757b', 'homepage status 200', '2026-08-05T16:39:29.375Z'
  from legalai.legal_sources where code='isa_gov_il';
insert into legalai.source_audit_evidence (source_id, audit_run_id, evidence_type, url, status_code, content_hash, summary, observed_at)
  select id, '75f28657-2ffc-455c-8ed9-be82780ffcc8', 'robots', 'https://www.new.isa.gov.il/robots.txt', 200, '407a7077c2c03f5dab258f3600a70abfe24dcb600b13f8aaa7f793cbddc36ba6', 'robots status 200', '2026-08-05T16:39:29.375Z'
  from legalai.legal_sources where code='isa_gov_il';
insert into legalai.source_audit_evidence (source_id, audit_run_id, evidence_type, url, status_code, content_hash, summary, observed_at)
  select id, '75f28657-2ffc-455c-8ed9-be82780ffcc8', 'sitemap', 'https://www.new.isa.gov.il/sitemap.xml', 200, '7cc2d715c3cfaccc2b3f28ef40b7f0a02ecca00006b5921d17a9b84a281b9332', 'sitemap index, ~0 urls', '2026-08-05T16:39:29.375Z'
  from legalai.legal_sources where code='isa_gov_il';

-- רשות המסים → BLOCKED
update legalai.legal_sources set
  normalized_domain='gov.il', owner_type='official',
  access_status='blocked', technical_access_status='waf_blocked',
  legal_reuse_status='unknown', collector_status='blocked',
  audit_status='incomplete', audit_confidence=0.3,
  requires_login=false, requires_captcha=false,
  robots_status='not_found', has_api=false,
  has_sitemap=false, has_rss=false, has_atom=false,
  has_public_search=false, estimated_sitemap_urls=null,
  coverage_score=0, access_score=10,
  metadata_quality_score=0, document_quality_score=0,
  legal_clarity_score=0, priority_score=3,
  recommended_access_method=null, last_audited_at=now(), last_successful_access_at=null
where code='gov_il_legal';
insert into legalai.source_audit_evidence (source_id, audit_run_id, evidence_type, url, status_code, content_hash, summary, observed_at)
  select id, '75f28657-2ffc-455c-8ed9-be82780ffcc8', 'homepage', 'https://www.gov.il/he/departments/israel_tax_authority', 403, 'e03059d8ff1beade484e4b7b03fa1e81f011ded01aedc36e04dcd8ac8573bb4d', 'homepage status 403', '2026-08-05T16:39:32.499Z'
  from legalai.legal_sources where code='gov_il_legal';

-- מערכת בתי הדין (unicourt) → REVIEW
update legalai.legal_sources set
  normalized_domain='unicourt.justice.gov.il', owner_type='official',
  access_status='public', technical_access_status='open',
  legal_reuse_status='unknown', collector_status='audit_required',
  audit_status='manual_review_required', audit_confidence=0.61,
  requires_login=false, requires_captcha=false,
  robots_status='found', has_api=false,
  has_sitemap=false, has_rss=false, has_atom=false,
  has_public_search=false, estimated_sitemap_urls=null,
  coverage_score=0, access_score=35,
  metadata_quality_score=0, document_quality_score=0,
  legal_clarity_score=0, priority_score=9,
  recommended_access_method=null, last_audited_at=now(), last_successful_access_at=now()
where code='unicourt_justice_gov_il';
insert into legalai.source_audit_evidence (source_id, audit_run_id, evidence_type, url, status_code, content_hash, summary, observed_at)
  select id, '75f28657-2ffc-455c-8ed9-be82780ffcc8', 'homepage', 'https://unicourt.justice.gov.il/', 200, '9ad94bf9aa65eaea957730b76c39cba55b5759d6b4f15ee078ff7931ab721ffb', 'homepage status 200', '2026-08-05T16:39:34.043Z'
  from legalai.legal_sources where code='unicourt_justice_gov_il';
insert into legalai.source_audit_evidence (source_id, audit_run_id, evidence_type, url, status_code, content_hash, summary, observed_at)
  select id, '75f28657-2ffc-455c-8ed9-be82780ffcc8', 'robots', 'https://unicourt.justice.gov.il/robots.txt', 200, '9ad94bf9aa65eaea957730b76c39cba55b5759d6b4f15ee078ff7931ab721ffb', 'robots status 200', '2026-08-05T16:39:34.043Z'
  from legalai.legal_sources where code='unicourt_justice_gov_il';

-- ארכיון המדינה → BLOCKED
update legalai.legal_sources set
  normalized_domain='gov.il', owner_type='official',
  access_status='blocked', technical_access_status='waf_blocked',
  legal_reuse_status='unknown', collector_status='blocked',
  audit_status='incomplete', audit_confidence=0.3,
  requires_login=false, requires_captcha=false,
  robots_status='not_found', has_api=false,
  has_sitemap=false, has_rss=false, has_atom=false,
  has_public_search=false, estimated_sitemap_urls=null,
  coverage_score=0, access_score=10,
  metadata_quality_score=0, document_quality_score=0,
  legal_clarity_score=0, priority_score=3,
  recommended_access_method=null, last_audited_at=now(), last_successful_access_at=null
where code='gov_il_legal';
insert into legalai.source_audit_evidence (source_id, audit_run_id, evidence_type, url, status_code, content_hash, summary, observed_at)
  select id, '75f28657-2ffc-455c-8ed9-be82780ffcc8', 'homepage', 'https://www.gov.il/he/departments/israel_state_archives', 403, '0afcf6e9af2ba23c5375d86ea642c8f5d9d6c4bd5a4068d4980c4e49ce144079', 'homepage status 403', '2026-08-05T16:39:35.851Z'
  from legalai.legal_sources where code='gov_il_legal';

-- נבו (מסחרי) → BLOCKED
update legalai.legal_sources set
  normalized_domain='nevo.co.il', owner_type='commercial',
  access_status='login_required', technical_access_status='robots_disallowed',
  legal_reuse_status='unknown', collector_status='blocked',
  audit_status='manual_review_required', audit_confidence=0.74,
  requires_login=true, requires_captcha=false,
  robots_status='found', has_api=false,
  has_sitemap=false, has_rss=true, has_atom=false,
  has_public_search=true, estimated_sitemap_urls=null,
  coverage_score=0, access_score=15,
  metadata_quality_score=0, document_quality_score=0,
  legal_clarity_score=0, priority_score=4,
  recommended_access_method='RSS/Atom feed', last_audited_at=now(), last_successful_access_at=now()
where code='nevo_co_il';
insert into legalai.source_audit_evidence (source_id, audit_run_id, evidence_type, url, status_code, content_hash, summary, observed_at)
  select id, '75f28657-2ffc-455c-8ed9-be82780ffcc8', 'homepage', 'https://www.nevo.co.il/', 200, '71e8ae277502e1ea57999a3c276154002f8fc22a994ea69649c00c74b5badf37', 'homepage status 200', '2026-08-05T16:39:37.364Z'
  from legalai.legal_sources where code='nevo_co_il';
insert into legalai.source_audit_evidence (source_id, audit_run_id, evidence_type, url, status_code, content_hash, summary, observed_at)
  select id, '75f28657-2ffc-455c-8ed9-be82780ffcc8', 'robots', 'https://www.nevo.co.il/robots.txt', 200, 'acdf990f65702fe3fdef8f20fea872dbe7c769e4f561336badc94388dda723c2', 'robots status 200', '2026-08-05T16:39:37.364Z'
  from legalai.legal_sources where code='nevo_co_il';
insert into legalai.source_audit_evidence (source_id, audit_run_id, evidence_type, url, status_code, content_hash, summary, observed_at)
  select id, '75f28657-2ffc-455c-8ed9-be82780ffcc8', 'search', 'https://www.nevo.co.il/', 200, '71e8ae277502e1ea57999a3c276154002f8fc22a994ea69649c00c74b5badf37', 'search POST param=null', '2026-08-05T16:39:37.364Z'
  from legalai.legal_sources where code='nevo_co_il';
insert into legalai.source_audit_evidence (source_id, audit_run_id, evidence_type, url, status_code, content_hash, summary, observed_at)
  select id, '75f28657-2ffc-455c-8ed9-be82780ffcc8', 'feed', 'https://www.nevo.co.il/', 200, '71e8ae277502e1ea57999a3c276154002f8fc22a994ea69649c00c74b5badf37', 'feeds rss=true atom=false', '2026-08-05T16:39:37.364Z'
  from legalai.legal_sources where code='nevo_co_il';

-- תקדין (מסחרי) → BLOCKED
update legalai.legal_sources set
  normalized_domain='takdin.co.il', owner_type='commercial',
  access_status='login_required', technical_access_status='authentication_required',
  legal_reuse_status='unknown', collector_status='blocked',
  audit_status='manual_review_required', audit_confidence=0.87,
  requires_login=true, requires_captcha=false,
  robots_status='found', has_api=false,
  has_sitemap=true, has_rss=false, has_atom=false,
  has_public_search=true, estimated_sitemap_urls=5,
  coverage_score=10, access_score=35,
  metadata_quality_score=0, document_quality_score=0,
  legal_clarity_score=0, priority_score=12,
  recommended_access_method='sitemap-driven fetch', last_audited_at=now(), last_successful_access_at=now()
where code='takdin_co_il';
insert into legalai.source_audit_evidence (source_id, audit_run_id, evidence_type, url, status_code, content_hash, summary, observed_at)
  select id, '75f28657-2ffc-455c-8ed9-be82780ffcc8', 'homepage', 'https://www.takdin.co.il/', 200, 'ab65cdedda650299aa372ec51a146a68b8e9c46656f6dec5d231d5fd6d11bb8d', 'homepage status 200', '2026-08-05T16:39:39.494Z'
  from legalai.legal_sources where code='takdin_co_il';
insert into legalai.source_audit_evidence (source_id, audit_run_id, evidence_type, url, status_code, content_hash, summary, observed_at)
  select id, '75f28657-2ffc-455c-8ed9-be82780ffcc8', 'robots', 'https://www.takdin.co.il/robots.txt', 200, '8735faec674b951aa8a01c01c0bafbac3f7b49f9c96f68981a4bd161d184e97a', 'robots status 200', '2026-08-05T16:39:39.494Z'
  from legalai.legal_sources where code='takdin_co_il';
insert into legalai.source_audit_evidence (source_id, audit_run_id, evidence_type, url, status_code, content_hash, summary, observed_at)
  select id, '75f28657-2ffc-455c-8ed9-be82780ffcc8', 'sitemap', 'https://www.takdin.co.il/sitemap.xml', 200, 'eff850abca56b37550c7bccd734e2281bb378b9843bc0bee95a6fa41d682f91f', 'sitemap urlset, ~5 urls', '2026-08-05T16:39:39.494Z'
  from legalai.legal_sources where code='takdin_co_il';
insert into legalai.source_audit_evidence (source_id, audit_run_id, evidence_type, url, status_code, content_hash, summary, observed_at)
  select id, '75f28657-2ffc-455c-8ed9-be82780ffcc8', 'search', 'https://www.takdin.co.il/', 200, 'ab65cdedda650299aa372ec51a146a68b8e9c46656f6dec5d231d5fd6d11bb8d', 'search POST param=null', '2026-08-05T16:39:39.494Z'
  from legalai.legal_sources where code='takdin_co_il';

-- Judgments.org.il → REVIEW
update legalai.legal_sources set
  normalized_domain='judgments.org.il', owner_type='commercial',
  access_status='public', technical_access_status='open',
  legal_reuse_status='unknown', collector_status='audit_required',
  audit_status='manual_review_required', audit_confidence=1,
  requires_login=false, requires_captcha=false,
  robots_status='found', has_api=true,
  has_sitemap=true, has_rss=true, has_atom=false,
  has_public_search=true, estimated_sitemap_urls=null,
  coverage_score=15, access_score=100,
  metadata_quality_score=0, document_quality_score=0,
  legal_clarity_score=0, priority_score=30,
  recommended_access_method='wp-json REST API', last_audited_at=now(), last_successful_access_at=now()
where code='judgments_org_il';
insert into legalai.source_audit_evidence (source_id, audit_run_id, evidence_type, url, status_code, content_hash, summary, observed_at)
  select id, '75f28657-2ffc-455c-8ed9-be82780ffcc8', 'homepage', 'https://judgments.org.il/', 200, 'f8e84c703530a95a46586e637684366078faf8a952bc09af572d7d0e85cd206f', 'homepage status 200', '2026-08-05T16:39:41.491Z'
  from legalai.legal_sources where code='judgments_org_il';
insert into legalai.source_audit_evidence (source_id, audit_run_id, evidence_type, url, status_code, content_hash, summary, observed_at)
  select id, '75f28657-2ffc-455c-8ed9-be82780ffcc8', 'robots', 'https://judgments.org.il/robots.txt', 200, '83b17b1ae863d459966054b28225925bb4d647549e665c5b0f0d1a7499b13bc6', 'robots status 200', '2026-08-05T16:39:41.491Z'
  from legalai.legal_sources where code='judgments_org_il';
insert into legalai.source_audit_evidence (source_id, audit_run_id, evidence_type, url, status_code, content_hash, summary, observed_at)
  select id, '75f28657-2ffc-455c-8ed9-be82780ffcc8', 'sitemap', 'https://judgments.org.il/sitemaps/sitemap_index.xml', 200, '291a5cd3f4e76a1e5ccdb59d6582404adae6f8b378378a7117f80c0eb41fa17c', 'sitemap index, ~0 urls', '2026-08-05T16:39:41.491Z'
  from legalai.legal_sources where code='judgments_org_il';
insert into legalai.source_audit_evidence (source_id, audit_run_id, evidence_type, url, status_code, content_hash, summary, observed_at)
  select id, '75f28657-2ffc-455c-8ed9-be82780ffcc8', 'api', 'https://judgments.org.il/wp-json/', 200, '4f7cbff870d6b39bfa85dad7406299935d9b8a2c11015482e9fec7a3d103c69e', 'wp-json present', '2026-08-05T16:39:41.491Z'
  from legalai.legal_sources where code='judgments_org_il';
insert into legalai.source_audit_evidence (source_id, audit_run_id, evidence_type, url, status_code, content_hash, summary, observed_at)
  select id, '75f28657-2ffc-455c-8ed9-be82780ffcc8', 'search', 'https://judgments.org.il/', 200, 'f8e84c703530a95a46586e637684366078faf8a952bc09af572d7d0e85cd206f', 'search GET param=s', '2026-08-05T16:39:41.491Z'
  from legalai.legal_sources where code='judgments_org_il';
insert into legalai.source_audit_evidence (source_id, audit_run_id, evidence_type, url, status_code, content_hash, summary, observed_at)
  select id, '75f28657-2ffc-455c-8ed9-be82780ffcc8', 'feed', 'https://judgments.org.il/', 200, 'f8e84c703530a95a46586e637684366078faf8a952bc09af572d7d0e85cd206f', 'feeds rss=true atom=false', '2026-08-05T16:39:41.491Z'
  from legalai.legal_sources where code='judgments_org_il';
