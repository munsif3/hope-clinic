# Hope Clinic: UX assessment and product redesign plan

Reviewed 12 September 2026; finalized 13 September 2026 · Decision proposal before the next implementation phase

## 1. Recommendation

**Proceed with a substantial redesign of the daily workflow and its interface. Preserve the clinical records foundation. Validate the proposed workflow with the doctor before building the next major phase.**

Hope Clinic has a useful recordkeeping core, but the doctor still has to coordinate the day, reconstruct patient context, and complete a substantial form herself. Those are central to the burden this product was meant to remove. A visual refresh alone would leave most of that work intact.

The strongest product opportunity is a dependable assistant for a solo practitioner: **know who is coming, see what matters about the patient, record today's decisions once, and leave with the next step settled.** That is the proposed product promise. Broad clinic administration should grow from a successful daily workflow.

The user has confirmed **laptop as the primary consultation device, with phone access for checking information**. Design a comfortable laptop workspace and a focused phone reading experience. Typing/dictation language, actual laptop resolution, appointment volume, assistant involvement, and the reason for stopping remain unverified.

This report proposes changes; it does not implement or deploy them.

## 2. Evidence and limits

The assessment combines the repository review, the earlier production walkthrough, the first local reliability implementation, and a fresh walkthrough of the local app with synthetic records. The current local app includes fixes that have **not been deployed** to the production site. Findings below refer to that local baseline unless stated otherwise.

The review covers the authenticated shell, dashboard, registration and patient search, patient history, consultation and prescription entry, investigations, follow-ups, visit search, inventory, print, login, recovery, and phone layout. It is an expert inspection, not an observed usability study or a complete accessibility certification.

Two useful measurements from the synthetic demo:

- At **1366 × 768**, a blank consultation form had **11 input/select/textarea controls**, before adding any prescription or investigation rows. Its rendered form height was approximately **1,486 px**; the main content's scroll height was **1,634 px**. Scrolling is not inherently bad, but here the space is consumed without showing prior treatment or allergy context.
- At **390 × 844**, the patient page's main region had a **375 px client width and 449 px scroll width**. The header visibly clipped the New Visit action. Visit History began around **898 px from the viewport top**, beneath demographics and mostly empty history sections. The local demo banner contributes to vertical positioning; these are measurements of this fixture and viewport, not universal production values.

The user's report of two months of use followed by abandonment is the key adoption signal. Data-entry burden is a credible hypothesis, supported by the workflow inspection, but it is **not a proven explanation**. Other possibilities include duplicate paper work, weak scheduling value, connectivity, difficulty retrieving previous treatment, or changes in her practice. Do not infer usage volume or the exact year of abandonment from this report.

## 3. What the app already does well

- It covers a coherent clinical journey: patient records, encounters, treatment, investigations, follow-ups, dispensing information, and paper output.
- Medical concepts remain explicit. Preserve this clarity when extracting reusable components.
- Readable base typography, familiar controls, patient search, and recognizable navigation provide a workable starting point.
- Printed treatment is a practical bridge to the doctor's existing workflow and to patients who will not use an app.
- The first local implementation improves structured treatment history, recovery after reload, save integrity, follow-up linkage, clinician attribution, and separation of private notes from patient instructions.

Keep those gains. The reliability pass was necessary, but it did not substantially shorten the workflow. For example, separating patient instructions was the right privacy change while also adding another prominent field to an already long form. The redesign should make that distinction easier to use.

## 4. Screen and workflow assessment

Priority meanings: **High** directly affects the principal daily job, record confidence, or frequent task completion; **Medium** affects efficiency, discoverability, or secondary work. These are expert judgments, not numerical usability scores. Observed structure is high-confidence; its effect on this doctor's adoption needs validation.

