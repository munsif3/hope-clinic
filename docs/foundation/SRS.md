# Hope Clinic - Software Requirements Specification (SRS)

| | |
| --- | --- |
| Version | 1.0 (retrospective baseline) |
| Date | 4 October 2026 |
| Parent | [BRD](BRD.md) |
| Design | [Technical Design Document](TDD.md) |
| Baseline | Commit `a8bb6c7`, production release of 16 September 2026 |

This SRS turns the business requirements into testable functional and non-functional requirements. Each requirement carries a status against the current code and a trace to where it is implemented and verified, so it doubles as a requirements traceability matrix.

**Status:** **Built** - implemented and covered by automated tests or a recorded walkthrough. **Partial** - implemented with a stated limitation. **Gap** - not built. **Decision** - waiting on the Doctor.

**Test references:** `U` = unit/render tests (`tests/*.test.mjs`), `I` = Firestore emulator integration tests (`tests/*.integration.mjs`), `E2E` = Playwright journey (`tests/browser/clinic.spec.mjs`), `SMOKE` = `scripts/production-smoke.mjs`.

## 1. Glossary

| Term | Meaning in this system |
| --- | --- |
| Patient | A person with a clinic record. Stored in `patients`. |
| Visit / encounter / consultation | One clinical contact, with its findings and treatment. Stored in `visits`. |
| Prescription | A structured medicine row on a visit: name, quantity, dosage, frequency, duration, notes, optional inventory link. |
| Legacy prescription | Free text in `visit.prescription` from early records. Displayed, never converted. |
| Investigation | A test advised at a visit (text). Results are not recorded. |
| Follow-up / review due | Advice to return around a date. Does not reserve time. Stored in `followups`. |
| Session | A block of clinic hours on a date, opened by the Doctor. Stored in `clinicSessions`. |
| Appointment | A reserved time inside a session for a patient. Stored in `appointments`. |
| Slot | One 15-minute unit of capacity held by an appointment. Stored in `appointmentSlots`. |
| Walk-in | A patient without a booking who is given a fitting free slot and placed in the waiting list. |
| Draft | Unsaved consultation form content kept in the browser tab's session storage. |
| Handout | The printable patient prescription sheet. |

## 2. Actors and permissions

| Capability | Doctor | Assistant | Signed-in, no role | Signed out |
| --- | --- | --- | --- | --- |
| Use the app shell | Yes | Yes | No - "Clinic access unavailable" | Redirect to `/login` |
| Read patients, visits, follow-ups, inventory, schedule | Yes | Yes | No | No |
| Create/edit patients | Yes | Yes | No | No |
| Delete patients | Yes (rules) - no UI | No | No | No |
| Create/edit visits | Yes | Yes | No | No |
| Be recorded and printed as clinician | Yes | Never | - | - |
| Create medicine in inventory | Yes | No | No | No |
| Change stock | Yes | Yes (stock, notes, updatedAt only) | No | No |
| Change medicine prices | Yes | No | No | No |
| Open/close clinic sessions | Yes | No | No | No |
| Book, move, cancel appointments; mark arrival | Yes | Yes | No | No |
| Manage user roles (`users` collection) | Yes (rules) - no UI | No | No | No |

Roles come from `users/{uid}.role`. Accounts are provisioned manually in the Firebase console (see [TDD](TDD.md) section 12).

## 3. Functional requirements

### 3.1 Authentication and access (FR-AUTH)

| ID | Requirement | Status | Implementation | Verification |
| --- | --- | --- | --- | --- |
| FR-AUTH-01 | Staff sign in with email and password. | Built | `pages/Login.jsx`, Firebase Auth | E2E |
| FR-AUTH-02 | All routes except `/login` require sign-in; unknown routes redirect to `/`. | Built | `App.jsx`, `ProtectedRoute.jsx` | E2E, SMOKE |
| FR-AUTH-03 | A signed-in account without a `doctor` or `assistant` role sees no clinical data and is offered sign-out. | Built | `ProtectedRoute.jsx`, `firestore.rules` | I: unapproved account denied |
| FR-AUTH-04 | After sign-in the user lands on Today (`/today`). | Built | `Login.jsx` | E2E |
| FR-AUTH-05 | Sign-out removes all consultation drafts from the browser. | Built | `Layout.jsx`, `AuthContext.jsx`, `utils/visitDrafts.js` | U: drafts removed on sign-out |
| FR-AUTH-06 | Sign-out clears the offline Firestore cache on the device. | Gap | Persistent cache is not cleared | - |
| FR-AUTH-07 | Password reset and account help from the login screen. | Gap | - | - |

