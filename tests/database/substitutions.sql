set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
insert into public.gym_workout_days (id, plan_id, name, day_order)
values ('20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000001', 'Swap fixture', 1);
insert into public.gym_exercises (id, workout_day_id, name, sets, target_reps, default_weight, exercise_order, muscle_group)
values ('30000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000010', 'Dumbbell Curl', 3, '8-12', 25, 0, 'Biceps'),
('30000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000010', 'Lat Pulldown', 4, '6-10', 50, 1, 'Back');
select public.gym_start_workout('20000000-0000-0000-0000-000000000010') as workout_id \gset
select id as snapshot_id, updated_at as original_updated_at from public.gym_workout_exercises where workout_id = :'workout_id' and exercise_order = 0 \gset
select id as completed_id, updated_at as completed_updated_at from public.gym_workout_exercises where workout_id = :'workout_id' and exercise_order = 1 \gset
select public.gym_update_workout_progress(:'workout_id', :'completed_id', 0, '{"completed":true}');
\set hammer '{"id":"fallback-hammer","name":"Hammer Curl","primaryMuscle":"Biceps","equipment":"Dumbbells","mechanic":"isolation","instructions":["Move under control"]}'
\set preacher '{"id":"fallback-preacher","name":"Preacher Curl","primaryMuscle":"Biceps","equipment":"Machine","mechanic":"isolation","instructions":[]}'
\set row '{"id":"fallback-row","name":"Barbell Row","primaryMuscle":"Back","equipment":"Barbell","instructions":[]}'

select test.assert_raises(format('select public.gym_swap_workout_exercise(%L,%L,0,%L,%L,%L)', :'workout_id', :'snapshot_id', :'original_updated_at', 'Chest', :'hammer'), 'Invalid replacement');
select test.assert_raises(format('select public.gym_swap_workout_exercise(%L,%L,0,%L,%L,%L)', :'workout_id', :'snapshot_id', :'original_updated_at', 'Back', :'row'), 'Replacement must keep the primary muscle');
select test.assert_raises(format('select public.gym_swap_workout_exercise(%L,%L,0,%L,%L,%L)', :'workout_id', :'completed_id', :'completed_updated_at', 'Back', :'row'), 'Completed exercises cannot be replaced');
select test.assert_raises(format('select public.gym_swap_workout_exercise(%L,%L,0,%L,%L,%L)', :'workout_id', :'snapshot_id', :'original_updated_at', 'Biceps', '{}'), 'Invalid replacement');

select test.assert_raises(format('select public.gym_swap_workout_exercise(%L,%L,0,%L,%L,%L)', :'workout_id', :'snapshot_id', :'original_updated_at', 'Biceps', '{"id":123,"name":"Bad","primaryMuscle":"Biceps","equipment":"Dumbbells","instructions":[]}'), 'Invalid replacement');
select test.assert_raises(format('select public.gym_swap_workout_exercise(%L,%L,0,%L,%L,%L)', :'workout_id', :'snapshot_id', :'original_updated_at', 'Biceps', '{"id":"bad","name":"Bad","primaryMuscle":"Biceps","equipment":"Dumbbells","instructions":[123]}'), 'Invalid instructions');

-- A progress save after opening the picker invalidates the reviewed snapshot.
select public.gym_update_workout_progress(:'workout_id', :'snapshot_id', 0, '{"weight":27.5}');
select test.assert_raises(format('select public.gym_swap_workout_exercise(%L,%L,0,%L,%L,%L)', :'workout_id', :'snapshot_id', :'original_updated_at', 'Biceps', :'hammer'), 'Exercise changed');
select updated_at as reviewed_updated_at from public.gym_workout_exercises where id = :'snapshot_id' \gset
select public.gym_swap_workout_exercise(:'workout_id', :'snapshot_id', 0, :'reviewed_updated_at', 'Biceps', :'hammer');
select test.assert((select name = 'Hammer Curl' and weight is null and not completed and exercise_id is null and exercise_order = 0
  and target_sets = 3 and target_reps = '8-12' and substitution_version = 1 and substitution_history->0->>'name' = 'Dumbbell Curl'
  and (substitution_history->0->>'weight')::numeric = 27.5 from public.gym_workout_exercises where id = :'snapshot_id'), 'Swap must preserve targets/order/original data and clear the replacement weight/reference');
select test.assert((select name = 'Dumbbell Curl' and default_weight = 25 from public.gym_exercises where id = '30000000-0000-0000-0000-000000000010'), 'Swap must not edit the saved plan');
select test.assert((select completed and weight = 50 and substitution_version = 0 from public.gym_workout_exercises where id = :'completed_id'), 'Swap must preserve completed exercises');
select test.assert((select count(*) = 2 from public.gym_workout_exercises where workout_id = :'workout_id'), 'Swap must not duplicate or remove snapshots');
select test.assert(public.gym_start_workout('20000000-0000-0000-0000-000000000010') = :'workout_id', 'Resume must retain the swapped session');