| Area | Current observation | Likely consequence | Priority and proposed response |
| --- | --- | --- | --- |
| Dashboard | Performance cards and large revenue/visit charts precede the expected-consultation list. New Visit and Add Patient are prominent, but start separate paths. | The first screen does not answer who needs attention next. | **High:** replace the landing hierarchy with Today; make reporting secondary. |
| Scheduling | Return dates/times create follow-ups. There is no capacity-based booking workflow with availability or a waiting queue. | A date can look like an appointment without having reserved capacity. The original timing problem remains. | **High:** distinguish review due from booked appointment; introduce working sessions, slots, buffers, and explicit exceptions. |
| Navigation | Dashboard, Patients, Visits, Inventory are top-level; Follow-ups is reached through the dashboard. A 288 px sidebar consumes laptop space. | Users navigate database categories and have to remember where actionable work lives. | **High:** Today, Patients, Follow-ups as primary tasks; quieter access to medicines, past consultations, and reports. |
| Registration | Five demographic controls plus four history sections. Name, age, contact are required; gender defaults to Male. Save returns to the patient list. | Considerable perceived work before first value, possible inaccurate default, and a break before starting care. | **High:** quick registration with a direct continuation; collect additional history in context. Confirm the minimum safe identity fields with the doctor. |
| Finding a patient | Name/contact search and patient cards; the consultation selector shows names without useful disambiguation. | Same-name patients and shared family numbers need extra checking; users may create duplicates. | **High:** searchable results with a second identifier and last-seen context; show possible matches before creation. Never auto-merge by phone. |
| Patient history | History categories and visits expand down the page. Allergies sit after other history. Latest treatment is now visible, but not alongside new entry. | Reading and writing are separated; the doctor must remember or navigate back to previous information. | **High:** patient summary plus compact timeline; keep safety context and last treatment visible during consultation. |
| Consultation | Long vertical form, early date/time and diagnosis, multiple text areas, optional empty sections, final save at the bottom. No previous-treatment panel. | The interface asks for completion of a record instead of helping record the changes in today's encounter. | **High:** one consultation workspace with progressive sections, visible context, and persistent actions. |
| Prescriptions | Each added row exposes medicine, quantity, dose, frequency, duration, directions. Autocomplete is inventory-oriented; no reviewed reuse of the last treatment. | Repeat visits still require substantial transcription; stock setup intrudes into care. | **High:** clinician-owned favorites and selected, reviewed reuse; distinguish prescribing from dispensing. Retain clinically necessary detail. |
| Investigations | Separate optional list with a large empty state. | Secondary work takes attention even when unused. | **Medium:** compact Add investigation disclosure; keep advised tests distinct from received results. No results workflow is currently established. |
| Follow-ups | Start Visit is now present, alongside View Profile and Mark Done. Rescheduling is not a first-class action here. | Administrative closure can be confused with an encounter; recommended returns can be treated as confirmed bookings. | **High:** due / booked distinction, reschedule and close-with-reason actions, visit-linked completion. |
| Visits search | Search filters the most recent 50 fetched visits; clicking a visit takes the user to the patient profile. | An older encounter may appear absent; the apparent encounter link requires more searching. | **High for record retrieval:** show search scope immediately, then implement indexed pagination/search and direct encounter access. |
| Inventory | Stock, pricing, cost, supplier, and expiry dominate the medicine workflow. A stock-linked save currently fails if stock is insufficient. | Inaccurate inventory can prevent saving the clinical encounter. | **High:** record care and track dispensing as separate operations with explicit reconciliation; this requires a data/service change. |
| Print | Local version previews before printing, uses stored clinician identity, and separates private notes. | Valuable continuity with paper; full consultation layout is unnecessary for patient handoff. | **Medium:** preserve familiar print structure, add a clear finish-and-preview path, validate actual printer and multipage output. |
| Phone | Patient header overflow and reading order fail the quick-check use case; navigation is hidden in a menu. | Important actions and recent care take effort to reach. | **High:** prioritize Today, search, patient summary, latest treatment, and next return; validate every key header with long names. |
| Errors and recovery | Local consultation has better recovery and errors, but drafts are tied to a tab and expire. Several other pages still use alerts or console-only failure paths. | A reassuring save message can be misunderstood; an empty list can be mistaken for no records after failure. | **High:** consistent loading/empty/error/retry states and precise saved/unsaved language; design durable unfinished work before promising it. |
| Login and return to use | Basic email/password login; no guided return, device setup, or recovery help in the interface. | Months away may make restarting harder, particularly if the app appears to require a backlog. | **Medium:** make finding an existing record the first useful action; add account recovery/help and a short practice setup. |

