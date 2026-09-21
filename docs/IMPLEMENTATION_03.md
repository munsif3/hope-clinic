# Today and appointment scheduling

16 September 2026. Local implementation; not deployed.

## What the analysis changed

The old app stored review dates but did not reserve time. It also described those dates as scheduled visits in the dashboard and handout. Making an agenda from those records would have promised availability that the data could not establish.

This slice adds explicit appointments, shared capacity enforcement, and a Today view while retaining review tasks separately. It implements the scheduling portion of phase C in [the UX plan](UX_PRODUCT_ASSESSMENT.md). Storage, compatibility and rollback are documented in [the scheduling model](SCHEDULING_MODEL.md).

The user described variable hours around 10am–1pm and 2pm–7pm, with 30–60-minute consultations. The UI offers those sessions as editable suggestions for each date, not a fixed recurring timetable. Bookings default to 30 minutes with 45- and 60-minute options.

## Working flows

- Sign-in opens `/today`; the original dashboard remains at `/` and all previous routes remain available.
- The doctor explicitly opens sessions for a date. Closing a session stops new bookings but preserves existing appointments and warns staff that they still need attention. Changing hours means closing the old session and opening a replacement; existing appointments require explicit rescheduling/cancellation.
- Staff choose a patient, duration and available time, then confirm. The UI hides past starts; the booking service checks the clock again on save. New-patient registration can return directly to booking.
- Capacity is clinic-wide, including overlapping sessions. Appointments must fit entirely within one session. Reserved 15-minute units and the appointment commit together, with Firestore rules verifying ownership after the transaction.
- Booked patients can be marked arrived, started, rescheduled, cancelled or marked as not attending. Walk-ins reserve a fitting time and enter the waiting list. A full day requires extra session time or explicit rescheduling; there is no silent overbooking.
- Starting or resuming an appointment opens the same preallocated encounter. Saving the clinical record completes the appointment atomically. An accidental start can return to waiting without losing its reserved encounter ID.
- The patient record shows open appointments and offers Book a return. Review due dates remain separate from bookings, including on patient handouts. Booking does not complete an old follow-up task; staff reconcile that task explicitly after care.
- Live schedule subscriptions expose loading, errors and cached/offline states. Booking and attendance changes wait for a live connection; failed confirmation leaves the form available.
- Phone date controls and counts are compact, patient actions wrap, and booking controls receive focus when opened.

## Verification

- Lint passed.
- 19 unit/render tests passed, including configured-timezone rollover, session validation, duration/overlap availability, clinical recovery and print privacy. Print regression checks confirm that a due date no longer claims to be a reserved visit.
- 19 emulator integration tests passed together: ten existing patient/visit/stock/rules checks and nine scheduling checks. Scheduling tests cover unknown-account denial, doctor-only session management, two staff competing for overlapping time, direct-write/slot tampering rejection, 60-minute rescheduling across dates, stale changes, failed moves preserving the original booking, cancellation/no-show releasing capacity, closed sessions, atomic completion, wrong-patient rejection, and returning an accidentally started encounter to waiting.
- Existing integration fixtures now use unique run IDs, allowing repeat checks without deleting another local demo's records.
- Production build and PWA generation passed. Existing large-bundle and outdated Browserslist warnings remain.
- Browser walkthrough with synthetic records: opened afternoon hours; confirmed a one-hour booking; rescheduled it; marked arrival; started care; entered notes; returned to Today; resumed and restored the same draft; saved; verified Completed on Today. Registered a new patient through booking and confirmed direct return with that patient selected. Opened tomorrow's morning session and booked a 30-minute visit.
- Responsive checks used 1366 × 768 and 390 × 844. The inspected phone agenda had no horizontal document overflow. Physical phone/printer and full assistive-technology testing remain outstanding.

All writes during verification used the local demo Auth/Firestore emulators and synthetic fixtures. No production deployment, migration or patient-data access was performed.

## Local review

The dev app runs at [Today](http://127.0.0.1:15178/today) with `VITE_USE_EMULATORS=true`. `tests/seed-demo.mjs` seeds fictional patients and tomorrow's morning/afternoon appointments. Run it only with the local emulators active; it is explicitly configured for the demo project. Local servers and emulator data are temporary unless separately exported.

Use tomorrow's date to try a 30-minute appointment, a one-hour return, and rescheduling around the reserved slots. For the arrival/start/finish walkthrough, open today's hours and use an available time; the future-day agenda deliberately omits arrival/start controls. Do not use real patient details in this demo.

## Remaining pilot decisions and work

The initial clinic timezone is explicitly Asia/Colombo. Confirm it with the clinic before release. Appointment times reserve capacity; they cannot guarantee the doctor finishes on time. Operating rules for delays, buffers, walk-in limits and notifying patients still need her input. The app does not send reminders or messages.

Unsaved consultation recovery remains account-scoped browser-tab storage with a 24-hour limit. It is not a durable cloud draft or cross-device continuation. Registration forms also require saving before leaving. Clinical save and dispensing are still coupled for inventory-linked prescriptions; confirm her dispensing workflow before deciding whether that blocks a pilot.

This remains a single-clinic, single-capacity calendar. It has no recurring session generator, multi-doctor capacity, external calendar integration, wait-list without a reserved time, tenant isolation or automated follow-up reconciliation. Queries are scoped to a day or patient where possible, but patient lookup and pending reviews still need pagination before scale.

The next practical gate is a short observed walkthrough with the doctor using fictional cases, followed by pilot preparation: supported draft recovery requirements, print fidelity, backup/restore, PWA update/cache behavior, rules/client rollout compatibility, and a rollback rehearsal. Technical tests do not demonstrate reduced workload or sustained adoption; measure those with her before expanding to other clinics.
