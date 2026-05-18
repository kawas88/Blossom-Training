-- =====================================================================
-- Trainzy - Billing (Stripe) schema additions
-- =====================================================================
-- Run this AFTER 003_multi_tenancy.sql. Idempotent (safe to re-run).
--
-- Notes:
-- - workspaces.plan now allows 'canceled' in addition to existing values.
--   No CHECK constraint added (it would break existing rows). Validation
--   happens in application code.
-- - Stripe is the source of truth for subscription state; webhooks update
--   these columns.
-- =====================================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- workspaces — billing columns
-- ---------------------------------------------------------------------
alter table workspaces add column if not exists stripe_customer_id text;
alter table workspaces add column if not exists stripe_subscription_id text;
alter table workspaces add column if not exists stripe_subscription_status text;
alter table workspaces add column if not exists stripe_price_id text;
alter table workspaces add column if not exists current_period_end timestamptz;
alter table workspaces add column if not exists cancel_at_period_end boolean not null default false;
alter table workspaces add column if not exists billing_interval text;
alter table workspaces add column if not exists billing_currency text;

create index if not exists workspaces_stripe_customer_idx
  on workspaces(stripe_customer_id)
  where stripe_customer_id is not null;

create index if not exists workspaces_stripe_subscription_idx
  on workspaces(stripe_subscription_id)
  where stripe_subscription_id is not null;

-- ---------------------------------------------------------------------
-- billing_events — audit log + webhook idempotency
-- ---------------------------------------------------------------------
create table if not exists billing_events (
  id uuid primary key default uuid_generate_v4(),
  stripe_event_id text unique not null,
  event_type text not null,
  workspace_id uuid references workspaces(id) on delete set null,
  payload jsonb not null,
  processed_at timestamptz default now()
);
create index if not exists billing_events_workspace_idx on billing_events(workspace_id);
create index if not exists billing_events_event_type_idx on billing_events(event_type);

alter table billing_events enable row level security;
-- No public policies: service-role only.
