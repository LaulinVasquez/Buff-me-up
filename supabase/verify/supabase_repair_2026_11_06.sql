-- Read-only schema checks and synthetic calculation; no personal records are read.
-- Run after the two repair scripts in docs/SUPABASE_REPAIR_2026_11_06.md.
with expected(table_name,column_name,type_name) as (values
 ('gym_workout_exercises','substitution_version','integer'),
 ('gym_workout_exercises','substitution_details','jsonb'),
 ('gym_workout_exercises','substitution_history','jsonb'),
 ('gym_workout_exercises','logged_sets','jsonb'),
 ('gym_workout_exercises','log_revision','integer'),
 ('gym_workout_exercises','deferred','boolean'),
 ('gym_workouts','session_mode','text'),
 ('gym_workouts','mode_minutes','integer'),
 ('gym_workouts','mode_revision','integer'),
 ('gym_workouts','session_adaptations','jsonb')
)
select e.table_name,e.column_name,c.data_type,
 case when c.column_name is null then 'MISSING'
  when c.data_type<>e.type_name then 'UNEXPECTED TYPE' else 'OK' end as status
from expected e left join information_schema.columns c
 on c.table_schema='public' and c.table_name=e.table_name and c.column_name=e.column_name
order by e.table_name,e.column_name;

select signature,to_regprocedure(signature) is not null as installed
from (values
 ('public.gym_set_workout_status(uuid,text)'),
 ('public.gym_update_workout_progress(uuid,uuid,integer,jsonb)'),
 ('public.gym_swap_workout_exercise(uuid,uuid,integer,timestamp with time zone,text,jsonb)'),
 ('public.gym_save_workout_sets(uuid,uuid,integer,integer,jsonb)'),
 ('public.gym_adapt_workout(uuid,text,integer,integer,jsonb,uuid[])'),
 ('public.gym_meal_nutrients(jsonb)')
) as expected(signature);

select c.relname,c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('gym_workouts','gym_workout_exercises');

-- Two servings: chicken 200 g + rice 100 g, including one unknown fiber value.
select public.gym_meal_nutrients($recipe${"name": "Synthetic chicken rice", "slot": "lunch", "mode": "recipe", "recipe_servings": 2, "ingredients": [{"name": "Chicken", "grams": 200, "per100g": {"calories": 165, "protein": 31, "carbs": 0, "fat": 3.6, "fiber": 0, "sodium": 74}, "source": "usda", "fdc_id": 123, "retrieved_at": "2026-11-06T00:00:00.000Z"}, {"name": "Rice", "grams": 100, "per100g": {"calories": 130, "protein": 2.7, "carbs": 28, "fat": 0.3, "fiber": null, "sodium": 1}, "source": "manual", "fdc_id": null, "retrieved_at": null}], "nutrients": {"calories": null, "protein": null, "carbs": null, "fat": null, "fiber": null, "sodium": null}, "ingredient_notes": "Synthetic test only", "food_groups": ["protein", "whole_grains"], "diet_tags": ["omnivore"], "allergens": [], "reviewed": true, "cooking_minutes": 90, "budget": "low", "notes": ""}$recipe$::jsonb)
 = '{"calories":230,"protein":32.35,"carbs":14,"fat":3.75,"fiber":null,"sodium":74.5}'::jsonb
 as recipe_math_ok;
