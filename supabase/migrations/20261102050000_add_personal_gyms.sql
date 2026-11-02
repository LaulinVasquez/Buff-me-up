create table public.gym_locations (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check (char_length(trim(name)) between 1 and 80),
 equipment text[] not null default '{}' check (cardinality(equipment)<=6 and equipment <@ array['Barbell','Bodyweight','Cable','Dumbbells','EZ Bar','Machine']),
 is_active boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index gym_locations_user_idx on public.gym_locations(user_id);
create unique index gym_locations_one_active on public.gym_locations(user_id) where is_active;
create table public.gym_exercise_notes (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 gym_id uuid not null references public.gym_locations(id) on delete cascade,
 exercise_key text not null check (char_length(exercise_key) between 1 and 160), exercise_name text not null check (char_length(trim(exercise_name)) between 1 and 160),
 machine_settings text not null default '' check (char_length(machine_settings)<=1000),
 notes text not null default '' check (char_length(notes)<=2000), preferred_exercise_id text check (char_length(preferred_exercise_id) between 1 and 160),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(gym_id,exercise_key)
);
create index gym_exercise_notes_user_idx on public.gym_exercise_notes(user_id);
alter table public.gym_locations enable row level security;
alter table public.gym_exercise_notes enable row level security;
revoke all on public.gym_locations, public.gym_exercise_notes from anon;
grant select,insert,update,delete on public.gym_locations,public.gym_exercise_notes to authenticated;
create policy gym_locations_owner on public.gym_locations for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy gym_exercise_notes_owner on public.gym_exercise_notes for all to authenticated using(user_id=(select auth.uid()) and exists(select 1 from public.gym_locations g where g.id=gym_id and g.user_id=(select auth.uid()))) with check(user_id=(select auth.uid()) and exists(select 1 from public.gym_locations g where g.id=gym_id and g.user_id=(select auth.uid())));
create trigger gym_locations_updated before update on public.gym_locations for each row execute function public.gym_set_updated_at();
create trigger gym_exercise_notes_updated before update on public.gym_exercise_notes for each row execute function public.gym_set_updated_at();

create function public.gym_save_location(target_gym_id uuid, expected_updated_at timestamptz, gym_name text, available_equipment text[])
returns uuid language plpgsql security invoker set search_path='' as $$
declare existing public.gym_locations; new_id uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 perform 1 from public.gym_profiles where id=auth.uid() for update;
 if not found then raise exception 'Profile not found'; end if;
 if target_gym_id is null then
  if (select count(*) from public.gym_locations where user_id=auth.uid())>=10 then raise exception 'You can save up to ten gyms'; end if;
  insert into public.gym_locations(user_id,name,equipment) values(auth.uid(),gym_name,available_equipment) returning id into new_id;
 else
  select * into existing from public.gym_locations where id=target_gym_id and user_id=auth.uid() for update;
  if existing.id is null then raise exception 'Gym not found'; end if;
  if expected_updated_at is distinct from existing.updated_at then raise exception 'Gym changed; refresh before saving'; end if;
  update public.gym_locations set name=gym_name,equipment=available_equipment where id=target_gym_id;
  new_id:=target_gym_id;
 end if;
 return new_id;
end;
$$;
create function public.gym_select_location(target_gym_id uuid)
returns void language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 perform 1 from public.gym_profiles where id=auth.uid() for update;
 if not found then raise exception 'Profile not found'; end if;
 if target_gym_id is not null and not exists(select 1 from public.gym_locations where id=target_gym_id and user_id=auth.uid()) then raise exception 'Gym not found'; end if;
 update public.gym_locations set is_active=false where user_id=auth.uid() and is_active;
 if target_gym_id is not null then update public.gym_locations set is_active=true where id=target_gym_id and user_id=auth.uid(); end if;
end;
$$;
create function public.gym_save_exercise_note(target_gym_id uuid, target_key text, display_name text, settings text, note_text text, preferred_id text, expected_updated_at timestamptz)
returns uuid language plpgsql security invoker set search_path='' as $$
declare existing public.gym_exercise_notes; new_id uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 perform 1 from public.gym_locations where id=target_gym_id and user_id=auth.uid() for update;
 if not found then raise exception 'Gym not found'; end if;
 select * into existing from public.gym_exercise_notes where gym_id=target_gym_id and exercise_key=target_key for update;
 if expected_updated_at is distinct from existing.updated_at then raise exception 'Notes changed; refresh before saving'; end if;
 if existing.id is null then
  insert into public.gym_exercise_notes(user_id,gym_id,exercise_key,exercise_name,machine_settings,notes,preferred_exercise_id) values(auth.uid(),target_gym_id,target_key,display_name,settings,note_text,preferred_id) returning id into new_id;
 else
  update public.gym_exercise_notes set exercise_name=display_name,machine_settings=settings,notes=note_text,preferred_exercise_id=preferred_id where id=existing.id returning id into new_id;
 end if;
 return new_id;
end;
$$;
revoke all on function public.gym_save_location(uuid,timestamptz,text,text[]),public.gym_select_location(uuid),public.gym_save_exercise_note(uuid,text,text,text,text,text,timestamptz) from public;
grant execute on function public.gym_save_location(uuid,timestamptz,text,text[]),public.gym_select_location(uuid),public.gym_save_exercise_note(uuid,text,text,text,text,text,timestamptz) to authenticated;
