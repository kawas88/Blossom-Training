-- =====================================================================
-- Trainzy - Unified Exercises foundation (Phase 3A)
-- =====================================================================
-- Run this AFTER 004_billing.sql. Idempotent.
--
-- Introduces:
--   - exercises (one row per reusable exercise definition)
--   - training_exercises (ordered sequence join)
--   - exercise_responses (universal response storage)
--
-- Migrates existing icebreakers into the new model. Legacy icebreaker_*
-- tables are LEFT IN PLACE as read-only historical records.
-- =====================================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- exercises — type-tagged exercise definitions, per workspace
-- ---------------------------------------------------------------------
create table if not exists exercises (
  id           uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  type         text not null check (type in (
    'matching', 'quiz', 'reflection',
    'word_cloud', 'ranking', 'annotation', 'scenario'
  )),
  title        text not null,
  description  text,
  config       jsonb not null default '{}'::jsonb,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create index if not exists exercises_workspace_idx on exercises(workspace_id);
create index if not exists exercises_type_idx on exercises(type);

-- ---------------------------------------------------------------------
-- training_exercises — ordered sequence of exercises per training
-- ---------------------------------------------------------------------
create table if not exists training_exercises (
  id           uuid primary key default uuid_generate_v4(),
  training_id  uuid not null references trainings(id) on delete cascade,
  exercise_id  uuid not null references exercises(id) on delete cascade,
  position     integer not null,
  required     boolean not null default false,
  created_at   timestamptz default now(),
  unique (training_id, exercise_id)
);

create index if not exists training_exercises_training_idx on training_exercises(training_id);
create index if not exists training_exercises_exercise_idx on training_exercises(exercise_id);

-- ---------------------------------------------------------------------
-- exercise_responses — universal response store
-- ---------------------------------------------------------------------
create table if not exists exercise_responses (
  id             uuid primary key default uuid_generate_v4(),
  training_id    uuid not null references trainings(id) on delete cascade,
  exercise_id    uuid not null references exercises(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  response       jsonb not null,
  score          numeric,
  completed_at   timestamptz default now(),
  unique (exercise_id, participant_id)
);

create index if not exists exercise_responses_training_idx on exercise_responses(training_id);
create index if not exists exercise_responses_exercise_idx on exercise_responses(exercise_id);
create index if not exists exercise_responses_participant_idx on exercise_responses(participant_id);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table exercises enable row level security;
alter table training_exercises enable row level security;
alter table exercise_responses enable row level security;

-- Public reads for live participation: anyone can read the
-- training_exercises and exercises rows attached to a live training.
-- (Admin operations go through the service-role client.)
drop policy if exists "exercises public read for live trainings" on exercises;
create policy "exercises public read for live trainings" on exercises
  for select using (
    exists (
      select 1
      from training_exercises te
      join trainings t on t.id = te.training_id
      where te.exercise_id = exercises.id
        and t.status = 'live'
    )
  );

drop policy if exists "training_exercises public read for live trainings" on training_exercises;
create policy "training_exercises public read for live trainings" on training_exercises
  for select using (
    exists (
      select 1 from trainings t
      where t.id = training_exercises.training_id
        and t.status = 'live'
    )
  );

drop policy if exists "exercise_responses public insert" on exercise_responses;
create policy "exercise_responses public insert" on exercise_responses
  for insert with check (true);

drop policy if exists "exercise_responses public update" on exercise_responses;
create policy "exercise_responses public update" on exercise_responses
  for update using (true);

drop policy if exists "exercise_responses public select" on exercise_responses;
create policy "exercise_responses public select" on exercise_responses
  for select using (true);

-- ---------------------------------------------------------------------
-- Data migration: existing icebreakers → exercises
-- ---------------------------------------------------------------------
do $$
declare
  ice_rec record;
  new_ex_id uuid;
  training_rec record;
  age_groups_json jsonb;
  milestones_json jsonb;
  correct_json jsonb;
begin
  for ice_rec in select * from icebreakers loop
    -- Skip if already migrated (legacyIcebreakerId tag in config)
    if exists (
      select 1 from exercises
      where config->>'legacyIcebreakerId' = ice_rec.id::text
    ) then
      continue;
    end if;

    -- Build the type-specific config from the legacy children
    if ice_rec.format = 'matching' then
      select coalesce(jsonb_agg(
               jsonb_build_object(
                 'id', c.id::text,
                 'label', c.label,
                 'position', c.position
               ) order by c.position
             ), '[]'::jsonb)
        into age_groups_json
        from icebreaker_categories c
       where c.icebreaker_id = ice_rec.id;

      select coalesce(jsonb_agg(
               jsonb_build_object(
                 'id', i.id::text,
                 'text', i.text,
                 'tagLabel', i.tag_label,
                 'tagColor', i.tag_color,
                 'position', i.position
               ) order by i.position
             ), '[]'::jsonb)
        into milestones_json
        from icebreaker_items i
       where i.icebreaker_id = ice_rec.id;

      select coalesce(jsonb_object_agg(i.id::text, i.correct_category_id::text), '{}'::jsonb)
        into correct_json
        from icebreaker_items i
       where i.icebreaker_id = ice_rec.id
         and i.correct_category_id is not null;

      insert into exercises (workspace_id, type, title, description, config)
      values (
        ice_rec.workspace_id,
        'matching',
        ice_rec.title,
        ice_rec.instructions,
        jsonb_build_object(
          'ageGroups',          age_groups_json,
          'milestones',         milestones_json,
          'correctPlacements',  correct_json,
          'instructions',       ice_rec.instructions,
          'showLiveWall',       ice_rec.show_live_wall,
          'legacyIcebreakerId', ice_rec.id::text
        )
      )
      returning id into new_ex_id;
    else
      -- Non-matching legacy icebreakers (prompts format) are out of scope for
      -- 3A. Skip them so they aren't lost — they can be migrated later.
      continue;
    end if;

    -- For every training that referenced this icebreaker, attach the new
    -- exercise at position 0 (idempotent via on conflict).
    for training_rec in
      select id from trainings where icebreaker_id = ice_rec.id
    loop
      insert into training_exercises (training_id, exercise_id, position, required)
      values (training_rec.id, new_ex_id, 0, false)
      on conflict (training_id, exercise_id) do nothing;
    end loop;

    -- Migrate responses: collapse one-row-per-item into one-row-per-participant
    insert into exercise_responses (training_id, exercise_id, participant_id, response, completed_at)
    select
      imr.training_id,
      new_ex_id,
      imr.participant_id,
      jsonb_build_object(
        'placements', jsonb_object_agg(
          imr.item_id::text,
          case when imr.was_correct then it.correct_category_id::text else null end
        ),
        'firstAttempts', jsonb_object_agg(
          imr.item_id::text,
          coalesce(imr.first_attempt_category_id::text, '')
        ),
        'attempts', jsonb_object_agg(imr.item_id::text, imr.attempts)
      ) as response,
      max(p.icebreaker_completed_at) as completed_at
    from icebreaker_matching_responses imr
    join icebreaker_items it on it.id = imr.item_id
    join participants p on p.id = imr.participant_id
    where it.icebreaker_id = ice_rec.id
    group by imr.training_id, imr.participant_id
    on conflict (exercise_id, participant_id) do nothing;
  end loop;
end $$;
