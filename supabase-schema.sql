create extension if not exists btree_gist;
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  notes text,
  items jsonb not null,
  service_ids jsonb not null,
  date date not null,
  start_minutes integer not null check (start_minutes >= 480 and start_minutes < 1140),
  duration_minutes integer not null check (duration_minutes > 0),
  total_price numeric(10,2) not null check (total_price >= 0),
  status text not null default 'confirmed' check (status in ('confirmed','cancelled','rescheduled')),
  manage_token_hash text unique not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  start_at timestamptz not null,
  blocked_end_at timestamptz not null
);
create index if not exists bookings_date_idx on bookings(date);
create index if not exists bookings_email_idx on bookings(lower(email));
alter table bookings add constraint bookings_no_overlap exclude using gist (
  tstzrange(start_at, blocked_end_at, '[)') with &&
) where (status = 'confirmed');
create table if not exists fees (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  booking_id uuid references bookings(id) on delete set null,
  amount numeric(10,2) not null check (amount >= 0),
  reason text not null default 'Late cancellation / no-show',
  status text not null default 'outstanding' check (status in ('outstanding','paid','waived')),
  created_at timestamptz not null default now()
);
create index if not exists fees_email_idx on fees(lower(email));
alter table bookings enable row level security;
alter table fees enable row level security;
