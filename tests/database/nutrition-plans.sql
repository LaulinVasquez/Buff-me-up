set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select public.gym_save_meal(null,null,'{"name": "Synthetic planned breakfast", "slot": "breakfast", "mode": "label", "recipe_servings": 1, "ingredients": [], "nutrients": {"calories": 500, "protein": 30, "carbs": 60, "fat": 15, "fiber": null, "sodium": null}, "ingredient_notes": "Rice and beans", "food_groups": ["protein", "whole_grains", "fruit", "vegetables", "dairy_or_fortified_alternative"], "diet_tags": ["vegan"], "allergens": [], "reviewed": true, "cooking_minutes": 20, "budget": "low", "notes": ""}',false) as breakfast_meal \gset
select (:'breakfast_meal'::jsonb->>'id') as breakfast_id \gset
select public.gym_save_meal(null,null,'{"name": "Synthetic planned lunch", "slot": "lunch", "mode": "label", "recipe_servings": 1, "ingredients": [], "nutrients": {"calories": 500, "protein": 30, "carbs": 60, "fat": 15, "fiber": null, "sodium": null}, "ingredient_notes": "Rice and beans", "food_groups": ["protein", "whole_grains", "fruit", "vegetables", "dairy_or_fortified_alternative"], "diet_tags": ["vegan"], "allergens": [], "reviewed": true, "cooking_minutes": 20, "budget": "low", "notes": ""}',false) as lunch_meal \gset
select (:'lunch_meal'::jsonb->>'id') as lunch_id \gset
select public.gym_save_meal(null,null,'{"name": "Synthetic planned dinner", "slot": "dinner", "mode": "label", "recipe_servings": 1, "ingredients": [], "nutrients": {"calories": 500, "protein": 30, "carbs": 60, "fat": 15, "fiber": null, "sodium": null}, "ingredient_notes": "Rice and beans", "food_groups": ["protein", "whole_grains", "fruit", "vegetables", "dairy_or_fortified_alternative"], "diet_tags": ["vegan"], "allergens": [], "reviewed": true, "cooking_minutes": 20, "budget": "low", "notes": ""}',false) as dinner_meal \gset
select (:'dinner_meal'::jsonb->>'id') as dinner_id \gset
select jsonb_build_object('start_date',current_date::text,'preference_revision',(select revision from public.gym_nutrition_preferences where user_id=auth.uid()),'guidance_version','dga-2025-2030-app-v1','entries',(select jsonb_agg(jsonb_build_object('day',d,'slot',s,'meal_id',case s when 'breakfast' then :'breakfast_id' when 'lunch' then :'lunch_id' else :'dinner_id' end,'meal_revision',0,'portions',1) order by d,s) from generate_series(0,6)d cross join unnest(array['breakfast','lunch','dinner'])s)) as plan \gset
select test.assert(public.gym_valid_meal_plan(:'plan'),'Seven complete days validate');
select public.gym_save_meal_plan('Synthetic week',:'plan','91000000-0000-0000-0000-000000000001') as saved_plan \gset
select public.gym_save_meal_plan('Synthetic week',:'plan','91000000-0000-0000-0000-000000000001');
select test.assert((select count(*)=1 from public.gym_meal_plans),'Plan retry is idempotent');
select test.assert((select jsonb_array_length(snapshot->'entries')=21 from public.gym_meal_plans),'Saved plan contains all reviewed snapshots');
select test.assert_raises($$update public.gym_meal_plans set name='Changed'$$,'permission denied');
select test.assert_raises(format('select public.gym_save_meal_plan(%L,%L,%L)','Invalid',jsonb_set(:'plan','{entries}','[]'),'91000000-0000-0000-0000-000000000002'),'Invalid meal plan');
select test.assert_raises(format('select public.gym_save_meal_plan(%L,%L,%L)','Invalid',jsonb_set(:'plan','{entries,0,portions}','0.1'),'91000000-0000-0000-0000-000000000002'),'Invalid meal plan');
select public.gym_save_meal(:'breakfast_id',0,jsonb_set(:'breakfast_meal'::jsonb->'details','{nutrients,calories}','900'),false);
select test.assert((select snapshot->'entries'->0->'meal'->'nutrients'->>'calories'='500' from public.gym_meal_plans),'Meal edits preserve past plan nutrition');
select public.gym_save_meal_plan('Synthetic week',:'plan','91000000-0000-0000-0000-000000000001');
select test.assert_raises(format('select public.gym_save_meal_plan(%L,%L,%L)','Stale',:'plan','91000000-0000-0000-0000-000000000002'),'Meal changed');
select jsonb_set(:'plan','{entries}',(select jsonb_agg(case when e->>'slot'='breakfast' then jsonb_set(e,'{meal_revision}','1')else e end) from jsonb_array_elements(:'plan'::jsonb->'entries')e)) as fresh_plan \gset
select public.gym_save_meal_plan('Fresh week',:'fresh_plan','91000000-0000-0000-0000-000000000002');
update public.gym_nutrition_preferences set cooking_minutes=25 where user_id=auth.uid();
select test.assert_raises(format('select public.gym_save_meal_plan(%L,%L,%L)','Stale profile',:'fresh_plan','91000000-0000-0000-0000-000000000003'),'Nutrition preferences changed');
select jsonb_set(:'fresh_plan','{preference_revision}',to_jsonb((select revision from public.gym_nutrition_preferences where user_id=auth.uid()))) as current_plan \gset
select public.gym_save_meal(:'breakfast_id',1,jsonb_set(jsonb_set(:'breakfast_meal'::jsonb->'details','{nutrients,calories}','900'),'{allergens}','["milk"]'),false);
select jsonb_set(:'current_plan','{entries}',(select jsonb_agg(case when e->>'slot'='breakfast' then jsonb_set(e,'{meal_revision}','2')else e end) from jsonb_array_elements(:'current_plan'::jsonb->'entries')e)) as restricted_plan \gset
select test.assert_raises(format('select public.gym_save_meal_plan(%L,%L,%L)','Restricted',:'restricted_plan','91000000-0000-0000-0000-000000000003'),'Meal no longer matches');
update public.gym_nutrition_preferences set ai_consent=true where user_id=auth.uid();
select test.assert((select ai_consent_version='nutrition-choices-v1' from public.gym_nutrition_preferences where user_id=auth.uid()),'AI consent has a versioned scope');
update public.gym_nutrition_preferences set ai_consent=false where user_id=auth.uid();
select test.assert((select ai_consent_version='' from public.gym_nutrition_preferences where user_id=auth.uid()),'Revoking AI consent clears its scope');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select test.assert((select count(*)=0 from public.gym_meal_plans),'Other plans are private');
select test.assert_raises(format('select public.gym_save_meal_plan(%L,%L,%L)','Other account',:'plan','91000000-0000-0000-0000-000000000004'),'Complete nutrition preferences first');
reset role;
set role anon;
select test.assert_raises('select * from public.gym_meal_plans','permission denied');
select test.assert_raises($$select public.gym_save_meal_plan('Invalid','{}','91000000-0000-0000-0000-000000000005')$$,'permission denied');
reset role;
-- Creation retry protocol also protects usual meals after a lost response.
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select jsonb_set(:'lunch_meal'::jsonb->'details','{name}','"Synthetic request meal"') as request_meal \gset
select public.gym_save_meal_with_request(null,null,:'request_meal',false,'93000000-0000-0000-0000-000000000001');
select public.gym_save_meal_with_request(null,null,:'request_meal',false,'93000000-0000-0000-0000-000000000001');
select test.assert((select count(*)=1 from public.gym_meals where request_id='93000000-0000-0000-0000-000000000001'),'Meal creation retries must return one saved meal');
select test.assert_raises(format('select public.gym_save_meal_with_request(null,null,%L,false,%L)',jsonb_set(:'request_meal','{name}','"Changed request"'),'93000000-0000-0000-0000-000000000001'),'Meal request changed');
reset role;
set role anon;
select test.assert_raises('select public.gym_valid_meal_plan(''{}'')','permission denied');
select test.assert_raises('select public.gym_valid_meal(''{}'')','permission denied');
reset role;
