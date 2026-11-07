-- Exercise the recipe branch that label-only fixtures previously missed.
begin;
set plpgsql.variable_conflict = error;
set time zone 'UTC';
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
\ir fixtures/nutrition-recipe.sql
select test.assert(public.gym_valid_meal(:'recipe'::jsonb),'Mixed USDA/manual recipe is valid');
select test.assert(public.gym_meal_nutrients(:'recipe'::jsonb)='{"calories":230,"protein":32.35,"carbs":14,"fat":3.75,"fiber":null,"sodium":74.5}'::jsonb,'Recipe aggregate uses the parameter and correct per-serving math');
select test.assert(public.gym_meal_nutrients(jsonb_set(:'recipe'::jsonb,'{recipe_servings}','4'))->>'calories'='115.00','Serving divisor scales the recipe');
select test.assert(public.gym_meal_nutrients(jsonb_set(:'recipe'::jsonb,'{ingredients,1,per100g,fiber}','0'))->>'fiber'='0.00','Known zero remains zero; unknown fiber remains null');
select test.assert_raises(format('select public.gym_meal_nutrients(%L)',jsonb_set(:'recipe'::jsonb,'{ingredients,0,grams}','-1')),'Invalid meal');
select test.assert_raises(format('select public.gym_meal_nutrients(%L)',jsonb_set(:'recipe'::jsonb,'{ingredients,0,per100g,calories}','100000')),'Invalid meal');
select public.gym_save_meal_with_request(null,null,:'recipe'::jsonb,false,'95000000-0000-0000-0000-000000000001') as saved \gset
select (:'saved'::jsonb->>'id') as meal_id \gset
select test.assert((select nutrients=public.gym_meal_nutrients(:'recipe'::jsonb) and revision=0 from public.gym_meals where id=:'meal_id'),'Recipe saves with calculated nutrients');
select public.gym_save_meal_with_request(null,null,:'recipe'::jsonb,false,'95000000-0000-0000-0000-000000000001');
select test.assert((select count(*)=1 from public.gym_meals where request_id='95000000-0000-0000-0000-000000000001'),'Recipe creation retry returns one meal');
select public.gym_log_meal(:'meal_id',0,1.5,current_date,'lunch','UTC','95000000-0000-0000-0000-000000000002');
select public.gym_save_meal(:'meal_id',0,jsonb_set(:'recipe'::jsonb,'{ingredients,1,grams}','200'),false);
select test.assert((select nutrients->>'calories'='295.00' and revision=1 from public.gym_meals where id=:'meal_id'),'Recipe edit recalculates from grams');
select test.assert((select snapshot->'nutrients'->>'calories'='230.00' and portions=1.5 from public.gym_food_logs where request_id='95000000-0000-0000-0000-000000000002'),'Recipe edit preserves original diary nutrition and portions');
select test.assert_raises(format('select public.gym_save_meal(%L,0,%L,false)',:'meal_id',:'recipe'),'Meal changed');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select test.assert((select count(*)=0 from public.gym_meals where id=:'meal_id'),'Other owners cannot read the recipe');
select test.assert_raises(format('select public.gym_save_meal(%L,1,%L,false)',:'meal_id',:'recipe'),'Meal not found');
reset role;
select test.assert(not has_function_privilege('anon','public.gym_meal_nutrients(jsonb)','execute'),'Recipe repair retains anonymous execute restriction');
select test.assert(has_function_privilege('authenticated','public.gym_meal_nutrients(jsonb)','execute'),'Recipe repair retains authenticated helper permission');
rollback;
