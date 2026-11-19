-- Read-only schema/ACL checks. No personal records or paid requests are accessed.
select to_regprocedure('public.gym_valid_photo_estimate(jsonb)') is not null as photo_validator_installed,
 to_regprocedure('public.gym_valid_meal_core(jsonb)') is not null as legacy_validator_installed;

select has_function_privilege('authenticated','public.gym_valid_photo_estimate(jsonb)','execute') as authenticated_validator_allowed,
 not has_function_privilege('anon','public.gym_valid_photo_estimate(jsonb)','execute') as anonymous_validator_blocked,
 has_function_privilege('authenticated','public.gym_consume_nutrition_request(text)','execute') as authenticated_quota_allowed,
 not has_function_privilege('anon','public.gym_consume_nutrition_request(text)','execute') as anonymous_quota_blocked;

select c.relname,c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('gym_meals','gym_food_logs','gym_meal_plans','gym_nutrition_requests')
order by c.relname;

select pg_get_constraintdef(oid) as request_kind_constraint
from pg_constraint where conrelid='public.gym_nutrition_requests'::regclass and conname='gym_nutrition_requests_kind_check';

select public.gym_valid_photo_estimate('{"version":"photo-v1","calories_low":400,"calories_high":650,"calories_estimate":530,"portion_description":"One synthetic bowl","confidence":"low","uncertainty":["Oil amount unknown"],"estimated_at":"2026-11-18T12:00:00.000Z"}') as valid_metadata_accepted,
 not public.gym_valid_photo_estimate('{"image":"not permitted"}') as image_payload_rejected;
