# Supabase and provider setup — nutrition release

Prepared 2026-11-04. The agent has not applied these changes to any remote database. Use the Supabase project connected to Buff Me Up. Its existing migrations 1–13 must already be present. New objects use the `gym_` prefix; no FlowDesk/Auth tables, sign-in configuration, API keys or storage buckets are changed by the SQL.

## Choose one migration path

### Existing SQL Editor workflow: all three nutrition migrations are pending

Open [the complete SQL bundle](../supabase/deploy/nutrition_2026_11_04.sql), copy its **entire contents**, and run it once in Supabase Dashboard → SQL Editor. It contains precisely migrations 14–16 in one transaction and refreshes the PostgREST schema. A guard rejects already-existing nutrition tables rather than overwriting data. Test in designated staging before rolling out the matching app version.

### Some nutrition migrations were already applied

Run only the remaining individual files, once, in this order:

| Order | Migration | Changes |
| --- | --- | --- |
| 14 | [20261104000000_add_nutrition_preferences.sql](../supabase/migrations/20261104000000_add_nutrition_preferences.sql) | New `gym_nutrition_preferences`: setup state, optional measurements, food preferences/exclusions, user-entered target, AI opt-in, revisions/RLS/save RPC. |
| 15 | [20261104010000_add_meals_and_food_logs.sql](../supabase/migrations/20261104010000_add_meals_and_food_logs.sql) | New `gym_meals`, `gym_food_logs`, `gym_nutrition_requests`; validated recipes, portion math, immutable historical snapshots, revision/idempotent log RPCs and request quotas. |
| 16 | [20261104020000_add_personalized_meal_plans.sql](../supabase/migrations/20261104020000_add_personalized_meal_plans.sql) | New `gym_meal_plans`; adds `ai_consent_version` to preferences and `request_id` to meals; reviewed-plan snapshots, stale/restriction checks, idempotent meal creation and scoped helper permissions. |

`gym_profiles` and existing workout tables do not require additional columns. Run the full SQL file, including policies, functions, grants and triggers. Creating tables alone is insufficient. Stop on any error; do not rerun successfully applied migrations blindly.

After the individual files, refresh API schema:

```sql
notify pgrst, 'reload schema';
```

### Existing Supabase CLI migration workflow

Continue that workflow with the committed migration files after checking the linked project and pending/history state. Do not run the convenience SQL bundle as well. Direct SQL Editor schema changes bypass CLI migration history; reconcile existing manual changes before a CLI push. See [Supabase migration guidance](https://supabase.com/docs/guides/deployment/database-migrations).

## Read-only checks

This inspects schema/RLS only; it does not read personal nutrition records:

```sql
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'gym_nutrition_preferences', 'gym_meals', 'gym_food_logs',
    'gym_nutrition_requests', 'gym_meal_plans'
  )
order by c.relname;
```

Expect five rows and `rls_enabled = true` on each.

```sql
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'gym_nutrition_preferences' and column_name = 'ai_consent_version')
    or (table_name = 'gym_meals' and column_name = 'request_id')
  )
order by table_name;
```

Expect `gym_meals.request_id` (uuid) and `gym_nutrition_preferences.ai_consent_version` (text).

## Optional server environment variables

Set these in `.env.local` for development or the hosting project's server environment for the relevant deployment. Do not paste real keys into chat, commit them or prefix them with `NEXT_PUBLIC_`. Restart/redeploy the matching server after configuring variables using your normal release process.

```dotenv
USDA_FDC_API_KEY=your_fooddata_central_key
OPENAI_API_KEY=your_openai_project_key
OPENAI_NUTRITION_MODEL=your_selected_structured_output_capable_model
```

- Obtain the USDA key through [FoodData Central's API guide](https://fdc.nal.usda.gov/api-guide/). Server food lookups cache public food records and handle provider/rate errors. Until configured, users can enter label/manual nutrition values and gram-based manual ingredients.
- OpenAI key/model are optional and separately configured. Select a supported model/project usage budget; the app deliberately has no model default or automatic provider signup. It limits AI attempts to ten per account per UTC day, bounds output/time and requires current scoped consent plus an explicit request. No live model/account call was made by the agent.
- The regular planner, saved meals and food logging operate without either external service. Nutrition data itself still needs the database migrations.
- `store:false` is sent with AI requests. It is not a promise of zero provider retention; provider account/data controls also apply. Only pre-screened aliases, meal names/types/tags, frequency counts and broad preferences are sent. Measurements, account identity, raw diary, raw habit notes and ingredient/allergen lists are excluded. See [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data).

## Staging acceptance before deployment

Use designated synthetic/test accounts: skip and complete setup; reload preferences; save a label meal and gram recipe; log 1.5 portions and retry a save; edit/archive the usual meal and verify old diary nutrition; create three reviewed meal types; generate/swap/review/save a seven-day plan; reload it and inspect shopping quantities; change preferences/meal in a second tab and verify stale saves reject. Check two-account isolation and export. With configured providers, verify USDA brand/cooked-form matches and AI opt-out, explicit request, invalid/refused/timeout fallback and quotas. Then verify phone/PWA/native navigation and network failures. No production data or remote schema was changed during development.

The bundle is generated from the three source migrations with `npm run sql:nutrition`; `npm run check:sql` rejects drift. Both individual migration and combined-bundle paths are verified using disposable local PostgreSQL, not the production service.
