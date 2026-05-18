-- =====================================================================
-- Trainzy - Multi-tenancy foundation
-- =====================================================================
-- Run this AFTER 002_seed_data.sql. Idempotent (safe to re-run).
-- =====================================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- workspaces
-- ---------------------------------------------------------------------
create table if not exists workspaces (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  plan text not null default 'trial' check (plan in ('trial', 'personal', 'organization')),
  trial_ends_at timestamptz,
  seat_limit integer not null default 1,
  created_by uuid references admin_users(id) on delete set null,
  training_focus jsonb,
  onboarded_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_workspaces_slug on workspaces(slug);

-- ---------------------------------------------------------------------
-- workspace_members
-- ---------------------------------------------------------------------
create table if not exists workspace_members (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references admin_users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'trainer', 'viewer')),
  joined_at timestamptz default now(),
  unique (workspace_id, user_id)
);
create index if not exists idx_workspace_members_workspace on workspace_members(workspace_id);
create index if not exists idx_workspace_members_user on workspace_members(user_id);

-- ---------------------------------------------------------------------
-- workspace_invites
-- ---------------------------------------------------------------------
create table if not exists workspace_invites (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'trainer', 'viewer')),
  invite_token text unique not null,
  invited_by uuid references admin_users(id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz default now(),
  unique (workspace_id, email)
);
create index if not exists idx_workspace_invites_workspace on workspace_invites(workspace_id);
create index if not exists idx_workspace_invites_token on workspace_invites(invite_token);
create index if not exists idx_workspace_invites_email on workspace_invites(email);

-- ---------------------------------------------------------------------
-- Session versioning on admin_users (used to "sign out from all sessions")
-- ---------------------------------------------------------------------
alter table admin_users
  add column if not exists session_version integer not null default 0;

-- ---------------------------------------------------------------------
-- Add workspace_id to root entities (nullable for now; NOT NULL after backfill)
-- ---------------------------------------------------------------------
alter table trainings
  add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
alter table icebreakers
  add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
alter table surveys
  add column if not exists workspace_id uuid references workspaces(id) on delete cascade;

create index if not exists idx_trainings_workspace on trainings(workspace_id);
create index if not exists idx_icebreakers_workspace on icebreakers(workspace_id);
create index if not exists idx_surveys_workspace on surveys(workspace_id);

-- ---------------------------------------------------------------------
-- Backfill: create Demo Workspace and assign existing rows to it
-- ---------------------------------------------------------------------
do $$
declare
  v_workspace_id uuid;
  v_admin_id uuid;
begin
  select id into v_admin_id from admin_users where email = 'kawas@swiftap.studio' limit 1;

  if v_admin_id is null then
    raise notice 'No seed admin user found — skipping demo workspace backfill';
    return;
  end if;

  -- Only create demo workspace once
  if not exists (select 1 from workspaces where slug = 'demo') then
    insert into workspaces (name, slug, plan, seat_limit, created_by, onboarded_at)
    values ('Demo Workspace', 'demo', 'personal', 1, v_admin_id, now())
    returning id into v_workspace_id;

    insert into workspace_members (workspace_id, user_id, role)
    values (v_workspace_id, v_admin_id, 'owner');
  else
    select id into v_workspace_id from workspaces where slug = 'demo' limit 1;
  end if;

  update trainings   set workspace_id = v_workspace_id where workspace_id is null;
  update icebreakers set workspace_id = v_workspace_id where workspace_id is null;
  update surveys     set workspace_id = v_workspace_id where workspace_id is null;
end $$;

-- ---------------------------------------------------------------------
-- Enforce NOT NULL once data is backfilled
-- ---------------------------------------------------------------------
alter table trainings   alter column workspace_id set not null;
alter table icebreakers alter column workspace_id set not null;
alter table surveys     alter column workspace_id set not null;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table workspaces        enable row level security;
alter table workspace_members enable row level security;
alter table workspace_invites enable row level security;
-- No public policies. Service-role bypasses RLS for trusted admin operations.
-- Anon clients have zero access to these tables.

-- Tighten existing policies — admin operations all go via service-role now.
-- Public access is only needed for: participants, response tables, trainer_notes (for realtime).
drop policy if exists "trainings public read live"             on trainings;
drop policy if exists "icebreakers public read"                on icebreakers;
drop policy if exists "icebreaker_categories public read"      on icebreaker_categories;
drop policy if exists "icebreaker_items public read"           on icebreaker_items;
drop policy if exists "icebreaker_prompts public read"         on icebreaker_prompts;
drop policy if exists "surveys public read"                    on surveys;
drop policy if exists "survey_questions public read"           on survey_questions;
-- Keep: participants/response/notes public select+insert (realtime + join flow)
