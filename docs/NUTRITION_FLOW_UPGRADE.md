# Guided meal planning and product information

Prepared 2026-11-06. User requested a food API comparison with product pictures, a Generate action that creates a plan or takes the user through questions, and feet/inches/pounds measurement options. Base: main 8ea3319, after developer merge of PR #21. Follow the previously read development workflow; the former untracked guide is absent.

## Implementation sequence

1. Add metric/imperial measurement controls. Keep canonical cm/kg in existing preference fields; remember only presentation units in this browser. Preserve exact stored values when switching units without editing.
2. Add planner readiness checks and a dedicated setup flow. Generate immediately prepares a draft for eligible reviewed meals; otherwise route to preference questions and clearly identified missing meal types. Preserve start date/snack selection, guide meal entry/review, and create the draft once the required meals are ready. Keep exclusion, stale-write and explicit plan-save checks.
3. Add optional Open Food Facts photo enrichment for selected USDA products using exact validated barcodes. Keep USDA nutrient values and manual fallback. Bound/cache external calls, show attribution and handle missing/mismatched/broken images without blocking meal entry. No fuzzy photo matches or photo-derived nutrition.
4. Verify conversion and readiness edge cases, provider/image failure paths, actual phone/desktop flows, and full repository checks. Commit/push a review branch and draft PR. No merge, deployment, remote SQL, production-data access or paid-provider signup.

## API comparison

| Provider | Useful information | Images and practical fit |
| --- | --- | --- |
| USDA FoodData Central | Generic foods and branded label composition, ingredients and product identifiers | Existing integration; documented API has no product-photo field. Retain for recipe nutrient calculations. |
| Open Food Facts | Community-contributed packaged-food identity, ingredients, label nutrients and barcodes | Product/label photos and keyless public reads. Recommended complement for exact-code photos; completeness and accuracy vary. Read v3 API is current; cached lookups and published rate limits matter. |
| Nutritionix | Branded/restaurant item data and image metadata | Commercial credentials/terms require owner evaluation before adopting. No account or paid service was created. |
| Edamam | Generic/branded food lookup and image-related features | Credentials, plan limits and attribution requirements make this a separate vendor decision. No account or paid service was created. |

Primary documentation:
- https://fdc.nal.usda.gov/api-guide/
- https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/
- https://openfoodfacts.github.io/openfoodfacts-server/api/how-to-download-images/
- https://openfoodfacts.github.io/openfoodfacts-server/api/ref-barcode-normalization/
- https://developer.nutritionix.com/docs/v2/item
- https://developer.edamam.com/food-database-api

Open Food Facts data uses ODbL/Database Contents licensing; photos use CC BY-SA. This implementation displays attributed photos separately rather than replacing or silently mixing nutrient records. Owner should complete Open Food Facts' API usage form and configure the photo feature before production use. Its documented read-product limit is 15/min/IP and search limit 10/min/IP; this feature performs no OFF text search and no per-result fan-out.

No new Supabase SQL is planned. Existing nutrition migrations 14–16 remain required. Product photos are optional and separately enabled on the server; no new paid API key is required. Live provider/real-account/physical-phone acceptance will be reported separately from synthetic and local database checks.

## Delivered behavior and configuration

Generate sends accounts with completed preferences and eligible reviewed meals directly to a regular seven-day draft. Otherwise `/app/nutrition/plan/setup` asks for food preferences, then identifies required breakfast/lunch/dinner (and selected snack) choices. Saving the last eligible meal automatically prepares the draft. Start date and snack choice are preserved. Incompatible meals show the existing exclusion/time/budget/review reason; they never count as ready. A regular automatic draft never turns on AI sharing. Saving a plan still requires explicit review, and does not log food as eaten.

Height offers feet/inches or cm; weight offers pounds or kg. The existing account fields remain cm/kg, unchanged values survive unit switching without rounding drift, and blank measurements remain optional. Only display-unit choices are remembered in browser storage. There is no new measurement schema or AI payload field.

USDA search/detail responses retain valid UPC/GTIN and prefer the retail brand. Selecting a barcode-bearing product can load a separate attributed Open Food Facts front photo. Unknown, invalid, mismatched, unavailable and broken images leave gram entry and Add to meal available. Neither photos nor Open Food Facts nutrients are stored in meals/logs/plans.

For the optional photos, complete the provider's [usage setup](https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/#before-you-start), then add `OPEN_FOOD_FACTS_PHOTOS_ENABLED=true` in the desired Vercel environment and deploy the reviewed branch. `OPEN_FOOD_FACTS_USER_AGENT` can identify your app/contact; default identifies the public project. No additional paid API key. Disabled by default until configured. Existing USDA/AI environment variables are unchanged.

Photo metadata is cached for 24 hours, with a 3.5-second timeout, no automatic retries, account food quotas and a 12-uncached-lookups/minute bound per server instance. This is not a distributed per-IP limiter: validate shared-egress/multi-instance capacity against the provider's 15/min/IP limit before enabling at scale. Provider downtime or a limit results in no photo rather than blocking food entry.

## Verification and acceptance

Targeted nutrition tests cover canonical conversions/invalid input, missing setup/slots, reviewed/allergen/archived eligibility, fixed local flow URLs, exact/check-digit barcodes, trusted image origins, source attribution, missing/mismatched/provider-limit responses, request bounds and unchanged saved ingredient fields.

Actual components were exercised in an isolated synthetic preview: Generate → preference questions → missing dinner; 5 ft 10 in / 180 lb saved as 177.8 cm / 81.646627 kg; reload, metric switching and unchanged re-save retained those canonical values; a searched, reviewed dinner triggered one regular draft automatically, preserving November 10 start; explicit plan save succeeded; ready meals generated directly. Existing synthetic food logs were unchanged. Selected product photo/attribution rendered; broken photo and no barcode showed fallback with Add enabled. Plan review fits 320/390/768/1024/1440 px without horizontal overflow; measurements fit 320/768/1440. Normal console clear before the intentional broken-image case. Preview used synthetic package art and local catalog/actions, not provider or real account calls. Temporary fixture was moved outside the repository and its server/tab stopped; viewport reset.

Full repository check result and review references are recorded in AGENT_SESSION_LOG.md. Live Open Food Facts/USDA coverage, signed-in PostgREST, real-account and physical-phone acceptance remain pending. No remote SQL, production-data writes, paid signup, AI charge, merge or deployment was performed by the agent.

Review: [draft PR #22](https://github.com/LaulinVasquez/Buff-me-up/pull/22), implementation `6a5fdb5`, branch `agent/guided-meal-planning`. Local full checks passed; live deployment remains pending owner review.
