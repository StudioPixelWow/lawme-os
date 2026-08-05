-- Legal source audit results — run 734a8075-ec0f-4723-b7c8-1929fcd617d4 (2026-08-05T16:06:58.460Z)
-- Idempotent: updates legalai.legal_sources by code; inserts evidence.
-- Apply to DEV only. No destructive statements.

insert into legalai.ingestion_runs (id, run_type, status, started_at, completed_at, metadata)
values ('734a8075-ec0f-4723-b7c8-1929fcd617d4', 'source_audit', 'succeeded', '2026-08-05T16:06:58.460Z', now(), '{"tool":"run-audits"}'::jsonb)
on conflict (id) do nothing;

-- הרשות השופטת → UNDETERMINED
update legalai.legal_sources set
  normalized_domain='court.gov.il', owner_type='official',
  access_status='unknown', technical_access_status='unknown',
  legal_reuse_status='unknown', collector_status='audit_required',
  audit_status='incomplete', audit_confidence=0.3,
  requires_login=false, requires_captcha=false,
  robots_status='not_found', has_api=false,
  has_sitemap=false, has_rss=false, has_atom=false,
  has_public_search=false, estimated_sitemap_urls=null,
  coverage_score=0, access_score=10,
  metadata_quality_score=0, document_quality_score=0,
  legal_clarity_score=0, priority_score=3,
  recommended_access_method=null, last_audited_at=now(), last_successful_access_at=null
where code='net_hamishpat';
insert into legalai.source_audit_evidence (source_id, audit_run_id, evidence_type, url, status_code, content_hash, summary, observed_at)
  select id, '734a8075-ec0f-4723-b7c8-1929fcd617d4', 'homepage', 'https://www.court.gov.il/', 403, 'c3664826946440c2d95624841f45bf962a41f6e0782ed903669841bad0b826c6', 'homepage status 403', '2026-08-05T16:06:58.607Z'
  from legalai.legal_sources where code='net_hamishpat';

-- בית המשפט העליון — פסיקה → UNDETERMINED
update legalai.legal_sources set
  normalized_domain='supremedecisions.court.gov.il', owner_type='official',
  access_status='unknown', technical_access_status='unknown',
  legal_reuse_status='unknown', collector_status='audit_required',
  audit_status='incomplete', audit_confidence=0.3,
  requires_login=false, requires_captcha=false,
  robots_status='not_found', has_api=false,
  has_sitemap=false, has_rss=false, has_atom=false,
  has_public_search=false, estimated_sitemap_urls=null,
  coverage_score=0, access_score=10,
  metadata_quality_score=0, document_quality_score=0,
  legal_clarity_score=0, priority_score=3,
  recommended_access_method=null, last_audited_at=now(), last_successful_access_at=null
where code='supreme_court';
insert into legalai.source_audit_evidence (source_id, audit_run_id, evidence_type, url, status_code, content_hash, summary, observed_at)
  select id, '734a8075-ec0f-4723-b7c8-1929fcd617d4', 'homepage', 'https://supremedecisions.court.gov.il/', 403, '0f463981efba4cb823d07a84c1ebd845fd821fe8cff9b56c7af3e138e7f625fa', 'homepage status 403', '2026-08-05T16:07:00.846Z'
  from legalai.legal_sources where code='supreme_court';

-- gov.il — dynamic collectors → UNDETERMINED
update legalai.legal_sources set
  normalized_domain='gov.il', owner_type='official',
  access_status='unknown', technical_access_status='unknown',
  legal_reuse_status='unknown', collector_status='audit_required',
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
  select id, '734a8075-ec0f-4723-b7c8-1929fcd617d4', 'homepage', 'https://www.gov.il/', 403, 'f239d83338dcef64b0644cc686e84738512633021adedadf24332579807b6810', 'homepage status 403', '2026-08-05T16:07:02.639Z'
  from legalai.legal_sources where code='gov_il_legal';

