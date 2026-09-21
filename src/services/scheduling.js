import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { slotIds, validateBooking, validateSession, bookingTimeHasPassed } from '../utils/scheduling.js';

export class ScheduleError extends Error {}
export const scheduleErrorMessage = error => error instanceof ScheduleError ? error.message :
    'The schedule could not be updated. Check your connection and clinic access, then try again. Nothing is confirmed until saving succeeds.';

export async function saveSession(db, { id, date, startMinute, endMinute }) {
    const invalid = validateSession({ date, startMinute, endMinute });
    if (invalid) throw new ScheduleError(invalid);
    return runTransaction(db, async transaction => {
        const ref = doc(db, 'clinicSessions', id);
        const previous = await transaction.get(ref);
        if (previous.exists()) return id;
        transaction.set(ref, { date, startMinute, endMinute, enabled: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        return id;
    });
}

export async function setSessionEnabled(db, id, enabled) {
    return runTransaction(db, async transaction => {
        const ref = doc(db, 'clinicSessions', id);
        if (!(await transaction.get(ref)).exists()) throw new ScheduleError('This session no longer exists. Refresh the schedule.');
        transaction.update(ref, { enabled, updatedAt: serverTimestamp() });
    });
}

// A fixed encounter ID belongs to the appointment from creation onward. Starting
// on another device cannot create a second encounter for the same booking.
export async function bookAppointment(db, { id, visitId, patientId, sessionId, date, startMinute, duration, kind = 'booked', expectedRevision }) {
    return runTransaction(db, async transaction => {
        const ref = doc(db, 'appointments', id);
        const previousSnapshot = await transaction.get(ref);
        const previous = previousSnapshot.exists() ? previousSnapshot.data() : null;
        if (previous && expectedRevision == null) throw new ScheduleError('This appointment was already saved. Refresh the agenda to open it.');
        if (expectedRevision != null && (!previous || previous.revision !== expectedRevision || previous.status !== 'booked')) {
            throw new ScheduleError('This appointment changed. Refresh the agenda before rescheduling.');
        }
        const session = await transaction.get(doc(db, 'clinicSessions', sessionId));
        const next = { patientId: previous?.patientId || patientId, sessionId, date, startMinute, duration,
            kind: previous?.kind || kind, visitId: previous?.visitId || visitId, status: previous?.status || (kind === 'walk_in' ? 'arrived' : 'booked'), revision: (previous?.revision ?? -1) + 1 };
        const invalid = validateBooking(next, session.data());
        if (invalid) throw new ScheduleError(invalid);
        if (bookingTimeHasPassed(date, startMinute)) throw new ScheduleError('That start time has passed. Choose a later time.');
        if (!(await transaction.get(doc(db, 'patients', next.patientId))).exists()) throw new ScheduleError('This patient record is no longer available.');
        const oldSlots = slotIds(previous), newSlots = slotIds(next);
        for (const slot of newSlots) {
            const existing = await transaction.get(doc(db, 'appointmentSlots', slot));
            if (existing.exists() && existing.data().appointmentId !== id) throw new ScheduleError('That time was just taken. Choose another available time; the original booking, if any, is unchanged.');
        }
        transaction.set(ref, { ...next, createdAt: previous?.createdAt || serverTimestamp(), updatedAt: serverTimestamp() });
        for (const slot of oldSlots.filter(slot => !newSlots.includes(slot))) transaction.delete(doc(db, 'appointmentSlots', slot));
        for (const slot of newSlots) transaction.set(doc(db, 'appointmentSlots', slot), { appointmentId: id, date, minute: Number(slot.split('_')[1]) });
        return id;
    });
}

const transitions = { arrived: ['booked', 'in_progress'], in_progress: ['booked', 'arrived', 'in_progress'], cancelled: ['booked', 'arrived'], no_show: ['booked', 'arrived'] };
export async function changeAppointmentStatus(db, { id, status, expectedRevision }) {
    return runTransaction(db, async transaction => {
        const ref = doc(db, 'appointments', id);
        const snapshot = await transaction.get(ref);
        const previous = snapshot.data();
        if (!previous || previous.revision !== expectedRevision || !transitions[status]?.includes(previous.status)) {
            throw new ScheduleError('This appointment changed. Refresh the agenda before continuing.');
        }
        if (previous.status === status) return { ...previous, id };
        if (previous.status === 'in_progress' && (await transaction.get(doc(db, 'visits', previous.visitId))).exists()) {
            throw new ScheduleError('This encounter already has a saved visit. Refresh the agenda before continuing.');
        }
        const next = { ...previous, status, revision: previous.revision + 1, updatedAt: serverTimestamp() };
        transaction.update(ref, { status, revision: next.revision, updatedAt: next.updatedAt });
        if (status === 'cancelled' || status === 'no_show') for (const slot of slotIds(previous)) transaction.delete(doc(db, 'appointmentSlots', slot));
        return { ...next, id };
    });
}
