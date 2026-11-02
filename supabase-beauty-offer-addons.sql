alter table public.beauty_offers
  add column if not exists addons jsonb not null default '[]'::jsonb;
