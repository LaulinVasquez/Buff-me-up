-- Buff Me Up nutrition release, migrations 14–16. Generated; edit the source migrations.
-- Run ONCE after existing migrations 1–13, only when all three nutrition migrations are pending.
-- Do not combine this manual SQL path with an existing CLI migration history without reconciling it.
begin;
do $$ begin
 if to_regclass('public.gym_profiles') is null or to_regclass('public.gym_meals') is not null or to_regclass('public.gym_nutrition_preferences') is not null or to_regclass('public.gym_meal_plans') is not null then
  raise exception 'Expected existing Buff Me Up foundation and no previously applied nutrition tables. Use only pending individual migrations if partially applied.';
 end if;
end $$;

-- SOURCE: 20261104000000_add_nutrition_preferences.sql
create table public.gym_nutrition_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 age integer check(age between 18 and 120), height_cm numeric check(height_cm between 80 and 250), weight_kg numeric check(weight_kg between 20 and 400),
 activity text not null default 'moderate' check(activity in ('light','moderate','high')),
 goal text not null default 'support_training' check(goal in ('eat_consistently','support_training','maintain_energy')),
 diet text not null default 'omnivore' check(diet in ('omnivore','vegetarian','vegan','pescatarian')),
 allergens text[] not null default '{}' check(cardinality(allergens)<=9 and allergens <@ array['milk','egg','fish','shellfish','tree_nut','peanut','wheat','soy','sesame'] and array_position(allergens,null) is null),
 avoid_foods text[] not null default '{}' check(cardinality(avoid_foods)<=20 and array_position(avoid_foods,null) is null and char_length(array_to_string(avoid_foods,','))<=1300),
 usual_foods text not null default '' check(char_length(usual_foods)<=1500),
 cooking_minutes integer not null default 30 check(cooking_minutes between 5 and 180),
 budget text not null default 'moderate' check(budget in ('flexible','moderate','low')),
 calorie_target integer check(calorie_target between 1200 and 6000), ai_consent boolean not null default false,
 onboarding_status text not null default 'completed' check(onboarding_status in ('completed','skipped')),
 revision integer not null default 0 check(revision>=0), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.gym_nutrition_preferences enable row level security;
revoke all on public.gym_nutrition_preferences from anon;
grant select,insert,update,delete on public.gym_nutrition_preferences to authenticated;
create policy gym_nutrition_preferences_owner on public.gym_nutrition_preferences for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create function public.gym_nutrition_revision() returns trigger language plpgsql set search_path='' as $$
begin
 if new.user_id is distinct from old.user_id then raise exception 'Owner cannot change'; end if;
 new.revision:=old.revision+1; new.updated_at:=clock_timestamp(); new.created_at:=old.created_at;
 return new;
