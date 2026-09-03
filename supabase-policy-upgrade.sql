-- VALE BEAUTY VK booking policy + attendance/fee upgrade
-- Run this once in Supabase SQL Editor after the original supabase-schema.sql.

alter table bookings drop constraint if exists bookings_status_check;
alter table bookings add constraint bookings_status_check
  check (status in ('confirmed','cancelled','rescheduled','attended','no_show','late_cancel'));

-- Optional fixed fee for automatic late cancellations/changes made within 24 hours.
-- Leave this unset if the studio wants to enter fees manually from the Admin page.
-- The app reads LATE_FEE_AMOUNT from Vercel, not from Supabase.
