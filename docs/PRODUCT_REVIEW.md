# Hope Clinic: project review and next-version brief

Reviewed 12 September 2026. This is a discovery and implementation brief, not a record of shipped changes.

## Product purpose

Hope Clinic was built to help a home-based Unani doctor carry less paper, recover patient history, remember follow-ups, and give patients dependable consultation times. The intended outcome is a lighter working day with better continuity of care.

The user reports roughly two months of use, ending after February, and suspects data entry was burdensome. That is valuable context, but the reason for stopping is not yet established. We have not interviewed the doctor or measured her original usage.

**Recommended direction:** build a dependable daily companion for solo practices. Prove that the doctor can use it comfortably first, with foundations that can support other practices. Make scheduling and retrieval useful before asking for extensive documentation.

Generalization should make clinic identity, language, working hours, consultation length, medicine catalog, and optional modules configurable. Preserve explicit clinical meaning in histories, allergies, prescriptions, investigations, and clinician attribution.

## Review coverage and limits

- Read all application pages, shared components, contexts, entry points, styles, formatters, project scripts, lint configuration, Firestore rules/index declarations, Firebase Hosting configuration, and PWA configuration. Inspected Firebase initialization without reproducing configuration values. Reviewed recent commit subjects.
- Inspected the deployed dashboard and blank new-visit and new-patient forms using an existing authenticated browser session. No clinical records were created, edited, deleted, exported, or submitted. No microphone or print operation was triggered.
- A 390 by 844 viewport measurement of the blank consultation form reported about 1,960 CSS pixels of form height, before adding medication or investigation rows. This is a layout observation, not a usability test on her device.
- Ran production build and lint. Results are recorded below.
- Production Firestore rules, indexes, account provisioning, backups, billing configuration, and exact deployed revision were not independently verified. Source findings about those areas must be checked against the deployment before acting.
- No patient-level data analysis, clinical-content assessment, penetration testing, or complete authenticated write/offline/print test was performed. This brief contains no patient records.
- The runtime application, security rules, and production deployment were not changed by this review.

## What is already built

| Area | Existing behavior | Relationship to the original need |
| --- | --- | --- |
| Authentication | Email/password login, doctor/assistant role lookup, protected route shell | Keeps the interface behind sign-in; backend permissions need stronger membership boundaries |
| Dashboard | Daily visit/revenue counts, low stock, seven-day charts, expected consultations, upcoming follow-ups | Useful overview, but today's patient work appears below reporting content |
| Patients | Name/phone search, registration and editing, demographic profile | Replaces the patient file index |
| Medical background | Separate lists for past history, family history, ongoing medicines, allergies; legacy string support | Captures longitudinal context, but takes multiple fields and actions per item |
| Consultation | Patient/date/time, complaint, required diagnosis, notes, investigations, structured prescriptions, fees | Captures a detailed encounter in one long form |
| Prescribing | Inventory suggestions, quantity, dose, frequency, duration, instructions, quick inventory creation | Helps record treatment but mixes prescribing with stock administration |
| History | Patient profile plus dated visit cards with edit/print access | Intended to replace carrying files; newer prescription data is missing from this view |
| Follow-ups | New visits can generate a pending return date/time; dashboard can start a linked visit; a separate list can mark returns done | Provides return tracking; does not provide a complete booking or queue workflow |
| Inventory | Stock, units, prices, supplier, expiry, low-stock alerts; visit saves adjust stock | Useful if the doctor dispenses medicines and wants stock management |
| Printing | Visit-based prescription/investigation sheet with clinic header and signature area | Useful patient handoff, with attribution and content issues to resolve |
| Offline/PWA | Installable-app configuration, Firestore persistent local cache, connectivity banner | Useful foundation; draft recovery and accurate synchronization status remain missing |

There is no appointment entity, availability calendar, slot reservation, conflict prevention, arrival queue, rescheduling workflow, reminder delivery service, document attachment flow, clinic onboarding, or clinic-specific membership boundary in the reviewed application.

The current data graph is small: `users` supplies global roles; `patients` has many `visits`; visits may reference `inventory` through prescription rows and create `followups`. These are top-level collections. There is no clinic ownership scope. The existing React/Firebase foundation can be evolved; this review does not establish a need to replace the stack.

## Why adoption may have failed

These are hypotheses grounded in the implementation, not findings from the doctor.

