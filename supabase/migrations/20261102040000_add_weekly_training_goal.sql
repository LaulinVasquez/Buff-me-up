-- Attendance days, not consecutive streaks. Existing owner profile RLS applies.
alter table public.gym_profiles add column weekly_goal integer not null default 3 check (weekly_goal between 1 and 7);
