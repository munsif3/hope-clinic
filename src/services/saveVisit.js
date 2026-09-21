import { collection, doc, getDocsFromServer, query, runTransaction, serverTimestamp, where } from 'firebase/firestore';
import { newVisit, stockChanges, validateVisit, visitRevision } from '../utils/visits.js';

export class VisitSaveError extends Error {}

// All related writes commit together. Transactions reject offline rather than
// suggesting that stock or a follow-up has been confirmed from a local draft.
export async function saveVisit(db, { visitId, isNew, expectedRevision, form, triggeringFollowupId, appointmentId, user }) {
    const validation = validateVisit(form);
    if (validation) throw new VisitSaveError(validation);
    if (!user?.uid) throw new VisitSaveError('Sign in again before saving.');

    const visitRef = doc(db, 'visits', visitId);
    // Legacy follow-ups have random IDs. Discover them, then re-read each inside
    // the transaction. Every save also checks the encounter's current revision.
    const linked = await getDocsFromServer(query(collection(db, 'followups'), where('visitId', '==', visitId)));
    const followupRefs = linked.docs.map(item => item.ref);
    const generatedFollowupRef = doc(db, 'followups', `visit-${visitId}`);
    if (!followupRefs.some(ref => ref.id === generatedFollowupRef.id)) followupRefs.push(generatedFollowupRef);
    const triggerRef = triggeringFollowupId ? doc(db, 'followups', triggeringFollowupId) : null;

    return runTransaction(db, async transaction => {
        const visitSnapshot = await transaction.get(visitRef);
        const previous = visitSnapshot.exists() ? visitSnapshot.data() : null;
        if (isNew && previous) throw new VisitSaveError('This draft has already been saved. Open patient history to view the saved visit.');
        if (!isNew && (!previous || visitRevision(previous) !== expectedRevision)) {
            throw new VisitSaveError('This visit changed after you opened it. Your draft is kept. Open the latest record before applying your changes.');
        }
        if (previous && previous.patientId !== form.patientId) throw new VisitSaveError('An existing visit cannot be moved to another patient.');
        const linkedAppointmentId = previous?.appointmentId || appointmentId;
        const appointmentRef = linkedAppointmentId ? doc(db, 'appointments', linkedAppointmentId) : null;
        let appointment;
        if (appointmentRef) {
            appointment = (await transaction.get(appointmentRef)).data();
            if (!appointment || appointment.visitId !== visitId || appointment.patientId !== form.patientId ||
                appointment.status !== (isNew ? 'in_progress' : 'completed')) {
                throw new VisitSaveError('The appointment changed or belongs to another encounter. Your entries are kept; return to Today and check the booking.');
            }
        }
        const patient = await transaction.get(doc(db, 'patients', form.patientId));
        if (!patient.exists()) throw new VisitSaveError('The selected patient no longer exists. Your draft is kept.');

        const deltas = stockChanges(previous?.prescriptions || [], form.prescriptions);
        const stockUpdates = [];
        for (const [inventoryId, delta] of deltas) {
            const ref = doc(db, 'inventory', inventoryId);
            const snapshot = await transaction.get(ref);
            if (!snapshot.exists()) throw new VisitSaveError('A linked medicine is no longer available. Review the prescription; your draft is kept.');
            const stock = Number(snapshot.data().stock) + delta;
            if (!Number.isFinite(stock) || stock < 0) throw new VisitSaveError('There is not enough stock for this prescription. Review quantities; your draft is kept.');
            stockUpdates.push({ ref, stock });
        }
        const followups = [];
        for (const ref of followupRefs) {
            const snapshot = await transaction.get(ref);
            if (snapshot.exists()) {
                if (snapshot.data().visitId !== visitId) throw new VisitSaveError('The linked follow-up could not be verified. Your draft is kept.');
                followups.push({ ref, ...snapshot.data() });
            }
        }
        let trigger;
        if (triggerRef && isNew) {
            trigger = await transaction.get(triggerRef);
            if (!trigger.exists() || trigger.data().patientId !== form.patientId || trigger.data().status !== 'pending') {
                throw new VisitSaveError('This follow-up is no longer pending for this patient. Open the follow-up list again.');
            }
        }

        // Whitelist editable fields: never round-trip serialized timestamps or
        // overwrite unrecognized legacy clinical fields from a recovery draft.
        const defaults = newVisit();
        const data = Object.fromEntries(Object.keys(defaults).map(key => [key, form[key] ?? defaults[key]]));
        data.consultationFee = Number(form.consultationFee);
        data.medicineFee = Number(form.medicineFee);
        data.cost = data.consultationFee + data.medicineFee;
        data.updatedAt = serverTimestamp();
        data.updatedBy = user.uid;
        if (linkedAppointmentId) data.appointmentId = linkedAppointmentId;
        if (isNew) {
            data.createdAt = serverTimestamp();
            data.createdBy = user.uid;
            // An assistant's name must never be printed as the treating doctor.
            if (user.role === 'doctor') {
                data.clinicianId = user.uid;
                data.clinicianName = user.name || '';
            }
        }
        transaction.set(visitRef, data, { merge: true });
        if (appointmentRef && isNew) transaction.update(appointmentRef, { status: 'completed', revision: appointment.revision + 1, updatedAt: serverTimestamp() });
        for (const { ref, stock } of stockUpdates) transaction.update(ref, { stock, updatedAt: serverTimestamp() });

        const scheduleChanged = isNew || previous.nextVisitDate !== form.nextVisitDate || (previous.nextVisitTime || '') !== form.nextVisitTime;
        if (scheduleChanged) {
            const pending = followups.filter(item => item.status === 'pending');
            if (!form.nextVisitDate) {
                for (const item of pending) transaction.update(item.ref, { status: 'cancelled', updatedAt: serverTimestamp() });
            } else {
                // Keep the original reference for a pending legacy follow-up.
                // Never turn a completed follow-up back into a pending one.
                const completedGenerated = followups.some(item => item.ref.id === generatedFollowupRef.id && item.status === 'completed');
                const target = pending[0]?.ref || (completedGenerated ? doc(collection(db, 'followups')) : generatedFollowupRef);
                transaction.set(target, {
                    patientId: form.patientId, visitId, date: form.nextVisitDate,
                    time: form.nextVisitTime || '', status: 'pending', updatedAt: serverTimestamp(),
                }, { merge: true });
                for (const duplicate of pending.slice(1)) transaction.update(duplicate.ref, { status: 'cancelled', updatedAt: serverTimestamp() });
            }
        }
        if (trigger) transaction.update(triggerRef, { status: 'completed', updatedAt: serverTimestamp() });
        return visitId;
    });
}
