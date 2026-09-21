# Scheduling: additive storage and rollout contract

16 September 2026. First implementation is for the existing single-doctor clinic.

## Capacity and time

Appointments occupy 15-minute units, with a selectable duration of 30, 45 or 60 minutes. The user described variable clinic hours around 10:00–13:00 and 14:00–19:00, with appointments lasting 30–60 minutes. Those two sessions are offered as editable suggestions, never opened automatically. Multiple sessions per date support breaks. Session dates and bounds are immutable; a doctor can close a session to new bookings and create a replacement. Closing a session does not cancel its existing appointments. Overlapping sessions share the same clinic-wide capacity.

The initial clinic calendar uses Asia/Colombo, displayed beside all booking controls. This is an explicit initial configuration, not inferred separately from each device. Confirm it before a real pilot. Dates/times represent clinic wall time; timestamps represent audit instants.

## New collections

- `clinicSessions/{id}`: date, startMinute, endMinute, enabled, createdAt, updatedAt. Doctor-managed; clinical staff can read.
- `appointments/{id}`: patientId, sessionId, date, startMinute, duration, status, kind (booked/walk_in), visitId, revision, createdAt, updatedAt. One immutable preallocated visitId per appointment. No patient names or clinical text duplicated here.
- `appointmentSlots/{date}_{minute}`: appointmentId, date, minute. One document per occupied 15-minute unit. Slots are acquired/released in the same transaction as appointment changes. Firestore rules verify both sides using getAfter; direct writes cannot reserve overlapping appointments, take another booking's slots or drop an occupied slot.

Booked → arrived → in_progress → completed. Booked/arrived can be cancelled or marked no-show; only booked appointments can be rescheduled. Completed capacity remains historical occupancy; cancellation/no-show releases capacity. Consultation completion is atomic with the saved visit. In-progress work remains visible, with browser-tab draft recovery limitations stated; another device does not gain access to an unsaved draft.

An in-progress appointment can return to waiting if its visit has not been saved; its encounter ID and capacity remain unchanged. The client hides past booking starts and future-day arrival/start controls. Those clock-dependent UI policies are separate from the server-enforced ownership and state-transition rules.

Visits gain an optional immutable appointmentId. Existing unlinked encounters and follow-ups keep their current shapes and semantics. No automatic conversion of a follow-up into a booking occurs. Initial booking is independent of follow-up closure; staff must reconcile the original review task explicitly after care, rather than silently assuming it happened when a slot was reserved.

## Migration and compatibility

No existing data is rewritten. New collections start empty. Existing patients, visits, inventory and follow-ups remain readable. Before release: back up/export the existing clinic, deploy reviewed additive rules first, smoke test existing operations, then release the client. Existing clients cannot manage the new schedule; linked encounter metadata must be preserved on edits. Review installed PWA update behavior before allowing mixed versions in the pilot.

Rollback the client without deleting scheduling documents or weakening slot rules. Reconcile any open appointments manually through the tested scheduling client before removing access to it. Multi-clinic use requires tenant isolation across both existing and new collections and is outside this migration.

## Required evidence

Emulator tests must prove simultaneous conflicting bookings have one winner, failed rescheduling preserves the original slot, successful rescheduling/cancellation releases it, duration cannot cross session close, direct slot tampering is denied, unknown accounts are denied, and visit completion updates exactly one linked appointment atomically. Exercise 60-minute cross-date rescheduling to check rule access limits.

Firebase documents transactional retries and post-write rule validation in [Transactions and batched writes](https://firebase.google.com/docs/firestore/manage-data/transactions). Rules have per-write and per-transaction document-access limits; the bounded duration model must be verified against those limits, not assumed safe from a client transaction alone.
