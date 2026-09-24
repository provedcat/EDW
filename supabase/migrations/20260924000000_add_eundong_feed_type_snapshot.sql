alter table public.eundong_daily_feeds
  add column if not exists feed_type_snapshot text not null default 'wet'
  check (feed_type_snapshot in ('dry', 'wet'));
