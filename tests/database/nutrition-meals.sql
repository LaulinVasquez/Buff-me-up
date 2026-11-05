-- Date inputs below use UTC, so the fixture must use the same day boundary.
set time zone 'UTC';
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select public.gym_save_meal(null,null,'{"name": "Synthetic usual bowl", "slot": "lunch", "mode": "label", "recipe_servings": 1, "ingredients": [], "nutrients": {"calories": 500, "protein": 30, "carbs": 60, "fat": 15, "fiber": null, "sodium": null}, "ingredient_notes": "Rice and beans", "food_groups": ["protein", "whole_grains"], "diet_tags": ["vegan"], "allergens": [], "reviewed": true, "cooking_minutes": 20, "budget": "low", "notes": ""}',false) as meal \gset
select (:'meal'::jsonb->>'id') as meal_id \gset
select test.assert((select nutrients->>'calories'='500' and revision=0 from public.gym_meals where id=:'meal_id'),'Meal nutrient values persist');
select test.assert_raises(format('select public.gym_save_meal(%L,9,%L,false)',:'meal_id','{"name": "Synthetic usual bowl", "slot": "lunch", "mode": "label", "recipe_servings": 1, "ingredients": [], "nutrients": {"calories": 500, "protein": 30, "carbs": 60, "fat": 15, "fiber": null, "sodium": null}, "ingredient_notes": "Rice and beans", "food_groups": ["protein", "whole_grains"], "diet_tags": ["vegan"], "allergens": [], "reviewed": true, "cooking_minutes": 20, "budget": "low", "notes": ""}'),'Meal changed');
select public.gym_log_meal(:'meal_id',0,1.5,current_date,'lunch','UTC','90000000-0000-0000-0000-000000000001') as first_log \gset
select public.gym_log_meal(:'meal_id',0,1.5,current_date,'lunch','UTC','90000000-0000-0000-0000-000000000001');
select test.assert((select count(*)=1 from public.gym_food_logs where request_id='90000000-0000-0000-0000-000000000001'),'Log retries are idempotent');
select test.assert_raises(format('select public.gym_log_meal(%L,0,2,current_date,%L,%L,%L)',:'meal_id','lunch','UTC','90000000-0000-0000-0000-000000000001'),'Log request changed');
select public.gym_save_meal(:'meal_id',0,jsonb_set('{"name": "Synthetic usual bowl", "slot": "lunch", "mode": "label", "recipe_servings": 1, "ingredients": [], "nutrients": {"calories": 500, "protein": 30, "carbs": 60, "fat": 15, "fiber": null, "sodium": null}, "ingredient_notes": "Rice and beans", "food_groups": ["protein", "whole_grains"], "diet_tags": ["vegan"], "allergens": [], "reviewed": true, "cooking_minutes": 20, "budget": "low", "notes": ""}','{nutrients,calories}','700'),false);
select test.assert((select snapshot->'nutrients'->>'calories'='500' from public.gym_food_logs where request_id='90000000-0000-0000-0000-000000000001'),'Recipe edits do not change historical nutrition');
select test.assert_raises(format('select public.gym_log_meal(%L,0,1,current_date,%L,%L,%L)',:'meal_id','lunch','UTC','90000000-0000-0000-0000-000000000002'),'Meal changed');
select test.assert_raises(format('select public.gym_log_meal(%L,1,1,current_date+1,%L,%L,%L)',:'meal_id','lunch','UTC','90000000-0000-0000-0000-000000000002'),'Future food logs');
select test.assert_raises('update public.gym_food_logs set portions=9','permission denied');
select public.gym_save_meal(:'meal_id',1,null,true);
select test.assert_raises(format('select public.gym_log_meal(%L,2,1,current_date,%L,%L,%L)',:'meal_id','lunch','UTC','90000000-0000-0000-0000-000000000002'),'Meal not found');
select test.assert((select count(*)=1 from public.gym_food_logs),'Archiving preserves logs');
select test.assert_raises('delete from public.gym_meals','permission denied');
select test.assert(public.gym_consume_nutrition_request('food'),'Food request is allowed');
select test.assert_raises('update public.gym_nutrition_requests set used=1','permission denied');
select test.assert_raises($$select public.gym_consume_nutrition_request('unknown')$$,'Invalid request kind');
select public.gym_consume_nutrition_request('ai') from generate_series(1,10);
select test.assert(not public.gym_consume_nutrition_request('ai'),'AI quota cannot be exceeded');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select test.assert((select count(*)=0 from public.gym_meals),'Other meals are private');
select test.assert((select count(*)=0 from public.gym_food_logs),'Other logs are private');
select test.assert((select count(*)=0 from public.gym_nutrition_requests),'Other counters are private');
select test.assert_raises(format('select public.gym_log_meal(%L,2,1,current_date,%L,%L,%L)',:'meal_id','lunch','UTC','90000000-0000-0000-0000-000000000003'),'Meal not found');
select test.assert(public.gym_consume_nutrition_request('ai'),'Other users have separate quotas');
reset role;
set role anon;
select test.assert_raises('select * from public.gym_meals','permission denied');
select test.assert_raises('select * from public.gym_food_logs','permission denied');
select test.assert_raises($$select public.gym_consume_nutrition_request('food')$$,'permission denied');
reset role;
reset time zone;
