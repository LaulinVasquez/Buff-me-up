-- Apply after migrations 1–17. New recipes and the reviewed week commit together.
begin;
create function public.gym_valid_planning_options(options jsonb) returns boolean
language sql immutable set search_path='' as $$
 select case when jsonb_typeof($1) is distinct from 'object' then false else coalesce((select count(*) from jsonb_object_keys($1))=4
  and $1 ?& array['style','mode','source','use_target']
  and jsonb_typeof($1->'style')='string' and $1->>'style'=any(array['balanced','vegan','vegetarian','pescatarian','meat_lovers'])
  and jsonb_typeof($1->'mode')='string' and $1->>'mode'=any(array['variety','meal_prep'])
  and jsonb_typeof($1->'source')='string' and $1->>'source'=any(array['mixed','suggestions','saved'])
  and jsonb_typeof($1->'use_target')='boolean',false) end;
$$;
revoke all on function public.gym_valid_planning_options(jsonb) from public;
grant execute on function public.gym_valid_planning_options(jsonb) to authenticated;
alter table public.gym_meal_plans
 add column planning_options jsonb not null default '{"style":"balanced","mode":"variety","source":"saved","use_target":false}'::jsonb check(public.gym_valid_planning_options(planning_options)),
 add column preparation_priorities text[] not null default '{}' check(cardinality(preparation_priorities)<=5 and preparation_priorities <@ array['wash_produce','batch_grains','portion_ingredients','midweek_refresh','freeze_later_portions']),
 add column request_fingerprint text check(request_fingerprint ~ '^[a-f0-9]{64}$');

