-- EUNDONG DAILY final schema. Existing Proved tables remain untouched.
create extension if not exists pgcrypto;

create table if not exists public.eundong_access (
  id smallint primary key default 1 check (id = 1),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.eundong_settings (
  id smallint primary key default 1 check (id = 1),
  pet_name text not null default '은동',
  goal_weight_kg numeric(5,2) check (goal_weight_kg is null or (goal_weight_kg > 0 and goal_weight_kg <= 30)),
  goal_start_weight_kg numeric(5,2) check (goal_start_weight_kg is null or (goal_start_weight_kg > 0 and goal_start_weight_kg <= 30)),
  goal_start_date date,
  goal_end_date date,
  weekly_targets jsonb not null default '[]'::jsonb check (jsonb_typeof(weekly_targets) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (goal_end_date is null or goal_start_date is null or goal_end_date >= goal_start_date)
);

create table if not exists public.eundong_daily_records (
  id uuid primary key default gen_random_uuid(),
  recorded_date date not null unique,
  weight_kg numeric(5,2) check (weight_kg is null or (weight_kg > 0 and weight_kg <= 30)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.eundong_daily_feeds (
  id uuid primary key default gen_random_uuid(),
  recorded_date date not null,
  feed_slot smallint not null check (feed_slot between 1 and 3),
  feed_id uuid not null,
  feed_name_snapshot text not null check (char_length(feed_name_snapshot) between 1 and 500),
  moisture_snapshot numeric(6,3) check (moisture_snapshot is null or moisture_snapshot between 0 and 100),
  kcal_per_kg_snapshot numeric(10,3) check (kcal_per_kg_snapshot is null or kcal_per_kg_snapshot >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(recorded_date, feed_slot)
);

create table if not exists public.eundong_meals (
  id uuid primary key default gen_random_uuid(),
  recorded_date date not null,
  meal_slot smallint not null check (meal_slot between 1 and 4),
  meal_time time not null,
  feed_slot smallint check (feed_slot between 1 and 3),
  feed_id uuid,
  feed_name_snapshot text,
  moisture_snapshot numeric(6,3) check (moisture_snapshot is null or moisture_snapshot between 0 and 100),
  kcal_per_kg_snapshot numeric(10,3) check (kcal_per_kg_snapshot is null or kcal_per_kg_snapshot >= 0),
  amount_g numeric(8,2) not null default 0 check (amount_g between 0 and 5000),
  added_water_ml numeric(8,2) not null default 0 check (added_water_ml between 0 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(recorded_date, meal_slot),
  check ((feed_slot is null and feed_id is null and feed_name_snapshot is null) or
         (feed_slot is not null and feed_id is not null and feed_name_snapshot is not null))
);

create or replace function public.eundong_touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke execute on function public.eundong_touch_updated_at() from public, anon, authenticated;

drop trigger if exists eundong_settings_touch on public.eundong_settings;
create trigger eundong_settings_touch before update on public.eundong_settings for each row execute function public.eundong_touch_updated_at();
drop trigger if exists eundong_records_touch on public.eundong_daily_records;
create trigger eundong_records_touch before update on public.eundong_daily_records for each row execute function public.eundong_touch_updated_at();
drop trigger if exists eundong_feeds_touch on public.eundong_daily_feeds;
create trigger eundong_feeds_touch before update on public.eundong_daily_feeds for each row execute function public.eundong_touch_updated_at();
drop trigger if exists eundong_meals_touch on public.eundong_meals;
create trigger eundong_meals_touch before update on public.eundong_meals for each row execute function public.eundong_touch_updated_at();

alter table public.eundong_access enable row level security;
alter table public.eundong_settings enable row level security;
alter table public.eundong_daily_records enable row level security;
alter table public.eundong_daily_feeds enable row level security;
alter table public.eundong_meals enable row level security;

revoke all on table public.eundong_access from anon, authenticated;
revoke all on table public.eundong_settings from anon, authenticated;
revoke all on table public.eundong_daily_records from anon, authenticated;
revoke all on table public.eundong_daily_feeds from anon, authenticated;
revoke all on table public.eundong_meals from anon, authenticated;

insert into public.eundong_settings (id, pet_name) values (1, '은동') on conflict (id) do nothing;

-- eundong_access.token_hash is intentionally not seeded in Git.
-- Store only the SHA-256 hex digest of the private sync token in the live database.