### 3.2 Patients (FR-PAT)

| ID | Requirement | Status | Implementation | Verification |
| --- | --- | --- | --- | --- |
| FR-PAT-01 | Register a patient with name, age, gender, contact, address, medical history, family history, ongoing medicines and allergies. | Built | `PatientForm.jsx`, `services/savePatient.js` | I: registration validation |
| FR-PAT-02 | Name, contact and an age of 0-130 are required. | Built / Decision | `validatePatient()` | I | 
| FR-PAT-03 | Gender defaults to "not recorded", never to a value. | Built | `PatientForm.jsx` | Walkthrough |
| FR-PAT-04 | Warn on an exact name match or identical contact digits before saving; the user must acknowledge. Never merge. | Built | `utils/patients.js` `possibleDuplicates()` | E2E |
| FR-PAT-05 | Search by name, record ID or contact; contact search ignores spaces, dashes, brackets and `+`. | Built | `matchesPatient()` | U: lookup normalization |
| FR-PAT-06 | Search results show a second identifier (age, gender, contact) to separate same-name patients. | Built | `patientIdentity()` | U |
| FR-PAT-07 | "Save and start consultation" and "save and return to booking" continue without re-selecting the patient. | Built | `PatientForm.jsx` | E2E |
| FR-PAT-08 | Repeated save of a new patient cannot create two records; a stale edit cannot overwrite a newer one. | Built | Transaction, stable ID, revision compare | I: duplicate retries, stale edits |
| FR-PAT-09 | Editing preserves fields the form does not know about (legacy data). | Built | Merge write of whitelisted fields | I: legacy fields preserved |
| FR-PAT-10 | An empty allergy list displays as "not recorded", never as "no known allergies". | Built | `PatientSafetySummary.jsx` | U: unrecorded allergies |
| FR-PAT-11 | Patient profile shows identity, safety summary, history, open appointments and visit history with full treatment. | Built | `PatientDetails.jsx`, `PatientAppointments.jsx` | U: history renders treatment |
| FR-PAT-12 | Record date of birth or the date an age was recorded. | Gap | Age stored without reference date | - |

### 3.3 Consultations (FR-ENC)

| ID | Requirement | Status | Implementation | Verification |
| --- | --- | --- | --- | --- |
| FR-ENC-01 | Record date, time, complaint, diagnosis, private notes, patient instructions, prescriptions, investigations, consultation fee, medicine fee, and an optional return date/time. | Built | `VisitForm.jsx`, `services/saveVisit.js` | E2E |
| FR-ENC-02 | Patient, valid date/time and diagnosis are required to save. | Built / Decision | `validateVisit()` | U: visit validation |
| FR-ENC-03 | Return date must be on or after the visit date; return time requires a return date. | Built | `validateVisit()` | U |
| FR-ENC-04 | Fees must be non-negative numbers; total cost is computed on save. | Built | `saveVisit.js` | U |
| FR-ENC-05 | Show allergies and previous visits beside the form (stacked on narrow screens). Previous context excludes other patients, the visit being edited, and later visits. | Built | `PreviousVisitContext.jsx`, `utils/consultations.js` | U: previous context |
| FR-ENC-06 | A review step shows identity and treatment before saving; structured prescriptions need an explicit acknowledgement. | Built | `ConsultationReview.jsx` | E2E |
| FR-ENC-07 | New doctor-created visits store clinician ID and name. Assistant-created visits store no clinician. | Built | `saveVisit.js` | U: print attribution |
| FR-ENC-08 | Every save is atomic: visit, stock changes, follow-up changes and appointment completion succeed or fail together. | Built | `runTransaction` in `saveVisit.js` | I: insufficient stock rollback |
| FR-ENC-09 | A retry of a new visit cannot save twice; a stale edit is rejected with the user's input kept. | Built | Stable visit ID, `visitRevision()` | I: stable IDs, concurrent edits |
| FR-ENC-10 | A visit cannot be moved to another patient. | Built | `saveVisit.js` | I |
| FR-ENC-11 | Unsaved form content is kept in the browser tab and offered for restore after reload, scoped to account and route, for up to 24 hours. | Partial | `utils/visitDrafts.js` | U: draft scope, corrupt drafts |
| FR-ENC-12 | Unfinished consultations can be saved and resumed from another device or after closing the browser. | Gap | - | - |
| FR-ENC-13 | Optional dictation into notes. | Partial | `webkitSpeechRecognition`, `en-US` only | Manual |
| FR-ENC-14 | Save a provisional assessment without a final diagnosis. | Gap / Decision | - | - |
| FR-ENC-15 | Corrections to a finalised visit keep an attributable revision history. | Gap | Edits overwrite; `updatedBy` recorded | - |