-- data.gov.il → UNDETERMINED
update legalai.legal_sources set
  normalized_domain='data.gov.il', owner_type='official',
  access_status='unknown', technical_access_status='unknown',
  legal_reuse_status='unknown', collector_status='audit_required',
  audit_status='incomplete', audit_confidence=0.3,
  requires_login=false, requires_captcha=false,
  robots_status='not_found', has_api=false,
  has_sitemap=false, has_rss=false, has_atom=false,
  has_public_search=false, estimated_sitemap_urls=null,
  coverage_score=0, access_score=10,
  metadata_quality_score=0, document_quality_score=0,
  legal_clarity_score=0, priority_score=3,
  recommended_access_method=null, last_audited_at=now(), last_successful_access_at=null
where code='data_gov_il';
insert into legalai.source_audit_evidence (source_id, audit_run_id, evidence_type, url, status_code, content_hash, summary, observed_at)
  select id, '734a8075-ec0f-4723-b7c8-1929fcd617d4', 'homepage', 'https://data.gov.il/', 403, '4a5511e6aabe11d3fa61f3503df9161f71379441eeff3e7345dc3d41dfc212d5', 'homepage status 403', '2026-08-05T16:07:04.392Z'
  from legalai.legal_sources where code='data_gov_il';

-- בתי הדין לעבודה → UNDETERMINED
update legalai.legal_sources set
  normalized_domain='court.gov.il', owner_type='official',
  access_status='unknown', technical_access_status='unknown',
  legal_reuse_status='unknown', collector_status='audit_required',
  audit_status='incomplete', audit_confidence=0.3,
  requires_login=false, requires_captcha=false,
  robots_status='not_found', has_api=false,
  has_sitemap=false, has_rss=false, has_atom=false,
  has_public_search=false, estimated_sitemap_urls=null,
  coverage_score=0, access_score=10,
  metadata_quality_score=0, document_quality_score=0,
  legal_clarity_score=0, priority_score=3,
  recommended_access_method=null, last_audited_at=now(), last_successful_access_at=null
where code='net_hamishpat';
insert into legalai.source_audit_evidence (source_id, audit_run_id, evidence_type, url, status_code, content_hash, summary, observed_at)
  select id, '734a8075-ec0f-4723-b7c8-1929fcd617d4', 'homepage', 'https://www.court.gov.il/', 403, 'c3664826946440c2d95624841f45bf962a41f6e0782ed903669841bad0b826c6', 'homepage status 403', '2026-08-05T16:07:06.152Z'
  from legalai.legal_sources where code='net_hamishpat';

-- בתי הדין הרבניים → UNDETERMINED
update legalai.legal_sources set
  normalized_domain='gov.il', owner_type='official',
  access_status='unknown', technical_access_status='unknown',
  legal_reuse_status='unknown', collector_status='audit_required',
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
  select id, '734a8075-ec0f-4723-b7c8-1929fcd617d4', 'homepage', 'https://www.gov.il/he/departments/rbc', 403, 'f239d83338dcef64b0644cc686e84738512633021adedadf24332579807b6810', 'homepage status 403', '2026-08-05T16:07:07.676Z'
  from legalai.legal_sources where code='gov_il_legal';

-- המפקחים על רישום מקרקעין → UNDETERMINED
update legalai.legal_sources set
  normalized_domain='gov.il', owner_type='official',
  access_status='unknown', technical_access_status='unknown',
  legal_reuse_status='unknown', collector_status='audit_required',
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
  select id, '734a8075-ec0f-4723-b7c8-1929fcd617d4', 'homepage', 'https://www.gov.il/he/departments/dynamiccollectors/tabu_search_verdict', 403, 'f239d83338dcef64b0644cc686e84738512633021adedadf24332579807b6810', 'homepage status 403', '2026-08-05T16:07:09.187Z'
  from legalai.legal_sources where code='gov_il_legal';

-- בתי דין מנהליים / ועדות ערר → UNDETERMINED
update legalai.legal_sources set
  normalized_domain='gov.il', owner_type='official',
  access_status='unknown', technical_access_status='unknown',
  legal_reuse_status='unknown', collector_status='audit_required',
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
  select id, '734a8075-ec0f-4723-b7c8-1929fcd617d4', 'homepage', 'https://www.gov.il/', 403, 'f239d83338dcef64b0644cc686e84738512633021adedadf24332579807b6810', 'homepage status 403', '2026-08-05T16:07:10.695Z'
  from legalai.legal_sources where code='gov_il_legal';

