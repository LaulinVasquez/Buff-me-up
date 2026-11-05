# Ingredient search layout — 2026-11-04

User request: improve ingredient search presentation after configuring the USDA key, and check photo availability. Branch agent/ingredient-search-layout starts from origin/main 4900843 after the developer merged meal-builder PR #20.

## Changes

- Food cards show food/product identity, brand, plain-language source badge, decorative food/package icon, available per-100-g calories/protein and a clear selection action. One column on phones, two on wider screens; names and missing data wrap without cutting off cooked/raw forms.
- Selected ingredients have clearer weight/gram-serving controls, a portion-adjusted calorie/macro summary, expanded readable package ingredients and a full-width add button. The detail panel uses two columns where space permits.
- Search clear, loading skeletons with reduced-motion support, initial/empty/error feedback, result count/page position and visible keyboard focus. Choosing a result focuses the amount; returning focuses the previous card; clearing focuses the search input.
- Search nutrient previews reuse the existing USDA search response. They require no per-result detail requests; incompatible/missing values remain unknown and genuine zero stays zero. Search cache version is updated for the enriched response.
- Existing manual fallback, imported notes, nullable totals and saved meal/snapshot contracts remain unchanged. No new SQL, environment variable, package or provider.

## Pictures

The documented USDA FoodData Central search/detail schemas do not contain a product-photo field. Source: https://fdc.nal.usda.gov/api-guide/ and its linked JSON specification https://api.nal.usda.gov/fdc/v1/json-spec?api_key=DEMO_KEY . Simple code-native icons are decorative, not product photos.

Open Food Facts documents product front/ingredient/nutrition photos through selected_images, with coverage varying by product: https://openfoodfacts.github.io/openfoodfacts-server/api/how-to-download-images/ . A future integration would require exact barcode/product matching, image attribution/licensing, caching and image-failure fallbacks. It is not added as an unverified image source in this update.

The user reports the USDA key is configured in Vercel. Development checks use synthetic data and never inspect or transmit that key. Live Vercel/provider and physical-device acceptance remain separate from synthetic checks. Verification and review references follow below.

## Verification

`npm run check` PASS: lint, generated SQL drift, production build, sequential TypeScript, all 58 pure/contract tests (15 nutrition) and full disposable PostgreSQL migration/RLS/snapshot/concurrency suite. The new adapter regression checks one search request only, known/zero/missing or incompatible-unit nutrient values, invalid IDs and key containment.

Synthetic actual-component browser checks PASS: six result cards with long branded/generic names and known/zero/missing values; both pagination directions; clear/selection/back focus; unknown details; 0-g blocking; gram-serving shortcut; no-match/provider failure with manual fallback; 50-g recipe import across two servings (95 kcal, 2.5 g protein), saved notes and reload. Fifteen view/width combinations (results/known details/unknown details × 320/390/768/1024/1440) had no overflow. Normal console clear. Phone result/detail and desktop result screenshots plus layout JSON are retained in this chat’s visualization artifacts. The temporary synthetic server is stopped and fixture is outside the repository; no auth bypass or test route is committed.

No live key/provider/database access, remote SQL, merge or deployment. User-configured Vercel/provider and physical-device acceptance remain unverified. Review reference follows after PR creation.

Review: [draft PR #21](https://github.com/LaulinVasquez/Buff-me-up/pull/21), branch `agent/ingredient-search-layout`, implementation `de907c8`.
