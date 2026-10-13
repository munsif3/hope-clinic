# AGENTS.md

Guidance for AI coding agents working in this repository. This is a Vite/React Firebase clinic app with patient, visit, inventory, follow-up, auth, print, and PWA-style behavior. Treat it as a clinical operations tool with sensitive health data.

## Project Snapshot

- Project: Hope Clinic App.
- Stack: React 19, Vite, React Router, Firebase, Tailwind/PostCSS, lucide-react, Recharts, Vite PWA tooling.
- Entry: `src/main.jsx` and `src/App.jsx`.
- Routing: React Router with protected routes.
- Auth/context: `src/contexts/AuthContext.jsx`.
- Toasts: `src/contexts/ToastContext.jsx` and `src/components/ToastContainer.jsx`.
- Firebase config: `src/config/firebase.js`.
- Core domains: patients, visits, prescriptions, investigations, inventory, follow-ups, printable visit records.

## Cleanup Goal

Use Flable 5 to reduce cognitive complexity while preserving clinical workflows and privacy. Prioritize clearer feature modules, reusable form/list components, and safer data handling.

Good cleanup work:

- Extract repeated form sections for prescriptions, investigations, dynamic lists, and inventory quick-add.
- Move formatting/date helpers into `src/utils`.
- Keep protected-route/auth behavior clear.
- Consolidate Firestore query/write patterns if duplicated in pages.
- Keep print output stable.

Avoid:

- Logging patient data.
- Weakening auth or route protection.
- Changing Firestore collection shapes without a migration.
- Turning clinical forms into generic forms that hide medical meaning.
- Large design rewrites during cleanup.

## Commands

Use `npm.cmd` on Windows PowerShell if needed.

- Dev: `npm.cmd run dev`
- Build: `npm.cmd run build`
- Lint: `npm.cmd run lint`
- Preview: `npm.cmd run preview`

## Branching

Branch from `main` and name branches `<type>/<short-kebab-description>`.

- Types match the commit prefixes: `feat/`, `fix/`, `docs/`, `chore/`, `refactor/`, `test/`.
- Describe the change in 2-5 lowercase words, e.g. `feat/visit-followup-filter`, `fix/print-dosage-wrap`.
- No auto-generated or random names (e.g. `claude/bold-tesla-ayqfkn`). If your tooling assigns one, rename it before opening a PR.
- One concern per branch; keep docs, chores and feature work in separate PRs.
- Use Conventional Commit messages (`feat: ...`, `fix: ...`, `docs: ...`).

## Repository Layout

- `src/App.jsx`: route tree and provider composition.
- `src/pages/Dashboard.jsx`: dashboard/overview.
- `src/pages/Patients.jsx`: patient listing.
- `src/pages/PatientForm.jsx`: create/edit patient.
- `src/pages/PatientDetails.jsx`: patient details.
- `src/pages/Visits.jsx`: visit listing.
- `src/pages/VisitForm.jsx`: create/edit visit.
- `src/pages/PrintVisit.jsx`: printable visit output.
- `src/pages/Inventory.jsx`: inventory listing.
- `src/pages/InventoryForm.jsx`: create/edit inventory.
- `src/pages/FollowUps.jsx`: follow-up workflow.
- `src/components/Layout.jsx`: authenticated shell.
- `src/components/ProtectedRoute.jsx`: auth guard.
- `src/components/DynamicListInput.jsx`: reusable dynamic list input.
- `src/components/DynamicListDisplay.jsx`: reusable dynamic list display.
- `src/components/PrescriptionListInput.jsx`: prescription entry UI.
- `src/components/InvestigationListInput.jsx`: investigation entry UI.
- `src/components/InventoryQuickAddModal.jsx`: quick add inventory support.
- `src/components/StructuredText.jsx`: structured display.
- `src/utils/formatters.js`: formatting helpers.

## Clinical Data Rules

Treat all patient and visit data as sensitive.

- Do not log patient names, phone numbers, diagnoses, symptoms, prescriptions, notes, investigations, or visit history.
- Keep patient and visit access behind authenticated routes.
- Validate required clinical fields before writes.
- Keep prescription and investigation structures explicit.
- Preserve print formatting if used for handoff or patient records.
- Keep Firestore rules aligned with collection access.
- Do not expose Firebase credentials beyond normal public client config.

## Cleanup Strategy

1. Pick one workflow: patients, visits, inventory, follow-ups, or print.
2. Read the page, related components, Firebase calls, and formatters.
3. Extract pure helpers and repeated list logic first.
4. Extract UI sections second.
5. Consolidate Firebase data access only after identifying repeated query/write logic.
6. Run lint/build.
7. Smoke test the touched route.

Good extraction targets:

- Prescription row/list logic.
- Investigation row/list logic.
- Dynamic add/remove list behavior.
- Date/phone/stock formatting.
- Inventory quick-add validation.
- Follow-up status/date filtering.
- Shared loading/empty/error states.

Avoid extracting:

- Medical labels into generic names that reduce clarity.
- Print-specific layout if it breaks print output.
- Auth guard behavior into hidden magic.

## Route Contract

Current routes from `src/App.jsx`:

- `/login`
- `/`
- `/patients`
- `/patients/new`
- `/patients/:id`
- `/patients/:id/edit`
- `/visits`
- `/visits/new`
- `/visits/:id/edit`
- `/visits/:id/print`
- `/inventory`
- `/inventory/new`
- `/inventory/:id/edit`
- `/followups`

Preserve route paths unless navigation migration is requested.

## Files to Avoid

- `.env.local`
- `.firebase/`
- `dist/`
- `dev-dist/`
- `node_modules/`
- Firebase project identifiers
- generated lint/build reports unless artifact cleanup is requested

## Known Cleanup Opportunities

- README is still the default Vite README.
- Clinical workflows likely have repeated dynamic-list code.
- Route pages may mix data fetching, form state, validation, and rendering.
- Print route should be checked after style/layout cleanup.
- PWA config and service-worker behavior should be verified before deployment changes.

## Definition of Done

The touched clinical workflow still works, route protection remains intact, no sensitive data is newly logged/exposed, lint/build status is known, and print/PWA behavior is not accidentally broken.