select test.assert_raises(format('select public.gym_swap_workout_exercise(%L,%L,0,%L,%L,%L)', :'workout_id', :'snapshot_id', :'reviewed_updated_at', 'Biceps', :'hammer'), 'Exercise changed');
select test.assert_raises(format('select public.gym_update_workout_progress(%L,%L,0,%L)', :'workout_id', :'snapshot_id', '{"weight":99}'), 'Exercise changed');
select test.assert_raises(format('select public.gym_update_workout_progress(%L,%L,0,%L)', :'workout_id', :'snapshot_id', '{"completed":true}'), 'Exercise changed');
select test.assert_raises(format('update public.gym_workout_exercises set weight = 999 where id = %L', :'snapshot_id'), 'Exercise changed');
select test.assert_raises(format('update public.gym_workout_exercises set completed = true where id = %L', :'snapshot_id'), 'Exercise changed');
select test.assert_raises(format('update public.gym_workout_exercises set substitution_history = %L where id = %L', '[]', :'snapshot_id'), 'Substitution history is managed automatically');
select test.assert_raises(format('select public.gym_update_workout_progress(%L,%L,1,%L)', :'workout_id', :'snapshot_id', '{"weight":-2}'), 'Invalid weight');
select test.assert_raises(format('select public.gym_update_workout_progress(%L,%L,1,%L)', :'workout_id', :'snapshot_id', '{"completed":null}'), 'Invalid completion');
select test.assert_raises(format('select public.gym_update_workout_progress(%L,%L,1,%L)', :'workout_id', :'snapshot_id', '{"name":"Forged"}'), 'Invalid progress');

select public.gym_update_workout_progress(:'workout_id', :'snapshot_id', 1, '{"weight":30.5}');
select updated_at as second_reviewed_at from public.gym_workout_exercises where id = :'snapshot_id' \gset
select public.gym_swap_workout_exercise(:'workout_id', :'snapshot_id', 1, :'second_reviewed_at', 'Biceps', :'preacher');
select test.assert((select substitution_version = 2 and jsonb_array_length(substitution_history) = 2
  and substitution_history->1->>'name' = 'Hammer Curl' and (substitution_history->1->>'weight')::numeric = 30.5
  and substitution_history->1->'details'->>'id' = 'fallback-hammer' from public.gym_workout_exercises where id = :'snapshot_id'), 'Repeated swaps must retain the full original chain');
select updated_at as duplicate_reviewed_at from public.gym_workout_exercises where id = :'snapshot_id' \gset
select test.assert_raises(format('select public.gym_swap_workout_exercise(%L,%L,2,%L,%L,%L)', :'workout_id', :'snapshot_id', :'duplicate_reviewed_at', 'Biceps', :'preacher'), 'already in this workout');

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
select test.assert_raises(format('select public.gym_swap_workout_exercise(%L,%L,2,%L,%L,%L)', :'workout_id', :'snapshot_id', :'duplicate_reviewed_at', 'Biceps', :'hammer'), 'Workout not found');
select test.assert_raises(format('select public.gym_update_workout_progress(%L,%L,2,%L)', :'workout_id', :'snapshot_id', '{"weight":99}'), 'Workout not found');
select test.assert((select count(*) = 0 from public.gym_workout_exercises where id = :'snapshot_id'), 'Swap details/history must remain private');
set request.jwt.claim.sub = '';
select test.assert_raises(format('select public.gym_update_workout_progress(%L,%L,2,%L)', :'workout_id', :'snapshot_id', '{"weight":99}'), 'Authentication required');
select test.assert_raises(format('select public.gym_swap_workout_exercise(%L,%L,2,%L,%L,%L)', :'workout_id', :'snapshot_id', :'duplicate_reviewed_at', 'Biceps', :'hammer'), 'Authentication required');
set role anon;
select test.assert_raises(format('select public.gym_swap_workout_exercise(%L,%L,2,%L,%L,%L)', :'workout_id', :'snapshot_id', :'duplicate_reviewed_at', 'Biceps', :'hammer'), 'permission denied');
select test.assert_raises(format('select public.gym_update_workout_progress(%L,%L,2,%L)', :'workout_id', :'snapshot_id', '{"weight":99}'), 'permission denied');
reset role;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select public.gym_update_workout_progress(:'workout_id', :'snapshot_id', 2, '{"weight":35,"completed":true}');
select public.gym_set_workout_status(:'workout_id', 'completed');
select test.assert_raises(format('select public.gym_swap_workout_exercise(%L,%L,2,%L,%L,%L)', :'workout_id', :'snapshot_id', :'duplicate_reviewed_at', 'Biceps', :'hammer'), 'Workout is no longer in progress');
select test.assert_raises(format('select public.gym_update_workout_progress(%L,%L,2,%L)', :'workout_id', :'snapshot_id', '{"weight":99}'), 'Workout is no longer in progress');
select test.assert((select name = 'Preacher Curl' and weight = 35 and completed and jsonb_array_length(substitution_history) = 2 from public.gym_workout_exercises where id = :'snapshot_id'), 'History must retain replacement progress and original records');
reset role;

-- Cancelled sessions reject swaps as well; a future workout still uses the plan's original exercise.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select public.gym_start_workout('20000000-0000-0000-0000-000000000010') as cancelled_id \gset
select id as cancelled_snapshot, updated_at as cancelled_updated_at from public.gym_workout_exercises where workout_id = :'cancelled_id' and exercise_order = 0 \gset
select test.assert((select name = 'Dumbbell Curl' and weight = 25 and substitution_version = 0 and substitution_history = '[]'::jsonb from public.gym_workout_exercises where id = :'cancelled_snapshot'), 'Future workouts must use the unchanged saved plan');
select public.gym_set_workout_status(:'cancelled_id', 'cancelled');
select test.assert_raises(format('select public.gym_swap_workout_exercise(%L,%L,0,%L,%L,%L)', :'cancelled_id', :'cancelled_snapshot', :'cancelled_updated_at', 'Biceps', :'hammer'), 'Workout is no longer in progress');
reset role;
