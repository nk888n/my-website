create table if not exists public.beauty_offer_rotation (
  singleton boolean primary key default true check (singleton = true),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  slots jsonb not null default '[]'::jsonb,
  is_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint beauty_offer_rotation_valid_window check (ends_at > starts_at),
  constraint beauty_offer_rotation_slots_array check (jsonb_typeof(slots) = 'array')
);
alter table public.beauty_offer_rotation enable row level security;
revoke all on public.beauty_offer_rotation from anon, authenticated;
grant all on public.beauty_offer_rotation to service_role;