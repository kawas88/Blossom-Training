-- =====================================================================
-- Trainzy — harden Realtime so updates land reliably under load
-- =====================================================================
-- Run AFTER 009. Idempotent.
--
-- Symptom this fixes:
--   • Trainer's cockpit shows the first word in a Word Cloud, but every
--     subsequent word from the same participant never appears live.
--   • Same shape of bug for any feature that mutates an existing
--     exercise_responses row (matching attempts, etc.).
--
-- Root cause:
--   Postgres logical replication only includes the columns covered by
--   `REPLICA IDENTITY` when broadcasting UPDATE events. The default
--   (`REPLICA IDENTITY DEFAULT`) is the primary key only, so the row
--   that supabase-js receives via .on('postgres_changes', { event:
--   'UPDATE' }) has just the id — the response field that the cockpit
--   needs is missing. supabase-js silently merges the empty patch into
--   the cached row, leaving the UI looking frozen.
--
-- Fix: switch the realtime-broadcasting tables to REPLICA IDENTITY FULL
-- so UPDATE payloads contain the entire new row.
--
-- Also re-asserts publication membership for every table the UI
-- subscribes to (safe to repeat — wrapped in EXCEPTION blocks).
-- =====================================================================

-- 1. Replica identity full ---------------------------------------------
alter table exercise_responses             replica identity full;
alter table training_sessions              replica identity full;
alter table survey_responses               replica identity full;
alter table participants                   replica identity full;
alter table trainer_notes                  replica identity full;
alter table icebreaker_matching_responses  replica identity full;
alter table icebreaker_prompt_responses    replica identity full;

-- 2. Publication membership (idempotent) -------------------------------
do $$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    return;
  end if;
  for t in select unnest(array[
    'participants',
    'training_sessions',
    'exercise_responses',
    'survey_responses',
    'trainer_notes',
    'icebreaker_matching_responses',
    'icebreaker_prompt_responses'
  ]::text[]) loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then
      null;
    end;
  end loop;
end $$;
