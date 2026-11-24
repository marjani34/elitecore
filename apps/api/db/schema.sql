-- =====================================================================
-- Elite — database schema (PostgreSQL / Supabase)
--
-- One product = one delivery review. Each of the six steps has its own
-- table, every AI agent execution is recorded in agent_runs, and the
-- team chat is activity_log.
--
-- Safe to run more than once (IF NOT EXISTS everywhere).
--
-- NOTE: the API currently still uses the simple single-table version
-- (products.data jsonb, created by src/db/db.service.ts). Don't run this
-- file on the same database until the API is switched to this schema.
-- Run it in Supabase → SQL Editor, or with: psql "$DIRECT_URL" -f schema.sql
-- =====================================================================

create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists citext;     -- case-insensitive email

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
do $$ begin create type user_role as enum ('admin', 'member'); exception when duplicate_object then null; end $$;
do $$ begin create type step_key as enum ('source', 'features', 'journeys', 'criteria', 'approval', 'report'); exception when duplicate_object then null; end $$;
do $$ begin create type agent_key as enum ('scout', 'feature', 'journey', 'criteria', 'qa', 'reporter'); exception when duplicate_object then null; end $$;
do $$ begin create type priority_level as enum ('required', 'optional'); exception when duplicate_object then null; end $$;
do $$ begin create type item_origin as enum ('ai', 'admin'); exception when duplicate_object then null; end $$;
do $$ begin create type ac_status as enum ('pending', 'passed', 'failed', 'skipped'); exception when duplicate_object then null; end $$;
do $$ begin create type ai_verdict as enum ('likely_pass', 'likely_fail', 'unknown'); exception when duplicate_object then null; end $$;
do $$ begin create type run_status as enum ('running', 'succeeded', 'failed'); exception when duplicate_object then null; end $$;
do $$ begin create type activity_kind as enum ('info', 'done', 'error', 'admin'); exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- 1. Users — the admin today, more team members later
-- ---------------------------------------------------------------------
create table if not exists users (
  id             uuid primary key default gen_random_uuid(),
  email          citext not null unique,
  name           text not null,
  password_hash  text not null,                       -- scrypt/argon2 hash, never plain text
  role           user_role not null default 'admin',
  last_login_at  timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. Products — one delivery review per product
-- ---------------------------------------------------------------------
create table if not exists products (
  id           uuid primary key default gen_random_uuid(),
  name         text not null default 'محصول جدید',
  created_by   uuid references users (id) on delete set null,
  is_demo      boolean not null default false,        -- created while AI ran in demo mode
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists products_updated_idx on products (updated_at desc) where archived_at is null;

-- ---------------------------------------------------------------------
-- Step 1 — Source (Kaveh): what the admin gave us + what Kaveh read
-- ---------------------------------------------------------------------
create table if not exists product_sources (
  product_id      uuid primary key references products (id) on delete cascade,
  git_url         text,
  repo_provider   text check (repo_provider in ('github', 'other')),
  repo_full_name  text,
  repo_description text,
  default_branch  text,
  stars           integer,
  languages       text[] not null default '{}',
  file_count      integer not null default 0,
  key_files       text[] not null default '{}',
  markdown_name   text,
  markdown        text,                               -- uploaded / pasted .md document
  context         text,                               -- text the agents read (tree + key files + md)
  analyzed_at     timestamptz,
  updated_at      timestamptz not null default now(),
  constraint source_present check (git_url is not null or markdown is not null)
);

-- Kaveh's analysis. One row per run; the newest is the current one.
create table if not exists product_analyses (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references products (id) on delete cascade,
  agent_run_id  uuid,                                 -- FK added below (agent_runs)
  product_name  text not null,
  summary       text not null,
  tech_stack    text[] not null default '{}',
  modules       text[] not null default '{}',
  highlights    text[] not null default '{}',
  created_at    timestamptz not null default now()
);
create index if not exists product_analyses_product_idx on product_analyses (product_id, created_at desc);

-- ---------------------------------------------------------------------
-- Step 2 — Features (Niloufar)
-- ---------------------------------------------------------------------
create table if not exists features (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references products (id) on delete cascade,
  title         text not null,
  description   text not null default '',
  priority      priority_level not null default 'required',
  confirmed     boolean not null default false,       -- the admin's check mark
  origin        item_origin not null default 'ai',
  agent_run_id  uuid,                                 -- which run proposed it (null if admin)
  position      integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists features_product_idx on features (product_id, position);

-- ---------------------------------------------------------------------
-- Step 3 — User journeys (Arash)
-- ---------------------------------------------------------------------
create table if not exists user_journeys (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references products (id) on delete cascade,
  feature_id    uuid not null references features (id) on delete cascade,
  title         text not null,
  steps         text[] not null default '{}',         -- ordered steps, as written
  confirmed     boolean not null default true,
  origin        item_origin not null default 'ai',
  agent_run_id  uuid,
  position      integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists user_journeys_feature_idx on user_journeys (feature_id, position);
create index if not exists user_journeys_product_idx on user_journeys (product_id);

-- ---------------------------------------------------------------------
-- Steps 4 + 5 — Acceptance criteria (Sara) and their review (Behrad + admin)
-- ---------------------------------------------------------------------
create table if not exists acceptance_criteria (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references products (id) on delete cascade,
  feature_id    uuid not null references features (id) on delete cascade,
  text          text not null,                        -- Given / When / Then
  priority      priority_level not null default 'required',
  origin        item_origin not null default 'ai',
  agent_run_id  uuid,                                 -- run that wrote it
  position      integer not null default 0,
  -- step 5: Behrad's pre-review
  ai_verdict    ai_verdict,
  ai_reason     text,
  review_run_id uuid,                                 -- run that reviewed it
  -- step 5: the admin's decision
  status        ac_status not null default 'pending',
  decided_by    uuid references users (id) on delete set null,
  decided_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists criteria_feature_idx on acceptance_criteria (feature_id, position);
create index if not exists criteria_product_status_idx on acceptance_criteria (product_id, status);

-- ---------------------------------------------------------------------
-- Approvals — which steps the admin has approved
-- (re-opening a step deletes its row and every later step's row)
-- ---------------------------------------------------------------------
create table if not exists step_approvals (
  product_id   uuid not null references products (id) on delete cascade,
  step         step_key not null check (step <> 'report'),
  approved_by  uuid references users (id) on delete set null,
  approved_at  timestamptz not null default now(),
  primary key (product_id, step)
);

-- ---------------------------------------------------------------------
-- Step 6 — Reports (Mahsa). One row per generated report; newest is current.
-- metrics keeps the exact numbers the report was written from.
-- ---------------------------------------------------------------------
create table if not exists reports (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references products (id) on delete cascade,
  agent_run_id    uuid,
  readiness_pct   smallint not null check (readiness_pct between 0 and 100),
  completion_pct  smallint not null check (completion_pct between 0 and 100),
  is_ready        boolean not null,
  metrics         jsonb not null,                     -- snapshot: required/optional tallies, per feature
  summary         text not null,
  recommendation  text not null,
  risks           text[] not null default '{}',
  created_at      timestamptz not null default now()
);
create index if not exists reports_product_idx on reports (product_id, created_at desc);

-- ---------------------------------------------------------------------
-- Agent runs — every time an agent works: for the live team view,
-- debugging, and AI cost tracking
-- ---------------------------------------------------------------------
create table if not exists agent_runs (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references products (id) on delete cascade,
  agent          agent_key not null,
  status         run_status not null default 'running',
  model          text,                                -- e.g. gpt-4o-mini; null in demo mode
  is_demo        boolean not null default false,
  input_tokens   integer,
  output_tokens  integer,
  summary        text,                                -- the agent's message in the team chat
  error          text,
  started_by     uuid references users (id) on delete set null,
  started_at     timestamptz not null default now(),
  finished_at    timestamptz
);
create index if not exists agent_runs_product_idx on agent_runs (product_id, started_at desc);
-- At most one running run per agent per product.
create unique index if not exists agent_runs_one_running on agent_runs (product_id, agent) where status = 'running';

-- Now that agent_runs exists, link the run columns.
do $$ begin
  alter table product_analyses    add constraint product_analyses_run_fk foreign key (agent_run_id) references agent_runs (id) on delete set null;
  alter table features            add constraint features_run_fk         foreign key (agent_run_id) references agent_runs (id) on delete set null;
  alter table user_journeys       add constraint user_journeys_run_fk    foreign key (agent_run_id) references agent_runs (id) on delete set null;
  alter table acceptance_criteria add constraint criteria_run_fk         foreign key (agent_run_id) references agent_runs (id) on delete set null;
  alter table acceptance_criteria add constraint criteria_review_run_fk  foreign key (review_run_id) references agent_runs (id) on delete set null;
  alter table reports             add constraint reports_run_fk          foreign key (agent_run_id) references agent_runs (id) on delete set null;
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Activity log — the "team chat" (an agent OR a user per message)
-- ---------------------------------------------------------------------
create table if not exists activity_log (
  id            bigint generated always as identity primary key,
  product_id    uuid not null references products (id) on delete cascade,
  actor_agent   agent_key,
  actor_user    uuid references users (id) on delete set null,
  agent_run_id  uuid references agent_runs (id) on delete set null,
  kind          activity_kind not null,
  message       text not null,
  created_at    timestamptz not null default now(),
  constraint agent_or_admin check (actor_agent is not null or kind = 'admin')
);
create index if not exists activity_product_idx on activity_log (product_id, created_at);

-- ---------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['users', 'products', 'product_sources', 'features', 'user_journeys', 'acceptance_criteria'] loop
    execute format('drop trigger if exists %I_updated_at on %I', t, t);
    execute format('create trigger %I_updated_at before update on %I for each row execute function set_updated_at()', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Readiness view — the report's numbers, always up to date.
-- Only criteria of confirmed features count.
-- ---------------------------------------------------------------------
create or replace view product_readiness as
select
  p.id as product_id,
  count(distinct f.id)                                                       as confirmed_features,
  count(c.id) filter (where c.priority = 'required')                        as required_total,
  count(c.id) filter (where c.priority = 'required' and c.status = 'passed')  as required_passed,
  count(c.id) filter (where c.priority = 'required' and c.status = 'failed')  as required_failed,
  count(c.id) filter (where c.priority = 'required' and c.status = 'skipped') as required_skipped,
  count(c.id) filter (where c.priority = 'optional')                        as optional_total,
  count(c.id) filter (where c.priority = 'optional' and c.status = 'passed')  as optional_passed,
  count(c.id) filter (where c.priority = 'optional' and c.status = 'skipped') as optional_skipped,
  coalesce(round(100.0 * count(c.id) filter (where c.priority = 'required' and c.status = 'passed')
         / nullif(count(c.id) filter (where c.priority = 'required'), 0)), 0)::int as readiness_pct
from products p
left join features f            on f.product_id = p.id and f.confirmed
left join acceptance_criteria c on c.feature_id = f.id
group by p.id;

-- ---------------------------------------------------------------------
-- Security: block Supabase's public Data API from every table.
-- The NestJS API connects as the owner and is not affected.
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['users', 'products', 'product_sources', 'product_analyses', 'features', 'user_journeys',
                           'acceptance_criteria', 'step_approvals', 'reports', 'agent_runs', 'activity_log'] loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;
alter view product_readiness set (security_invoker = true);
