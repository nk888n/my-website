# Vale Beauty VK – current fixes

This package contains the current fixes for the four issues reported during testing:

1. Service detail panels no longer stretch other cards; each service keeps its own open/closed state.
2. The booking calendar is compact so the month view does not create a large vertical box.
3. Availability uses 30-minute start slots, 8:00 AM–7:00 PM business hours, and includes the private 30-minute cleanup buffer when calculating whether a slot can be booked. The latest start therefore depends on the selected service duration (for example, a 30-minute service can start at 6:00 PM because its 30-minute buffer ends at 7:00 PM).
4. Confirm Booking becomes enabled when a service, available date/time, full name, and valid email are present. Notes remain optional.

## Important deployment requirement

The availability and booking API requires the Supabase environment variables from `.env.example` to be configured in the deployment environment:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `BUSINESS_TIMEZONE`
- `RESEND_FROM_EMAIL`

If the deployed site still shows an availability-load error after these code changes, verify those Vercel environment variables and that the Supabase schema in `supabase-schema.sql` has been applied.