The design principles behind this assessment are visibility of status, recognition over recall, useful defaults, and emphasis proportional to task importance. These align with established [Nielsen Norman Group usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/). The app-specific judgments above come from this review.

## 5. Proposed product structure

### Laptop: organize around a clinic day

**Today** is the landing page at the existing `/` route. It should answer: who is booked, who is here, which consultation is open, and what needs resolution before closing.

Primary navigation: **Today · Patients · Follow-ups**. Secondary navigation: **Medicines · Past consultations · Reports**, with practice settings in a quieter location. Existing routes remain valid; labels and navigation grouping can change without breaking links. New domain routes must be additive and documented. Reports should contain the existing charts once that destination is implemented.

Today should begin with the date, working session, patient search, and Book appointment / Add walk-in. Use an agenda with time, patient identity, attendance state, and a context-specific action. Keep an unfinished-consultations area visible once durable drafts exist. Completed work and end-of-day totals can collapse below the active list. Follow-ups due without a booking appear separately, never as invented appointment slots.

Prefer a day agenda initially. A full calendar grid can follow if weekly planning proves useful. Do not create a queue that needs constant manual maintenance; infer transitions from booking, arrival, starting, and finishing wherever appropriate, while allowing correction.

### Laptop: consultation workspace

Proposed spatial structure, to be tested at 1366 × 768 and the doctor's actual laptop:

```text
Compact nav | Patient identity · age context · record number | Date / time
            | Allergy status and key cautions               | Save status
            |-----------------------------------------------------------
            | Today's consultation               | Patient context
            | Reason / change since last visit   | Last visit and date
            | Assessment and clinical notes      | Previous treatment
            | Treatment and patient directions   | Relevant history
            | + Investigation / other details    | Open full timeline
            |-----------------------------------------------------------
            | Save unfinished       Review & finish       More actions
```

Use roughly two-thirds of the content width for entry and one-third for context, subject to actual fitting. Keep global navigation compact enough that prescription controls remain readable. The patient header and action area remain available without obscuring focused fields. Prefer one main document scroll over several competing scroll regions.

This is one flexible workspace, with section links if needed. A mandatory multi-step wizard would introduce unnecessary navigation when the doctor moves between history, symptoms, and treatment during a conversation.

The common follow-up path should be: choose patient → see previous treatment and allergy status → record today's changes → review treatment → settle the return plan → finish. A new patient should enter the same workspace after quick registration, with additional history available in context.

### Phone: a companion for checking information

The first phone release should prioritize:

1. Today's agenda and patient search.
2. Patient identity, allergy status, latest consultation, and previous treatment.
3. The next booked appointment and separately any review due date.
4. Clear access to older history and patient-facing print/document preview.

Use a short visible navigation bar, stacked readable summaries, wrapping headers, and full-width primary actions. Keep empty sections collapsed. Desktop context moves into a patient-summary panel rather than becoming an equally long stack above the task.

The user requested checking information on the phone; do not make full phone consultation entry a prerequisite for the first successful release. Preserve existing access while making the reading experience excellent. Cross-device draft continuation is a separate capability and must not be implied by phone access to saved records.

## 6. Reduce entry while preserving clinical meaning

