-- =============================================================================
-- AI Tutor — Migration 005: usage metering, plans, subscriptions, entitlements.
--
-- ADDITIVE and idempotent. Nothing here changes behaviour until the app is run
-- with QUOTAS_ENABLED=true (metering via usage_events is always on).
-- All writes happen server-side with the service-role key; students may only
-- read their own usage/subscription rows.
-- =============================================================================

-- One row per LLM call ('llm_call': tokens + estimated cost) and one per
-- billable request ('request': credits charged against the monthly allowance).
create table if not exists usage_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null check (event_type in ('llm_call', 'request')),
  feature text not null,
  provider text,
  model text,
  tokens_in integer not null default 0,
  tokens_out integer not null default 0,
  cost_usd numeric(12, 6) not null default 0,
  credits numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_usage_events_user_created on usage_events (user_id, created_at desc);
create index if not exists idx_usage_events_user_type_created on usage_events (user_id, event_type, created_at desc);

alter table usage_events enable row level security;
drop policy if exists "usage_events: owner read" on usage_events;
create policy "usage_events: owner read" on usage_events for select using (auth.uid() = user_id);

create table if not exists plans (
  id text primary key,
  name text not null,
  monthly_credits integer not null check (monthly_credits >= 0),
  price_inr integer,
  price_usd numeric(8, 2),
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

alter table plans enable row level security;
drop policy if exists "plans: readable by signed-in users" on plans;
create policy "plans: readable by signed-in users" on plans for select to authenticated using (true);

-- At most one default (free) plan.
create unique index if not exists uq_plans_single_default on plans (is_default) where is_default;

-- Optional per-feature monthly request caps for a plan (NULL = only the credit pool applies).
create table if not exists entitlements (
  plan_id text not null references plans (id) on delete cascade,
  feature text not null,
  monthly_limit integer check (monthly_limit is null or monthly_limit >= 0),
  primary key (plan_id, feature)
);

alter table entitlements enable row level security;
drop policy if exists "entitlements: readable by signed-in users" on entitlements;
create policy "entitlements: readable by signed-in users" on entitlements for select to authenticated using (true);

create table if not exists subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan_id text not null references plans (id),
  status text not null default 'active' check (status in ('active', 'trialing', 'past_due', 'canceled')),
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table subscriptions enable row level security;
drop policy if exists "subscriptions: owner read" on subscriptions;
create policy "subscriptions: owner read" on subscriptions for select using (auth.uid() = user_id);

-- Seed plans. Edit the numbers freely; they are read at runtime.
insert into plans (id, name, monthly_credits, price_inr, price_usd, is_default) values
  ('free', 'Free', 150, 0, 0, true),
  ('pro', 'Pro', 2000, 299, 4.99, false)
on conflict (id) do nothing;

insert into entitlements (plan_id, feature, monthly_limit) values
  ('free', 'notes_generate', 20),
  ('free', 'assessment_generate', 30),
  ('free', 'assessment_submit', 60),
  ('free', 'tutor_chat', 300),
  ('free', 'mentor', 10),
  ('free', 'syllabus_analyze', 10)
on conflict (plan_id, feature) do nothing;

-- Monthly usage per feature for the quota check (service-role only).
create or replace function public.get_monthly_usage(p_user_id uuid, p_since timestamptz)
returns table (feature text, requests bigint, credits numeric)
language sql
stable
security definer
set search_path = public
as $$
  select ue.feature, count(*) as requests, coalesce(sum(ue.credits), 0) as credits
  from usage_events ue
  where ue.user_id = p_user_id and ue.event_type = 'request' and ue.created_at >= p_since
  group by ue.feature;
$$;

revoke all on function public.get_monthly_usage(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.get_monthly_usage(uuid, timestamptz) to service_role;
