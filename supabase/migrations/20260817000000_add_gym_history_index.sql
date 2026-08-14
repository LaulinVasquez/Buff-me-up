create index gym_workouts_user_status_completed_at_idx
  on public.gym_workouts (user_id, status, completed_at desc)
  where completed_at is not null;
