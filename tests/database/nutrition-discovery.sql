-- Every fixture below is synthetic and rolled back; no live DB configuration is read.
begin;
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select $preferences${"age": null, "height_cm": null, "weight_kg": null, "activity": "moderate", "goal": "support_training", "diet": "omnivore", "allergens": [], "avoid_foods": [], "usual_foods": "", "cooking_minutes": 30, "budget": "moderate", "calorie_target": null, "ai_consent": false}$preferences$::jsonb as preferences \gset
select public.gym_save_nutrition_preferences(:'preferences',(select revision from public.gym_nutrition_preferences where user_id=auth.uid()),false);
\ir fixtures/discovery-recipes.sql
select '{"style":"vegan","mode":"variety","source":"mixed","use_target":false}'::jsonb as options \gset
select jsonb_build_object('start_date',current_date::text,'preference_revision',(select revision from public.gym_nutrition_preferences where user_id=auth.uid()),'guidance_version','dga-2025-2030-app-v1','entries',(
 select jsonb_agg(jsonb_build_object('day',d,'slot',p.item->'details'->>'slot','meal_id',p.item->>'key','meal_revision',0,'portions',1) order by d,p.item->'details'->>'slot')
 from generate_series(0,6)d cross join jsonb_array_elements(:'proposals'::jsonb) as p(item))) as plan \gset
