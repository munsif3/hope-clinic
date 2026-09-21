# Consultation workflow implementation

16 September 2026

## Decision and scope

This implements the consultation slice of phase B in [the UX assessment](UX_PRODUCT_ASSESSMENT.md), following the [synthetic prototype](PROTOTYPE_REVIEW.md). The main opportunity is reducing repeated entry and the navigation needed to recover a patient's previous treatment. A visual reskin alone would not address either burden.

The working app now supports a clearer sequence: identify the patient, check allergies and previous care, enter today's assessment and treatment, review, save, and preview the patient handout. Laptop consultation and phone lookup remain the target uses. The doctor's usability session is still outstanding; technical completion is not evidence that she will adopt the workflow.

This is a local implementation, not a production release. No production records were used or changed during verification. Existing routes and Firestore collection structures are retained. The broader Today/scheduling prototype remains separate from the working application.

## What changed

- Patient search accepts names, record IDs and contact numbers with punctuation. Results show secondary identity and distinguish opening a record from starting a consultation.
- Registration puts identity and allergies first, with secondary history behind disclosures. Save & start consultation continues directly into the selected patient's encounter. Name, age and contact remain required pending a clinical/product decision about minimum identification. Gender defaults to unrecorded.
- Matching names or shared contact numbers prompt an explicit identity check; the app does not merge patients or assume a shared number is unique.
- Patient saves use a stable document ID and a transaction. Repeated creation with that ID is rejected, stale edits cannot overwrite a newer revision, and edits preserve unknown legacy fields. Duplicate detection is advisory, not a database uniqueness constraint across independently created records.
- The consultation places patient identity, allergy information and previous care alongside entry on wide screens, and stacks them on narrower screens. The context uses the same page scroll so long history cannot trap lower controls offscreen.
- Optional notes, investigations, fees and follow-up details are progressively disclosed. Existing recorded values remain available. Private notes and patient-facing instructions remain distinct.
- Selected structured medicines can be reused from a dated previous encounter. Only clinical text is copied; previous quantities, inventory links and encounter metadata are cleared. Historical free-text treatment stays readable and is not silently converted into medicine rows.
- A final review dialog shows identity and treatment before saving. Structured prescriptions require an explicit review acknowledgement. The existing atomic visit save, stock handling, follow-up handling and conflict checks remain in place.
- Patient headers and medicine fields adapt to narrow screens. Follow-ups now have a direct navigation entry.

## Reliability boundaries

The form continues to describe recovery as a temporary copy in this browser tab, not a saved clinic record or cross-device draft. It does not expose a cloud-backed Save unfinished workflow. Patient registration must be saved before leaving; it is not covered by consultation recovery.

Previous encounter context excludes other patients, the encounter being edited, and encounters later than the selected date/time. Context retrieval failures are shown with retry rather than presented as an empty history. Unrecorded allergies remain explicitly unknown.

The new patient transaction is a client workflow safeguard backed by existing authenticated rules. It does not establish clinic tenancy or guarantee that older application clients use revision checks. Patient lookup still loads the patient collection and context loads the selected patient's visit history; pagination/index strategy remains necessary before scaling.

Follow-up date/time is still a return plan, not a capacity-checked booking. Manually inventory-linked prescriptions still participate in the existing dispensing transaction. Clinical-save/dispensing separation requires its own design and compatibility work.

## Verification

All checks used synthetic fixtures and local Firebase Auth/Firestore emulators.

- `npm.cmd run lint`: passed.
- `npm.cmd test`: 15 unit/render tests passed, including identity lookup, legacy allergy rendering, chronological context, safe treatment reuse, recovery and print privacy.
- Emulator integration: seven existing visit/rules tests passed, followed by three added patient/reuse tests in a separate filtered run. Added coverage verifies required registration fields, simultaneous retries with one document ID, stale patient edits, legacy field preservation, and reuse without stock deduction.
- `npm.cmd run build`: passed, including PWA generation. Existing large-JavaScript-bundle and outdated Browserslist warnings remain.
- Browser: registered a synthetic patient sharing an existing contact after identity acknowledgement; continued into consultation; edited and saved the patient; reused selected treatment with blank quantity; restored a consultation after reload; exercised treatment review; saved and reopened the encounter; inspected print preview with patient instructions present and private notes absent.
- Responsive inspection: laptop at 1366 × 768 and phone at 390 × 844. No horizontal content overflow in the inspected phone state. Temporary viewport overrides were reset.

Physical printing, real-device performance, complete keyboard/assistive-technology coverage, production cache/update behavior, and observation with the doctor remain release checks. A successful build does not prove those behaviors.

The running local demo for this review is [the patient directory](http://127.0.0.1:15178/patients). It depends on the local dev server and emulators remaining active. Synthetic fixture setup is in `tests/seed-demo.mjs`; emulator configuration is in `firebase.emulator.json`. The integration command in `package.json` launches a fresh emulator test run; rerunning the original fixed-ID tests against an already populated emulator requires a fresh isolated test instance.

## Next delivery slice

Implement Today and dependable scheduling as phase C: clinic sessions and capacity, create/reschedule/cancel, walk-ins and attendance, encounter linkage, and clear review-due versus booked states. Document the additive storage/rules migration before implementing writes, and test concurrent bookings and released capacity rather than relying on client-only slot checks.

Confirm actual session hours, new/repeat appointment durations, walk-in policy, dispensing practice, typing language and unfinished-work expectations with the doctor. The prototype's sample hours and durations are examples, not clinic policy. Use her walkthrough to adjust this consultation implementation before a supported single-clinic pilot; multi-clinic onboarding follows proven use and tenant isolation.
