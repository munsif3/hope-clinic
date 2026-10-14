# Hope Clinic - foundation documents

These are the documents that would normally exist before building a clinical app. They were written retrospectively in October 2026, about ten months after development started, against the code as deployed on 16 September 2026.

| Document | Answers | Main audience |
| --- | --- | --- |
| [Business Requirements (BRD)](BRD.md) | Why the app exists, for whom, what success looks like, scope, business rules, open decisions | The Doctor, sponsor |
| [Software Requirements (SRS)](SRS.md) | What the system must do, testable requirements with status and traceability to code and tests | Developer, reviewer |
| [Technical Design (TDD)](TDD.md) | How it is built: architecture, decisions, data model, security rules, write flows, testing, release, debt | Developer, maintainer |
| [Data Protection and Security Assessment](DATA_PROTECTION.md) | What personal and health data is held, where, who can see it, risks, backup and incident plan | The Doctor, sponsor |

## How they relate to the older notes in `docs/`

The files one level up are working notes from the September 2026 review and implementation cycle. They are still accurate for their slice, and these foundation documents link to them rather than repeat them.

| Older note | Role now |
| --- | --- |
| `PRODUCT_REVIEW.md`, `UX_PRODUCT_ASSESSMENT.md` | Evidence behind the BRD's problem statement and hypotheses |
| `SCHEDULING_MODEL.md` | Detailed contract for the scheduling part of the TDD |
| `RELEASE.md` | Operating procedure for the TDD's release section |
| `IMPLEMENTATION_01-03.md` | Change history for what the SRS marks as Built |
| `PROTOTYPE_REVIEW.md`, `PILOT_INSTRUCTIONS.md`, `IMPLEMENTATION_PROMPTS.md`, `NEXT_STEPS_HANDOFF.md` | Pilot planning |

## Keeping them current

- Update the SRS status column in the same pull request that changes behaviour.
- Add an ADR row to the TDD for any decision that changes the data model, rules or hosting.
- Record the Doctor's answers to the BRD's open decisions as they come, then change the affected requirements.
- Re-run the Data Protection review when anything in its section 11 triggers.