### 3.4 Prescriptions and investigations (FR-RX)

| ID | Requirement | Status | Implementation | Verification |
| --- | --- | --- | --- | --- |
| FR-RX-01 | Each prescription row has medicine name (required), quantity, dosage, frequency, duration and directions. | Built | `PrescriptionListInput.jsx` | U |
| FR-RX-02 | Medicine name suggests inventory items; picking one links the row to stock. | Built | `PrescriptionListInput.jsx` | E2E |
| FR-RX-03 | Changing a linked medicine's name removes its stock link. | Built | `changePrescription()` | U: renaming clears stock reference |
| FR-RX-04 | Doctor can quick-add a medicine to inventory from the row; it links back to the row. | Built | `InventoryQuickAddModal.jsx` | Walkthrough |
| FR-RX-05 | Selected rows from a previous visit can be reused; only name, dosage, frequency, duration and notes are copied; quantity and stock link are cleared. | Built | `reusablePrescription()` | U, I: reuse does not consume stock |
| FR-RX-06 | Investigations are a list of non-empty text items. | Built | `InvestigationListInput.jsx` | U |
| FR-RX-07 | Legacy free-text prescriptions remain readable next to structured rows. | Built | `PatientDetails.jsx`, `VisitPrintout.jsx` | U: history renders original treatment |
| FR-RX-08 | Personal medicine catalogue / favourites independent of stock. | Gap | - | - |

### 3.5 Inventory (FR-INV)

| ID | Requirement | Status | Implementation | Verification |
| --- | --- | --- | --- | --- |
| FR-INV-01 | Maintain medicines with name, stock, unit, cost, selling price, supplier, expiry date and low-stock threshold. | Built | `Inventory.jsx`, `InventoryForm.jsx` | Walkthrough |
| FR-INV-02 | Saving a visit deducts quantities of linked medicines; editing applies only the difference; removing a row restores it. | Built | `stockChanges()` | U: stock edits, I |
| FR-INV-03 | Stock can never become negative; insufficient stock rejects the whole save. | Built | `saveVisit.js`, rules | I |
| FR-INV-04 | Assistants may change stock but not prices or other fields. | Built | `firestore.rules` | I: assistant pricing |
| FR-INV-05 | Low stock flagged when stock is at or below its threshold. | Built | `Dashboard.jsx`, `Inventory.jsx` | Walkthrough |
| FR-INV-06 | Clinical save is never blocked by stock; dispensing is recorded separately with retry-safe stock movements. | Gap | Currently coupled | - |
| FR-INV-07 | Medicines referenced by past visits are archived, not deleted. | Gap | Hard delete available to doctor | - |

### 3.6 Scheduling (FR-SCH)

