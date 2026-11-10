-- Read-only: inspect schema/permissions and validate synthetic options. No personal records.
select column_name,data_type,is_nullable
from information_schema.columns
where table_schema='public' and table_name='gym_meal_plans'
 and column_name in ('planning_options','preparation_priorities','request_fingerprint')
order by column_name;

select to_regprocedure('public.gym_save_discovery_meal_plan(text,jsonb,jsonb,jsonb,jsonb,uuid)') is not null as discovery_rpc_installed;
select has_function_privilege('authenticated','public.gym_save_discovery_meal_plan(text,jsonb,jsonb,jsonb,jsonb,uuid)','execute') as authenticated_can_execute,
 not has_function_privilege('anon','public.gym_save_discovery_meal_plan(text,jsonb,jsonb,jsonb,jsonb,uuid)','execute') as anonymous_execute_blocked;

select c.relname,c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('gym_meal_plans','gym_meals','gym_food_logs')
order by c.relname;

select public.gym_valid_planning_options('{"style":"vegan","mode":"variety","source":"mixed","use_target":false}') as valid_options_accepted,
 not public.gym_valid_planning_options('{"style":"invented","mode":"variety","source":"mixed","use_target":false}') as invalid_options_rejected;