end;
$$;
create trigger gym_nutrition_preferences_revision before update on public.gym_nutrition_preferences for each row execute function public.gym_nutrition_revision();
create function public.gym_save_nutrition_preferences(preferences jsonb, expected_revision integer, skip_setup boolean default false)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare existing public.gym_nutrition_preferences; result public.gym_nutrition_preferences; key text;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 perform 1 from public.gym_profiles where id=auth.uid() for update;
 if not found then raise exception 'Profile not found'; end if;
 select * into existing from public.gym_nutrition_preferences where user_id=auth.uid() for update;
 if expected_revision is distinct from existing.revision then raise exception 'Nutrition preferences changed; reload before saving'; end if;
 if skip_setup is true then
  if existing.user_id is null then insert into public.gym_nutrition_preferences(user_id,onboarding_status) values(auth.uid(),'skipped') returning * into result;
  else update public.gym_nutrition_preferences set onboarding_status='skipped' where user_id=auth.uid() returning * into result; end if;
  return to_jsonb(result);
 end if;
 if jsonb_typeof(preferences) is distinct from 'object' then raise exception 'Invalid nutrition preferences'; end if;
 for key in select jsonb_object_keys(preferences) loop
  if not(key=any(array['age','height_cm','weight_kg','activity','goal','diet','allergens','avoid_foods','usual_foods','cooking_minutes','budget','calorie_target','ai_consent'])) then raise exception 'Invalid preference field'; end if;
 end loop;
 if (select count(*) from jsonb_object_keys(preferences))<>13 or jsonb_typeof(preferences->'allergens') is distinct from 'array' or jsonb_typeof(preferences->'avoid_foods') is distinct from 'array' or jsonb_typeof(preferences->'ai_consent') is distinct from 'boolean' then raise exception 'Invalid nutrition preferences'; end if;
 if exists(select 1 from jsonb_array_elements(preferences->'avoid_foods') item where jsonb_typeof(item)<>'string' or char_length(trim(item#>>'{}')) not between 1 and 64) then raise exception 'Invalid food exclusion'; end if;
 result:=jsonb_populate_record(null::public.gym_nutrition_preferences, preferences);
 insert into public.gym_nutrition_preferences(user_id,age,height_cm,weight_kg,activity,goal,diet,allergens,avoid_foods,usual_foods,cooking_minutes,budget,calorie_target,ai_consent,onboarding_status)
 values(auth.uid(),result.age,result.height_cm,result.weight_kg,result.activity,result.goal,result.diet,result.allergens,result.avoid_foods,result.usual_foods,result.cooking_minutes,result.budget,result.calorie_target,result.ai_consent,'completed')
 on conflict(user_id) do update set age=excluded.age,height_cm=excluded.height_cm,weight_kg=excluded.weight_kg,activity=excluded.activity,goal=excluded.goal,diet=excluded.diet,allergens=excluded.allergens,avoid_foods=excluded.avoid_foods,usual_foods=excluded.usual_foods,cooking_minutes=excluded.cooking_minutes,budget=excluded.budget,calorie_target=excluded.calorie_target,ai_consent=excluded.ai_consent,onboarding_status='completed' returning * into result;
 return to_jsonb(result);
end;
$$;
revoke all on function public.gym_save_nutrition_preferences(jsonb,integer,boolean) from public;
grant execute on function public.gym_save_nutrition_preferences(jsonb,integer,boolean) to authenticated;

-- SOURCE: 20261104010000_add_meals_and_food_logs.sql
create function public.gym_valid_nutrients(value jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare key text; amount jsonb;
begin
 if jsonb_typeof(value) is distinct from 'object' then return false; end if;
 if (select count(*) from jsonb_object_keys(value))<>6 or not(value ?& array['calories','protein','carbs','fat','fiber','sodium']) then return false; end if;
 for key,amount in select * from jsonb_each(value) loop
  if amount='null'::jsonb then continue; end if;
  if jsonb_typeof(amount)<>'number' then return false; end if;
  if (amount#>>'{}')::numeric<0 or (amount#>>'{}')::numeric>(case when key='calories' then 10000 else 100000 end) then return false; end if;
 end loop;
 return true;
end;
$$;
create function public.gym_nutrition_tags(value jsonb, allowed text[]) returns boolean language plpgsql immutable set search_path='' as $$
begin
 if jsonb_typeof(value) is distinct from 'array' then return false; end if;
 return not exists(select 1 from jsonb_array_elements(value) item where jsonb_typeof(item)<>'string' or not((item#>>'{}')=any(allowed))) and jsonb_array_length(value)=(select count(distinct item) from jsonb_array_elements(value) item);
end;
$$;
create function public.gym_valid_meal(value jsonb) returns boolean language plpgsql immutable set search_path='' as $$
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
create function public.gym_meal_nutrients(value jsonb) returns jsonb language plpgsql immutable set search_path='' as $$
declare key text; result jsonb:='{}'; amount numeric;
begin
 if not public.gym_valid_meal(value) then raise exception 'Invalid meal'; end if;
 if value->>'mode'='label' then return value->'nutrients'; end if;
 foreach key in array array['calories','protein','carbs','fat','fiber','sodium'] loop
  if exists(select 1 from jsonb_array_elements(value->'ingredients') item where item->'per100g'->key='null'::jsonb) then result:=result||jsonb_build_object(key,null);
  else
   select round(sum((item->'per100g'->>key)::numeric*(item->>'grams')::numeric/100)/(value->>'recipe_servings')::numeric,2) into amount from jsonb_array_elements(value->'ingredients') item;
   result:=result||jsonb_build_object(key,amount);
  end if;
 end loop;
 if not public.gym_valid_nutrients(result) then raise exception 'Meal nutrition exceeds supported ranges'; end if;
 return result;
end;
$$;
create table public.gym_meals (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null default '', details jsonb not null check(public.gym_valid_meal(details)), nutrients jsonb not null default '{}' check(public.gym_valid_nutrients(nutrients)),
 archived boolean not null default false, revision integer not null default 0 check(revision>=0), created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index gym_meals_owner_idx on public.gym_meals(user_id,archived,created_at);
alter table public.gym_meals enable row level security;
revoke all on public.gym_meals from anon;
grant select,insert,update on public.gym_meals to authenticated;
revoke delete on public.gym_meals from authenticated;
create policy gym_meals_owner on public.gym_meals for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create function public.gym_meal_before_save() returns trigger language plpgsql set search_path='' as $$
begin
 perform 1 from public.gym_profiles where id=new.user_id for update;
 if not found then raise exception 'Profile not found'; end if;
 if tg_op='INSERT' then
  if (select count(*) from public.gym_meals where user_id=new.user_id and not archived)>=100 and not new.archived then raise exception 'Archive a meal before adding more than 100'; end if;
  new.revision:=0;
 else
  if new.user_id is distinct from old.user_id then raise exception 'Owner cannot change'; end if;
  if old.archived and not new.archived and (select count(*) from public.gym_meals where user_id=new.user_id and not archived)>=100 then raise exception 'Archive a meal before restoring another'; end if;
  new.revision:=old.revision+1;new.created_at:=old.created_at;
 end if;
 new.updated_at:=clock_timestamp();new.name:=trim(new.details->>'name');new.nutrients:=public.gym_meal_nutrients(new.details);
 return new;
end;
$$;
create trigger gym_meals_before_save before insert or update on public.gym_meals for each row execute function public.gym_meal_before_save();
create function public.gym_save_meal(target_meal_id uuid,expected_revision integer,meal jsonb,archive boolean default false) returns jsonb language plpgsql security invoker set search_path='' as $$
declare existing public.gym_meals; result public.gym_meals;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 perform 1 from public.gym_profiles where id=auth.uid() for update;
 if not found then raise exception 'Profile not found'; end if;
 if target_meal_id is null then
  if expected_revision is not null or archive then raise exception 'Invalid new meal'; end if;
  insert into public.gym_meals(user_id,details)values(auth.uid(),meal)returning * into result;
 else
  select * into existing from public.gym_meals where id=target_meal_id and user_id=auth.uid() for update;
  if existing.id is null then raise exception 'Meal not found'; end if;
  if expected_revision is distinct from existing.revision then raise exception 'Meal changed; reload before saving'; end if;
  update public.gym_meals set details=coalesce(meal,existing.details),archived=archive where id=target_meal_id returning * into result;
 end if;
 return to_jsonb(result);
end;
$$;
create table public.gym_food_logs (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 meal_id uuid not null,meal_revision integer not null default 0,portions numeric not null check(portions between 0.1 and 10 and scale(portions)<=3),
 log_date date not null,meal_slot text not null check(meal_slot in ('breakfast','lunch','dinner','snack')),snapshot jsonb not null default '{}',
 request_id uuid not null,created_at timestamptz not null default now(),unique(user_id,request_id)
);
create index gym_food_logs_owner_date_idx on public.gym_food_logs(user_id,log_date desc,created_at desc);
alter table public.gym_food_logs enable row level security;
revoke all on public.gym_food_logs from anon;
grant select,insert,delete on public.gym_food_logs to authenticated;
revoke update on public.gym_food_logs from authenticated;
create policy gym_food_logs_owner on public.gym_food_logs for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create function public.gym_food_log_snapshot() returns trigger language plpgsql set search_path='' as $$
declare meal public.gym_meals;
begin
 perform 1 from public.gym_profiles where id=new.user_id for update;
 select * into meal from public.gym_meals where id=new.meal_id and user_id=new.user_id and not archived for share;
 if meal.id is null then raise exception 'Meal not found'; end if;
 if new.log_date<current_date-366 or new.log_date>current_date+1 then raise exception 'Choose a recent food-log date'; end if;
 new.meal_revision:=meal.revision;new.snapshot:=jsonb_build_object('name',meal.name,'details',meal.details,'nutrients',meal.nutrients);
 return new;
end;
$$;
create trigger gym_food_logs_snapshot before insert on public.gym_food_logs for each row execute function public.gym_food_log_snapshot();
create function public.gym_log_meal(target_meal_id uuid,expected_revision integer,servings numeric,consumed_on date,slot text,client_timezone text,request_token uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare existing public.gym_food_logs; meal public.gym_meals; result public.gym_food_logs;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 perform 1 from public.gym_profiles where id=auth.uid() for update;
 if not found then raise exception 'Profile not found'; end if;
 if client_timezone is null or not exists(select 1 from pg_timezone_names where name=client_timezone) then raise exception 'Invalid time zone'; end if;
 if consumed_on>(current_timestamp at time zone client_timezone)::date then raise exception 'Future food logs are not supported'; end if;
 select * into existing from public.gym_food_logs where user_id=auth.uid() and request_id=request_token;
 if existing.id is not null then
  if existing.meal_id is distinct from target_meal_id or existing.portions is distinct from servings or existing.log_date is distinct from consumed_on or existing.meal_slot is distinct from slot then raise exception 'Log request changed; use a new request'; end if;
  return to_jsonb(existing);
 end if;
 select * into meal from public.gym_meals where id=target_meal_id and user_id=auth.uid() and not archived for share;
 if meal.id is null then raise exception 'Meal not found'; end if;
 if expected_revision is distinct from meal.revision then raise exception 'Meal changed; reload before logging'; end if;
 insert into public.gym_food_logs(user_id,meal_id,portions,log_date,meal_slot,request_id)values(auth.uid(),target_meal_id,servings,consumed_on,slot,request_token)returning * into result;
 return to_jsonb(result);
end;
$$;
-- Bounded operational counters contain no meal names, prompts or tokens.
create table public.gym_nutrition_requests(user_id uuid not null references auth.users(id) on delete cascade,kind text not null check(kind in ('food','ai')),window_start timestamptz not null,used integer not null check(used between 1 and 120),primary key(user_id,kind));
alter table public.gym_nutrition_requests enable row level security;
revoke all on public.gym_nutrition_requests from anon,authenticated;
grant select on public.gym_nutrition_requests to authenticated;
create policy gym_nutrition_requests_owner on public.gym_nutrition_requests for select to authenticated using(user_id=(select auth.uid()));
create function public.gym_consume_nutrition_request(request_kind text) returns boolean language plpgsql security definer set search_path='' as $$
declare bucket timestamptz; cap integer; accepted integer;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if request_kind='food' then bucket:=date_trunc('hour',current_timestamp at time zone 'UTC') at time zone 'UTC';cap:=120;
 elsif request_kind='ai' then bucket:=date_trunc('day',current_timestamp at time zone 'UTC') at time zone 'UTC';cap:=10;
 else raise exception 'Invalid request kind'; end if;
 insert into public.gym_nutrition_requests(user_id,kind,window_start,used)values(auth.uid(),request_kind,bucket,1)
 on conflict(user_id,kind)do update set window_start=bucket,used=case when gym_nutrition_requests.window_start=bucket then gym_nutrition_requests.used+1 else 1 end
 where gym_nutrition_requests.window_start<>bucket or gym_nutrition_requests.used<cap returning used into accepted;
 return accepted is not null;
end;
$$;
revoke all on function public.gym_save_meal(uuid,integer,jsonb,boolean),public.gym_log_meal(uuid,integer,numeric,date,text,text,uuid),public.gym_consume_nutrition_request(text) from public;
grant execute on function public.gym_save_meal(uuid,integer,jsonb,boolean),public.gym_log_meal(uuid,integer,numeric,date,text,text,uuid),public.gym_consume_nutrition_request(text) to authenticated;

-- SOURCE: 20261104020000_add_personalized_meal_plans.sql
alter table public.gym_nutrition_preferences add column ai_consent_version text not null default '' check(ai_consent_version in ('','nutrition-choices-v1'));
create function public.gym_nutrition_consent_scope() returns trigger language plpgsql set search_path='' as $$
begin
 new.ai_consent_version:=case when new.ai_consent then 'nutrition-choices-v1' else '' end;
 return new;
end;
$$;
create trigger gym_nutrition_preferences_consent before insert or update on public.gym_nutrition_preferences for each row execute function public.gym_nutrition_consent_scope();
create function public.gym_meal_is_eligible(details jsonb,preferences public.gym_nutrition_preferences) returns boolean language plpgsql stable set search_path='' as $$
declare text_value text; tag text;
begin
 if not public.gym_valid_meal(details) or preferences.onboarding_status<>'completed' or details->>'reviewed'<>'true' then return false; end if;
 if exists(select 1 from jsonb_array_elements_text(details->'allergens') a where a=any(preferences.allergens)) then return false; end if;
 text_value:=lower((details->>'name')||' '||(details->>'ingredient_notes')||' '||coalesce((select string_agg(item->>'name',' ') from jsonb_array_elements(details->'ingredients') item),''));
 if exists(select 1 from unnest(preferences.avoid_foods) food where position(lower(food) in text_value)>0) then return false; end if;
 if preferences.diet='vegan' and not(details->'diet_tags' ? 'vegan') then return false; end if;
 if preferences.diet='vegetarian' and not(details->'diet_tags' ?| array['vegetarian','vegan']) then return false; end if;
 if preferences.diet='pescatarian' and not(details->'diet_tags' ?| array['pescatarian','vegetarian','vegan']) then return false; end if;
 if (details->>'cooking_minutes')::integer>preferences.cooking_minutes then return false; end if;
 if array_position(array['low','moderate','flexible'],details->>'budget')>array_position(array['low','moderate','flexible'],preferences.budget) then return false; end if;
 return true;
end;
$$;
create function public.gym_valid_meal_plan(value jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare entry jsonb; day integer; slot text;
begin
 if jsonb_typeof(value) is distinct from 'object' then return false; end if;
 if (select count(*) from jsonb_object_keys(value))<>4 or not(value ?& array['start_date','preference_revision','guidance_version','entries']) then return false; end if;
 if jsonb_typeof(value->'start_date') is distinct from 'string' or (value->>'start_date')!~'^\d{4}-\d{2}-\d{2}$' or to_char((value->>'start_date')::date,'YYYY-MM-DD')<>value->>'start_date' then return false; end if;
 if value->>'guidance_version' is distinct from 'dga-2025-2030-app-v1' or jsonb_typeof(value->'preference_revision') is distinct from 'number' or (value->>'preference_revision')::numeric<0 or (value->>'preference_revision')::numeric<>trunc((value->>'preference_revision')::numeric) or jsonb_typeof(value->'entries') is distinct from 'array' then return false; end if;
 if jsonb_array_length(value->'entries') not between 21 and 28 then return false; end if;
 for entry in select * from jsonb_array_elements(value->'entries') loop
  if jsonb_typeof(entry) is distinct from 'object' then return false; end if;
  if (select count(*) from jsonb_object_keys(entry))<>5 or not(entry ?& array['day','slot','meal_id','meal_revision','portions']) then return false; end if;
  if jsonb_typeof(entry->'day') is distinct from 'number' or (entry->>'day')::numeric not between 0 and 6 or (entry->>'day')::numeric<>trunc((entry->>'day')::numeric) then return false; end if;
  if jsonb_typeof(entry->'slot') is distinct from 'string' or not((entry->>'slot')=any(array['breakfast','lunch','dinner','snack'])) or jsonb_typeof(entry->'meal_id') is distinct from 'string' then return false; end if;
  perform (entry->>'meal_id')::uuid;
  if jsonb_typeof(entry->'meal_revision') is distinct from 'number' or (entry->>'meal_revision')::numeric<0 or (entry->>'meal_revision')::numeric<>trunc((entry->>'meal_revision')::numeric) then return false; end if;
  if jsonb_typeof(entry->'portions') is distinct from 'number' or (entry->>'portions')::numeric not between 0.5 and 3 or (entry->>'portions')::numeric*2<>trunc((entry->>'portions')::numeric*2) then return false; end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(value->'entries') e group by e->>'day',e->>'slot' having count(*)<>1) then return false; end if;
 for day in 0..6 loop
  foreach slot in array array['breakfast','lunch','dinner'] loop
   if not exists(select 1 from jsonb_array_elements(value->'entries') e where (e->>'day')::integer=day and e->>'slot'=slot) then return false; end if;
  end loop;
 end loop;
 return true;
exception when others then return false;
end;
$$;
create table public.gym_meal_plans (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(char_length(trim(name)) between 1 and 120), start_date date not null default current_date,
 preference_revision integer not null default 0,guidance_version text not null default 'dga-2025-2030-app-v1',draft jsonb not null check(public.gym_valid_meal_plan(draft)),snapshot jsonb not null default '{}',
 request_id uuid not null,created_at timestamptz not null default now(),unique(user_id,request_id)
);
create index gym_meal_plans_owner_date_idx on public.gym_meal_plans(user_id,start_date desc,created_at desc);
alter table public.gym_meal_plans enable row level security;
revoke all on public.gym_meal_plans from anon;
grant select,insert,delete on public.gym_meal_plans to authenticated;
revoke update on public.gym_meal_plans from authenticated;
create policy gym_meal_plans_owner on public.gym_meal_plans for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create function public.gym_meal_plan_snapshot() returns trigger language plpgsql set search_path='' as $$
declare preferences public.gym_nutrition_preferences; meal public.gym_meals; entry jsonb; entries jsonb:='[]';
begin
 perform 1 from public.gym_profiles where id=new.user_id for update;
 if not found then raise exception 'Profile not found'; end if;
 select * into preferences from public.gym_nutrition_preferences where user_id=new.user_id for share;
 if preferences.user_id is null or preferences.onboarding_status<>'completed' then raise exception 'Complete nutrition preferences first'; end if;
 if not public.gym_valid_meal_plan(new.draft) then raise exception 'Invalid meal plan'; end if;
 if preferences.revision<>(new.draft->>'preference_revision')::integer then raise exception 'Nutrition preferences changed; regenerate the plan'; end if;
 new.start_date:=(new.draft->>'start_date')::date;
 if new.start_date<current_date-1 or new.start_date>current_date+366 then raise exception 'Choose a current or upcoming plan start date'; end if;
 new.preference_revision:=preferences.revision;new.guidance_version:=new.draft->>'guidance_version';
 for entry in select * from jsonb_array_elements(new.draft->'entries') order by (value->>'day')::integer,array_position(array['breakfast','lunch','dinner','snack'],value->>'slot') loop
  select * into meal from public.gym_meals where id=(entry->>'meal_id')::uuid and user_id=new.user_id and not archived for share;
  if meal.id is null or meal.revision<>(entry->>'meal_revision')::integer then raise exception 'Meal changed; regenerate the plan'; end if;
  if meal.details->>'slot'<>entry->>'slot' or not public.gym_meal_is_eligible(meal.details,preferences) then raise exception 'Meal no longer matches your food preferences'; end if;
  entries:=entries||jsonb_build_array(entry||jsonb_build_object('meal',jsonb_build_object('id',meal.id,'name',meal.name,'details',meal.details,'nutrients',meal.nutrients,'revision',meal.revision)));
 end loop;
 new.snapshot:=jsonb_build_object('entries',entries,'preferences',jsonb_build_object('diet',preferences.diet,'allergens',preferences.allergens,'avoid_foods',preferences.avoid_foods,'calorie_target',preferences.calorie_target,'cooking_minutes',preferences.cooking_minutes,'budget',preferences.budget));
 return new;
end;
$$;
create trigger gym_meal_plans_snapshot before insert on public.gym_meal_plans for each row execute function public.gym_meal_plan_snapshot();
create function public.gym_save_meal_plan(plan_name text,plan jsonb,request_token uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare existing public.gym_meal_plans;result public.gym_meal_plans;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 perform 1 from public.gym_profiles where id=auth.uid() for update;
 if not found then raise exception 'Profile not found'; end if;
 select * into existing from public.gym_meal_plans where user_id=auth.uid() and request_id=request_token;
 if existing.id is not null then
  if existing.draft is distinct from plan or existing.name is distinct from trim(plan_name) then raise exception 'Plan request changed; use a new request'; end if;
  return to_jsonb(existing);
 end if;
 if (select count(*) from public.gym_meal_plans where user_id=auth.uid())>=100 then raise exception 'Remove an older plan before saving more than 100'; end if;
 insert into public.gym_meal_plans(user_id,name,draft,request_id) values(auth.uid(),trim(plan_name),plan,request_token)returning * into result;
 return to_jsonb(result);
end;
$$;
revoke all on function public.gym_save_meal_plan(text,jsonb,uuid) from public;
grant execute on function public.gym_save_meal_plan(text,jsonb,uuid) to authenticated;
-- Stable creation requests prevent duplicates after a response is lost in transit.
alter table public.gym_meals add column request_id uuid;
create unique index gym_meals_owner_request_idx on public.gym_meals(user_id,request_id) where request_id is not null;
create function public.gym_save_meal_with_request(target_meal_id uuid,expected_revision integer,meal jsonb,archive boolean,request_token uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare existing public.gym_meals;result public.gym_meals;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 perform 1 from public.gym_profiles where id=auth.uid() for update;
 if not found then raise exception 'Profile not found'; end if;
 if target_meal_id is not null then return public.gym_save_meal(target_meal_id,expected_revision,meal,archive); end if;
 if request_token is null or expected_revision is not null or archive is distinct from false then raise exception 'Invalid new meal request'; end if;
 select * into existing from public.gym_meals where user_id=auth.uid() and request_id=request_token;
 if existing.id is not null then
  if existing.details is distinct from meal or existing.archived then raise exception 'Meal request changed; reload your saved meals'; end if;
  return to_jsonb(existing);
 end if;
 insert into public.gym_meals(user_id,details,request_id)values(auth.uid(),meal,request_token)returning * into result;
 return to_jsonb(result);
end;
$$;
revoke all on function public.gym_save_meal_with_request(uuid,integer,jsonb,boolean,uuid) from public;
grant execute on function public.gym_save_meal_with_request(uuid,integer,jsonb,boolean,uuid) to authenticated;
revoke all on function public.gym_valid_nutrients(jsonb),public.gym_nutrition_tags(jsonb,text[]),public.gym_valid_meal(jsonb),public.gym_meal_nutrients(jsonb),public.gym_meal_is_eligible(jsonb,public.gym_nutrition_preferences),public.gym_valid_meal_plan(jsonb) from public;
grant execute on function public.gym_valid_nutrients(jsonb),public.gym_nutrition_tags(jsonb,text[]),public.gym_valid_meal(jsonb),public.gym_meal_nutrients(jsonb),public.gym_meal_is_eligible(jsonb,public.gym_nutrition_preferences),public.gym_valid_meal_plan(jsonb) to authenticated;

notify pgrst, 'reload schema';
commit;
