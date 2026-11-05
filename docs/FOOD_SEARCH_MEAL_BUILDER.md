# Search foods to build a meal

Follow-up scope approved through the ongoing nutrition workflow, 2026-11-04. The main flow is search → select the right product/form → enter grams → add items → review/save the meal. Manual ingredients and whole-meal label entry remain available. The planner continues to select reviewed saved meals; the USDA food catalog supplies their composition, not complete personalized recipes.

## Bounded implementation plan

1. Make ingredient search the default for new meals; preserve existing saved entry modes.
2. Preview USDA composition, available branded ingredient lists and declared gram servings before adding an item. Keep unknown nutrients unknown and require actual grams for volume servings.
3. Copy available package ingredients into the existing meal notes so they persist in saved meals/log/plan snapshots and food-exclusion checks. Never silently truncate ingredient lists or infer allergen/diet safety.
4. Verify mixed USDA/manual recipe math, metadata limits, exclusions and provider failure/manual fallback; check phone/desktop rendering; run repository checks and open a draft review branch.

No new tables/columns/migrations or provider are needed. Existing nutrition migrations 14–16 and server-only USDA_FDC_API_KEY are prerequisites for live lookup. API keys belong in the app hosting environment, not Supabase SQL. No live account/provider/database operations are part of development verification.

Official schema: https://fdc.nal.usda.gov/api-guide/ . Branded records can supply an ingredient list and serving size, while generic records may omit them. The app still requires user review of current package ingredients/allergen/diet tags before planning.

## Verification and review

- PASS: lint, generated SQL drift check, production build, TypeScript and all 57 pure tests (14 nutrition tests). Three new tests cover product metadata/serving units, mixed searched/manual recipes with persistent exclusion notes and the detail response contract.
- PASS: full disposable PostgreSQL migration/RLS/snapshot/concurrency suite. The first run exposed an existing fixture assumption: PostgreSQL’s local current_date plus one may already be today in UTC. The UTC food-log fixture now sets/resets its session time zone explicitly; rerun passed. Application/database behavior and migration files are unchanged by that correction.
- PASS: actual components in an isolated synthetic preview: search → product details → label-serving preview (40 g = 152 kcal) → custom amount (50 g) → add → manual ingredient after provider error → two-serving recipe (145 kcal, protein unknown) → save/reload with package notes retained; no-match feedback and zero-quantity blocking also passed. Five widths (320, 390, 768, 1024, 1440) had no page overflow. Normal browser warning/error log was clear.
- Preview image and layout JSON are saved in this chat’s visualization artifacts. Temporary preview files were moved out of the repository and its server stopped before release checks. No preview/auth bypass is committed.
- Reviewed the official FoodData Central API/schema. No live USDA/OpenAI request or real Supabase read/write was used. Signed-in staging/provider/native-device acceptance remains pending. The app still needs USDA_FDC_API_KEY in the server/hosting environment and existing migrations 14–16; this update requires no new SQL.
