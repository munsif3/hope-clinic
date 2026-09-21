import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword } from 'firebase/auth';
import { initializeFirestore, connectFirestoreEmulator, doc, getDoc, updateDoc, setDoc, deleteDoc, serverTimestamp, terminate } from 'firebase/firestore';
import { saveSession, setSessionEnabled, bookAppointment, changeAppointmentStatus } from '../src/services/scheduling.js';
import { saveVisit } from '../src/services/saveVisit.js';
import { newVisit, visitRevision } from '../src/utils/visits.js';

if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080' || process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099') throw new Error('Local demo emulators required.');
const project = 'demo-hope-clinic', run = 'schedule-' + Date.now();
const apps = [], databases = [];
const dayBase = Date.UTC(2030, 0, 1) + Math.floor(Math.random() * 900000) * 86400000;
let dayIndex = 0, idIndex = 0, doctor, assistant, stranger;
const nextId = () => run + '-' + (++idIndex);
async function account(role) {
    const app = initializeApp({ projectId: project, apiKey: 'demo-key', authDomain: 'localhost' }, run + role);
    apps.push(app);
    const auth = getAuth(app); connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    const db = initializeFirestore(app, {}); connectFirestoreEmulator(db, '127.0.0.1', 8080); databases.push(db);
    const result = await createUserWithEmailAndPassword(auth, run + role + '@example.test', 'Synthetic-test-password-123');
    if (role !== 'stranger') {
        const response = await fetch(`http://127.0.0.1:8080/v1/projects/${project}/databases/(default)/documents/users/${result.user.uid}`, {
            method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: { role: { stringValue: role }, name: { stringValue: 'Synthetic scheduler' } } }),
        });
        assert.equal(response.ok, true);
    }
    return { db, user: { uid: result.user.uid, role, name: 'Synthetic scheduler' } };
}
async function session() {
    const value = { id: nextId(), date: new Date(dayBase + (++dayIndex) * 86400000).toISOString().slice(0, 10), startMinute: 600, endMinute: 1140 };
    await saveSession(doctor.db, value); return value;
}
function booking(s, changes = {}) {
    return { id: nextId(), visitId: nextId(), patientId: run, sessionId: s.id, date: s.date, startMinute: 600, duration: 60, ...changes };
}
const read = async id => ({ ...(await getDoc(doc(doctor.db, 'appointments', id))).data(), id });
before(async () => {
    doctor = await account('doctor'); assistant = await account('assistant'); stranger = await account('stranger');
    await setDoc(doc(doctor.db, 'patients', run), { name: 'Synthetic schedule patient' });
});
after(async () => { await Promise.all(databases.map(terminate)); await Promise.all(apps.map(deleteApp)); });

