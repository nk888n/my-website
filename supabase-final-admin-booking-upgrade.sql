-- VALE BEAUTY VK: final admin/discount/booking rules
-- Safe to run after the existing schema/admin upgrades.

alter table customer_discounts add column if not exists scope text not null default 'customer' check (scope in ('customer','service'));
alter table customer_discounts alter column email drop not null;
alter table customer_discounts add column if not exists service_ids text[] not null default '{}';
alter table customer_discounts add column if not exists starts_at timestamptz not null default now();
alter table customer_discounts add column if not exists updated_at timestamptz not null default now();
create index if not exists customer_discounts_scope_idx on customer_discounts(scope,active,starts_at,expires_at);

alter table customer_fees add column if not exists resolved_at timestamptz;
alter table customer_fees add column if not exists customer_id uuid references customer_profiles(id) on delete set null;
create index if not exists customer_fees_customer_idx on customer_fees(customer_id);

alter table bookings add column if not exists cancelled_by text check (cancelled_by in ('client','studio'));
alter table bookings add column if not exists cancellation_reason text;
alter table bookings add column if not exists cancellation_notified boolean;
create index if not exists bookings_customer_date_idx on bookings(customer_id,date,start_minutes);

create table if not exists customer_profile_tombstones (
  customer_id uuid primary key,
  name text not null,
  email text not null,
  deleted_at timestamptz not null default now()
);

update customer_discounts set scope='customer' where scope is null;
