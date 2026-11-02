set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select jsonb_build_object('name','Synthetic generated plan','description','Local tests','days',jsonb_agg(jsonb_build_object('name','Day '||n,'exercises',jsonb_build_array(jsonb_build_object('id','fallback-bench','name','Bench Press','primaryMuscle','Chest','sets',3,'reps','8-12','equipment','Barbell'))))) as template from generate_series(1,4) n \gset
select public.gym_save_generated_plan(:'template',false) as generated_id \gset
select test.assert((select count(*)=4 from public.gym_workout_days where plan_id=:'generated_id'),'Four-day generated plan persists four populated days');
select test.assert((select count(*)=4 from public.gym_exercises e join public.gym_workout_days d on d.id=e.workout_day_id where d.plan_id=:'generated_id'),'Each generated day contains its exercise');
select id as original_active from public.gym_workout_plans where is_active \gset
select count(*) as before_count from public.gym_workout_plans \gset
select jsonb_set(:'template','{days,0,exercises}','[]') as empty_template \gset
select test.assert_raises(format('select public.gym_save_generated_plan(%L,true)',:'empty_template'),'Invalid workout day');
select test.assert((select is_active from public.gym_workout_plans where id=:'original_active'),'Failed generation must preserve active plan');
select test.assert((select count(*)=:'before_count'::integer from public.gym_workout_plans),'Failed generation must not leave a partial plan');
select jsonb_set(:'template','{days,0,exercises}',jsonb_build_array(:'template'::jsonb->'days'->0->'exercises'->0,:'template'::jsonb->'days'->0->'exercises'->0)) as duplicate_template \gset
select test.assert_raises(format('select public.gym_save_generated_plan(%L,false)',:'duplicate_template'),'Duplicate generated exercise');
select jsonb_set(:'template','{days,0,exercises,0,sets}','1.5') as fractional_template \gset
select test.assert_raises(format('select public.gym_save_generated_plan(%L,false)',:'fractional_template'),'Invalid exercise');
select jsonb_set(:'template','{days,0,exercises,0,primaryMuscle}','"Unknown"') as invalid_muscle \gset
select test.assert_raises(format('select public.gym_save_generated_plan(%L,false)',:'invalid_muscle'),'Invalid exercise');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select test.assert((select count(*)=0 from public.gym_workout_plans where id=:'generated_id'),'Generated plans remain owner-isolated');
set role anon;
select test.assert_raises(format('select public.gym_save_generated_plan(%L,false)',:'template'),'permission denied');
reset role;
