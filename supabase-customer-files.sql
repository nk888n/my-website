-- VALE BEAUTY VK — Customer files, session photos and notes
create table if not exists customer_files (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customer_profiles(id) on delete cascade,
  booking_id uuid references bookings(id) on delete cascade,
  file_path text,
  file_name text,
  mime_type text,
  size_bytes bigint,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists customer_files_customer_idx on customer_files(customer_id,created_at desc);
create index if not exists customer_files_booking_idx on customer_files(booking_id,created_at desc);
alter table customer_files enable row level security;

-- Private Supabase Storage bucket used by the admin service-role API.
insert into storage.buckets (id,name,public)
values ('customer-files','customer-files',false)
on conflict (id) do update set public=false;