1. **Value arrives after substantial entry.** Registration shows four history sections, then consultation opens another long form. Most sections are optional, but their visual prominence still asks the doctor to consider them. Each prescription introduces six inputs.
2. **Returning patients still require repeated work.** A new consultation does not show the previous treatment or allergy context alongside entry, offer a reviewed repeat prescription, or carry forward relevant context. Registration saves back to the patient list instead of continuing straight into care.
3. **Scheduling remains unfinished.** A follow-up date with optional time is useful, but there are no working sessions, durations, reserved slots, overlap checks, cancellations, or patient confirmations. First appointments cannot be booked independently of recording a visit.
4. **Useful history is incomplete on the main retrieval screen.** Structured prescriptions and investigations are absent from patient visit cards. Entering treatment provides less retrieval value than intended.
5. **The consultation has too many responsibilities.** Recording care, creating medicines, dispensing stock, collecting fees, and arranging returns all meet at one Save button. Failure in a supporting operation can interrupt recording the consultation.
6. **Interrupted work is fragile.** Form state stays in React until submission. There is no draft recovery or navigation guard. A phone interruption, reload, or accidental navigation can require re-entry. Firestore caching does not persist unsent React form state.
7. **Voice support may not fit actual usage.** The implementation uses `webkitSpeechRecognition`, fixed to `en-US`, and appends speech only to notes. Her preferred language, terminology, browser, privacy preferences, and correction burden are unknown.

The two months of reported use justify learning from the existing product. They do not tell us whether the main issue was typing, workflow mismatch, bugs, connectivity, duplicate paper work, or something outside the app.

## Concrete issues to address

Source locations refer to the reviewed checkout. “Confirmed in source” describes code behavior; it does not mean a harmful incident was observed in production.

| Priority | Finding and consequence | Evidence | Required outcome |
| --- | --- | --- | --- |
| Before broader access | Every authenticated account can read the clinical collections. There is no approved clinic membership check; a missing role still passes the route guard. Doctor roles can manage users globally. | `firestore.rules:22`, `:28`, `:34`, `:49`; `src/components/ProtectedRoute.jsx:14`; `src/contexts/AuthContext.jsx` | Verify deployed rules/account provisioning; enforce approved membership and clinic scope in rules and queries before onboarding another practice |
| High | History renders legacy `visit.prescription`; the form saves `visit.prescriptions`. Investigations are also absent from visit cards. | `src/pages/PatientDetails.jsx:167`; `src/pages/VisitForm.jsx:41`; `src/pages/PrintVisit.jsx:86` | Shared, backward-compatible clinical display; test old and new records without rewriting historical text |
| High | Assistant inventory updates check the entire resulting document against `quantity`, `notes`, `updatedAt`, while application stock writes use `stock`. Normal stocked inventory records cannot satisfy this condition. The same visit batch includes the stock update. | `firestore.rules:43`; `src/pages/VisitForm.jsx:180`–`:227` | Define the intended dispensing permission and test it in the emulator; permitted care recording must not be unexpectedly blocked by inventory rules |
| High | Editing a visit's next date/time does not update its generated follow-up; follow-up creation only runs for new visits. Starting a visit through the profile does not carry the original follow-up ID. | `src/pages/VisitForm.jsx:206`, `:219`; `src/pages/FollowUps.jsx:99` | One authoritative scheduling record with explicit linkage and deterministic reschedule/completion behavior |
| High | Selecting an inventory medicine and then changing its name leaves the old `inventoryId` attached. Saving can deduct the original medicine. | `src/components/PrescriptionListInput.jsx:39`, `:67`; `src/pages/VisitForm.jsx:196` | Clear the inventory reference on manual medicine changes; require explicit selection to relink |
| High | Editing restores quantities from a page-load snapshot and then deducts new quantities. Two editors using the same old snapshot can produce stock inconsistent with the final visit. Negative quantities and insufficient stock are not meaningfully guarded. Deleting a referenced inventory item can make later visit editing fail. | `src/pages/VisitForm.jsx:71`, `:182`; `src/components/PrescriptionListInput.jsx:167`; `src/pages/Inventory.jsx:32` | Version/concurrency protection and explicit stock movements; validate quantities; archive referenced medicines instead of breaking history |
| High | Clinical notes are printed under “Instructions”; the printed doctor is the currently signed-in user, not a clinician stored on the encounter. The sheet omits the next visit date/time. | `src/pages/PrintVisit.jsx:19`, `:129`; entire print component | Separate private notes and patient instructions; persist clinician attribution; include a confirmed return appointment when present |
| High | No draft recovery or saved/pending/failed state tied to actual writes. Connectivity banner promises synchronization based only on browser connectivity. Persistent cache is enabled unconditionally and logout only signs out. | `src/components/OfflineIndicator.jsx`; `src/config/firebase.js:18`; `src/components/Layout.jsx:23`; form state and submit handlers | Recoverable drafts, honest synchronization status, trusted-device policy, and documented logout/cache behavior |
| Medium | Follow-ups use pending-status filtering plus date ordering, but the checked-in index list is empty. A failed fetch is logged and then displayed like an empty list. | `src/pages/FollowUps.jsx:19`–`:49`; `firestore.indexes.json` | Verify production index availability, check in required indexes, and distinguish errors from no follow-ups |
| Medium | “Overdue” compares date-only midnight with the current instant, ignoring scheduled time. A return later today can be labeled overdue. | `src/pages/FollowUps.jsx:89` | Explicit clinic-timezone handling; distinguish overdue, due today, and future |
| Medium | Several fetch failures appear as empty results. The visit form's initial patient/inventory loading has incomplete error handling, with no clear initial loading state for editing. | `src/pages/Patients.jsx`, `Visits.jsx`, `Inventory.jsx`, `FollowUps.jsx`; `VisitForm.jsx:53` | Retryable error state, preserved user input, and no editable empty form masquerading as a loaded encounter |
| Medium | Recent-visit search only searches the latest 50 loaded visits. Dashboard and forms load entire collections; dashboard charts make seven daily queries; lists repeat patient lookups. | `src/pages/Visits.jsx:19`; `src/pages/Dashboard.jsx:53`, `:135`; `src/pages/VisitForm.jsx:56` | Clearly scoped search, pagination, bounded queries, and reusable data access |
| Medium | Print route is inside the normal shell. No shell-specific print hiding or print overflow reset was found. Only the print page's Back button is explicitly hidden. | `src/App.jsx:41`; `src/components/Layout.jsx`; `src/index.css`; `src/pages/PrintVisit.jsx:150` | Synthetic-data print test covering shell removal, full-length records, multipage tables, and long instructions |
| Medium | Browser speech setup lacks end/error state reconciliation and unmount cleanup. Form labels generally lack explicit control associations; icon buttons and autocomplete need keyboard/accessibility review. | `src/pages/VisitForm.jsx:84`; form/list components | Reliable optional dictation; associated labels, named controls, keyboard operation, and comfortable touch targets |

