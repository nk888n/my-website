-- VALE BEAUTY VK: full admin controls
create table if not exists availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  start_at timestamptz not null,
  end_at timestamptz not null,
  kind text not null default 'custom',
  reason text,
  created_at timestamptz not null default now(),
  check (end_at > start_at)
);
create index if not exists availability_exceptions_range_idx on availability_exceptions(start_at,end_at);

create table if not exists customer_discounts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  kind text not null check (kind in ('percent','fixed')),
  value numeric(10,2) not null check (value > 0),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  max_uses integer,
  uses integer not null default 0,
  active boolean not null default true,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists customer_discounts_email_idx on customer_discounts(lower(email));

create table if not exists customer_fees (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  booking_id uuid references bookings(id) on delete set null,
  amount numeric(10,2) not null check (amount >= 0),
  reason text not null,
  status text not null default 'outstanding' check (status in ('outstanding','paid','waived')),
  admin_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists customer_fees_email_idx on customer_fees(lower(email));

create table if not exists admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  entity_type text,
  entity_id text,
  email text,
  details jsonb,
  created_at timestamptz not null default now()
);

create table if not exists message_log (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  body text not null,
  recipients jsonb not null,
  sent_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  date date not null,
  preferred_start_minutes integer,
  duration_minutes integer not null,
  notes text,
  status text not null default 'waiting' check (status in ('waiting','contacted','fulfilled','cancelled')),
  created_at timestamptz not null default now()
);

alter table availability_exceptions enable row level security;
alter table customer_discounts enable row level security;
alter table customer_fees enable row level security;
alter table admin_audit_log enable row level security;
alter table message_log enable row level security;
alter table waitlist enable row level security;