test('scheduling denies unknown accounts and assistant session management', async () => {
    const s = await session();
    await assert.rejects(getDoc(doc(stranger.db, 'clinicSessions', s.id)), { code: 'permission-denied' });
    await assert.rejects(saveSession(assistant.db, { ...s, id: nextId() }), { code: 'permission-denied' });
    await assert.rejects(bookAppointment(stranger.db, booking(s)), { code: 'permission-denied' });
});
test('concurrent overlapping bookings from two staff accounts have exactly one winner', async () => {
    const s = await session();
    const a = booking(s), b = booking(s, { startMinute: 630 });
    const results = await Promise.allSettled([bookAppointment(doctor.db, a), bookAppointment(assistant.db, b)]);
    assert.equal(results.filter(item => item.status === 'fulfilled').length, 1);
    assert.match(results.find(item => item.status === 'rejected').reason.message, /time was just taken/);
});
test('slots cannot be removed, stolen or bypassed by direct appointment writes', async () => {
    const s = await session(), a = booking(s);
    await bookAppointment(doctor.db, a);
    const slot = doc(doctor.db, 'appointmentSlots', s.date + '_600');
    await assert.rejects(deleteDoc(slot), { code: 'permission-denied' });
    await assert.rejects(setDoc(slot, { appointmentId: 'fake', date: s.date, minute: 600 }), { code: 'permission-denied' });
    const { id, ...data } = booking(s);
    await assert.rejects(setDoc(doc(doctor.db, 'appointments', id), { ...data, kind: 'booked', status: 'booked', revision: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }), { code: 'permission-denied' });
    await assert.rejects(updateDoc(doc(doctor.db, 'appointments', a.id), { status: 'cancelled', revision: 1, updatedAt: serverTimestamp() }), { code: 'permission-denied' });
});
test('cross-date 60-minute rescheduling releases all old slots and stale revisions fail', async () => {
    const s = await session(), target = await session(), a = booking(s);
    await bookAppointment(doctor.db, a);
    await bookAppointment(doctor.db, { ...a, sessionId: target.id, date: target.date, expectedRevision: 0 });
    for (const minute of [600, 615, 630, 645]) assert.equal((await getDoc(doc(doctor.db, 'appointmentSlots', s.date + '_' + minute))).exists(), false);
    await bookAppointment(assistant.db, booking(s));
    await assert.rejects(bookAppointment(doctor.db, { ...a, expectedRevision: 0 }), /changed/);
});
test('failed moves leave the original booking intact and cancellation frees capacity', async () => {
    const s = await session(), a = booking(s), b = booking(s, { startMinute: 660 });
    await bookAppointment(doctor.db, a); await bookAppointment(doctor.db, b);
    await assert.rejects(bookAppointment(doctor.db, { ...a, startMinute: 660, expectedRevision: 0 }), /time was just taken/);
    assert.equal((await read(a.id)).startMinute, 600);
    await changeAppointmentStatus(doctor.db, { id: a.id, status: 'cancelled', expectedRevision: 0 });
    await bookAppointment(assistant.db, booking(s));
    await assert.rejects(changeAppointmentStatus(doctor.db, { id: a.id, status: 'in_progress', expectedRevision: 1 }), /changed/);
});
test('closing sessions blocks new bookings without cancelling existing ones; bounds cannot be bypassed', async () => {
    const s = await session(), a = booking(s);
    await bookAppointment(doctor.db, a);
    await assert.rejects(bookAppointment(doctor.db, booking(s, { startMinute: 1110 })), /entirely/);
    await setSessionEnabled(doctor.db, s.id, false);
    await assert.rejects(bookAppointment(doctor.db, booking(s, { startMinute: 660 })), /closed/);
    assert.equal((await read(a.id)).status, 'booked');
    await changeAppointmentStatus(assistant.db, { id: a.id, status: 'arrived', expectedRevision: 0 });
    await assert.rejects(updateDoc(doc(doctor.db, 'clinicSessions', s.id), { endMinute: 630, updatedAt: serverTimestamp() }), { code: 'permission-denied' });
});
test('appointment completion is atomic with one linked visit, supports edits and rejects wrong-patient saves', async () => {
    const s = await session(), a = booking(s);
    await bookAppointment(doctor.db, a);
    await changeAppointmentStatus(doctor.db, { id: a.id, status: 'in_progress', expectedRevision: 0 });
    const resumed = await changeAppointmentStatus(assistant.db, { id: a.id, status: 'in_progress', expectedRevision: 1 });
    assert.equal(resumed.visitId, a.visitId);
    await assert.rejects(updateDoc(doc(doctor.db, 'appointments', a.id), { status: 'completed', revision: 2, updatedAt: serverTimestamp() }), { code: 'permission-denied' });
    const params = { visitId: a.visitId, isNew: true, appointmentId: a.id, user: doctor.user, form: { ...newVisit(run), diagnosis: 'Synthetic assessment' } };
    await assert.rejects(saveVisit(doctor.db, { ...params, form: { ...params.form, patientId: 'other' } }), /another encounter/);
    await saveVisit(doctor.db, params);
    assert.equal((await read(a.id)).status, 'completed');
    await assert.rejects(saveVisit(doctor.db, params), /already been saved/);
    const ref = doc(doctor.db, 'visits', a.visitId), saved = (await getDoc(ref)).data();
    assert.equal(saved.appointmentId, a.id);
    await saveVisit(doctor.db, { ...params, isNew: false, expectedRevision: visitRevision(saved), form: { ...saved, diagnosis: 'Synthetic correction' } });
    await assert.rejects(updateDoc(ref, { appointmentId: '' }), { code: 'permission-denied' });
});
test('walk-ins enter the waiting queue and no-show releases capacity', async () => {
    const s = await session(), a = booking(s, { kind: 'walk_in' });
    await bookAppointment(assistant.db, a);
    assert.equal((await read(a.id)).status, 'arrived');
    await changeAppointmentStatus(assistant.db, { id: a.id, expectedRevision: 0, status: 'no_show' });
    await bookAppointment(doctor.db, booking(s));
});

test('an accidentally started encounter can return to waiting without losing its reserved identity', async () => {
    const s = await session(), a = booking(s);
    await bookAppointment(doctor.db, a);
    await changeAppointmentStatus(doctor.db, { id: a.id, status: 'in_progress', expectedRevision: 0 });
    await changeAppointmentStatus(doctor.db, { id: a.id, status: 'arrived', expectedRevision: 1 });
    const resumed = await changeAppointmentStatus(doctor.db, { id: a.id, status: 'in_progress', expectedRevision: 2 });
    assert.equal(resumed.visitId, a.visitId);
    assert.equal((await getDoc(doc(doctor.db, 'appointmentSlots', s.date + '_600'))).data().appointmentId, a.id);
});
