begin;
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
commit;
