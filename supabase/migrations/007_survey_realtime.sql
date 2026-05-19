-- =====================================================================
-- Trainzy — add survey_responses to the supabase_realtime publication
-- =====================================================================
-- One-liner. survey_responses was missing from the publication while
-- everything else was already in. After this migration admin dashboards
-- that subscribe to survey_responses INSERTs will start receiving them.
-- =====================================================================

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table survey_responses;
    exception when duplicate_object then
      null;
    end;
  end if;
end $$;
