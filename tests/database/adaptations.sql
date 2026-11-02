set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
insert into public.gym_workout_plans (id,user_id,name) values ('12000000-0000-0000-0000-000000000001',auth.uid(),'Mode test plan');
insert into public.gym_workout_days (id,plan_id,name,day_order) values ('22000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000001','Mode day',0);
insert into public.gym_exercises (workout_day_id,name,sets,target_reps,exercise_order) select '22000000-0000-0000-0000-000000000001','Mode exercise '||n,3,'8-12',n from generate_series(1,5) n;
select public.gym_activate_workout_plan('12000000-0000-0000-0000-000000000001');
select public.gym_start_workout('22000000-0000-0000-0000-000000000001') as mode_workout \gset
select id as first_id from public.gym_workout_exercises where workout_id=:'mode_workout' and exercise_order=1 \gset
select id as second_id from public.gym_workout_exercises where workout_id=:'mode_workout' and exercise_order=2 \gset
select id as third_id from public.gym_workout_exercises where workout_id=:'mode_workout' and exercise_order=3 \gset
select id as fourth_id from public.gym_workout_exercises where workout_id=:'mode_workout' and exercise_order=4 \gset
select public.gym_update_workout_progress(:'mode_workout',:'first_id',0,'{"completed":true}');
select public.gym_save_workout_sets(:'mode_workout',:'second_id',0,0,'[{"set":1,"reps":8,"weight":25,"completed":true},{"set":2,"reps":null,"weight":null,"completed":false}]');
select jsonb_agg(jsonb_build_object('id',id,'updatedAt',updated_at)) as review from public.gym_workout_exercises where workout_id=:'mode_workout' \gset
select public.gym_adapt_workout(:'mode_workout','short',20,0,:'review',array[:'first_id'::uuid,:'second_id'::uuid,:'third_id'::uuid]);
select test.assert((select count(*)=2 from public.gym_workout_exercises where workout_id=:'mode_workout' and deferred),'Short mode retains snapshots but sets aside untouched work');
select test.assert((select count(*)=5 from public.gym_exercises where workout_day_id='22000000-0000-0000-0000-000000000001'),'Saved plan is unchanged');
select test.assert((select not deferred and logged_sets->0->>'reps'='8' from public.gym_workout_exercises where id=:'second_id'),'Partial actual work is retained');
select test.assert_raises(format('select public.gym_adapt_workout(%L,%L,20,0,%L,array[%L::uuid])',:'mode_workout','short',:'review',:'first_id'),'Session changed');
select test.assert_raises(format('select public.gym_save_workout_sets(%L,%L,0,0,%L)',:'mode_workout',:'fourth_id','[{"set":1,"reps":8,"weight":25,"completed":true}]'),'Logged work cannot be deferred');
select jsonb_agg(jsonb_build_object('id',id,'updatedAt',updated_at)) as review2 from public.gym_workout_exercises where workout_id=:'mode_workout' \gset
select test.assert_raises(format('select public.gym_adapt_workout(%L,%L,null,1,%L,array[%L::uuid])',:'mode_workout','comeback',:'review2',:'third_id'),'Logged work must stay');
select public.gym_update_workout_progress(:'mode_workout',:'third_id',0,'{"weight":35}');
select test.assert_raises(format('select public.gym_adapt_workout(%L,%L,null,1,%L,array[%L::uuid,%L::uuid,%L::uuid])',:'mode_workout','comeback',:'review2',:'first_id',:'second_id',:'third_id'),'Exercise changed');
select jsonb_agg(jsonb_build_object('id',id,'updatedAt',updated_at)) as review3 from public.gym_workout_exercises where workout_id=:'mode_workout' \gset
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
select test.assert_raises(format('select public.gym_adapt_workout(%L,%L,null,1,%L,array[]::uuid[])',:'mode_workout','full',:'review3'),'Workout not found');
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select public.gym_adapt_workout(:'mode_workout','full',null,1,:'review3',array[]::uuid[]);
select test.assert((select count(*)=0 from public.gym_workout_exercises where workout_id=:'mode_workout' and deferred),'Full mode restores retained work');
select test.assert((select mode_revision=2 and jsonb_array_length(session_adaptations)=2 from public.gym_workouts where id=:'mode_workout'),'Scope changes remain in session history');
select public.gym_set_workout_status(:'mode_workout','completed');
select test.assert_raises(format('select public.gym_adapt_workout(%L,%L,null,2,%L,array[]::uuid[])',:'mode_workout','full',:'review3'),'Workout is no longer in progress');
select test.assert_raises(format('update public.gym_workouts set session_mode=%L where id=%L','comeback',:'mode_workout'),'Finished session scope cannot change');
select public.gym_activate_workout_plan('10000000-0000-0000-0000-000000000001');
set role anon;
select test.assert_raises(format('select public.gym_adapt_workout(%L,%L,null,2,%L,array[]::uuid[])',:'mode_workout','full',:'review3'),'permission denied');
reset role;
