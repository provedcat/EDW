-- EUNDONG DAILY private data. Existing public.cats, feeds and weight_records remain authoritative.
-- Apply as a migration owner; never expose that credential to the browser.
create table public.weight_goals (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  cat_id uuid not null references public.cats(id) on delete cascade, start_date date not null,
  start_weight numeric(5,2) not null check(start_weight>0), goal_weight numeric(5,2) not null check(goal_weight>0),
  weekly_change_kg numeric(4,2) not null default -0.05, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(cat_id)
);
create table public.daily_feed_selections (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  cat_id uuid not null references public.cats(id) on delete cascade, recorded_date date not null, slot smallint not null check(slot between 1 and 3),
  feed_id bigint not null references public.feeds(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(cat_id,recorded_date,slot)
);
create table public.daily_meals (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  cat_id uuid not null references public.cats(id) on delete cascade, recorded_date date not null, meal_slot smallint not null check(meal_slot between 1 and 4),
  meal_time time not null, feed_id bigint not null references public.feeds(id), amount_g numeric(7,2) not null default 0 check(amount_g>=0),
  added_water_ml numeric(7,2) not null default 0 check(added_water_ml>=0),
  moisture_percent_snapshot numeric(5,2) check(moisture_percent_snapshot between 0 and 100), kcal_per_kg_snapshot numeric(9,2) check(kcal_per_kg_snapshot>=0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(cat_id,recorded_date,meal_slot)
);
create or replace function public.set_eundong_updated_at() returns trigger language plpgsql security invoker set search_path='' as $$ begin new.updated_at=now(); return new; end $$;
create trigger weight_goals_updated before update on public.weight_goals for each row execute function public.set_eundong_updated_at();
create trigger daily_feed_selections_updated before update on public.daily_feed_selections for each row execute function public.set_eundong_updated_at();
create trigger daily_meals_updated before update on public.daily_meals for each row execute function public.set_eundong_updated_at();
alter table public.weight_goals enable row level security;alter table public.daily_feed_selections enable row level security;alter table public.daily_meals enable row level security;
create policy "owners manage weight goals" on public.weight_goals for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and exists(select 1 from public.cats c where c.id=cat_id and c.user_id=(select auth.uid())));
create policy "owners manage feed selections" on public.daily_feed_selections for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and exists(select 1 from public.cats c where c.id=cat_id and c.user_id=(select auth.uid())));
create policy "owners manage daily meals" on public.daily_meals for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and exists(select 1 from public.cats c where c.id=cat_id and c.user_id=(select auth.uid())));
grant select,insert,update,delete on public.weight_goals,public.daily_feed_selections,public.daily_meals to authenticated;
-- Daily weight upserts require this uniqueness; deduplicate existing data before applying if needed.
create unique index if not exists weight_records_cat_date_unique on public.weight_records(cat_id,recorded_date);
