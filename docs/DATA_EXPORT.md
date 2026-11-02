# Account data export

Profile → Download my data prepares an owner-scoped JSON export containing profile preferences, plans/days/exercises, workouts/snapshots including actual sets and adaptation/swap history, and gym settings/notes. It uses only eight explicitly named `gym_*` tables. Auth provider metadata, tokens, service credentials and FlowDesk tables are not exported. JSON format version is 1 and weights are labeled pounds. This is a portable data file, not an import/restore feature.

GET `/app/profile/export` authenticates with `getUser`, uses the request's normal Supabase client and RLS, returns 401/500 on failure and private/no-store/nosniff headers. UUID keyset pages of 500 avoid first-page truncation and offset drift; a start-time creation cutoff excludes newly created rows. Reads are not one database snapshot, so concurrent edits/deletions can affect consistency. Any failed table read aborts the export instead of returning partial success. No service-role bypass or external export service.

The client rejects redirected HTML/non-JSON and unexpected formats, prepares a browser download, and offers a selectable JSON text fallback for devices that block downloads. Failure clears previous prepared text and offers retry feedback. It does not promise native Files integration.

Verification: eleven training tests include real-SDK allowlist/pagination request contracts and failure abort with synthetic fetch responses. Existing SQL suite verifies owner access to all eight tables. Actual component fixture verifies prepared payload via the visible JSON text, HTML sign-in response rejection, retry/clearing behavior and five expanded widths without overflow. Browser download-event inspection timed out; actual disk download remains manual acceptance, not claimed passed. Screenshot data-export-phone.png is synthetic. Real authenticated staging export, large history and iPhone download/copy remain pending. No live user records were accessed.

No new migration. Requires existing schema through migration 12. Apply/verify outstanding migrations in staging before release. Branch stacks on personal gym PR #12; no production deployment or database change was performed.
