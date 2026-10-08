-- VALE BEAUTY VK — attendance payments, tips, and customer occasion reminders
-- Safe to run after the existing customer profile/admin migrations.

alter table customer_profiles add column if not exists birthday date;
alter table customer_profiles add column if not exists personal_event_name text;
alter table customer_profiles add column if not exists personal_event_date date;
alter table customer_profiles add column if not exists birthday_last_reminded_year integer;
alter table customer_profiles add column if not exists personal_event_last_reminded_year integer;

alter table bookings add column if not exists paid_amount numeric(10,2);
alter table bookings add column if not exists tip_amount numeric(10,2) not null default 0;
alter table bookings add column if not exists paid_at timestamptz;
alter table bookings add column if not exists payment_confirmed boolean not null default false;

create index if not exists customer_profiles_birthday_idx
  on customer_profiles(birthday);
create index if not exists customer_profiles_personal_event_idx
  on customer_profiles(personal_event_date);

-- Existing bookings are intentionally NOT marked paid.
-- Spend will only increase after the studio explicitly marks a booking attended
-- and confirms the payment amount/tip in the admin panel.
