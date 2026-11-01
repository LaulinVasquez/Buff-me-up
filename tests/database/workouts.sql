insert into auth.users values ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';

insert into public.gym_profiles (id, full_name) values (auth.uid(), 'Synthetic user one');
insert into public.gym_workout_plans (id, user_id, name, is_active)
values ('10000000-0000-0000-0000-000000000001', auth.uid(), 'Local test plan', true);
insert into public.gym_workout_days (id, plan_id, name, day_order)
values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Day one', 0);
insert into public.gym_exercises (id, workout_day_id, name, sets, target_reps, default_weight, exercise_order)
values ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Synthetic curl', 3, '8-12', 25, 0);

select public.gym_start_workout('20000000-0000-0000-0000-000000000001') as workout_id \gset
select test.assert(public.gym_start_workout('20000000-0000-0000-0000-000000000001') = :'workout_id', 'Resume must return the same workout');
select test.assert((select count(*) = 1 from public.gym_workouts where status = 'in_progress'), 'Start must not duplicate the active workout');
select test.assert((select count(*) = 1 from public.gym_workout_exercises where workout_id = :'workout_id'), 'Start must create exactly one exercise snapshot');
update public.gym_workout_exercises set weight = 30.5, completed = true where workout_id = :'workout_id';
select test.assert((select weight = 30.5 and completed from public.gym_workout_exercises where workout_id = :'workout_id'), 'Active progress must persist');

-- Reproduce the stale-tab defect without depending on the new RPC.
update public.gym_workouts set status = 'completed', completed_at = now() where id = :'workout_id';
select test.assert_raises(format('update public.gym_workout_exercises set weight = 999 where workout_id = %L', :'workout_id'), 'Workout is no longer in progress');
select test.assert_raises(format('update public.gym_workout_exercises set completed = false where workout_id = %L', :'workout_id'), 'Workout is no longer in progress');
select test.assert_raises(format('delete from public.gym_workout_exercises where workout_id = %L', :'workout_id'), 'Workout is no longer in progress');
select test.assert_raises(format('insert into public.gym_workout_exercises (workout_id, name, exercise_order) values (%L, %L, 1)', :'workout_id', 'Late exercise'), 'Workout is no longer in progress');
select test.assert_raises(format('update public.gym_workouts set status = %L where id = %L', 'in_progress', :'workout_id'), 'Workout is already finalized');
select test.assert_raises(format('update public.gym_workouts set completed_at = now() + interval %L where id = %L', '1 minute', :'workout_id'), 'Workout is already finalized');

select completed_at as original_completion from public.gym_workouts where id = :'workout_id' \gset
select test.assert(public.gym_set_workout_status(:'workout_id', 'completed') = :'workout_id', 'Completion retry must succeed');
select test.assert((select completed_at = :'original_completion'::timestamptz from public.gym_workouts where id = :'workout_id'), 'Retry must preserve completion time');
select test.assert_raises(format('select public.gym_set_workout_status(%L, %L)', :'workout_id', 'cancelled'), 'Workout is already finalized');
select test.assert_raises(format('select public.gym_set_workout_status(%L, %L)', :'workout_id', 'in_progress'), 'Invalid workout status');
select test.assert_raises(format('select public.gym_set_workout_status(%L, null)', :'workout_id'), 'Invalid workout status');
select test.assert((select count(*) = 1 from public.gym_workouts where status = 'completed'), 'History must contain exactly one completion');

select public.gym_start_workout('20000000-0000-0000-0000-000000000001') as finished_id \gset
select public.gym_set_workout_status(:'finished_id', 'completed');
select test.assert((select status = 'completed' and completed_at >= started_at from public.gym_workouts where id = :'finished_id'), 'RPC must persist a valid database completion time');
select test.assert((select count(*) = 0 from public.gym_workouts where status = 'in_progress'), 'Completion must close the active session');

select public.gym_start_workout('20000000-0000-0000-0000-000000000001') as cancelled_id \gset
select test.assert_raises(format('update public.gym_workout_exercises set workout_id = %L where workout_id = %L', :'workout_id', :'cancelled_id'), 'Workout snapshot cannot move to another session');
select test.assert_raises(format('update public.gym_workout_exercises set workout_id = %L where workout_id = %L', :'cancelled_id', :'workout_id'), 'Workout is no longer in progress');
select public.gym_set_workout_status(:'cancelled_id', 'cancelled');
select test.assert(public.gym_set_workout_status(:'cancelled_id', 'cancelled') = :'cancelled_id', 'Cancellation retry must succeed');
select test.assert((select completed_at is null from public.gym_workouts where id = :'cancelled_id'), 'Cancellation must not create attendance');
select test.assert_raises(format('select public.gym_set_workout_status(%L, %L)', :'cancelled_id', 'completed'), 'Workout is already finalized');