| ID | Requirement | Status | Implementation | Verification |
| --- | --- | --- | --- | --- |
| FR-SCH-01 | Doctor opens sessions per date with start and end on 15-minute boundaries; morning and afternoon suggestions are editable, never auto-opened. | Built | `ClinicSessions.jsx`, `saveSession()` | U: session validation, I |
| FR-SCH-02 | Doctor can close a session to new bookings; existing appointments stay. Session times are immutable. | Built | `setSessionEnabled()`, rules | I: closing sessions |
| FR-SCH-03 | Book a patient for 30, 45 or 60 minutes at an available start inside one open session. | Built | `BookingForm.jsx`, `bookAppointment()` | U: availability, I |
| FR-SCH-04 | Overlapping bookings are impossible, including concurrent bookings from two devices and direct database writes. | Built | `appointmentSlots`, rules `ownsAllSlots` | I: one winner, slot tampering |
| FR-SCH-05 | Past start times cannot be booked (checked in UI and again on save). | Built | `bookingTimeHasPassed()` | U |
| FR-SCH-06 | Reschedule a booked appointment, across dates; old slots are released, a failed move keeps the original. | Built | `bookAppointment()` with revision | I: cross-date reschedule |
| FR-SCH-07 | Status flow: booked -> arrived -> in progress -> completed; booked/arrived can be cancelled or no-show; in progress can return to waiting if nothing was saved. | Built | `changeAppointmentStatus()`, rules | I |
| FR-SCH-08 | Walk-ins reserve a fitting slot and start as arrived. | Built | `bookAppointment(kind: 'walk_in')` | I: walk-ins |
| FR-SCH-09 | Each appointment owns one pre-allocated visit ID; saving that visit completes the appointment atomically. | Built | `saveVisit.js`, rules `validVisitAppointment` | I: atomic completion |
| FR-SCH-10 | Today shows sessions, agenda with status and next action, waiting list, and review-due follow-ups separately from bookings. | Built | `Today.jsx`, `useClinicSchedule.js` | E2E |
| FR-SCH-11 | Booking and status changes require a live connection; offline or cached state is shown. | Built | `Today.jsx` | Walkthrough |
| FR-SCH-12 | Recurring weekly session templates. | Gap | - | - |
| FR-SCH-13 | Appointment reminders to patients. | Gap (out of scope) | - | - |

### 3.7 Follow-ups (FR-FU)

| ID | Requirement | Status | Implementation | Verification |
| --- | --- | --- | --- | --- |
| FR-FU-01 | A return date on a visit creates one pending follow-up linked to that visit. | Built | `saveVisit.js` | I |
| FR-FU-02 | Changing the return date updates the same follow-up; clearing it cancels it. Completed follow-ups are never reopened. | Built | `saveVisit.js` | I: legacy follow-up updates |
| FR-FU-03 | List pending follow-ups by date with overdue, due today and upcoming; a return later today is not overdue. | Built | `FollowUps.jsx`, `followupOverdue()` | U: overdue logic |
| FR-FU-04 | Start a visit from a follow-up; saving completes that follow-up once, only for the same patient. | Built | `saveVisit.js` | I: follow-up completion |
| FR-FU-05 | Mark a follow-up done without a visit. | Partial | No reason captured | - |
| FR-FU-06 | Booking an appointment does not close a follow-up automatically. | Built (by design) | - | - |

### 3.8 Printing (FR-PRN)

| ID | Requirement | Status | Implementation | Verification |
| --- | --- | --- | --- | --- |
| FR-PRN-01 | Handout shows clinic header, stored clinician, patient name and age/sex, date, short visit ID, diagnosis, complaint, prescriptions table, investigations, patient instructions and review-due date/time, with signature area. | Built | `PrintVisit.jsx`, `VisitPrintout.jsx` | U: print content |
| FR-PRN-02 | Private notes never print. Legacy combined notes print only after explicit opt-in in preview. | Built | `VisitPrintout.jsx` | U, E2E: print privacy |
| FR-PRN-03 | A review-due date is never worded as a reserved appointment. | Built | `VisitPrintout.jsx` | U |
| FR-PRN-04 | Printing hides app navigation and starts from an explicit Print button after preview. | Built | Print CSS | E2E |
| FR-PRN-05 | Long prescriptions print legibly across pages on the clinic printer. | Partial | Not tested on the real printer | - |
| FR-PRN-06 | Clinic name, address and phone are configurable. | Partial | Address/phone via env vars with hard-coded fallback; name hard-coded | - |

### 3.9 Dashboard and lists (FR-DASH)