select test.assert(not public.gym_valid_planning_options('[]'),'Non-object planning options reject without errors');
select count(*) as before_meals from public.gym_meals \gset
select count(*) as before_plans from public.gym_meal_plans \gset
select count(*) as before_logs from public.gym_food_logs \gset
select public.gym_save_discovery_meal_plan('Synthetic discovered week',:'plan',:'proposals',:'options','["wash_produce","midweek_refresh"]','96000000-0000-0000-0000-000000000001') as saved \gset
select test.assert((select count(*)=:'before_meals'::integer+3 from public.gym_meals),'Three reviewed recipe ideas save with the plan');
select test.assert((select count(*)=:'before_plans'::integer+1 from public.gym_meal_plans),'One discovered week saves');
select test.assert((select count(*)=:'before_logs'::integer from public.gym_food_logs),'Planning must never log food as eaten');
select test.assert(public.gym_valid_meal_plan(:'saved'::jsonb->'draft'),'Saved aliases normalize to canonical UUID meal references');
select test.assert(:'saved'::jsonb->'planning_options'=:'options'::jsonb,'Plan style and mode persist');
select test.assert(:'saved'::jsonb->'preparation_priorities'='["wash_produce","midweek_refresh"]'::jsonb,'Preparation priorities persist');
select test.assert(:'saved'::jsonb->'snapshot'->'entries'->0->'meal'->'nutrients'->'calories'='null'::jsonb,'Unknown suggested nutrients remain null');
select test.assert(position('1. ' in (:'saved'::jsonb->'snapshot'->'entries'->0->'meal'->'details'->>'notes'))>0,'Preparation directions are retained in immutable snapshots');
select public.gym_save_nutrition_preferences(jsonb_set(:'preferences','{cooking_minutes}','5'),(select revision from public.gym_nutrition_preferences where user_id=auth.uid()),false);
select test.assert(public.gym_save_discovery_meal_plan('Synthetic discovered week',:'plan',:'proposals',:'options','["wash_produce","midweek_refresh"]','96000000-0000-0000-0000-000000000001')->>'id'=:'saved'::jsonb->>'id','Lost response retry returns the original plan even after preferences changed');
select test.assert_raises(format('select public.gym_save_discovery_meal_plan(%L,%L,%L,%L,%L,%L)','Changed request',:'plan',:'proposals',:'options','["wash_produce","midweek_refresh"]','96000000-0000-0000-0000-000000000001'),'Plan request changed');
select test.assert_raises(format('select public.gym_save_discovery_meal_plan(%L,%L,%L,%L,%L,%L)','Stale',:'plan',:'proposals',:'options','[]','96000000-0000-0000-0000-000000000002'),'Nutrition preferences changed');
select public.gym_save_nutrition_preferences(:'preferences',(select revision from public.gym_nutrition_preferences where user_id=auth.uid()),false);
select jsonb_set(:'plan','{preference_revision}',to_jsonb((select revision from public.gym_nutrition_preferences where user_id=auth.uid()))) as plan \gset
select public.gym_save_discovery_meal_plan('Another reviewed week',:'plan',:'proposals',:'options','[]','96000000-0000-0000-0000-000000000005') as reused \gset
select test.assert((select count(*)=:'before_meals'::integer+3 from public.gym_meals),'Another week reuses identical reviewed recipes');
delete from public.gym_meal_plans where id=(:'reused'::jsonb->>'id')::uuid;
-- Make genuinely new recipes so the failure tests exercise rollback after actual inserts.
select jsonb_agg(jsonb_set(p.item,'{details,name}',to_jsonb((p.item->'details'->>'name')||' pending'))) as proposals from jsonb_array_elements(:'proposals'::jsonb) as p(item) \gset
select count(*) as baseline_meals from public.gym_meals \gset
select test.assert_raises(format('select public.gym_save_discovery_meal_plan(%L,%L,%L,%L,%L,%L)','Unreviewed',:'plan',jsonb_set(:'proposals','{2,details,reviewed}','false'),:'options','[]','96000000-0000-0000-0000-000000000002'),'compatible ingredient review');
select test.assert((select count(*)=:'baseline_meals'::integer from public.gym_meals),'Later unreviewed recipe rolls back earlier recipe creations');
select test.assert_raises(format('select public.gym_save_discovery_meal_plan(%L,%L,%L,%L,%L,%L)','Bad portion',jsonb_set(:'plan','{entries,0,portions}','0.1'),:'proposals',:'options','[]','96000000-0000-0000-0000-000000000002'),'Invalid meal plan');
select test.assert((select count(*)=:'baseline_meals'::integer from public.gym_meals),'Plan validation failure rolls back all newly created recipes');
select test.assert_raises(format('select public.gym_save_discovery_meal_plan(%L,%L,%L,%L,%L,%L)','Bad revision type',jsonb_set(:'plan','{entries,0,meal_revision}','"0"'),:'proposals',:'options','[]','96000000-0000-0000-0000-000000000002'),'Invalid meal plan');
select test.assert_raises(format('select public.gym_save_discovery_meal_plan(%L,%L,%L,%L,%L,%L)','Unreviewed alias',jsonb_set(:'plan','{entries,0,meal_id}','"suggestion:unknown"'),:'proposals',:'options','[]','96000000-0000-0000-0000-000000000002'),'Review each selected recipe');
select test.assert_raises(format('select public.gym_save_discovery_meal_plan(%L,%L,%L,%L,%L,%L)','Bad priority',:'plan',:'proposals',:'options','["invented safety advice"]','96000000-0000-0000-0000-000000000002'),'Invalid preparation');
select test.assert_raises(format('select public.gym_save_discovery_meal_plan(%L,%L,%L,%L,%L,%L)','Saved only',:'plan',:'proposals',jsonb_set(:'options','{source}','"saved"'),'[]','96000000-0000-0000-0000-000000000002'),'Saved-only');
-- Reject a requested style that would relax the saved diet.
select public.gym_save_nutrition_preferences(jsonb_set(:'preferences','{diet}','"vegan"'),(select revision from public.gym_nutrition_preferences where user_id=auth.uid()),false);
select jsonb_set(:'plan','{preference_revision}',to_jsonb((select revision from public.gym_nutrition_preferences where user_id=auth.uid()))) as plan \gset
select test.assert_raises(format('select public.gym_save_discovery_meal_plan(%L,%L,%L,%L,%L,%L)','Conflicting style',:'plan',:'proposals',jsonb_set(:'options','{style}','"meat_lovers"'),'[]','96000000-0000-0000-0000-000000000002'),'style conflicts');
select test.assert((select count(*)=:'baseline_meals'::integer from public.gym_meals),'Rejected style adds no meals');
-- Changes to a saved recipe cannot alter the past plan's preparation snapshot.
select (:'saved'::jsonb->'snapshot'->'entries'->0->'meal'->>'id') as first_meal \gset
select public.gym_save_meal(:'first_meal',0,jsonb_set((select details from public.gym_meals where id=:'first_meal'),'{notes}','"Edited later"'),false);
select test.assert((select position('1. ' in (snapshot->'entries'->0->'meal'->'details'->>'notes'))>0 from public.gym_meal_plans where id=(:'saved'::jsonb->>'id')::uuid),'Saved directions do not change with a usual recipe');
-- A limit reached after the first creation must roll back the entire request.
insert into public.gym_meals(user_id,details)
 select auth.uid(),jsonb_set(:'proposals'::jsonb->0->'details','{name}',to_jsonb('Capacity fixture '||i))
 from generate_series(1,99-(select count(*)::integer from public.gym_meals where not archived))i;
select test.assert_raises(format('select public.gym_save_discovery_meal_plan(%L,%L,%L,%L,%L,%L)','Capacity',:'plan',:'proposals',:'options','[]','96000000-0000-0000-0000-000000000002'),'more than 100');
select test.assert((select count(*)=99 from public.gym_meals where not archived),'Meal limit failure rolls back the first successful creation');
select test.assert((select count(*)=:'before_plans'::integer+1 from public.gym_meal_plans),'All failed requests leave plan count unchanged');
select test.assert_raises($$update public.gym_meal_plans set planning_options='{}'$$,'permission denied');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select test.assert((select count(*)=0 from public.gym_meal_plans where id=(:'saved'::jsonb->>'id')::uuid),'Second owner cannot read the plan');
select test.assert((select count(*)=0 from public.gym_meals where id=:'first_meal'),'Second owner cannot read the created recipe');
reset role;
select test.assert(not has_function_privilege('anon','public.gym_save_discovery_meal_plan(text,jsonb,jsonb,jsonb,jsonb,uuid)','execute'),'Anonymous callers cannot save discovery plans');
select test.assert(has_function_privilege('authenticated','public.gym_save_discovery_meal_plan(text,jsonb,jsonb,jsonb,jsonb,uuid)','execute'),'Authenticated callers retain the reviewed save');
rollback;
