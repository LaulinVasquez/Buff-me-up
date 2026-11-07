-- Isolated regression: preference revisions do not invalidate independent meal saves.
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select to_jsonb(p) as original_preferences from public.gym_nutrition_preferences p where user_id=auth.uid() \gset
select to_jsonb(m) as original_meal from public.gym_meals m where name='Synthetic planned lunch' \gset
select (:'original_preferences'::jsonb - array['user_id','revision','created_at','updated_at','onboarding_status','ai_consent_version']) as preference_input \gset
select public.gym_save_nutrition_preferences(jsonb_set(:'preference_input','{cooking_minutes}','60'),(:'original_preferences'::jsonb->>'revision')::integer,false) as sixty \gset
select public.gym_save_nutrition_preferences(jsonb_set(:'preference_input','{cooking_minutes}','90'),(:'sixty'::jsonb->>'revision')::integer,false) as ninety \gset
select test.assert((:'ninety'::jsonb->>'cooking_minutes')::integer=90,'Cooking limit update persists');
select test.assert((:'ninety'::jsonb->'allergens')=(:'original_preferences'::jsonb->'allergens') and (:'ninety'::jsonb->'height_cm')=(:'original_preferences'::jsonb->'height_cm'),'Limit update preserves unrelated fields');
select test.assert_raises(format('select public.gym_save_nutrition_preferences(%L,%s,false)',jsonb_set(:'preference_input','{cooking_minutes}','75'),(:'sixty'::jsonb->>'revision')::integer),'Nutrition preferences changed');
select public.gym_save_meal((:'original_meal'::jsonb->>'id')::uuid,(:'original_meal'::jsonb->>'revision')::integer,:'original_meal'::jsonb->'details',false) as saved_meal \gset
select test.assert((:'saved_meal'::jsonb->>'revision')::integer=(:'original_meal'::jsonb->>'revision')::integer+1,'Preference update alone must not reject a meal save');
select jsonb_set(:'original_meal'::jsonb->'details','{name}','"Synthetic recovered meal"') as new_meal \gset
select public.gym_save_meal_with_request(null,null,:'new_meal',false,'94000000-0000-0000-0000-000000000001');
select public.gym_save_meal_with_request(null,null,:'new_meal',false,'94000000-0000-0000-0000-000000000001');
select test.assert((select count(*)=1 from public.gym_meals where request_id='94000000-0000-0000-0000-000000000001'),'Reload retries keep one new meal');
rollback;
