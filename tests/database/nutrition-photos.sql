begin;
set time zone 'UTC';
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select $photo${"name": "Synthetic photo breakfast", "slot": "breakfast", "mode": "label", "recipe_servings": 1, "ingredients": [], "nutrients": {"calories": 500, "protein": 25, "carbs": 80, "fat": 12, "fiber": null, "sodium": null}, "ingredient_notes": "Possible rice and beans. User must verify actual ingredients and labels.", "food_groups": [], "diet_tags": [], "allergens": [], "reviewed": false, "cooking_minutes": 15, "budget": "low", "notes": "Photo-assisted rough estimate, manually corrected.", "photo_estimate": {"version": "photo-v1", "calories_low": 400, "calories_high": 650, "calories_estimate": 530, "portion_description": "One pictured bowl", "confidence": "low", "uncertainty": ["Amount of oil is not visible", "Depth of the bowl is uncertain"], "estimated_at": "2026-11-18T00:00:00.000Z"}}$photo$::jsonb as photo \gset
select test.assert(public.gym_valid_meal(:'photo'),'Photo label permits a corrected calorie value and optional metadata');
select test.assert(public.gym_valid_meal(:'photo'::jsonb-'photo_estimate'),'Legacy meal shape remains valid');
select test.assert(not public.gym_valid_meal(jsonb_set(:'photo','{photo_estimate,confidence}','"high"')),'Photo metadata cannot claim high confidence');
select test.assert(not public.gym_valid_meal(jsonb_set(:'photo','{photo_estimate,calories_high}','400')),'Invalid photo ranges reject');
select test.assert(not public.gym_valid_meal(jsonb_set(:'photo','{photo_estimate,image}','"private image"')),'Photo blobs cannot be added to metadata');
select test.assert(not public.gym_valid_meal(jsonb_set(:'photo','{image}','"private image"')),'Extra image fields cannot be stored as meals');
select test.assert(not public.gym_valid_meal(jsonb_set(:'photo','{mode}','"recipe"')),'Photo metadata is only valid for per-serving label estimates');
select test.assert(not public.gym_valid_meal(jsonb_set(:'photo','{recipe_servings}','2')),'Photo label is one per-serving estimate');
select test.assert(not public.gym_valid_meal(jsonb_set(:'photo','{photo_estimate,estimated_at}','"2026-02-30T00:00:00.000Z"')),'Invalid estimate dates reject');
select public.gym_save_meal_with_request(null,null,:'photo',false,'98000000-0000-0000-0000-000000000001') as saved_photo \gset
select (:'saved_photo'::jsonb->>'id') as photo_id \gset
select public.gym_save_meal_with_request(null,null,:'photo',false,'98000000-0000-0000-0000-000000000001');
select test.assert((select count(*)=1 from public.gym_meals where request_id='98000000-0000-0000-0000-000000000001'),'Photo meal retries create one row');
select public.gym_log_meal(:'photo_id',0,1.5,current_date,'breakfast','UTC','98000000-0000-0000-0000-000000000002');
select test.assert((select snapshot->'details'->'photo_estimate'=:'photo'::jsonb->'photo_estimate' and snapshot->'nutrients'->>'calories'='500' from public.gym_food_logs where request_id='98000000-0000-0000-0000-000000000002'),'Diary retains the photo range/provenance and corrected value');
select (select id from public.gym_meals where name='Synthetic planned lunch') as lunch_id,(select revision from public.gym_meals where name='Synthetic planned lunch') as lunch_revision,(select id from public.gym_meals where name='Synthetic planned dinner') as dinner_id,(select revision from public.gym_meals where name='Synthetic planned dinner') as dinner_revision \gset
select jsonb_build_object('start_date',current_date::text,'preference_revision',(select revision from public.gym_nutrition_preferences where user_id=auth.uid()),'guidance_version','dga-2025-2030-app-v1','entries',(select jsonb_agg(jsonb_build_object('day',d,'slot',s,'meal_id',case s when 'breakfast' then :'photo_id' when 'lunch' then :'lunch_id' else :'dinner_id' end,'meal_revision',case s when 'breakfast' then 0 when 'lunch' then :'lunch_revision'::integer else :'dinner_revision'::integer end,'portions',1) order by d,s) from generate_series(0,6)d cross join unnest(array['breakfast','lunch','dinner'])s)) as plan \gset
select test.assert_raises(format('select public.gym_save_meal_plan(%L,%L,%L)','Unreviewed photo week',:'plan','98000000-0000-0000-0000-000000000003'),'Meal no longer matches');
select public.gym_save_meal(:'photo_id',0,jsonb_set(jsonb_set(:'photo','{reviewed}','true'),'{diet_tags}','["vegan"]'),false);
select jsonb_set(:'plan','{entries}',(select jsonb_agg(case when e.item->>'slot'='breakfast' then jsonb_set(e.item,'{meal_revision}','1') else e.item end order by e.ordinality) from jsonb_array_elements(:'plan'::jsonb->'entries') with ordinality as e(item,ordinality))) as plan \gset
select public.gym_save_meal_plan('Synthetic reviewed photo week',:'plan','98000000-0000-0000-0000-000000000003') as saved_plan \gset
select test.assert(:'saved_plan'::jsonb->'snapshot'->'entries'->0->'meal'->'details'->'photo_estimate'=:'photo'::jsonb->'photo_estimate','Reviewed plan retains the image-estimate source without any image');
select public.gym_save_meal(:'photo_id',1,jsonb_set(jsonb_set(jsonb_set(:'photo','{reviewed}','true'),'{diet_tags}','["vegan"]'),'{photo_estimate,calories_high}','800'),false);
select test.assert((select snapshot->'details'->'photo_estimate'->>'calories_high'='650' from public.gym_food_logs where request_id='98000000-0000-0000-0000-000000000002'),'Later estimate edits do not change diary ranges');
select test.assert((select snapshot->'entries'->0->'meal'->'details'->'photo_estimate'->>'calories_high'='650' from public.gym_meal_plans where id=(:'saved_plan'::jsonb->>'id')::uuid),'Later estimate edits do not change saved plan ranges');
select used as old_food_usage from public.gym_nutrition_requests where kind='food' \gset
select used as old_ai_usage from public.gym_nutrition_requests where kind='ai' \gset
select test.assert(public.gym_consume_nutrition_request('photo'),'Separate photo quota accepts attempt') from generate_series(1,5);
select test.assert(not public.gym_consume_nutrition_request('photo'),'Photo quota stops at five attempts');
select test.assert((select used=:'old_food_usage'::integer from public.gym_nutrition_requests where kind='food'),'Photo analysis preserves food lookup quota');
select test.assert((select used=:'old_ai_usage'::integer from public.gym_nutrition_requests where kind='ai'),'Photo analysis preserves text-AI quota');
select test.assert_raises($$update public.gym_nutrition_requests set used=1 where kind='photo'$$,'permission denied');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select test.assert((select count(*)=0 from public.gym_meals where id=:'photo_id'),'Other users cannot read photo-assisted meals');
select test.assert((select count(*)=0 from public.gym_food_logs where request_id='98000000-0000-0000-0000-000000000002'),'Other users cannot read photo diary snapshots');
select test.assert(public.gym_consume_nutrition_request('photo'),'Other users have an independent photo quota');
select test.assert((select used=1 from public.gym_nutrition_requests where kind='photo'),'Other photo attempt counts remain private');
reset role;
select test.assert(not has_function_privilege('anon','public.gym_valid_photo_estimate(jsonb)','execute'),'Anonymous helper permissions stay restricted');
select test.assert(not has_function_privilege('anon','public.gym_consume_nutrition_request(text)','execute'),'Anonymous provider quota calls stay restricted');
rollback;
