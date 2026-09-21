# Workflow prototype: review guide

13 September 2026

## Open the prototype

From the repository, run `npm.cmd run dev -- --host 127.0.0.1 --port 5182 --strictPort`, then open [the workflow prototype](http://127.0.0.1:5182/prototypes/clinic/index.html).

Source lives in `prototypes/clinic/`. This is a separate Vite entry with its own styles. It imports React and icons only, with no Firebase connection, clinical data, authentication changes, or persistent storage. Reloading resets every example. The normal production build does not include this entry. Nothing has been deployed.

The prototype advances phase A of the [UX plan](UX_PRODUCT_ASSESSMENT.md). Observation and validation with the doctor remain outstanding; the design has not been validated by her.

## What is interactive

- Today: agenda, arrival, starting/resuming consultations, patient search, registration, and adding a walk-in.
- Patient search: same-name examples with different record numbers and ages, including a shared contact number.
- Patient summary: allergies, latest treatment, history disclosure, future appointment and unbooked review information.
- Consultation: optional notes/investigations, medicine rows, reviewed reuse of previous treatment, patient advice, return plan, unfinished work, final review.
- Booking: example evening sessions, 30/60-minute duration, unavailable overlapping slots, and explicit booking confirmation. A time selected during consultation is reserved only on finish; finishing checks for a new conflict.
- Finish and handout: treatment review gate, required assessment, completed agenda state, a patient-facing preview that excludes private notes.
- Phone: visible navigation, search above the agenda, wrapping patient actions, recent treatment before secondary history.

The scenario date is intentionally fixed at 13 September 2026. The medicine and clinical text are fictional placeholders; they are not suggestions for treatment. The sample duration, session hours, minimum patient fields, and completion requirements are design choices for discussion.

## Suggested walkthrough with the doctor (20–30 minutes)

Use fictional entries throughout. Let her attempt each task before explaining the controls. Record hesitation, backtracking, and information she needs but cannot find. Ask what she expected after an action rather than whether she likes the screen.

| Task to give her | What to observe | Decision to make |
| --- | --- | --- |
| “The 16:00 patient has arrived. Find what you prescribed previously and start today's follow-up.” | Does Today make the next action clear? Does she notice identity and allergy context? | Agenda hierarchy and patient-context placement |
| “There are two Amina records. Find the 61-year-old patient.” | Does she use the second identifier? Is the shared phone confusing? | Identity fields in search and headers |
| “Keep one previous treatment, change its duration, and leave patient advice.” | Is reviewing/reusing faster than typing? Does the review step feel useful? | Prescription row fields and review controls |
| “You are interrupted before finishing. Return to Today, then resume.” | Can she distinguish unfinished work from a completed record? | Draft wording and real recovery requirements |
| “Arrange the return for next week at a definite time.” | Does she understand the difference between a review due date and a booking? | Booking rules and return-plan controls |
| “Finish this visit and look at what the patient takes home.” | Does she recognize the handout? Are private notes and advice clearly separate? | Print content and finish sequence |
| “A new patient arrives without a phone number.” | Can she begin without completing a full file? What identification is missing? | Minimum registration fields; do not infer clinical policy from this prototype |
| “On your phone, find the latest treatment and next return.” | Is the reading order useful? Are controls readable without zoom? | Scope of phone use and summary density |

Also try booking a 60-minute appointment on the example day: 17:00 is unavailable because it overlaps the 17:30 booking, while 18:00 fits. This demonstrates capacity reasoning, not a production booking guarantee.

## Questions to settle before implementation

1. What language does she use for typing and writing prescriptions? Is dictation actually desirable?
2. How long are new and repeat appointments, and how much walk-in/buffer capacity does she want?
3. Does she dispense medicines herself, and are stock counts dependable enough to use during care?
4. Which fields must be present to identify a patient and finish an encounter? How should provisional assessments be represented?
5. Does she need unfinished work to survive browser closure, power loss, or switching devices? The prototype demonstrates the interface only.
6. Which parts of her existing paper prescription must remain familiar? What would let her stop duplicate entry?

## Boundaries of this prototype

It is an interaction model, not a replacement clinic application. No real offline recovery, cross-device continuation, reminder delivery, server-side conflict prevention, dispensing, billing, record editing, file uploads, or authentication are implemented here. The sample uses one new completed encounter per patient; it is not a historical-record storage model. It has no reschedule/cancel/no-show flow yet. Those states belong in the subsequent scheduling prototype iteration if the core concept is accepted.

Age/contact are optional solely to explore entry burden. The doctor must validate registration and finalization rules before they change in production. Existing negative/unknown allergy semantics, legacy records, print behavior, and role checks remain governed by the real app.

No automatic acceptance is inferred from a successful technical walkthrough. The next product gate is the doctor's ability to complete these scenarios with less effort and without coaching. Her observations should determine the next revision before the prototype is connected to clinical data.

## Technical verification

- Repository lint passes.
- Existing production app builds successfully; existing large-bundle and outdated Browserslist warnings remain. This verifies the application baseline, not a production build of the prototype.
- Existing ten unit/render tests pass.
- Browser walkthrough verified synthetic entry, selected treatment reuse, unfinished/resume, treatment-review validation, finishing with a return booking, and patient handout privacy.
- Phone patient summary checked at 390 px; narrow agenda checked at 320 px with no horizontal document overflow in the tested states.
- Booking duration check verified that a 60-minute visit cannot start at 17:00 across the existing 17:30 appointment or at 18:30 beyond session close.
- Physical phone, printer, assistive-technology testing, and doctor usability sessions are still required before implementation acceptance.
