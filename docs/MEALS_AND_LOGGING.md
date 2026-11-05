# Usual meals and food logging

Phase 2 of NUTRITION_IMPLEMENTATION_PLAN.md, implemented 2026-11-04 on `agent/meals-and-logging`, stacked on nutrition profile PR #17. Migration 15 (`20261104010000_add_meals_and_food_logs.sql`) adds `gym_meals`, `gym_food_logs` and owner-scoped operational request counters. Migration 14 is required first. No live SQL is executed by the agent.

## Experience

Meals → My usual meals supports create/edit/archive/restore. Enter package-label/manual per-serving values or compose up to 40 gram-based ingredients into 1–100 recipe servings. Blank nutrient fields remain unknown. Recipe totals are calculated independently in TypeScript and PostgreSQL; any missing ingredient value keeps that nutrient unknown. USDA details import per-100-g composition; household cups/milliliters are not silently converted to grams. Select cooked/raw form and brand explicitly.

Users review ingredients, dietary-pattern tags, allergen tags and qualitative food groups before a meal is eligible for suggestions. Changing details clears the UI review checkbox. This does not establish allergen/cross-contact safety; users check package labels. Unreviewed meals remain usable in the diary. Active-meal limit is 100; the UI loads up to 200 active/recent archived meals and labels its archive scope.

The diary logs 0.1–10 servings against a selected local calendar day and meal type. A retry token is retained across failed requests; repeated identical requests return the existing log. Changed content requires a new token. Owner/revision checks and snapshot creation run atomically under a profile/meal lock. Snapshot names, recipe/ingredient data and nullable nutrients remain unchanged after recipe edits/archival. Logs can be removed to correct mistakes. Dates use an explicit browser IANA time zone; future dates are rejected. Diary view covers recent 90 days, up to 1,000 logs; a visible message labels possible partial totals at that cap. Unlogged meals are not treated as zero food intake or complete diet assessments.

## USDA adapter

Authenticated `/api/nutrition/foods` and `/api/nutrition/foods/[foodId]` call server-only FoodData Central with `USDA_FDC_API_KEY`. Missing configuration, no matches, provider failures and quotas produce actionable feedback; manual entry stays available. The key never appears in browser responses or Git. USDA search/details are cached server-side (one day/seven days) and each upstream call has a seven-second timeout. Food lookups have an atomic per-account 120/hour request cap; upstream/shared-IP limits may still cause provider failures. No automatic aggressive retries. Operational counters store no food names/prompts and users cannot reset them directly.

The adapter accepts documented nutrient IDs and explicit compatible units (kcal, g, mg). Missing or incompatible values remain unknown. Food IDs, source and retrieval time are retained; no invented USDA fallback content is supplied. Official API and schema: https://fdc.nal.usda.gov/api-guide/ . Data is CC0/public domain; USDA attribution appears in lookup/diary.

## Verification / handoff

Pure tests cover nullable scaling, recipe math, invalid payloads, date validation, USDA search/detail nutrient formats, key containment, limits and failures. Local SQL tests cover owner/anonymous access, immutable snapshots, stale meal/log requests, archive behavior, duplicate retry protection and counter isolation/caps. Final aggregate/UI results are recorded in the batch report/session log. External provider and signed-in/native acceptance require configured staging; no live credential calls are claimed. Account export now includes preferences, meals and food logs with explicit nutrition-unit notes. Stored content does not include provider keys.

## Search-first meal builder — 2026-11-04

New meals now open with food/product search. Select a result to preview nutrition and any available package ingredient list, enter the grams used in the whole recipe (or use a declared gram serving), then add it. Multiple searched and manual ingredients can be combined; recipe servings determine each portion’s nutrition. Existing saved label meals retain their entry mode. Manual ingredients and whole-meal label entry remain available when the catalog has no match or the provider is unavailable.

Available branded ingredient lists are copied, with source/food identity, into the existing ingredient_notes field and therefore saved with meal/log/plan snapshots and included in avoided-food matching. Import refuses to overflow the 2,500-character field rather than silently truncating ingredient lists. These are editable meal notes: review them after changing/removing ingredients. Allergen/diet tags still require review; API ingredients do not establish cross-contact safety. Brand, food ID and retrieved composition are retained; missing nutrients remain unknown. Food detail cache uses a new version for the preview response. No new database migration is needed beyond nutrition migrations 14–16.

See FOOD_SEARCH_MEAL_BUILDER.md for scope, checks and provider activation.
