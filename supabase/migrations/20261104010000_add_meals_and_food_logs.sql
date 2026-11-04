begin;
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
commit;