-- רשות התחרות → UNDETERMINED
update legalai.legal_sources set
  normalized_domain='gov.il', owner_type='official',
  access_status='unknown', technical_access_status='unknown',
  legal_reuse_status='unknown', collector_status='audit_required',
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
  select id, '734a8075-ec0f-4723-b7c8-1929fcd617d4', 'homepage', 'https://www.gov.il/he/departments/competition_authority', 403, 'f239d83338dcef64b0644cc686e84738512633021adedadf24332579807b6810', 'homepage status 403', '2026-08-05T16:07:12.203Z'
  from legalai.legal_sources where code='gov_il_legal';

-- רשות ניירות ערך → UNDETERMINED
update legalai.legal_sources set
  normalized_domain='isa.gov.il', owner_type='official',
  access_status='unknown', technical_access_status='unknown',
  legal_reuse_status='unknown', collector_status='audit_required',
  audit_status='incomplete', audit_confidence=0.3,
  requires_login=false, requires_captcha=false,
  robots_status='not_found', has_api=false,
  has_sitemap=false, has_rss=false, has_atom=false,
  has_public_search=false, estimated_sitemap_urls=null,
  coverage_score=0, access_score=10,
  metadata_quality_score=0, document_quality_score=0,
  legal_clarity_score=0, priority_score=3,
  recommended_access_method=null, last_audited_at=now(), last_successful_access_at=null
where code='isa_gov_il';
insert into legalai.source_audit_evidence (source_id, audit_run_id, evidence_type, url, status_code, content_hash, summary, observed_at)
  select id, '734a8075-ec0f-4723-b7c8-1929fcd617d4', 'homepage', 'https://www.isa.gov.il/', 403, 'e490c2dbcab7c0a8a79f9c47b47260a28df30cd08841e89d3f75948d727771c4', 'homepage status 403', '2026-08-05T16:07:13.710Z'
  from legalai.legal_sources where code='isa_gov_il';

-- רשות המסים → UNDETERMINED
update legalai.legal_sources set
  normalized_domain='gov.il', owner_type='official',
  access_status='unknown', technical_access_status='unknown',
  legal_reuse_status='unknown', collector_status='audit_required',
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
  select id, '734a8075-ec0f-4723-b7c8-1929fcd617d4', 'homepage', 'https://www.gov.il/he/departments/israel_tax_authority', 403, 'f239d83338dcef64b0644cc686e84738512633021adedadf24332579807b6810', 'homepage status 403', '2026-08-05T16:07:16.003Z'
  from legalai.legal_sources where code='gov_il_legal';

-- מערכת בתי הדין (unicourt) → UNDETERMINED
update legalai.legal_sources set
  normalized_domain='unicourt.justice.gov.il', owner_type='official',
  access_status='unknown', technical_access_status='unknown',
  legal_reuse_status='unknown', collector_status='audit_required',
  audit_status='incomplete', audit_confidence=0.3,
  requires_login=false, requires_captcha=false,
  robots_status='not_found', has_api=false,
  has_sitemap=false, has_rss=false, has_atom=false,
  has_public_search=false, estimated_sitemap_urls=null,
  coverage_score=0, access_score=10,
  metadata_quality_score=0, document_quality_score=0,
  legal_clarity_score=0, priority_score=3,
  recommended_access_method=null, last_audited_at=now(), last_successful_access_at=null
where code='unicourt_justice_gov_il';
insert into legalai.source_audit_evidence (source_id, audit_run_id, evidence_type, url, status_code, content_hash, summary, observed_at)
  select id, '734a8075-ec0f-4723-b7c8-1929fcd617d4', 'homepage', 'https://unicourt.justice.gov.il/', 403, '1a63855b180a01b3bc9796d98861b742dbee850878f077492f6073e8af01751e', 'homepage status 403', '2026-08-05T16:07:17.514Z'
  from legalai.legal_sources where code='unicourt_justice_gov_il';

-- ארכיון המדינה → UNDETERMINED
update legalai.legal_sources set
  normalized_domain='gov.il', owner_type='official',
  access_status='unknown', technical_access_status='unknown',
  legal_reuse_status='unknown', collector_status='audit_required',
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
  select id, '734a8075-ec0f-4723-b7c8-1929fcd617d4', 'homepage', 'https://www.gov.il/he/departments/israel_state_archives', 403, 'f239d83338dcef64b0644cc686e84738512633021adedadf24332579807b6810', 'homepage status 403', '2026-08-05T16:07:19.254Z'
  from legalai.legal_sources where code='gov_il_legal';

