-- Forward repair: keep the existing RPC signature and caller permissions.
-- A recipe's JSON parameter collided with jsonb_array_elements' output column "value".
begin;
do $$ begin
 if to_regprocedure('public.gym_meal_nutrients(jsonb)') is null
  or to_regclass('public.gym_meal_plans') is null then
  raise exception 'Recipe repair requires nutrition migrations 14–16. Apply only pending nutrition migrations first.';
 end if;
end $$;
create or replace function public.gym_meal_nutrients(value jsonb)
returns jsonb language plpgsql immutable set search_path='' as $$
declare nutrient_key text; result jsonb := '{}'; amount numeric;
begin
 if not public.gym_valid_meal($1) then raise exception 'Invalid meal'; end if;
 if $1->>'mode'='label' then return $1->'nutrients'; end if;
 foreach nutrient_key in array array['calories','protein','carbs','fat','fiber','sodium'] loop
  if exists (
   select 1 from jsonb_array_elements($1->'ingredients') as ingredients(item)
   where ingredients.item->'per100g'->nutrient_key='null'::jsonb
  ) then
   result := result || jsonb_build_object(nutrient_key,null);
  else
   select round(sum((ingredients.item->'per100g'->>nutrient_key)::numeric
     * (ingredients.item->>'grams')::numeric / 100)
     / ($1->>'recipe_servings')::numeric,2)
   into amount from jsonb_array_elements($1->'ingredients') as ingredients(item);
   result := result || jsonb_build_object(nutrient_key,amount);
  end if;
 end loop;
 if not public.gym_valid_nutrients(result) then raise exception 'Meal nutrition exceeds supported ranges'; end if;
 return result;
end;
$$;
notify pgrst, 'reload schema';
commit;
