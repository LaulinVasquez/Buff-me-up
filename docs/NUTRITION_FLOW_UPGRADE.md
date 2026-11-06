# Guided meal planning and product information

Prepared 2026-11-06. User requested a food API comparison with product pictures, a Generate action that creates a plan or takes the user through questions, and feet/inches/pounds measurement options. Base: main 8ea3319, after developer merge of PR #21. Follow the previously read development workflow; the former untracked guide is absent.

## Implementation sequence

1. Add metric/imperial measurement controls. Keep canonical cm/kg in existing preference fields; remember only presentation units in this browser. Preserve exact stored values when switching units without editing.
2. Add planner readiness checks and a dedicated setup flow. Generate immediately prepares a draft for eligible reviewed meals; otherwise route to preference questions and clearly identified missing meal types. Preserve start date/snack selection, guide meal entry/review, and create the draft once the required meals are ready. Keep exclusion, stale-write and explicit plan-save checks.
3. Add optional Open Food Facts photo enrichment for selected USDA products using exact validated barcodes. Keep USDA nutrient values and manual fallback. Bound/cachе external calls, show attribution and handle missing/mismatched/broken images without blocking meal entry. No fuzzy photo matches or photo-derived nutrition.
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