-- A second test user cannot read, create under, edit, or finalize the first user's data.
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
select test.assert((select count(*) = 0 from public.gym_profiles), 'Profiles must be isolated');
select test.assert((select count(*) = 0 from public.gym_workout_plans), 'Plans must be isolated');
select test.assert((select count(*) = 0 from public.gym_workout_days), 'Days must be isolated');
select test.assert((select count(*) = 0 from public.gym_exercises), 'Exercises must be isolated');
select test.assert((select count(*) = 0 from public.gym_workouts), 'Workouts must be isolated');
select test.assert((select count(*) = 0 from public.gym_workout_exercises), 'Snapshots must be isolated');
select test.assert_raises(format('select public.gym_set_workout_status(%L, %L)', :'workout_id', 'completed'), 'Workout not found');
select test.assert_raises($$select public.gym_start_workout('20000000-0000-0000-0000-000000000001')$$, 'Workout day not found');
select test.assert_raises($$insert into public.gym_workout_days (plan_id, name, day_order) values ('10000000-0000-0000-0000-000000000001', 'Foreign day', 1)$$, 'row-level security');
select test.assert_raises($$insert into public.gym_exercises (workout_day_id, name, sets, target_reps, exercise_order) values ('20000000-0000-0000-0000-000000000001', 'Foreign exercise', 3, '10', 1)$$, 'row-level security');
select test.assert_raises($$insert into public.gym_workout_plans (user_id, name) values ('00000000-0000-0000-0000-000000000001', 'Forged owner')$$, 'row-level security');
update public.gym_workouts set status = 'in_progress' where id = :'workout_id';
delete from public.gym_workouts where id = :'workout_id';
update public.gym_workout_exercises set weight = 999 where workout_id = :'workout_id';

insert into public.gym_workout_plans (id, user_id, name, is_active)
values ('10000000-0000-0000-0000-000000000002', auth.uid(), 'Second synthetic plan', true);
insert into public.gym_workout_days (id, plan_id, name, day_order)
values ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Second user day', 0);
insert into public.gym_exercises (workout_day_id, name, sets, target_reps, exercise_order)
values ('20000000-0000-0000-0000-000000000002', 'Second user curl', 3, '10', 0);
select public.gym_start_workout('20000000-0000-0000-0000-000000000002') as second_workout_id \gset
select test.assert((select count(*) = 1 from public.gym_workouts), 'Second user must see only their own workout');
select public.gym_set_workout_status(:'second_workout_id', 'completed');

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select test.assert((select status = 'completed' from public.gym_workouts where id = :'workout_id'), 'Foreign writes must have no effect');
select test.assert((select weight = 30.5 and completed from public.gym_workout_exercises where workout_id = :'workout_id'), 'Finished progress must remain unchanged');
select test.assert((select count(*) = 0 from public.gym_workouts where id = :'second_workout_id'), 'Isolation must work in both directions');

-- Template deletion sets foreign keys to null without discarding history.
delete from public.gym_exercises where id = '30000000-0000-0000-0000-000000000001';
select test.assert((select exercise_id is null and weight = 30.5 from public.gym_workout_exercises where workout_id = :'workout_id'), 'Deleting a template must preserve snapshots');
insert into public.gym_exercises (id, workout_day_id, name, sets, target_reps, default_weight, exercise_order)
values ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Synthetic curl', 3, '8-12', 25, 0);
-- Parent deletion still cascades, including for a finalized session.
delete from public.gym_workouts where id = :'cancelled_id';
select test.assert((select count(*) = 0 from public.gym_workout_exercises where workout_id = :'cancelled_id'), 'Parent deletion must clean up snapshots');

-- Missing/anonymous identities cannot use finalization.
set request.jwt.claim.sub = '';
select test.assert_raises(format('select public.gym_set_workout_status(%L, %L)', :'workout_id', 'completed'), 'Authentication required');
set role anon;
select test.assert_raises(format('select public.gym_set_workout_status(%L, %L)', :'workout_id', 'completed'), 'permission denied');
reset role;