| ID | Requirement | Status | Implementation | Verification |
| --- | --- | --- | --- | --- |
| FR-DASH-01 | Dashboard shows today's visits and revenue, patient count, low stock, 7-day charts and upcoming follow-ups. | Built | `Dashboard.jsx` | Walkthrough |
| FR-DASH-02 | Visits list searches the 50 most recent visits and states that scope. | Partial | `Visits.jsx` | - |
| FR-DASH-03 | Lists distinguish loading, empty, no matches and failed to load, with retry. | Partial | Done on Today, follow-ups, consultation; not uniform | - |

### 3.10 App behaviour and offline (FR-APP)

| ID | Requirement | Status | Implementation | Verification |
| --- | --- | --- | --- | --- |
| FR-APP-01 | Installable as an app; caches only the app shell, never clinical responses. | Built | `vite.config.js`, `public/sw-cleanup.js` | SMOKE |
| FR-APP-02 | New releases show an update prompt rather than reloading mid-work. | Built | `AppUpdateNotice.jsx` | Walkthrough |
| FR-APP-03 | Offline banner reflects connectivity without claiming data has synced. | Built | `OfflineIndicator.jsx` | Walkthrough |
| FR-APP-04 | Previously loaded data is readable offline. | Built | Firestore persistent cache | - |

## 4. Key use cases

### UC-1 Returning patient with a booking

1. Doctor opens Today and sees the patient as Booked.
2. Patient arrives; Doctor or Assistant marks Arrived.
3. Doctor clicks Start; the consultation opens with the pre-allocated visit ID, allergies and previous visits beside it.
4. Doctor selects last visit's medicines to reuse, adjusts duration, enters diagnosis and instructions.
5. Doctor reviews and saves. Visit is saved, appointment completed, stock deducted, follow-up created - all at once.
6. Doctor opens the print preview and prints the handout.

*Alternate:* save fails (offline, stale, stock) - user input is kept, error explains next step, nothing is half-saved.

### UC-2 New walk-in patient

1. Search finds no match. Register with minimum details; duplicate warning if name or phone matches.
2. "Save and start" or "Save and book" continues with the patient selected.
3. A walk-in reserves the next fitting slot and appears as Waiting.
4. Continue as UC-1 from step 3.

### UC-3 Book or move a return

1. From Today or the patient profile, choose Book.
2. Choose duration; only starts that fit the full duration inside an open session are offered.
3. Confirm. If someone else took the time meanwhile, the booking fails and the original is unchanged.

### UC-4 Interrupted consultation

1. Doctor is entering a consultation and the page reloads.
2. On return, the app offers Restore or Discard for that account and route.
3. Restoring brings back the form, including prescriptions and return date. Limitation: only within the same tab and 24 hours.

### UC-5 Phone lookup

1. Doctor signs in on phone, searches the patient, sees allergy status, latest treatment and next appointment without horizontal scrolling.

## 5. Data requirements

| ID | Requirement | Status |
| --- | --- | --- |
| DR-01 | Existing collection shapes are preserved; new fields and collections are additive. | Built |
| DR-02 | Legacy prescription text, history strings and object shapes remain readable. | Built |
| DR-03 | All writes set `updatedAt` (server time); visits also set `createdBy`/`updatedBy`. | Built |
| DR-04 | Patients and visits belong to a clinic (tenancy field or path). | Gap - required before a second clinic |
| DR-05 | Records can be exported in full and restored. | Gap |

The full data model is in the [TDD](TDD.md) section 5.

## 6. Non-functional requirements

### 6.1 Security and privacy

| ID | Requirement | Status |
| --- | --- | --- |
| NFR-SEC-01 | Every Firestore read and write is enforced by server-side rules; the UI guard is convenience only. | Built |
| NFR-SEC-02 | Default deny for any collection not explicitly allowed. | Built |
| NFR-SEC-03 | Only public Firebase web config is shipped to the client; no service-account keys in the repo. | Built |
| NFR-SEC-04 | No patient data in console logs, analytics, error reports or test fixtures. | Built (tests use synthetic data) - keep enforced in review |
| NFR-SEC-05 | Production verification never signs in or touches real records. | Built |
| NFR-SEC-06 | Device policy for shared/lost devices, including clearing offline data on sign-out. | Gap |
| NFR-SEC-07 | Multi-factor authentication for the Doctor's account. | Gap - recommended |
| NFR-SEC-08 | Audit trail of who changed which record and when. | Partial - `updatedBy` on visits only, no history |