create function public.gym_save_discovery_meal_plan(plan_name text,plan jsonb,proposed_meals jsonb,options jsonb,preparation jsonb,request_token uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare existing public.gym_meal_plans; result public.gym_meal_plans; preferences public.gym_nutrition_preferences;
 proposal jsonb; entry jsonb; saved jsonb; meal public.gym_meals; mapping jsonb:='{}'; normalized jsonb; entries jsonb:='[]';
 fingerprint text; priorities text[]; proposal_key text; meal_key text;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if request_token is null or plan_name is null or char_length(trim(plan_name)) not between 1 and 120
  or plan is null or jsonb_typeof(plan) is distinct from 'object' or char_length(plan::text)>30000
  or proposed_meals is null or jsonb_typeof(proposed_meals) is distinct from 'array' or jsonb_array_length(proposed_meals)>28 or char_length(proposed_meals::text)>200000
  or options is null or not public.gym_valid_planning_options(options)
  or preparation is null or jsonb_typeof(preparation) is distinct from 'array' or jsonb_array_length(preparation)>5 then raise exception 'Invalid discovery plan request'; end if;
 if exists(select 1 from jsonb_array_elements(preparation) as tips(item) where jsonb_typeof(tips.item)<>'string'
  or not((tips.item#>>'{}')=any(array['wash_produce','batch_grains','portion_ingredients','midweek_refresh','freeze_later_portions'])))
  or jsonb_array_length(preparation)<>(select count(distinct tips.item) from jsonb_array_elements(preparation) as tips(item)) then raise exception 'Invalid preparation priorities'; end if;
 select coalesce(array_agg(tips.item#>>'{}' order by tips.ordinality),'{}'::text[]) into priorities from jsonb_array_elements(preparation) with ordinality as tips(item,ordinality);
 fingerprint:=encode(sha256(convert_to(jsonb_build_object('name',trim(plan_name),'plan',plan,'meals',proposed_meals,'options',options,'preparation',preparation)::text,'UTF8')),'hex');
 perform 1 from public.gym_profiles where id=auth.uid() for update;
 if not found then raise exception 'Profile not found'; end if;
 select * into existing from public.gym_meal_plans where user_id=auth.uid() and request_id=request_token;
 if existing.id is not null then
  if existing.request_fingerprint is distinct from fingerprint then raise exception 'Plan request changed; use a new request'; end if;
  return to_jsonb(existing);
 end if;
 select * into preferences from public.gym_nutrition_preferences where user_id=auth.uid() for share;
 if preferences.user_id is null or preferences.onboarding_status<>'completed' then raise exception 'Complete nutrition preferences first'; end if;
 if jsonb_typeof(plan->'preference_revision') is distinct from 'number' or (plan->>'preference_revision')::numeric<>preferences.revision then raise exception 'Nutrition preferences changed; regenerate the plan'; end if;
 if (options->>'style'='meat_lovers' and preferences.diet<>'omnivore')
  or (options->>'style'='pescatarian' and preferences.diet=any(array['vegan','vegetarian'])) then raise exception 'Plan style conflicts with saved food preferences'; end if;
 if jsonb_typeof(plan->'entries') is distinct from 'array' or jsonb_array_length(plan->'entries') not between 21 and 28 then raise exception 'Invalid meal plan'; end if;
 -- Validate the original shape before replacing aliases; replacement must not sanitize bad revisions.
 for entry in select choices.item from jsonb_array_elements(plan->'entries') as choices(item) loop
  if jsonb_typeof(entry) is distinct from 'object' then raise exception 'Invalid meal plan'; end if;
  if entry->>'meal_id' like 'suggestion:%' then entry:=jsonb_set(entry,'{meal_id}','"00000000-0000-0000-0000-000000000000"'::jsonb); end if;
  entries:=entries||jsonb_build_array(entry);
 end loop;
 if not public.gym_valid_meal_plan(jsonb_set(plan,'{entries}',entries)) then raise exception 'Invalid meal plan'; end if;
 entries:='[]';
 if (select count(*) from public.gym_meal_plans where user_id=auth.uid())>=100 then raise exception 'Remove an older plan before saving more than 100'; end if;
 if options->>'source'='saved' and jsonb_array_length(proposed_meals)>0 then raise exception 'Saved-only plan cannot add suggestions'; end if;
 for proposal in select proposals.item from jsonb_array_elements(proposed_meals) as proposals(item) loop
  if jsonb_typeof(proposal) is distinct from 'object' or (select count(*) from jsonb_object_keys(proposal))<>2 or not(proposal ?& array['key','details'])
   or jsonb_typeof(proposal->'key') is distinct from 'string' then raise exception 'Invalid recipe suggestion'; end if;
  proposal_key:=proposal->>'key';
  if proposal_key!~'^suggestion:[a-z0-9-]{1,48}$' or mapping ? proposal_key
   or not exists(select 1 from jsonb_array_elements(plan->'entries') as choices(item) where choices.item->>'meal_id'=proposal_key)
   or not public.gym_meal_is_eligible(proposal->'details',preferences) then raise exception 'Recipe suggestion needs a compatible ingredient review'; end if;
  -- Reuse an identical active reviewed recipe across weeks. Never overwrite an edited recipe.
  select * into meal from public.gym_meals where user_id=auth.uid() and not archived
   and details=proposal->'details' order by created_at,id limit 1 for share;
  if meal.id is not null then saved:=to_jsonb(meal);
  else saved:=public.gym_save_meal_with_request(null,null,proposal->'details',false,md5(request_token::text||':'||proposal_key)::uuid); end if;
  mapping:=mapping||jsonb_build_object(proposal_key,saved);
 end loop;
 for entry in select choices.item from jsonb_array_elements(plan->'entries') as choices(item) loop
  if jsonb_typeof(entry) is distinct from 'object' then raise exception 'Invalid meal plan'; end if;
  meal_key:=entry->>'meal_id';
  if meal_key like 'suggestion:%' then
   if not(mapping ? meal_key) or (entry->>'meal_revision')::numeric is distinct from 0::numeric then raise exception 'Review each selected recipe suggestion'; end if;
   saved:=mapping->meal_key;
   entry:=jsonb_set(jsonb_set(entry,'{meal_id}',saved->'id'),'{meal_revision}',saved->'revision');
  end if;
  select * into meal from public.gym_meals where id=(entry->>'meal_id')::uuid and user_id=auth.uid() and not archived for share;
  if meal.id is null then raise exception 'Meal not found'; end if;
  if (options->>'style'='vegan' and not(meal.details->'diet_tags' ? 'vegan'))
   or (options->>'style'='vegetarian' and not(meal.details->'diet_tags' ?| array['vegan','vegetarian']))
   or (options->>'style'='pescatarian' and not(meal.details->'diet_tags' ?| array['vegan','vegetarian','pescatarian'])) then raise exception 'Meal does not match requested plan style'; end if;
  entries:=entries||jsonb_build_array(entry);
 end loop;
 normalized:=jsonb_set(plan,'{entries}',entries);
 -- Existing canonical trigger rechecks dates, exact shape, revisions, slots, portions and exclusions.
 insert into public.gym_meal_plans(user_id,name,draft,request_id,planning_options,preparation_priorities,request_fingerprint)
 values(auth.uid(),trim(plan_name),normalized,request_token,options,priorities,fingerprint) returning * into result;
 return to_jsonb(result);
end;
$$;
revoke all on function public.gym_save_discovery_meal_plan(text,jsonb,jsonb,jsonb,jsonb,uuid) from public;
grant execute on function public.gym_save_discovery_meal_plan(text,jsonb,jsonb,jsonb,jsonb,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
