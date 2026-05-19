-- =====================================================================
-- Trainzy — Live Q&A (Slido-style audience questions)
-- =====================================================================
-- Run AFTER 010. Idempotent.
--
-- A flat thread of audience questions per training, with upvotes by
-- session_token (not display_name, so anonymous participants can vote).
-- The trainer can mark answered / hide.
-- =====================================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- training_questions — one row per audience question.
-- ---------------------------------------------------------------------
create table if not exists training_questions (
  id              uuid primary key default uuid_generate_v4(),
  training_id     uuid not null references trainings(id) on delete cascade,
  participant_id  uuid references participants(id) on delete set null,
  display_name    text,
  question        text not null check (char_length(question) between 3 and 500),
  status          text not null default 'pending'
    check (status in ('pending', 'answered', 'hidden')),
  upvotes         integer not null default 0,
  created_at      timestamptz not null default now(),
  answered_at     timestamptz
);

create index if not exists training_questions_training_idx
  on training_questions(training_id, created_at desc);
create index if not exists training_questions_status_idx
  on training_questions(training_id, status);

-- ---------------------------------------------------------------------
-- training_question_votes — one upvote per participant per question.
-- ---------------------------------------------------------------------
create table if not exists training_question_votes (
  id              uuid primary key default uuid_generate_v4(),
  question_id     uuid not null references training_questions(id) on delete cascade,
  participant_id  uuid not null references participants(id) on delete cascade,
  created_at      timestamptz not null default now(),
  unique (question_id, participant_id)
);

create index if not exists training_question_votes_question_idx
  on training_question_votes(question_id);

-- ---------------------------------------------------------------------
-- Keep upvotes denormalised on the question row for cheap reads.
-- ---------------------------------------------------------------------
create or replace function recalc_question_upvotes()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update training_questions
       set upvotes = upvotes + 1
     where id = new.question_id;
    return new;
  elsif tg_op = 'DELETE' then
    update training_questions
       set upvotes = greatest(0, upvotes - 1)
     where id = old.question_id;
    return old;
  end if;
  return null;
end
$$ language plpgsql;

drop trigger if exists training_question_votes_recalc on training_question_votes;
create trigger training_question_votes_recalc
  after insert or delete on training_question_votes
  for each row execute function recalc_question_upvotes();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table training_questions enable row level security;
alter table training_question_votes enable row level security;

drop policy if exists "training_questions public read"   on training_questions;
drop policy if exists "training_questions public insert" on training_questions;
drop policy if exists "training_questions public update" on training_questions;

create policy "training_questions public read" on training_questions
  for select using (
    status != 'hidden' and exists (
      select 1 from trainings t
      where t.id = training_questions.training_id
        and t.status = 'live'
    )
  );

create policy "training_questions public insert" on training_questions
  for insert with check (true);

-- Updates are server-only (trainer actions go through the admin API
-- with the service role, which bypasses RLS).
create policy "training_questions public update" on training_questions
  for update using (false);

drop policy if exists "training_question_votes public read"   on training_question_votes;
drop policy if exists "training_question_votes public insert" on training_question_votes;
drop policy if exists "training_question_votes public delete" on training_question_votes;

create policy "training_question_votes public read"   on training_question_votes for select using (true);
create policy "training_question_votes public insert" on training_question_votes for insert with check (true);
create policy "training_question_votes public delete" on training_question_votes for delete using (true);

-- ---------------------------------------------------------------------
-- Realtime: full row on UPDATE + add to publication
-- ---------------------------------------------------------------------
alter table training_questions       replica identity full;
alter table training_question_votes  replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table training_questions;
      exception when duplicate_object then null;
    end;
    begin alter publication supabase_realtime add table training_question_votes;
      exception when duplicate_object then null;
    end;
  end if;
end $$;