### 6.2 Reliability and data integrity

| ID | Requirement | Status |
| --- | --- | --- |
| NFR-REL-01 | Multi-document clinical writes are atomic. | Built |
| NFR-REL-02 | Retries never duplicate a patient, visit, appointment or stock deduction. | Built |
| NFR-REL-03 | Concurrent edits are detected and rejected without losing the user's input. | Built |
| NFR-REL-04 | Recovery point objective (RPO) of 24 hours: at most one day of records lost in a disaster. | Gap - needs daily export |
| NFR-REL-05 | Recovery time objective (RTO) of one clinic day, with a rehearsed restore. | Gap |

### 6.3 Performance and capacity

| ID | Requirement | Target | Status |
| --- | --- | --- | --- |
| NFR-PERF-01 | Cold start on the Doctor's laptop over normal clinic connectivity | Under 5 seconds to usable login | Not measured. Bundle about 1 MB minified |
| NFR-PERF-02 | Patient search response after list is loaded | Instant (client-side) | Built |
| NFR-PERF-03 | Find a returning patient and their last treatment | About 20 seconds end to end | Not measured with the Doctor |
| NFR-PERF-04 | Supported volume without redesign | Up to about 5,000 patients and 20,000 visits | Assumed. Several screens load whole collections - see TDD section 14 |

### 6.4 Usability and accessibility

| ID | Requirement | Status |
| --- | --- | --- |
| NFR-UX-01 | Laptop consultation fits at 1366 x 768 without hiding patient context. | Built (checked) |
| NFR-UX-02 | No horizontal scrolling at 390 px phone width on key screens. | Built (checked, SMOKE on login) |
| NFR-UX-03 | Form labels are associated with inputs; icon buttons have accessible names; keyboard operable. | Partial |
| NFR-UX-04 | Touch targets of 44 px for primary actions (WCAG 2.2 AA minimum is 24 px). | Partial |
| NFR-UX-05 | Clear saved / not saved / failed language; never imply sync from connectivity alone. | Built |
| NFR-UX-06 | The Doctor completes UC-1 to UC-5 without coaching. | Not validated |

### 6.5 Compatibility and localisation

| ID | Requirement | Status |
| --- | --- | --- |
| NFR-COMP-01 | Current Chrome and Edge on Windows laptop; Chrome on Android. | Built for Chrome; others not verified |
| NFR-COMP-02 | Clinic calendar in Asia/Colombo; dates shown in en-LK format; currency Rs. | Built |
| NFR-COMP-03 | Works on the clinic's actual printer at A4/A5. | Not verified |

### 6.6 Maintainability and operations

| ID | Requirement | Status |
| --- | --- | --- |
| NFR-OPS-01 | One command verifies a release (lint, unit, emulator, browser, build, preview). | Built - `npm run verify` |
| NFR-OPS-02 | Deploy refuses an unverified or changed build. | Built - `assert-verified.mjs` |
| NFR-OPS-03 | Post-deploy smoke check confirms the live build matches the verified one. | Built |
| NFR-OPS-04 | Documented rollback for hosting and rules. | Built - [RELEASE.md](../RELEASE.md) |
| NFR-OPS-05 | Error monitoring without patient data. | Gap |
| NFR-OPS-06 | Usage and cost alerting on the Firebase project. | Gap |

## 7. Acceptance

The SRS is accepted for the pilot when:

1. All **Must** business requirements in the [BRD](BRD.md) have their FRs at Built, or a Partial that the Doctor has explicitly accepted.
2. `npm run verify` passes on the release commit.
3. UC-1 to UC-5 are completed by the Doctor on her own devices with fictional patients.
4. NFR-REL-04 and NFR-REL-05 (backup and restore) are met.
5. Open **Decision** items are resolved and this document is updated.
