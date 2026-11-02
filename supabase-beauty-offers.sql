create table if not exists public.beauty_offers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  short_description text not null default '',
  nav_label text not null default 'Offers',
  services jsonb not null default '[]'::jsonb,
  original_price numeric(10,2) not null default 0,
  offer_price numeric(10,2) not null default 0,
  total_duration_minutes integer not null default 0,
  popup_image_url text,
  detail_image_url text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  homepage_order integer not null default 1,
  show_homepage boolean not null default true,
  show_offers_page boolean not null default true,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beauty_offers_valid_window check (ends_at > starts_at),
  constraint beauty_offers_valid_prices check (original_price >= 0 and offer_price >= 0 and offer_price <= original_price),
  constraint beauty_offers_valid_duration check (total_duration_minutes >= 0),
  constraint beauty_offers_services_array check (jsonb_typeof(services) = 'array')
);
alter table public.beauty_offers enable row level security;
revoke all on public.beauty_offers from anon, authenticated;
grant all on public.beauty_offers to service_role;
create index if not exists beauty_offers_schedule_idx on public.beauty_offers (is_active, starts_at, ends_at, homepage_order);