| Information | Proposed handling | Important boundary |
| --- | --- | --- |
| Patient identity | Search before registration; capture agreed minimum; continue directly to consultation. | Shared phone numbers are valid; unknown contact needs an explicit path. Do not silently invent missing demographics. |
| Age | Show existing age with its recording context; consider DOB or approximate age with an as-of date in the data plan. | Do not infer an exact DOB from legacy age or silently increment an age of uncertain provenance. |
| Allergies | Prominent recorded allergies, explicit unknown status, or a clinician-recorded negative finding. | An empty old array does not mean no known allergies. Do not preselect negative findings. |
| History | Show existing facts and let the clinician update what changed. Secondary categories expand on demand. | Important cautions remain visible; disclosure must not conceal safety information. |
| Date/time | Default from the encounter start and make correction available. | Corrections must remain possible; clinic time zone must be explicit when generalizing. |
| Assessment | Use language agreed with the doctor; allow an unfinished draft without a finalized diagnosis. | Provisional assessment must remain distinguishable from a final diagnosis. Define completion rules before changing validation. |
| Treatment | Favorites and selectable previous rows, with source date and explicit review of dose, frequency, duration, directions, and dispensing quantity. | No silent repeat prescription, inferred treatment, or automatic diagnosis carry-forward. Historical directions are not necessarily current. |
| Notes and instructions | Keep private clinical notes and patient-facing directions distinct, with short contextual labels and preview. | No automatic publishing of private notes; avoid asking for the same instructions in multiple places. |
| Fees | Clinic defaults and optional overrides, with fees settled during finish when relevant. | A missing amount is not necessarily a zero payment; collection status needs a defined model if introduced. |
| Return plan | Offer No return planned, Review due, or Book appointment, with clear date/time semantics. | A suggested review date alone must not claim a reserved slot. |
| Dictation | Optional, clinician-reviewed entry after testing her language and browser. | Current recognition is fixed to en-US. Browser/service processing and privacy need evaluation before relying on it. Typing must work well independently. |

Use her actual medicine names, formulations, units, abbreviations, and paper prescription examples to shape the catalog. The current examples lean toward conventional tablet prescriptions. Adapt terminology to Unani practice through observation; avoid inventing specialized clinical fields without a demonstrated need. Generalize the shared workflow while keeping medical labels explicit.

