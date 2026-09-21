# Implementation prompts

Use one at a time. In a new chat, paste this context first:

> Work in `D:\projects\hope-clinic-app`. Read `AGENTS.md` and `docs/RELEASE.md`. Hope Clinic was deployed on 16 September 2026; older “not deployed” notes are historical. Preserve uncommitted work. The doctor uses a laptop with phone lookup, variable hours and 30–60-minute appointments. Use synthetic local data, existing scripts and focused tests. Keep updates concise. Do not deploy unless requested below.

## 1. Preserve the baseline

> Review the working tree and preserve the implemented release in a local commit, excluding credentials and generated/test artifacts. Identify unrelated changes before staging. Check what remains for a supported single-doctor pilot. Give me only the three most important gaps. Do not rebuild or redeploy unchanged code.

## 2. Reliable unfinished consultations

> Implement explicit Save unfinished and Resume workflows. Current recovery lasts only in the browser tab. Store authenticated drafts separately from completed visits, preserve patient/appointment identity, handle conflicting edits, and prevent duplicate completion. Saving a draft must not dispense stock or complete an appointment. Add focused recovery/failure tests and a synthetic Playwright journey. Preserve existing records and keep the interface simple.

## 3. Prescribing without stock blocking care

> Separate clinical saving from dispensing. Let the doctor save treatment when inventory is inaccurate, while recording dispensing separately with visible status and retry-safe stock changes. Preserve legacy records and define corrections/reversals. Never silently bypass stock checks. Keep medicine directions explicit and require clinical review. Test failures, retries and concurrent changes with synthetic data.

## 4. Prepare and release the pilot

> Assess pilot readiness: account/clinician identity, browser persistence and sign-out, actual-device/print checks, and backup/restore readiness. Fix concrete code defects; report doctor-dependent checks briefly. Do not claim backup readiness without a restore rehearsal. Once release-blocking issues are resolved, run the existing verification suite and repeated Playwright checks, deploy the verified build with its rules/indexes, and confirm live smoke checks. Finish with a short first-session guide. Do not access production patient records for testing.
