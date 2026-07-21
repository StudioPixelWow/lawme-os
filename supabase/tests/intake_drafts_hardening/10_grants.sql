-- Table-level DML grants (Supabase grants these to authenticated/anon/service_role;
-- RLS is the actual gate). Applied AFTER the historical migration creates the table.
grant select, insert, update, delete on public.matter_intake_drafts to authenticated;
grant select, insert, update, delete on public.matter_intake_drafts to anon;
grant all on public.matter_intake_drafts to service_role;
-- Before hardening, the helper functions still carry the broad PUBLIC grant that
-- CREATE FUNCTION assigns; the hardening migration is what strips PUBLIC/anon.
