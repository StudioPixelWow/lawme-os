-- LAW ME — additive: store the machine-derived structured text inline on the
-- page-extraction layer so the RAG/citation layers have the actual content
-- (previously only a content-hash reference was stored). ADDITIVE ONLY: adds one
-- nullable column + a Hebrew-capable full-text index. Touches no existing
-- column or row; raw extraction remains authoritative-adjacent and untouched.
alter table legalai.publication_page_extraction
  add column if not exists structured_text text;

comment on column legalai.publication_page_extraction.structured_text is
  'Machine-derived structured reading-order text for this physical page (route A/B1/B2). Nullable (blank/empty OCR => null). The official PDF remains authoritative; this is a machine-derived representation.';

-- Lexical retrieval support (language-agnostic simple tokeniser; works for Hebrew).
create index if not exists ppe_structured_text_fts
  on legalai.publication_page_extraction
  using gin (to_tsvector('simple', coalesce(structured_text, '')));
