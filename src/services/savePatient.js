import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { visitRevision } from '../utils/visits.js';

export class PatientSaveError extends Error {}

export function validatePatient(form) {
    if (!String(form.name || '').trim() || !String(form.contact || '').trim() || form.age === '' || form.age == null ||
        !Number.isFinite(Number(form.age)) || Number(form.age) < 0 || Number(form.age) > 130) {
        return 'Enter a name, contact number, and an age between 0 and 130.';
    }
    if (['medicalHistory', 'familyHistory', 'ongoingMedications', 'allergies'].some(key => !Array.isArray(form[key]))) {
        return 'The patient history format could not be saved safely. Keep your entries and review the original record.';
    }
    return '';
}

export async function savePatient(db, { patientId, isNew, expectedRevision, form }) {
    const invalid = validatePatient(form);
    if (invalid) throw new PatientSaveError(invalid);
    const ref = doc(db, 'patients', patientId);
    return runTransaction(db, async transaction => {
        const snapshot = await transaction.get(ref);
        if (!isNew && (!snapshot.exists() || visitRevision(snapshot.data()) !== expectedRevision)) throw new PatientSaveError('changed');
        if (isNew && snapshot.exists()) throw new PatientSaveError('already-saved');
        const editable = ['name', 'age', 'gender', 'contact', 'address', 'medicalHistory', 'familyHistory', 'ongoingMedications', 'allergies'];
        const data = Object.fromEntries(editable.map(key => [key, form[key] ?? '']));
        data.name = String(form.name).trim(); data.contact = String(form.contact).trim();
        transaction.set(ref, { ...data, updatedAt: serverTimestamp(), ...(isNew ? { createdAt: serverTimestamp() } : {}) }, { merge: true });
        return patientId;
    });
}