-- נבו (מסחרי) → UNDETERMINED
update legalai.legal_sources set
  normalized_domain='nevo.co.il', owner_type='commercial',
  access_status='unknown', technical_access_status='unknown',
  legal_reuse_status='unknown', collector_status='audit_required',
  audit_status='incomplete', audit_confidence=0.3,
  requires_login=false, requires_captcha=false,
  robots_status='not_found', has_api=false,
  has_sitemap=false, has_rss=false, has_atom=false,
  has_public_search=false, estimated_sitemap_urls=null,
  coverage_score=0, access_score=10,
  metadata_quality_score=0, document_quality_score=0,
  legal_clarity_score=0, priority_score=3,
  recommended_access_method=null, last_audited_at=now(), last_successful_access_at=null
where code='nevo_co_il';
insert into legalai.source_audit_evidence (source_id, audit_run_id, evidence_type, url, status_code, content_hash, summary, observed_at)
  select id, '734a8075-ec0f-4723-b7c8-1929fcd617d4', 'homepage', 'https://www.nevo.co.il/', 403, 'e4067cd5d50b80de7b604c5eff6f59e27a92499f2b43e3f31e94d5d98d6e1ed1', 'homepage status 403', '2026-08-05T16:07:20.761Z'
  from legalai.legal_sources where code='nevo_co_il';

-- תקדין (מסחרי) → UNDETERMINED
update legalai.legal_sources set
  normalized_domain='takdin.co.il', owner_type='commercial',
  access_status='unknown', technical_access_status='unknown',
  legal_reuse_status='unknown', collector_status='audit_required',
  audit_status='incomplete', audit_confidence=0.3,
  requires_login=false, requires_captcha=false,
  robots_status='not_found', has_api=false,
  has_sitemap=false, has_rss=false, has_atom=false,
  has_public_search=false, estimated_sitemap_urls=null,
  coverage_score=0, access_score=10,
  metadata_quality_score=0, document_quality_score=0,
  legal_clarity_score=0, priority_score=3,
  recommended_access_method=null, last_audited_at=now(), last_successful_access_at=null
where code='takdin_co_il';
insert into legalai.source_audit_evidence (source_id, audit_run_id, evidence_type, url, status_code, content_hash, summary, observed_at)
  select id, '734a8075-ec0f-4723-b7c8-1929fcd617d4', 'homepage', 'https://www.takdin.co.il/', 403, '812788831a5ffb9860b87fca130e3b5a94072883a4ff4f6090f7970d736c3d2f', 'homepage status 403', '2026-08-05T16:07:22.413Z'
  from legalai.legal_sources where code='takdin_co_il';

-- Judgments.org.il → UNDETERMINED
update legalai.legal_sources set
  normalized_domain='judgments.org.il', owner_type='commercial',
  access_status='unknown', technical_access_status='unknown',
  legal_reuse_status='unknown', collector_status='audit_required',
  audit_status='incomplete', audit_confidence=0.3,
  requires_login=false, requires_captcha=false,
  robots_status='not_found', has_api=false,
  has_sitemap=false, has_rss=false, has_atom=false,
  has_public_search=false, estimated_sitemap_urls=null,
  coverage_score=0, access_score=10,
  metadata_quality_score=0, document_quality_score=0,
  legal_clarity_score=0, priority_score=3,
  recommended_access_method=null, last_audited_at=now(), last_successful_access_at=null
where code='judgments_org_il';
insert into legalai.source_audit_evidence (source_id, audit_run_id, evidence_type, url, status_code, content_hash, summary, observed_at)
  select id, '734a8075-ec0f-4723-b7c8-1929fcd617d4', 'homepage', 'https://judgments.org.il/', 403, '08a6c9925ff2fd270e4a660f12dfecf25ade67085f53ba632e950c5504911c11', 'homepage status 403', '2026-08-05T16:07:24.069Z'
  from legalai.legal_sources where code='judgments_org_il';
