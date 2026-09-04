-- VALE BEAUTY VK — Customer Profiles foundation
create table if not exists customer_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  address text,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists customer_profiles_email_idx on customer_profiles(lower(email));
create index if not exists customer_profiles_name_idx on customer_profiles(lower(name));
create unique index if not exists customer_profiles_name_email_uidx on customer_profiles(lower(name),lower(email));
alter table bookings add column if not exists customer_id uuid references customer_profiles(id) on delete set null;
alter table customer_fees add column if not exists customer_id uuid references customer_profiles(id) on delete set null;
alter table customer_discounts add column if not exists customer_id uuid references customer_profiles(id) on delete set null;
insert into customer_profiles(name,email)
select distinct trim(name),lower(trim(email)) from bookings where trim(coalesce(name,''))<>'' and trim(coalesce(email,''))<>'' on conflict do nothing;
update bookings b set customer_id=p.id from customer_profiles p where b.customer_id is null and lower(trim(b.email))=lower(trim(p.email)) and trim(b.name)=p.name;
update customer_fees f set customer_id=p.id from customer_profiles p where f.customer_id is null and lower(trim(f.email))=lower(trim(p.email)) and (select count(*) from customer_profiles p2 where lower(trim(p2.email))=lower(trim(f.email)))=1;
update customer_discounts d set customer_id=p.id from customer_profiles p where d.customer_id is null and lower(trim(d.email))=lower(trim(p.email)) and (select count(*) from customer_profiles p2 where lower(trim(p2.email))=lower(trim(d.email)))=1;
alter table customer_profiles enable row level security;
-- No public policies are intentionally created. Server routes use the Supabase service role.
