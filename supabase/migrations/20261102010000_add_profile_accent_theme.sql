-- Owner-scoped appearance preference. Existing profile RLS applies to this column.
alter table public.gym_profiles
  add column accent_theme text not null default 'lime'
  check (accent_theme in ('lime', 'ocean', 'purple', 'orange', 'rose'));
