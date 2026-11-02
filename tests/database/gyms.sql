set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select public.gym_save_location(null,null,'Synthetic gym A',array['Dumbbells','Cable']) as gym_a \gset
select public.gym_save_location(null,null,'Synthetic gym B',array['Machine']) as gym_b \gset
select public.gym_select_location(:'gym_a');
select test.assert((select count(*)=1 from public.gym_locations where is_active),'Only one gym is selected');
select test.assert((select equipment=array['Dumbbells','Cable'] from public.gym_locations where id=:'gym_a'),'Equipment persists');
select updated_at as gym_time from public.gym_locations where id=:'gym_a' \gset
select public.gym_save_location(:'gym_a',:'gym_time','Synthetic gym A edited',array['Dumbbells']);
select test.assert_raises(format('select public.gym_save_location(%L,%L,%L,array[%L])',:'gym_a',:'gym_time','Stale name','Machine'),'Gym changed');
select test.assert_raises($$select public.gym_save_location(null,null,'Invalid',array['Unknown'])$$,'violates check');
select public.gym_save_exercise_note(:'gym_a','dumbbell curl','Dumbbell Curl','Seat 4','Use handle B','fallback-hammer',null) as note_a \gset
select test.assert((select machine_settings='Seat 4' and notes='Use handle B' and preferred_exercise_id='fallback-hammer' from public.gym_exercise_notes where id=:'note_a'),'Settings/notes/preference persist');
select test.assert_raises(format('select public.gym_save_exercise_note(%L,%L,%L,%L,%L,null,null)',:'gym_a','dumbbell curl','Dumbbell Curl','Seat 5','Stale'),'Notes changed');
select updated_at as note_time from public.gym_exercise_notes where id=:'note_a' \gset
select public.gym_save_exercise_note(:'gym_a','dumbbell curl','Dumbbell Curl','Seat 5','Updated','fallback-preacher',:'note_time');
select public.gym_save_exercise_note(:'gym_b','dumbbell curl','Dumbbell Curl','Seat 1','Other gym',null,null);
select public.gym_select_location(:'gym_b');
select test.assert((select is_active from public.gym_locations where id=:'gym_b'),'Switching gym persists');
select test.assert((select count(*)=1 from public.gym_locations where is_active),'Switching retains exactly one selection');
select test.assert((select machine_settings='Seat 5' from public.gym_exercise_notes where id=:'note_a'),'Changing gyms does not overwrite earlier notes');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select test.assert((select count(*)=0 from public.gym_locations),'Other gyms are private');
select test.assert((select count(*)=0 from public.gym_exercise_notes),'Other notes are private');
select test.assert_raises(format('select public.gym_select_location(%L)',:'gym_a'),'Gym not found');
select test.assert_raises(format('select public.gym_save_exercise_note(%L,%L,%L,%L,%L,null,null)',:'gym_a','x','X','Forged','Forged'),'Gym not found');
select test.assert_raises(format('insert into public.gym_exercise_notes(user_id,gym_id,exercise_key,exercise_name) values(auth.uid(),%L,%L,%L)',:'gym_a','forged','Forged'),'row-level security');
select public.gym_save_location(null,null,'Second user gym',array['Bodyweight']) as other_gym \gset
select public.gym_select_location(:'other_gym');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select test.assert((select is_active from public.gym_locations where id=:'gym_b'),'Other selection cannot clear your gym');
select public.gym_select_location(null);
select test.assert((select count(*)=0 from public.gym_locations where is_active),'No-gym selection is supported');
set role anon;
select test.assert_raises($$select * from public.gym_exercise_notes$$,'permission denied');
select test.assert_raises($$select public.gym_select_location(null)$$,'permission denied');
reset role;
