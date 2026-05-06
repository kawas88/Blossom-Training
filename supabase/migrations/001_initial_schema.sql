-- =====================================================================
-- Nursery Trainer Hub - Initial Schema
-- =====================================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- admin_users
-- ---------------------------------------------------------------------
create table if not exists admin_users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  password_hash text not null,
  name text not null,
  role text not null default 'admin' check (role in ('admin', 'trainer')),
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- icebreakers
-- ---------------------------------------------------------------------
create table if not exists icebreakers (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  format text not null check (format in ('matching', 'prompts')),
  instructions text,
  show_live_wall boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists icebreaker_categories (
  id uuid primary key default uuid_generate_v4(),
  icebreaker_id uuid not null references icebreakers(id) on delete cascade,
  label text not null,
  position int not null default 0,
  created_at timestamptz default now()
);
create index if not exists idx_icebreaker_categories_icebreaker on icebreaker_categories(icebreaker_id);

create table if not exists icebreaker_items (
  id uuid primary key default uuid_generate_v4(),
  icebreaker_id uuid not null references icebreakers(id) on delete cascade,
  text text not null,
  correct_category_id uuid references icebreaker_categories(id) on delete set null,
  tag_label text,
  tag_color text,
  position int not null default 0,
  created_at timestamptz default now()
);
create index if not exists idx_icebreaker_items_icebreaker on icebreaker_items(icebreaker_id);
create index if not exists idx_icebreaker_items_category on icebreaker_items(correct_category_id);

create table if not exists icebreaker_prompts (
  id uuid primary key default uuid_generate_v4(),
  icebreaker_id uuid not null references icebreakers(id) on delete cascade,
  prompt text not null,
  answer_type text not null check (answer_type in ('short_text', 'long_text', 'word')),
  position int not null default 0,
  created_at timestamptz default now()
);
create index if not exists idx_icebreaker_prompts_icebreaker on icebreaker_prompts(icebreaker_id);

-- ---------------------------------------------------------------------
-- surveys
-- ---------------------------------------------------------------------
create table if not exists surveys (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  created_at timestamptz default now()
);

create table if not exists survey_questions (
  id uuid primary key default uuid_generate_v4(),
  survey_id uuid not null references surveys(id) on delete cascade,
  question text not null,
  question_type text not null check (question_type in (
    'yes_no', 'yes_no_notreally', 'yes_no_sometimes',
    'multiple_choice', 'rating_5', 'rating_10',
    'short_text', 'long_text'
  )),
  options jsonb,
  required boolean not null default false,
  position int not null default 0,
  created_at timestamptz default now()
);
create index if not exists idx_survey_questions_survey on survey_questions(survey_id);

-- ---------------------------------------------------------------------
-- trainings
-- ---------------------------------------------------------------------
create table if not exists trainings (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  nursery_name text,
  trainer_name text,
  description text,
  join_code text unique not null,
  slug text unique not null,
  status text not null default 'draft' check (status in ('draft', 'live', 'closed')),
  icebreaker_id uuid references icebreakers(id) on delete set null,
  survey_id uuid references surveys(id) on delete set null,
  scheduled_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_trainings_join_code on trainings(join_code);
create index if not exists idx_trainings_slug on trainings(slug);
create index if not exists idx_trainings_status on trainings(status);
create index if not exists idx_trainings_icebreaker on trainings(icebreaker_id);
create index if not exists idx_trainings_survey on trainings(survey_id);

-- ---------------------------------------------------------------------
-- participants
-- ---------------------------------------------------------------------
create table if not exists participants (
  id uuid primary key default uuid_generate_v4(),
  training_id uuid not null references trainings(id) on delete cascade,
  display_name text,
  session_token text unique not null,
  joined_at timestamptz default now(),
  icebreaker_completed_at timestamptz,
  survey_completed_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_participants_training on participants(training_id);
create index if not exists idx_participants_session_token on participants(session_token);

-- ---------------------------------------------------------------------
-- icebreaker_matching_responses
-- ---------------------------------------------------------------------
create table if not exists icebreaker_matching_responses (
  id uuid primary key default uuid_generate_v4(),
  participant_id uuid not null references participants(id) on delete cascade,
  training_id uuid not null references trainings(id) on delete cascade,
  item_id uuid not null references icebreaker_items(id) on delete cascade,
  first_attempt_category_id uuid references icebreaker_categories(id) on delete set null,
  was_correct boolean not null default false,
  attempts int not null default 1,
  created_at timestamptz default now()
);
create index if not exists idx_imr_participant on icebreaker_matching_responses(participant_id);
create index if not exists idx_imr_training on icebreaker_matching_responses(training_id);
create index if not exists idx_imr_item on icebreaker_matching_responses(item_id);

-- ---------------------------------------------------------------------
-- icebreaker_prompt_responses
-- ---------------------------------------------------------------------
create table if not exists icebreaker_prompt_responses (
  id uuid primary key default uuid_generate_v4(),
  participant_id uuid not null references participants(id) on delete cascade,
  training_id uuid not null references trainings(id) on delete cascade,
  prompt_id uuid not null references icebreaker_prompts(id) on delete cascade,
  answer text,
  created_at timestamptz default now()
);
create index if not exists idx_ipr_participant on icebreaker_prompt_responses(participant_id);
create index if not exists idx_ipr_training on icebreaker_prompt_responses(training_id);
create index if not exists idx_ipr_prompt on icebreaker_prompt_responses(prompt_id);

-- ---------------------------------------------------------------------
-- survey_responses
-- ---------------------------------------------------------------------
create table if not exists survey_responses (
  id uuid primary key default uuid_generate_v4(),
  participant_id uuid not null references participants(id) on delete cascade,
  training_id uuid not null references trainings(id) on delete cascade,
  question_id uuid not null references survey_questions(id) on delete cascade,
  answer text,
  created_at timestamptz default now(),
  unique (participant_id, question_id)
);
create index if not exists idx_sr_participant on survey_responses(participant_id);
create index if not exists idx_sr_training on survey_responses(training_id);
create index if not exists idx_sr_question on survey_responses(question_id);

-- ---------------------------------------------------------------------
-- trainer_notes
-- ---------------------------------------------------------------------
create table if not exists trainer_notes (
  id uuid primary key default uuid_generate_v4(),
  training_id uuid not null references trainings(id) on delete cascade,
  participant_id uuid references participants(id) on delete set null,
  item_id uuid references icebreaker_items(id) on delete set null,
  body text not null,
  created_at timestamptz default now()
);
create index if not exists idx_tn_training on trainer_notes(training_id);
create index if not exists idx_tn_participant on trainer_notes(participant_id);
create index if not exists idx_tn_item on trainer_notes(item_id);

-- ---------------------------------------------------------------------
-- ai_analyses
-- ---------------------------------------------------------------------
create table if not exists ai_analyses (
  id uuid primary key default uuid_generate_v4(),
  training_id uuid not null references trainings(id) on delete cascade,
  question_id uuid references survey_questions(id) on delete cascade,
  analysis_type text not null check (analysis_type in ('sentiment', 'training_summary')),
  result jsonb not null,
  created_at timestamptz default now()
);
create index if not exists idx_ai_training on ai_analyses(training_id);
create index if not exists idx_ai_question on ai_analyses(question_id);

-- =====================================================================
-- Row Level Security
-- =====================================================================

alter table admin_users enable row level security;
alter table icebreakers enable row level security;
alter table icebreaker_categories enable row level security;
alter table icebreaker_items enable row level security;
alter table icebreaker_prompts enable row level security;
alter table surveys enable row level security;
alter table survey_questions enable row level security;
alter table trainings enable row level security;
alter table participants enable row level security;
alter table icebreaker_matching_responses enable row level security;
alter table icebreaker_prompt_responses enable row level security;
alter table survey_responses enable row level security;
alter table trainer_notes enable row level security;
alter table ai_analyses enable row level security;

-- admin_users: locked down (service role only)

-- icebreakers and content (publicly readable)
create policy "icebreakers public read" on icebreakers for select using (true);
create policy "icebreaker_categories public read" on icebreaker_categories for select using (true);
create policy "icebreaker_items public read" on icebreaker_items for select using (true);
create policy "icebreaker_prompts public read" on icebreaker_prompts for select using (true);

-- surveys (publicly readable)
create policy "surveys public read" on surveys for select using (true);
create policy "survey_questions public read" on survey_questions for select using (true);

-- trainings (only live trainings publicly readable)
create policy "trainings public read live" on trainings for select using (status = 'live');

-- participants (insert + read + update for self-service)
create policy "participants public insert" on participants for insert with check (true);
create policy "participants public select" on participants for select using (true);
create policy "participants public update" on participants for update using (true);

-- responses (insert + read for live wall)
create policy "imr public insert" on icebreaker_matching_responses for insert with check (true);
create policy "imr public select" on icebreaker_matching_responses for select using (true);
create policy "ipr public insert" on icebreaker_prompt_responses for insert with check (true);
create policy "ipr public select" on icebreaker_prompt_responses for select using (true);
create policy "sr public insert" on survey_responses for insert with check (true);
create policy "sr public update" on survey_responses for update using (true);
create policy "sr public select" on survey_responses for select using (true);

-- trainer_notes (read-only for public, writes via service role)
create policy "trainer_notes public select" on trainer_notes for select using (true);

-- ai_analyses (no public access)

-- =====================================================================
-- Realtime publication
-- =====================================================================

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table participants;
    alter publication supabase_realtime add table icebreaker_matching_responses;
    alter publication supabase_realtime add table icebreaker_prompt_responses;
    alter publication supabase_realtime add table trainer_notes;
  end if;
exception when duplicate_object then
  null;
end $$;
