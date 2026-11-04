begin;
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
commit;
