# Verification and deployment

## Latest release

16 September 2026: deployed successfully to https://hope-clinic.web.app/ with Firestore rules and indexes. Final verification passed lint, 19 unit/render tests, 19 emulator integration tests, and two consecutive Playwright journeys (no retries). Production build and preview checks passed. The post-deployment signed-out browser check passed, including exact live JavaScript equality with the verified build and uncached service-worker headers. No production patient records were accessed by verification.

## Repeatable commands

Run from the repository root using Node 22+, installed dependencies, Google Chrome, and Java for the Firebase emulators. Firebase CLI must be signed in to the intended deployment project. On Windows, use `npm.cmd`.

```powershell
npm.cmd run verify
npm.cmd run deploy
```

`verify` runs lint, 19 unit/render checks, 19 Firestore integration checks, and the full Playwright consultation journey twice with one worker and no automatic retries. It then validates the production Firebase project, builds the app, and checks the production preview, including its service worker and protected routes. It uses local Auth/Firestore emulators on ports 9099/8080, starting them when neither is running. The browser server uses port 15179; the production preview uses 15180. Existing emulators should be running this repository's `firebase.emulator.json` configuration and current rules.

All clinical test records are synthetic and local. The browser journey blocks requests outside localhost, exercises registration, appointment rescheduling, arrival, draft recovery, reviewed save, print privacy, and phone lookup, and verifies sign-out protection. Repeated runs create independent records. Tests do not read or write real patients.

The verification receipt is `.local-test/verified-release.json`; browser results are `.local-test/playwright-results.json`. Failure screenshots/traces are under `.local-test/playwright-artifacts`. These local artifacts are ignored by Git.

`deploy` requires a verification receipt less than 24 hours old whose source, configuration, tests, scripts, and build hashes still match. It deploys Firestore rules, indexes, and Hosting together. The Hosting predeploy hook also checks the receipt. It does not rebuild or deploy Functions. After release, an automated, signed-out production smoke check verifies the protected-route redirect, login screen, phone layout, service-worker cache headers, and that the live JavaScript exactly matches the tested build.

To investigate a browser failure while emulators are running:

```powershell
npm.cmd run test:browser -- --repeat-each=1
```

This targeted command does not grant a deployment receipt. Run `verify` after a fix. To repeat only the signed-out live check:

```powershell
node scripts/production-smoke.mjs live
```

## PWA updates

New releases offer an explicit update prompt. Save work in all clinic tabs before applying an update. Users upgrading from the old service worker may need to close all clinic tabs/the installed app and reopen after saving. Session draft recovery is not a durable backup.

Service-worker and manifest responses must not use the one-year asset cache policy. The worker no longer caches Firestore network responses; its activation removes the previous `firestore-cache`. Firebase SDK persistence remains a separate existing mechanism.

## Release boundaries

Authenticated workflows are exercised against local emulators. The production smoke check stays signed out. This release does not migrate or rewrite existing clinical records. Browser verification uses desktop Chrome plus a phone-sized viewport, not a physical phone or every browser. Existing bundle-size and Browserslist-age warnings remain non-blocking.

If a release needs rollback, use Firebase Hosting release history for the previous site version and restore the matching Firestore rules version separately. Hosting rollback alone does not roll back rules or indexes. Do not delete production data to roll back the UI.