Other cleanup: registration stores an age without a reference date, defaults gender to Male, and does not normalize phone search or detect possible duplicates. Do not invent a birthdate from an old age or merge patients solely because they share a phone. History normalization drops unrecognized object fields and supplies today's date when absent; any future migration should preserve originals and uncertainty. Low-stock logic treats threshold zero as five. Quick inventory creation does not automatically link the new item to the originating prescription row. Currency symbols and clinic identity are inconsistent/hardcoded in places.

Firebase documentation confirms that update-field restrictions should compare changed keys, not the entire resulting document. See [field access rules](https://firebase.google.com/docs/firestore/security/rules-fields). The assistant-stock conclusion above follows from applying that behavior to this repository's rule and write paths.

Firestore's web cache persists across sessions, and Firebase recommends a trusted-device decision for sensitive information. See [offline persistence](https://firebase.google.com/docs/firestore/manage-data/enable-offline). The app also configures a separate Workbox Firestore URL cache; inspect whether it caches relevant responses and remove unnecessary duplication. We did not inspect browser caches or establish a data exposure incident.

Firestore batches are atomic, and transactions can retry against current data but fail offline. See [transactions and batched writes](https://firebase.google.com/docs/firestore/manage-data/transactions). A future design must distinguish an offline draft from a confirmed stock movement or conflict-free booking.

## Proposed daily workflow

### 1. Open Today

The first screen answers: who is booked, who has arrived, who is next, who is running late, and what remains unfinished. Put patient search, Book patient, Add walk-in, and Resume draft within immediate reach. Move revenue charts to a secondary reports view.

Use a simple queue with booked, arrived, in consultation, completed, cancelled, and no-show states. Keep the booked time and actual arrival/start times separate. Show realistic delays when consultations run long. Software can support time discipline; the doctor's actual availability, session boundaries, breaks, and patient expectations must be agreed as well.

### 2. Find or register a patient

Search by name and normalized phone, with enough identity context to distinguish similar names. Allow shared household contact numbers. New-patient registration should ask for the minimum identity/contact information needed for the current task, then continue directly to the appointment or consultation. Capture age/DOB and clinically relevant information at the appropriate point in care.

Progressively disclose history sections. Keep allergy review visible and distinguish “not reviewed/unknown” from an explicitly documented absence of known allergies. Do not turn blank fields into negative clinical findings.

### 3. Consult with context visible

Show identity, allergies, relevant conditions, and the last visit/treatment next to a short encounter form. Support a brief follow-up and a more detailed first visit without separate disconnected products.

Allow the doctor to select medicines from a personal catalog and reuse chosen instructions from a prior visit after reviewing them. Never silently carry forward a diagnosis, dose, duration, or clinical finding. Preserve explicit prescription fields and support the units and formulations the doctor actually uses.

Save a recoverable draft during work. Clearly distinguish draft, saved on this device, syncing, saved to clinic, and failed. Finalizing a consultation should require the information the clinician considers necessary, while allowing incomplete documentation to remain clearly marked as a draft. Do not force a premature definitive diagnosis merely to retain work.

### 4. Finish the encounter

Review and finalize the treatment record. Fees and dispensing should be optional capabilities according to the practice, with their own explicit status. A stock problem should not erase clinical notes or leave the doctor unsure whether the encounter exists.

Separate internal notes from patient-facing instructions. Provide a readable prescription/visit sheet and, if booked, the next appointment time. Permit corrections through an attributable revision rather than silently overwriting a finalized record.

### 5. Book the return before the patient leaves

Offer available slots inside configured working sessions, with durations, breaks, and buffer time. Keep “review advised in two weeks” separate from “appointment confirmed for Tuesday at 5:30.” Unscheduled returns belong in a recall list; booked returns belong in the appointment list.

Rescheduling changes the same authoritative appointment. Prevent conflicting reservations at the database/backend boundary, not only in the displayed calendar. Offline booking requests must remain provisional until conflict checking succeeds.

Begin with a clear appointment slip and a staff-reviewed confirmation text the doctor can choose to send. Automated SMS/WhatsApp reminders are a later integration: validate the channel, recipient preferences, timing, delivery status, costs, and reschedule/cancellation handling. Keep diagnosis and treatment details out of routine reminders. No messaging integration or sending is authorized by this brief.

## Discovery before locking the interface

Observe the doctor reenacting three common tasks with synthetic examples: a new patient, a returning patient with unchanged treatment, and a patient who needs a different return time. First watch her current paper/phone routine; then compare the app. Avoid coaching through the interface during the first attempt.

Record actions and friction, not identifiable clinical content. Capture:

- Device, browser, typing comfort, working language, and connectivity.
- Who registers patients, types notes, dispenses medicines, and receives calls/messages.
- Whether entry happens during the encounter or afterward, and whether paper documentation still has to be duplicated.
- Typical consultation length, walk-in frequency, breaks, daily capacity, and how often booked patients arrive late.
- Which details she actually needs from the previous file; whether the app failed to show any of them.
- Which medicine formulations, units, directions, and frequent prescription patterns should be supported.
- The last specific occasion she tried to use the app, what happened, and why paper felt easier.
- Whether she wants typing, dictation, or a photograph of an existing note as a supplementary record. Do not assume voice or OCR reduces total work until correction time is measured.

Pending answers, this brief assumes a first pilot with the original doctor and eventual expansion to other solo practices. It does not assume her device or preferred language.

## Generalization and implementation boundaries

Keep React/Vite and Firebase initially. Introduce feature modules gradually: patients, encounters, appointments, inventory, clinic settings, and shared clinical display. Extract pure normalization, validation, date/time, and stock-delta logic before reorganizing whole pages. Consolidate query/write behavior behind explicit feature data services.

Proposed concepts, subject to a migration design:

| Concept | Responsibility |
| --- | --- |
| Clinic | Identity, timezone, language, currency, working sessions, optional capabilities |
| Membership | Which clinic a user belongs to and what actions they may perform; default deny for unknown membership |
| Patient | Clinic-owned identity and longitudinal clinical background |
| Appointment | Booking, scheduled start/end, status, patient, clinician, linkage to encounter; independent of documentation |
| Encounter | Draft/finalized/revised clinical record, author/clinician, explicit prescriptions and investigations |
| Recall | Return advice that has not yet become a confirmed appointment |
| Medicine catalog | Reusable medicine names/formulations without requiring stock bookkeeping |
| Stock movement | Optional dispensing/restocking/correction ledger with unique operation IDs and attributable changes |

Firestore document reads are whole-document reads. If future reception staff should see booking/contact details but not clinical notes, separate those data at document boundaries; hiding fields in React is insufficient. Server operations must enforce membership too.

Decide on nested clinic collections versus immutable clinic ownership fields through a short architecture decision before migration. Existing unscoped collections must never become a shared pool for new clinics. Retain route compatibility where possible and scope access independently of route presentation.

The migration needs a verified backup and restore rehearsal, stable identifier/reference mapping, an inventory of legacy shapes, dry-run validation with synthetic/redacted fixtures, and counts/reference checks. Preserve originals and clinician uncertainty. Define a cutover window or reconciliation process so writes are not lost between copy and cutover. Keep a restricted recovery path and rollback instructions. Do not combine data migration with a large UI rewrite.

Add a server component only for tasks that need one, such as scheduled message delivery and authoritative booking/dispensing workflows. Resolve hosting costs and operating responsibilities before adopting those dependencies. Public self-booking, subscriptions, billing integrations, extensive analytics, and AI-generated clinical content are outside the initial release.

## Staged delivery and acceptance

### Stage 0: establish the baseline

Deliver the doctor workflow observation, a concise account of why use stopped, agreed minimum documentation, chosen scheduling policy, and a prioritized backlog. Verify deployed rules/indexes and backup/restore arrangements. Set up synthetic fixtures and an isolated environment for writes.

Acceptance: the doctor can recognize her actual day in the proposed flow, and we know which tasks the first release must reduce.

### Stage 1: restore trust in existing records

Repair structured/legacy treatment display, follow-up consistency, medicine-link handling, role/write mismatches, loading/error states, and print attribution/content. Establish recoverable drafts and accurate sync status. Fix the six application lint errors and exclude generated development output from lint. Preserve existing routes and record compatibility.

Acceptance: synthetic old and new records render consistently; permitted doctor/assistant workflows pass; save failures preserve work; reload recovery works; print output is complete and correctly attributed. No unintended production-data changes.

### Stage 2: pilot Today, booking, and a short consultation

Build daily sessions and slot booking, walk-ins and arrival status, contextual patient lookup/quick registration, visible last-visit context, reviewed treatment reuse, optional fees/stock, and a patient-facing appointment slip. Keep the existing detailed information accessible.

Acceptance: the doctor completes representative tasks on her actual device without coaching, sees and changes appointment times clearly, retrieves previous treatment quickly, and resumes an interrupted draft. Two simultaneous booking attempts cannot silently confirm the same capacity.

### Stage 3: validate sustained use

Run a short supported pilot, checking friction after the first day and first week. Review at two weeks and again around six weeks; initial novelty does not establish retention. Address observed causes of duplicate entry before adding features.

Provisional targets to calibrate against a measured baseline:

- Find a returning patient's last treatment in about 10 seconds.
- Book or reschedule a known patient in about 30 seconds.
- Record a straightforward return visit in about one minute of interaction, excluding clinical decision-making.
- No loss of an acknowledged saved draft in the agreed interruption scenarios.
- No silently confirmed overlapping bookings; accurate completion/cancellation state.
- Continued voluntary use across most clinic sessions and a reported reduction in duplicate work.

Track task duration, completion, retries, and error categories without logging patient names, contact details, free text, diagnoses, or medication content. These are proposed acceptance targets, not measured results.

### Stage 4: expand to another independent practice

Complete clinic membership/isolation, clinic settings, onboarding, role permissions, export/restore processes, auditability, and support procedures. Validate with a second solo practice before calling the product generalized. Test both a dispensing practice and one that uses only the medicine catalog if those are intended audiences.

Acceptance: clinic A cannot read or mutate clinic B's records, inactive/unapproved accounts are denied, printed clinician identity is stable, and both practices operate without code changes to their branding or working schedule.

## Verification baseline from this review

| Check | Result |
| --- | --- |
| `npm.cmd run build` | Passed; Vite production bundle and PWA service worker generated |
| Bundle | Main JavaScript approximately 1,079 kB minified / 326 kB gzip; large-chunk warning. Measure cold-start performance on the doctor's device before assigning an impact |
| Build warning | Browserslist dataset reported as nine months old |
| `npm.cmd run lint` | Failed: 46 errors and 4 warnings, including generated `dev-dist` service-worker files |
| `npm.cmd run lint -- --ignore-pattern 'dev-dist/**'` | Failed: six application errors, no warnings |
| Application lint locations | `ToastContext.jsx`: mixed fast-refresh exports; `PatientDetails.jsx`: unused formatter; `VisitForm.jsx`: three unused imports and unused interim transcript |
| Test infrastructure | No test script or application test files found in the reviewed project inventory |
| Live read-only check | Dashboard, blank consultation form, blank registration form inspected; broad structure consistent with source |
| Not verified | Production write paths, assistant session, deployed rule/index parity, offline recovery, print pagination, notification delivery, backup restoration, or historical adoption data |

The first implementation slice should make patient history dependable and keep unfinished consultation work recoverable. In parallel with that product work, the doctor's observed routine should determine the shape of Today and appointment booking. Multi-practice access must wait for verified clinic isolation.
