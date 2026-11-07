-- Prove the original migration fails on the same recipe; no application records needed.
begin;
set plpgsql.variable_conflict = error;
\ir fixtures/nutrition-recipe.sql
select test.assert(public.gym_valid_meal(:'recipe'::jsonb),'Pre-repair recipe is valid');
select test.assert_raises(format('select public.gym_meal_nutrients(%L)',:'recipe'),'column reference "value" is ambiguous');
rollback;
