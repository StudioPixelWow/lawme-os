-- LAW ME — additive: keep legal_chunks.text_search in sync from text, so chunks
-- upserted via the client (which cannot call to_tsvector) are FTS-searchable
-- through the existing GIN index (lc_fts_idx). Additive trigger only; no column
-- or row is altered. Backfills existing rows once.
create or replace function legalai.tg_legal_chunks_fts() returns trigger
  language plpgsql as $$
begin
  new.text_search := to_tsvector('simple', coalesce(new.text, ''));
  return new;
end $$;

drop trigger if exists legal_chunks_fts on legalai.legal_chunks;
create trigger legal_chunks_fts before insert or update of text on legalai.legal_chunks
  for each row execute function legalai.tg_legal_chunks_fts();

-- one-time backfill for rows already present
update legalai.legal_chunks
  set text_search = to_tsvector('simple', coalesce(text, ''))
  where text_search is null;
