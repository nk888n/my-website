# VALE BEAUTY VK – booking + policy upgrade

## Included
- 12-hour appointment times (8:00 AM, 8:30 AM, …) instead of 24-hour labels.
- Booking date picker and manage-appointment date picker use the compact custom calendar instead of the browser's native date input.
- Fully booked dates are greyed out.
- Booked/unavailable time slots are visibly faded/disabled.
- Business hours remain 8:00 AM–7:00 PM every day. Because every appointment also has a 30-minute cleanup buffer, the latest start time depends on the service duration.
- The customer management link is usable until 24 hours before the appointment. After that, customer self-service change/cancel is disabled.
- A late cancellation/change within 24 hours can create an outstanding fee when `LATE_FEE_AMOUNT` is configured.
- The admin page can mark a customer as Attended or No-show, and can add a manually entered fee for a no-show or late cancellation.
- Outstanding fees block a new booking from the same email and show the customer the amount owed.
- Admin can mark outstanding fees as paid or waive them.
- Confirmation and appointment-update emails use Gmail SMTP through `GMAIL_USER` + `GMAIL_APP_PASSWORD`.

## Supabase migration
Run `supabase-policy-upgrade.sql` once in the Supabase SQL Editor. It expands booking status values to support attendance/no-show/late-cancellation tracking.

## Vercel
Keep these Production variables configured:
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_PIN`
- `NEXT_PUBLIC_SITE_URL`
- `BUSINESS_TIMEZONE`

Set `LATE_FEE_AMOUNT` only after the studio decides the actual fee amount. Do not invent a fee amount in the code.
