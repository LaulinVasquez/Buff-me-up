# Meal photo estimates — 2026-11-18

## Plan committed before implementation

User requests a phone camera/photo option that uses the agent to approximate meal calories. Base: developer-merged PR #26 (`f4f66de`). Continue plan → implementation → meaningful checks → review/report → branch push/draft PR. No agent merge, deployment, remote SQL, real account/photo/provider testing or model charge.

1. Add camera/library entry points to the meal editor and Meals area. Keep the current meal unchanged until the user accepts the estimate. Let them add optional known food/portion context and adjust the pictured portion before using it.
2. Require per-photo explicit sharing consent naming OpenAI; existing text-only consent does not authorize image sharing. Resize/re-encode locally, validate/re-encode on the server to strip metadata, authenticate and bound request bytes/pixels/time/output. Do not save photos in Supabase, local draft storage, logs or provider Files. Use `store:false`, with accurate provider-retention disclosure.
3. Use a separately configured image-capable model with structured output: possible visible foods, portion description, a rough calorie range, nullable estimated macros, uncertainty and not-food/needs-details states. Reject invalid/refused/incomplete results. Do not infer allergens, dietary suitability, medical conditions or nutrition-label precision from a photo.
4. Keep editable text/results in owner-scoped session drafts, never raw images. No automatic analysis/retry on reload; selected photos must be reselected after reload. Provider attempts can still count if a connection fails. Apply accepted results as unreviewed label meals with persistent photo provenance/range; allow corrections and existing explicit meal/plan/log review. Exclude photo estimates from automatic calorie-target portion fitting.
5. Add forward migration 19 for optional validated photo-estimate metadata and a separate five-photo-attempts/day quota, preserving existing meal shape/rows, RLS, revisions, snapshots and prior food/text-AI limits. No new tables or image bucket. Deliver complete SQL/configuration and verification instructions.
6. Test response/range/portion validation, body limits/consent/auth/quota/provider failures, image normalization/metadata removal, source transitions, reload/no-image persistence, label/recipe compatibility, historical snapshots and two-owner quota isolation. Run full checks, existing SQL deployment paths and actual-component synthetic phone/desktop acceptance. Self-review, commit/push and attach a draft PR.

## Sources

Official image input contract: https://developers.openai.com/api/docs/guides/images-vision . Structured output: https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses . Provider data controls: https://developers.openai.com/api/docs/guides/your-data . Image normalization uses the already-installed sharp version, made an explicit dependency: https://sharp.pixelplumbing.com/api-output/ . No fixed accuracy percentage or medical-diet capability is claimed.
