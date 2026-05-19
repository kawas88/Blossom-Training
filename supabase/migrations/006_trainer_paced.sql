-- =====================================================================
-- Trainzy — Trainer-paced sessions + Word Cloud (Phase 3B)
-- =====================================================================
-- Run this AFTER 005_exercises.sql. Idempotent.
-- =====================================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- Per-exercise pacing on the training_exercises join table.
--   'self'    — appears on the participant hub, run at the participant's
--               own pace (existing behaviour).
--   'trainer' — only renders when the trainer drives the session forward
--               via training_sessions.current_exercise_id.
-- ---------------------------------------------------------------------
alter table training_exercises
  add column if not exists pacing text not null default 'self'
    check (pacing in ('self', 'trainer'));

create index if not exists training_exercises_pacing_idx
  on training_exercises(training_id, pacing);

-- ---------------------------------------------------------------------
-- training_sessions — one live-cockpit state row per training.
-- Trainer-paced flow reads/writes this row; participants subscribe via
-- Supabase Realtime and react to current_exercise_id changes.
-- ---------------------------------------------------------------------
create table if not exists training_sessions (
  id                  uuid primary key default uuid_generate_v4(),
  training_id         uuid not null references trainings(id) on delete cascade unique,
  status              text not null default 'idle'
    check (status in ('idle', 'live', 'wrapped')),
  current_exercise_id uuid references exercises(id) on delete set null,
  started_at          timestamptz,
  wrapped_at          timestamptz,
  updated_at          timestamptz default now()
);

create index if not exists training_sessions_status_idx on training_sessions(status);

-- ---------------------------------------------------------------------
-- RLS — participants need to read the session row for live trainings
-- (and Realtime needs select to broadcast row changes). Service-role
-- continues to bypass RLS for admin writes.
-- ---------------------------------------------------------------------
alter table training_sessions enable row level security;

drop policy if exists "training_sessions public read for live trainings" on training_sessions;
create policy "training_sessions public read for live trainings"
  on training_sessions for select using (
    exists (
      select 1 from trainings t
      where t.id = training_sessions.training_id
        and t.status = 'live'
    )
  );

-- ---------------------------------------------------------------------
-- Realtime publication — make training_sessions broadcastable.
-- (Wrapped in a DO block so reruns don't fail with "relation is already
-- member of publication".)
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table training_sessions;
    exception when duplicate_object then
      null;
    end;
    begin
      alter publication supabase_realtime add table exercise_responses;
    exception when duplicate_object then
      null;
    end;
  end if;
end $$;