Removing redundant entry within a process also supports accessibility. [WCAG's redundant-entry guidance](https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html) concerns repeated information in the same process and has exceptions; it does not justify copying clinical information across encounters without review.

## 7. Scheduling must define a real operating policy

A stronger calendar interface cannot establish strict timing by itself. Agree how the practice will run:

- Working days and sessions, time off, session capacity, and appointment duration defaults that can vary between new and returning patients.
- Buffers and a deliberate allowance for walk-ins; avoid filling every minute on paper.
- A distinction between the booked time and the actual start. Show delays honestly rather than claiming precise predictions without evidence.
- Arrival, start, completion, late arrival, no-show, cancellation, and rescheduling actions with recoverable corrections.
- Visible conflict handling. Prevent accidental double booking in the service layer; deliberate exceptions must be explicit and attributable.
- Follow-up recommendations that can exist without appointments. Finishing care can create a due date or reserve capacity; these are separate decisions.

Proposed appointment states: **Booked → Arrived → In consultation → Completed**, with Cancelled / No-show alternatives. Encounter states such as Draft / Finished belong to the clinical record, not the appointment. Finishing a walk-in encounter must work without a pre-existing booking. A follow-up can be closed without a visit, but that action needs a reason and must not manufacture a consultation.

Keep reminder delivery out of the first redesign dependency chain. A clearly communicated time on the patient handout plus a useful agenda is already testable. Add messaging only after booking behavior, consent/preferences, delivery failures, and cancellation updates are designed.

## 8. Visual and interaction direction

Aim for a calm, readable clinical workspace with a clear hierarchy. The current large cards, gradients, animation, and equal-weight blocks make routine actions compete. A coherent design system should support tasks:

- Retain readable body text around 16 px; reduce excess containers and spacing before reducing type size. Use compact rows for agendas and history, generous controls for entry.
- One primary accent, neutral surfaces, restrained borders, and semantic colors for status. Important states have text and icons as well as color.
- One clearly dominant action per task area. Distinguish starting, saving unfinished work, finishing an encounter, and printing.
- Remove persistent decorative pulsing from active navigation. Honor reduced-motion preferences.
- Visible labels, keyboard operation, predictable focus order, accessible autocomplete, named icon buttons, and field errors linked to an error summary. Move focus to the error when submission fails.
- Distinguish Loading, No records, No matches, and Could not load. An error must not look like an empty clinic.
- Use concise save messages: Saved to clinic with time after acknowledgement; Unsaved changes / Saving / Could not save otherwise. Keep recovery details in accessible supporting help. Until durable drafts are implemented, continue to explain the current tab-only limitation honestly.
- Design for text zoom, long names, lengthy medicine names, multiple prescriptions, and many years of history. Global overflow hiding is not a fix for clipped content.

Use **44–48 px** targets for important touch controls as a product comfort target. WCAG 2.2 AA's target-size criterion specifies **24 × 24 CSS px**, subject to spacing and other exceptions; the larger design target is not a claim about that minimum. Verify against the [W3C target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html). Measure contrast and keyboard behavior during implementation; this assessment does not certify compliance.

## 9. Changes that need more than UI

| Capability | UI work | Required underlying work |
| --- | --- | --- |
| Today / appointments | Agenda, booking panel, attendance actions, conflict feedback | Appointment records, working sessions, capacity checks, time-zone rules, authorization and concurrent booking handling |
| Save unfinished and resume | Status, resume list, discard/recovery experience | Durable account/clinic-scoped drafts, revision conflicts, retention rules; current session storage cannot deliver cross-device continuity |
| Repeat treatment | Select and review previous prescription rows | Safe copy semantics and validation; never carry inventory consumption, identifiers, or old visit completion effects forward |
| Prescribe independently of stock | Separate treatment decision and dispensing status | Separate clinical save from inventory mutation, with idempotent dispensing and a visible reconciliation path; do not simply remove the current stock check |
| Search all history | Search scope, filters, direct encounter view | Paginated/indexed queries and query limits; all-patient client loading will not scale indefinitely |
| Trusted-device behavior | Clear saved/offline/account states and device help | Review persistent Firestore cache, service-worker caching, sign-out behavior, and update delivery before promising privacy or offline synchronization |
| Generalized clinics | Configurable clinic identity, hours, fees, medicine terminology, print details | Tenant isolation, membership, role permissions, migration and backup/restore validation before any second clinic has access |

Keep the existing routes, medical structures, legacy prescription display, attribution behavior, and safe print boundaries. Introduce schema changes additively with a documented compatibility/migration plan. The current single-clinic role checks do not establish safe separation between clinics.

## 10. Phased delivery plan and gates

Indicative effort below assumes one experienced developer, timely access to the doctor, and reuse of the current React/Firebase app. These are planning ranges, not committed dates; refine after prototype validation. Pilot time is elapsed clinic time, additional to implementation effort.

### A. Observe the work and validate the design — 3–5 focused days

Conduct a short interview about the last successful session and the first abandoned session, then observe a representative clinic session with appropriate patient consent. Study new patients, repeat patients, walk-ins, interruptions, and end-of-day work. Use synthetic cases for prototype tests; do not export clinical records into design tools.

Produce a field-by-field keep/default/defer/reuse decision, the minimum finished-record requirements, appointment operating rules, and a clickable prototype of Today, patient summary, consultation, and booking. Include a phone version of Today and patient history. Test alternatives for the consultation layout before polishing every screen.

**Gate:** the doctor can find a patient, explain the previous treatment, record a follow-up, and arrange a return without coaching; no wrong-patient ambiguity or hidden save-state uncertainty. Revise the prototype where she hesitates. Her language and actual hardware are confirmed.

### B. Build the consultation redesign and shared UI foundation — 1–2 weeks

Build accessible controls, shell hierarchy, patient search/quick registration, the patient context panel, progressive consultation sections, reviewed treatment reuse, consistent errors, and the finish/print flow. Address the phone header/reading-order defects in this slice. Include a durable-draft design and implementation if Save unfinished is exposed as a supported workflow; otherwise keep its existing limitations explicit and omit cross-device claims.

Keep changes behind a development/pilot boundary until legacy and current records render correctly. Preserve the reliability fixes from the first implementation.

**Gate:** new and returning patient tasks work end to end with reduced administrative entry; reload, failure, wrong-patient prevention, and print content checks pass. The doctor's existing records remain readable. All essential controls work with keyboard and at target viewports.

### C. Build Today and dependable scheduling — 1–2 weeks

Implement working sessions, appointment creation/rescheduling, walk-ins, clear attendance states, consultation linkage, and the due-versus-booked distinction. Give follow-ups a direct navigation entry. Complete stock/clinical-save separation if observed dispensing behavior would otherwise block the pilot.

**Gate:** two simultaneous bookings cannot silently take the same capacity; cancellations/reschedules release it correctly; a walk-in and an interrupted encounter can be handled; displayed times and return handouts agree. Stock discrepancies do not erase work or silently falsify dispensing.

### D. Prepare and run a supported pilot — 3–5 preparation days, then 2 and 6 week reviews

Prepare the doctor using several synthetic encounters on her laptop and phone. Agree a small initial operating scope, support contact, rollback procedure, record backup/restore arrangements, and when paper duplication can end. Do not require historical back-entry or a complete medicine inventory before the first useful session. Bring older records forward as patients return.

Release to the existing clinic only after app/rules compatibility, cache/update behavior, and actual printing have been checked. Observe the first session and collect friction without logging clinical content. Review at two weeks, fix the highest-burden steps, and assess sustained use at six weeks.

**Gate:** regular voluntary use on clinic days, less end-of-day administrative work, and no unresolved record integrity or privacy failures. Continued dependence on the developer to complete ordinary visits means the workflow needs more work.

### E. Generalize after the pilot demonstrates value

Test the shared workflow with a small number of other solo practitioners, including at least one with different terminology or dispensing practices. Separate essential common behavior from configuration. Establish clinic isolation and roles before onboarding another clinic; then add onboarding, clinic settings, import/export, support, and only the integrations validated by actual demand.

Defer a patient portal, native mobile app, billing suite, automatic clinical documentation, automated treatment suggestions, and extensive analytics until they address a demonstrated limitation. A subscription/pricing decision needs willingness-to-pay and support-cost evidence, not feature count.

## 11. Acceptance scenarios and success measures

Test complete jobs, not whether individual screens look attractive:

| Scenario | Acceptance evidence |
| --- | --- |
| Same-name returning patients sharing a number | Doctor reliably selects the intended person using visible secondary identity; no automatic merge |
| Quick new patient | Registration continues directly to care; omitted history remains unknown, not falsely negative |
| Repeat treatment with one change | Source encounter is clear; doctor reviews the selected rows; old dates/quantities are not silently reused as new dispensing |
| Incomplete assessment interrupted by another patient | Work is explicitly unfinished and recoverable within the supported device/session model; no fake completed encounter |
| Slow connection, failed save, reload, concurrent edit | Honest save status, preserved work, recoverable conflict; no duplicate finished visit |
| Booked patient arrives late while a walk-in is waiting | Agenda remains understandable and rescheduling is possible without hidden overbooking |
| Review due without a booking | Appears as a follow-up task, not a guaranteed slot; can be booked or closed with reason |
| Medicine stock is wrong | Clinical work is retained; dispensing discrepancy remains visible and attributable |
| Phone check | Latest treatment and next return are easy to find; long names and actions fit; no dependence on desktop hover |
| Long printed prescription and legacy record | Patient instructions remain separate from private notes; correct attribution and legible multipage output |

Measure a baseline first. Proposed pilot targets are hypotheses to agree with the doctor:

- **Primary outcome:** lower administrative time per encounter, including after-hours completion. Compare similar visit types; do not optimize for shortening clinical conversation. Aim initially for at least a 30% reduction from the observed baseline.
- **Retrieval:** find the intended patient and explain the latest treatment within roughly 20 seconds in a representative scenario. Track errors as well as speed.
- **Adoption:** by week six, aim for use on at least 80% of clinic days and capture of at least 80% of encounters within the agreed pilot scope, without developer prompting. Define denominators with her; do not count days the clinic was closed as non-use.
- **End-of-day burden:** unfinished work is visible and declining; compare time spent finishing notes against baseline. Fewer drafts is not automatically better if it encourages incomplete final records.
- **Scheduling:** track booking conflicts, proportion with communicated times, and waiting-time distribution where arrival/start data are reliable. Clinical overruns and patient lateness require interpretation.
- **Guardrails:** no lost records, wrong-patient saves, unreviewed copied treatment, duplicate completion, or private notes in patient output in acceptance testing. Any such failure blocks rollout rather than being averaged into a success rate.

For this small pilot, observation and a short end-of-session diary may be more useful than analytics infrastructure. If events are later instrumented, collect only approved minimal task/status/timing data; exclude names, phone numbers, diagnoses, prescriptions, notes, and free text. Do not use session replay on clinical screens. Report counts alongside percentages for a small sample.

## 12. Decision for the next phase

**Replace the proposed feature-first next step with a short workflow prototype and validation phase, then implement the consultation workspace and Today as two coherent slices.** Keep the existing reliability work, and use it as the base of the redesign.

The redesign is successful if she can spend the consultation looking at the patient, retrieve the last treatment without searching through files, and end the session with a credible plan for who comes next. More screens or a more polished dashboard are not sufficient evidence of that outcome.

## Repository evidence map

Line references are from the working tree on 12 September 2026 and may move during implementation.

| Evidence | Source |
| --- | --- |
| Dashboard order and follow-up placement | `src/pages/Dashboard.jsx:176`, `:246`, `:290`, `:323` |
| Navigation, fixed sidebar width, animation, overflow | `src/components/Layout.jsx:34`, `:65`, `:104`, `:126` |
| Registration default and continuation | `src/pages/PatientForm.jsx:17`, `:107`, `:134`, `:203` |
| Clinical form, language, and final action | `src/pages/VisitForm.jsx:122`, `:272`, `:321`, `:377`, `:408` |
| Patient action/header and history order | `src/pages/PatientDetails.jsx:80`, `:93`, `:114`, `:125` |
| Prescription field density and inventory relationship | `src/components/PrescriptionListInput.jsx` |
| Generic repeated list labels | `src/components/DynamicListInput.jsx` |
| Search scope and indirect encounter navigation | `src/pages/Visits.jsx:18`, `:60`, `:113` |
| Follow-up actions | `src/pages/FollowUps.jsx:107`, `:116` |
| Inventory-linked clinical save | `src/services/saveVisit.js:33`, `:40`, `:78` |
| Print/privacy baseline | `src/pages/PrintVisit.jsx`, `src/components/VisitPrintout.jsx` |
| Device/cache dependency | `src/config/firebase.js`, `vite.config.js`, `src/utils/visitDrafts.js` |
| Prior review and already completed work | `docs/PRODUCT_REVIEW.md`, `docs/IMPLEMENTATION_01.md` |
