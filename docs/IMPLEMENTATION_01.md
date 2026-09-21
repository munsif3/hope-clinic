# First implementation: dependable consultation records

Implemented locally on 12 September 2026. This completes the first engineering slice from the product review, not the full product roadmap. Nothing has been deployed to the production clinic.

## Changes

- Patient history displays structured prescriptions (dose, frequency, duration, quantity, directions), investigations, patient instructions, and legacy prescription text.
- Consultation form saves account- and route-scoped recovery drafts in session storage. A reload offers Restore or Discard. Successful clinical saves and sign-out remove drafts. Recovery expires after 24 hours; it is not cloud storage or a cross-device backup. Keep the tab open. Browser session restoration behavior varies, so closing a tab/browser is not a supported recovery guarantee.
- Draft availability and clinic-save success have separate messages. Connectivity alone no longer claims data has synchronized. Stock-linked visit saves require a connection.
- Visit writes live in a dedicated service. Transactions verify the current visit, patient existence, stock quantities, and follow-up ownership/status before committing. Stale edits, duplicate new-visit IDs, insufficient stock, and invalid triggering follow-ups fail without partial writes.
- Changing a selected medicine's name clears its inventory reference. Quick-add links the newly created item back to the originating row. Assistant users are not offered medicine creation.
- Changing a return date/time updates a pending linked follow-up, including older records with random IDs. Clearing a return cancels pending linked follow-ups. The follow-up list has Start Visit, retryable errors, and time-aware overdue labels.
- Clinic reads require an existing doctor/assistant role. Unknown roles cannot enter the protected shell. Assistant stock updates compare changed fields and cannot change prices; stock must remain non-negative. These are single-clinic permissions, not tenant isolation.
- New doctor-created visits record clinician identity. Printing uses that stored identity. Older records and assistant-created visits without a recorded clinician display “Clinician not recorded”; no doctor identity is inferred.
- Patient-facing instructions are separate from private clinical notes. Older combined notes may be included only after explicit review in the print preview. Printing is now an explicit button after preview. The existing prescription-table layout is retained, with return date/time added and shell navigation hidden by print styles.
- Initial consultation/history loading errors are visible. Dictation has cleanup and error/end handling. Form labels are associated with their inputs.
- Lint excludes generated development output; the six baseline application errors are fixed.

## Compatibility and rollout

Collections and route paths are unchanged. The update is additive and uses a read-compatible transition:

| Addition or transition | Compatibility behavior |
| --- | --- |
| Visit fields: patientInstructions, createdBy, updatedBy, clinicianId, clinicianName | Optional on old records. The save service writes only known editable fields and metadata, preserving unknown legacy fields with merge writes. No bulk backfill or inferred clinical information |
| Legacy prescription text | Retained and shown alongside structured prescriptions when both exist |
| Follow-up status: cancelled | Excluded by existing pending-status queries. Completed follow-ups remain completed |
| New generated follow-up IDs | Prefer a stable visit-based ID; existing pending random-ID follow-ups are updated in place |
| Browser drafts | Separate from Firestore. No draft is presented as a completed clinical visit |
| Local emulator mode | Explicit development flag selects a demo project and local endpoints; production builds cannot enable it |

Before production rollout: verify the actual deployed rules/indexes and approved user roles, confirm backup/restore arrangements, create the checked-in follow-up index, deploy application and rules together, and require open clients to reload. Older clients do not implement the transaction/revision checks. A previous client may also still print combined notes. Do not assume a service-worker update alone immediately replaces every open tab.

No production migration was executed. If a rollback becomes necessary, preserve all additive fields and cancelled follow-ups; do not remove them or overwrite new records with an old export. Rolling back to the old client also restores its known saving and printing defects. Prefer a forward fix and a temporary pause in writes if reliability is in doubt.

Remaining product work includes Today/appointments, shorter entry with previous-treatment context, a medicine catalog independent of stock, trusted-device/cache controls, explicit clinician selection for assistant-created visits, full clinical revision history, backup rehearsal, and clinic isolation. No reminder messages or external integrations have been enabled.

## Verification

- Ten unit/render tests pass: medicine relinking, stock deltas, validation, revision comparisons, overdue times, draft expiry/account scope/storage failures, legacy/structured treatment display, and print content/attribution.
- Seven local Firebase integration tests pass against the checked-in rules: unauthorized access denied; assistant dispensing allowed but price changes/negative stock denied; insufficient-stock rollback; duplicate saves; concurrent edits; legacy reschedule/cancellation; follow-up completion and mismatched-patient rejection.
- Browser smoke test with synthetic fixtures: sign-in, form entry, reload/restore (including prescription and return date/time), successful save, old/new patient history, patient-facing print preview, generated follow-up, and linked Start Visit.
- Lint and production build pass. The build retains the existing large-bundle and outdated Browserslist-data warnings.
- A 390-pixel viewport showed no horizontal overflow in the consultation form.
- Browser sign-out/sign-in check confirmed the unfinished draft was no longer offered.
- Print markup/content and the screen preview were checked. Actual printer output and multipage print pagination still require acceptance testing with the clinic's printer.
- No production patient records were used for write tests.

## Running the isolated checks

Use Node 22+ and Java supported by the installed Firebase CLI.

PowerShell:

~~~powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run test

# Keep CLI state and emulator downloads separate from the developer's account.
$env:XDG_CONFIG_HOME = Join-Path (Get-Location) '.local-test/config'
$env:FIREBASE_EMULATORS_PATH = Join-Path (Get-Location) '.local-test/emulators'
$env:CI = 'true'
npm.cmd run test:integration
~~~

The integration runner refuses to run without the expected local emulator endpoints. It uses the demo project only. Test runtime/cache files are ignored by Git. The first run may download the official Firestore emulator from Google.

For manual browser checks, start emulators in one terminal using the same isolated environment variables:

~~~powershell
npm.cmd exec -- firebase emulators:start --config firebase.emulator.json --project demo-hope-clinic --only auth,firestore
~~~

In another terminal:

~~~powershell
node tests/seed-demo.mjs
$env:VITE_USE_EMULATORS = 'true'
npm.cmd run dev -- --host 127.0.0.1 --port 5178 --strictPort
~~~

Open http://127.0.0.1:5178/. The visible local-demo banner must be present. The fixture login is doctor@example.test / Synthetic-test-password-123. These credentials belong only to the local emulator. Never enter real patient data in this demo. Stop both development processes after review.
