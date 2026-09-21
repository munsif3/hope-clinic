// Synthetic local-only browser fixtures. Never points at the deployed clinic.
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { initializeFirestore, connectFirestoreEmulator, setDoc, getDoc, doc, terminate } from 'firebase/firestore';
import { saveSession, bookAppointment } from '../src/services/scheduling.js';
import { clinicDate } from '../src/utils/scheduling.js';
const app = initializeApp({ projectId: 'demo-hope-clinic', apiKey: 'demo-key', authDomain: 'localhost' });
const auth = getAuth(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
const db = initializeFirestore(app, {});
connectFirestoreEmulator(db, '127.0.0.1', 8080);
const email = 'doctor@example.test';
const password = 'Synthetic-test-password-123';
let credential;
try { credential = await createUserWithEmailAndPassword(auth, email, password); }
catch (error) {
    if (error.code !== 'auth/email-already-in-use') throw error;
    credential = await signInWithEmailAndPassword(auth, email, password);
}
const response = await fetch('http://127.0.0.1:8080/v1/projects/demo-hope-clinic/databases/(default)/documents/users/' + credential.user.uid, {
    method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { role: { stringValue: 'doctor' }, name: { stringValue: 'Demo Doctor' } } }),
});
if (!response.ok) throw new Error('Local fixture setup failed');
await setDoc(doc(db, 'patients', 'demo-patient'), {
    name: 'Synthetic Patient', contact: '0000000000', age: 40, gender: 'Female',
    medicalHistory: [], familyHistory: [], ongoingMedications: [],
    allergies: [{ name: 'Synthetic allergy', notes: 'Fixture only', date: '2026-09-12' }],
});
await setDoc(doc(db, 'inventory', 'demo-medicine'), { name: 'Synthetic Medicine', stock: 100, unit: 'pcs', cost: 2, sellingPrice: 5 });
await setDoc(doc(db, 'visits', 'demo-legacy'), {
    patientId: 'demo-patient', date: '2026-09-01', time: '17:00', diagnosis: 'Synthetic assessment',
    prescription: 'Original prescription text (synthetic fixture)', notes: 'Private legacy note (synthetic fixture)',
    consultationFee: 0, medicineFee: 0, cost: 0,
});
await setDoc(doc(db, 'visits', 'demo-structured'), {
    patientId: 'demo-patient', date: '2026-09-10', time: '17:00', diagnosis: 'Synthetic follow-up assessment',
    prescriptions: [{ name: 'Synthetic Medicine', dosage: 'Fixture dose', frequency: 'Fixture frequency', duration: 'Fixture duration', notes: 'Fixture directions', quantity: 3, inventoryId: 'demo-medicine' }],
    investigations: ['Synthetic investigation'], notes: 'Private synthetic history note', patientInstructions: 'Synthetic previous advice',
    consultationFee: 0, medicineFee: 0, cost: 0,
});
// Seed tomorrow so these example bookings remain usable even after evening hours.
const scheduleDate = clinicDate(new Date(Date.now() + 86400000));
await setDoc(doc(db, 'patients', 'demo-booking-patient'), {
    name: 'Synthetic Booking Review', contact: '0000000077', age: 42, gender: '',
    medicalHistory: [], familyHistory: [], ongoingMedications: [], allergies: [],
});
for (const [suffix, startMinute, endMinute] of [['morning', 600, 780], ['afternoon', 840, 1140]]) {
    await saveSession(db, { id: `demo-${scheduleDate}-${suffix}`, date: scheduleDate, startMinute, endMinute });
}
for (const [suffix, patientId, startMinute, duration] of [['morning', 'demo-booking-patient', 630, 30], ['afternoon', 'demo-patient', 960, 60]]) {
    const id = `demo-booking-${scheduleDate}-${suffix}`;
    if (!(await getDoc(doc(db, 'appointments', id))).exists()) await bookAppointment(db, {
        id, patientId, visitId: `demo-encounter-${scheduleDate}-${suffix}`,
        sessionId: `demo-${scheduleDate}-${suffix}`, date: scheduleDate, startMinute, duration,
    });
}
await terminate(db);
await deleteApp(app);
console.log('Local synthetic clinic fixtures are ready.');
