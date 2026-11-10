# Meal discovery, variety and preparation — 2026-11-10

## Plan committed before implementation

User reports that generated weeks repeat saved meals in the same slots every day and requests new suggestions suited to their needs, preparation prompts and styles such as vegan/meat lovers. Base: developer-merged PR #25 (`512a5fe`). Follow plan → implementation → meaningful checks → self-review → report → push review branch/draft PR. No remote SQL, merge, deployment or live-account/provider testing.

1. Add explicit Balanced, Vegan, Vegetarian, Pescatarian and Meat lovers styles, variety/meal-prep modes, and mixed/new/saved choice sources. Style is an additional filter; it cannot relax profile exclusions, diet, cooking time or budget. Retain unfinished inputs across reload.
2. Add an app-authored catalog of genuinely different recipes, gram-based ingredients, declared allergens/diet tags, cooking/budget estimates and practical preparation steps. Generate a week from compatible suggestions even with no saved meals. Optional cached USDA generic food matches provide attributed estimates; unmatched nutrients remain unknown and brand/ingredient review stays explicit. Never invent model nutrition or classify guesses as USDA.
3. Improve repeat control: use distinct choices before reuse, avoid adjacent repeats when alternatives exist, distinguish intentional batch preparation and expose honest variety/coverage limits. Personalize by existing food preferences, routine/training goal and optional user-entered target; do not derive a medical diet or energy deficit from measurements.
4. Show recipe ingredients, preparation steps, source/unknown nutrition and individual review before final save. Allow users to adapt a suggested recipe using the existing food search/editor. Save selected reviewed new recipes and the plan together with a new owner-scoped atomic, idempotent RPC; preserve stale checks, limits, RLS, historical snapshots and no automatic diary entries.
5. Extend the optional consented OpenAI request to choose from compatible saved/catalog meals with the requested style and variety/prep priorities. Use structured output and bounded supported preparation priorities, retain existing privacy minimization/quota/consent checks and explicit fallback. No free-form invented nutrient values or unsafe model cooking directions. Keep useful recipe planning available without AI.
6. Verify styles/restrictions, diverse weeks and intentional prep, zero saved meals, USDA matching/failure/unknowns, edits/reload/review invalidation, AI contract/failure handling and atomic SQL/retry/RLS/concurrency. Run full checks and actual-component phone/desktop synthetic acceptance. Deliver the exact forward Supabase SQL and configuration/staging report in a draft PR.

## Sources inspected

Official OpenAI structured output contract: https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses . FoodData Central API/search contract and attribution: https://fdc.nal.usda.gov/api-guide/ . Existing qualitative USDA/HHS guidance remains versioned in the planner. Preparation/storage guidance will link directly to USDA FSIS; app-authored recipes are not USDA-certified meal prescriptions.

## Boundaries

No change to user-selected exclusions, no forced meat/animal products for restricted profiles, no invented nutrient accuracy or allergen guarantees. Server-only provider credentials, no personal measurements/raw diary sent to AI, and no automatic/renewed consent. Original migrations remain unchanged; new SQL uses only gym_* schema. A preview is not a saved meal or food log. UI/API fallbacks remain usable without a paid provider.
