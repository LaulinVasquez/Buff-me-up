-- Apply once after migrations 1–18. Existing meals/snapshots and text-only consent stay unchanged.
begin;
create function public.gym_valid_photo_estimate(value jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare item jsonb; key text; amount numeric;
begin
 if jsonb_typeof($1) is distinct from 'object' or (select count(*) from jsonb_object_keys($1))<>8
  or not($1 ?& array['version','calories_low','calories_high','calories_estimate','portion_description','confidence','uncertainty','estimated_at']) then return false; end if;
 if $1->>'version' is distinct from 'photo-v1' then return false; end if;
 foreach key in array array['calories_low','calories_high','calories_estimate'] loop
  if jsonb_typeof($1->key) is distinct from 'number' then return false; end if;
  amount:=($1->>key)::numeric;
  if amount<>trunc(amount) or amount<0 or amount>(case when key='calories_estimate' then 10000 else 30000 end) then return false; end if;
 end loop;
 if ($1->>'calories_high')::numeric<=($1->>'calories_low')::numeric
  or ($1->>'calories_estimate')::numeric not between ($1->>'calories_low')::numeric and ($1->>'calories_high')::numeric
  or jsonb_typeof($1->'portion_description') is distinct from 'string' or char_length(trim($1->>'portion_description')) not between 1 and 200
  or jsonb_typeof($1->'confidence') is distinct from 'string' or not(($1->>'confidence')=any(array['low','medium']))
  or jsonb_typeof($1->'estimated_at') is distinct from 'string' or char_length($1->>'estimated_at')>40 or ($1->>'estimated_at')!~'^\d{4}-\d{2}-\d{2}T'
  or jsonb_typeof($1->'uncertainty') is distinct from 'array' or jsonb_array_length($1->'uncertainty') not between 1 and 4 then return false; end if;
 if to_char(($1->>'estimated_at')::timestamptz at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') is distinct from $1->>'estimated_at' then return false; end if;
 for item in select notes.item from jsonb_array_elements($1->'uncertainty') as notes(item) loop
  if jsonb_typeof(item) is distinct from 'string' or char_length(trim(item#>>'{}')) not between 1 and 180 then return false; end if;
 end loop;
 return true;
exception when others then return false;
end;
$$;
create function public.gym_valid_meal_core(value jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare ingredient jsonb; key text;
begin
 if jsonb_typeof(value) is distinct from 'object' then return false; end if;
 if (select count(*) from jsonb_object_keys(value))<>14 or not(value ?& array['name','slot','mode','recipe_servings','ingredients','nutrients','ingredient_notes','food_groups','diet_tags','allergens','reviewed','cooking_minutes','budget','notes']) then return false; end if;
 foreach key in array array['slot','mode','budget'] loop if jsonb_typeof(value->key) is distinct from 'string' then return false; end if; end loop;
 if jsonb_typeof(value->'name') is distinct from 'string' or char_length(trim(value->>'name')) not between 1 and 120 or not((value->>'slot')=any(array['breakfast','lunch','dinner','snack'])) or not((value->>'mode')=any(array['label','recipe'])) or not((value->>'budget')=any(array['low','moderate','flexible'])) then return false; end if;
 if jsonb_typeof(value->'recipe_servings') is distinct from 'number' or (value->>'recipe_servings')::numeric<>trunc((value->>'recipe_servings')::numeric) or (value->>'recipe_servings')::numeric not between 1 and 100 then return false; end if;
 if jsonb_typeof(value->'cooking_minutes') is distinct from 'number' or (value->>'cooking_minutes')::numeric<>trunc((value->>'cooking_minutes')::numeric) or (value->>'cooking_minutes')::numeric not between 0 and 180 then return false; end if;
 if jsonb_typeof(value->'reviewed') is distinct from 'boolean' or not public.gym_valid_nutrients(value->'nutrients') or jsonb_typeof(value->'ingredients') is distinct from 'array' then return false; end if;
 if jsonb_array_length(value->'ingredients')>40 or ((value->>'mode')='recipe' and jsonb_array_length(value->'ingredients')=0) or ((value->>'mode')='label' and jsonb_array_length(value->'ingredients')<>0) then return false; end if;
 if jsonb_typeof(value->'notes') is distinct from 'string' or char_length(value->>'notes')>1500 or jsonb_typeof(value->'ingredient_notes') is distinct from 'string' or char_length(value->>'ingredient_notes')>2500 then return false; end if;
 if not public.gym_nutrition_tags(value->'food_groups',array['vegetables','fruit','whole_grains','protein','dairy_or_fortified_alternative']) or not public.gym_nutrition_tags(value->'diet_tags',array['omnivore','vegetarian','vegan','pescatarian']) or not public.gym_nutrition_tags(value->'allergens',array['milk','egg','fish','shellfish','tree_nut','peanut','wheat','soy','sesame']) then return false; end if;
 for ingredient in select * from jsonb_array_elements(value->'ingredients') loop
  if jsonb_typeof(ingredient) is distinct from 'object' then return false; end if;
  if (select count(*) from jsonb_object_keys(ingredient))<>6 or not(ingredient ?& array['name','grams','per100g','source','fdc_id','retrieved_at']) then return false; end if;
  if jsonb_typeof(ingredient->'name') is distinct from 'string' or char_length(trim(ingredient->>'name')) not between 1 and 200 or jsonb_typeof(ingredient->'grams') is distinct from 'number' then return false; end if;
  if (ingredient->>'grams')::numeric<=0 or (ingredient->>'grams')::numeric>10000 or not public.gym_valid_nutrients(ingredient->'per100g') then return false; end if;
  if ingredient->>'source'='usda' then
   if jsonb_typeof(ingredient->'fdc_id') is distinct from 'number' or (ingredient->>'fdc_id')::numeric<=0 or (ingredient->>'fdc_id')::numeric<>trunc((ingredient->>'fdc_id')::numeric) or jsonb_typeof(ingredient->'retrieved_at') is distinct from 'string' then return false; end if;
   perform (ingredient->>'retrieved_at')::timestamptz;
  elsif ingredient->>'source'='manual' then
   if ingredient->'fdc_id'<>'null'::jsonb or ingredient->'retrieved_at'<>'null'::jsonb then return false; end if;
  else return false; end if;
 end loop;
 return true;
exception when others then return false;
end;
$$;

create or replace function public.gym_valid_meal(value jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
begin
 if jsonb_typeof($1) is distinct from 'object' then return false; end if;
 if $1 ? 'photo_estimate' then
  if $1->>'mode' is distinct from 'label' or $1->'recipe_servings' is distinct from '1'::jsonb or not public.gym_valid_photo_estimate($1->'photo_estimate') then return false; end if;
  return public.gym_valid_meal_core($1-'photo_estimate');
 end if;
 return public.gym_valid_meal_core($1);
end;
$$;
revoke all on function public.gym_valid_photo_estimate(jsonb),public.gym_valid_meal_core(jsonb) from public;
grant execute on function public.gym_valid_photo_estimate(jsonb),public.gym_valid_meal_core(jsonb) to authenticated;

alter table public.gym_nutrition_requests drop constraint gym_nutrition_requests_kind_check;
alter table public.gym_nutrition_requests add constraint gym_nutrition_requests_kind_check check(kind in ('food','ai','photo'));
create or replace function public.gym_consume_nutrition_request(request_kind text) returns boolean language plpgsql security definer set search_path='' as $$
declare bucket timestamptz; cap integer; accepted integer;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if request_kind='food' then bucket:=date_trunc('hour',current_timestamp at time zone 'UTC') at time zone 'UTC';cap:=120;
 elsif request_kind='ai' then bucket:=date_trunc('day',current_timestamp at time zone 'UTC') at time zone 'UTC';cap:=10;
 elsif request_kind='photo' then bucket:=date_trunc('day',current_timestamp at time zone 'UTC') at time zone 'UTC';cap:=5;
 else raise exception 'Invalid request kind'; end if;
 insert into public.gym_nutrition_requests(user_id,kind,window_start,used)values(auth.uid(),request_kind,bucket,1)
 on conflict(user_id,kind)do update set window_start=bucket,used=case when gym_nutrition_requests.window_start=bucket then gym_nutrition_requests.used+1 else 1 end
 where gym_nutrition_requests.window_start<>bucket or gym_nutrition_requests.used<cap returning used into accepted;
 return accepted is not null;
end;
$$;

notify pgrst,'reload schema';
commit;
