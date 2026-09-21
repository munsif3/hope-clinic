import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword } from 'firebase/auth';
import { initializeFirestore, connectFirestoreEmulator, doc, getDoc, updateDoc, setDoc, getDocs, collection, terminate } from 'firebase/firestore';
import { saveVisit } from '../src/services/saveVisit.js';
import { savePatient } from '../src/services/savePatient.js';
import { newVisit, visitRevision } from '../src/utils/visits.js';
import { reusablePrescription } from '../src/utils/consultations.js';

const project = 'demo-hope-clinic';
const fixture = id => 'visit-suite-' + runId + '-' + id;
const runId = Date.now();
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080' || process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099') {
    throw new Error('These tests require the local demo emulators. Production connections are forbidden.');
}
const apps = [];
const databases = [];
let doctor, assistant, stranger;
const root = 'http://127.0.0.1:8080/v1/projects/' + project + '/databases/(default)/documents/';
function fields(data) {
    return Object.fromEntries(Object.entries(data).map(([key, value]) => [key,
        typeof value === 'number' ? { integerValue: String(value) } : { stringValue: value }]));
}
async function seed(path, data) {
    const response = await fetch(root + path, { method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: fields(data) }) });
    assert.equal(response.ok, true, 'Emulator fixture seeding failed');
}
async function account(role) {
    const app = initializeApp({ projectId: project, apiKey: 'demo-key', authDomain: 'localhost' }, role);
    apps.push(app);
    const auth = getAuth(app);
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    const db = initializeFirestore(app, {});
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    databases.push(db);
    const result = await createUserWithEmailAndPassword(auth, role + '-' + Date.now() + '@example.test', 'Synthetic-test-password-123');
    if (role !== 'stranger') await seed('users/' + result.user.uid, { role, name: 'Fixture ' + role });
    return { db, user: { uid: result.user.uid, name: 'Fixture ' + role, role } };
}
function form(overrides = {}) {
    return { ...newVisit(fixture('fixture-patient')), date: '2026-09-12', time: '17:30', diagnosis: 'Synthetic assessment', ...overrides };
}
function create(account, visitId, data) {
    return saveVisit(account.db, { visitId, isNew: true, form: data, user: account.user });
}
before(async () => {
    doctor = await account('doctor');
    assistant = await account('assistant');
    stranger = await account('stranger');
    await seed('patients/' + fixture('fixture-patient'), { name: 'Synthetic Patient', contact: '0000000000' });
    await seed('inventory/' + fixture('fixture-stock'), { name: 'Synthetic Medicine', stock: 100, unit: 'pcs', sellingPrice: 5 });
});
after(async () => {
    await Promise.all(databases.map(terminate));
    await Promise.all(apps.map(deleteApp));
});

test('unapproved authenticated account cannot read patient data or write visits', async () => {
    await assert.rejects(getDoc(doc(stranger.db, 'patients', fixture('fixture-patient'))), { code: 'permission-denied' });
    await assert.rejects(setDoc(doc(stranger.db, 'visits', fixture('unauthorized')), form()), { code: 'permission-denied' });
});

test('assistant can dispense stock as part of a visit but cannot change medicine pricing', async () => {
    await create(assistant, fixture('assistant-visit'), form({ prescriptions: [{ name: 'Synthetic Medicine', inventoryId: fixture('fixture-stock'), quantity: 5 }] }));
    assert.equal((await getDoc(doc(doctor.db, 'inventory', fixture('fixture-stock')))).data().stock, 95);
    await assert.rejects(updateDoc(doc(assistant.db, 'inventory', fixture('fixture-stock')), { sellingPrice: 999 }), { code: 'permission-denied' });
    await assert.rejects(updateDoc(doc(assistant.db, 'inventory', fixture('fixture-stock')), { stock: -1 }), { code: 'permission-denied' });
    assert.equal((await getDoc(doc(doctor.db, 'visits', fixture('assistant-visit')))).data().clinicianName, undefined);
});

test('insufficient stock rejects the whole save, preserving stock and avoiding a partial visit', async () => {
    await assert.rejects(create(doctor, fixture('insufficient'), form({ prescriptions: [{ name: 'Synthetic Medicine', inventoryId: fixture('fixture-stock'), quantity: 1000 }] })), /not enough stock/);
    assert.equal((await getDoc(doc(doctor.db, 'visits', fixture('insufficient')))).exists(), false);
    assert.equal((await getDoc(doc(doctor.db, 'inventory', fixture('fixture-stock')))).data().stock, 95);
});

test('stable new-visit IDs prevent a retry from saving or dispensing twice', async () => {
    const data = form({ prescriptions: [{ name: 'Synthetic Medicine', inventoryId: fixture('fixture-stock'), quantity: 3 }], nextVisitDate: '2026-09-20' });
    await create(doctor, fixture('single-save'), data);
    await assert.rejects(create(doctor, fixture('single-save'), data), /already been saved/);
    assert.equal((await getDoc(doc(doctor.db, 'inventory', fixture('fixture-stock')))).data().stock, 92);
    assert.equal((await getDoc(doc(doctor.db, 'visits', fixture('single-save')))).data().clinicianName, 'Fixture doctor');
});

test('concurrent edits cannot both apply stale stock adjustments', async () => {
    const snapshot = (await getDoc(doc(doctor.db, 'visits', fixture('single-save')))).data();
    const params = { visitId: fixture('single-save'), isNew: false, expectedRevision: visitRevision(snapshot), user: doctor.user };
    const outcomes = await Promise.allSettled([4, 6].map(quantity => saveVisit(doctor.db, {
        ...params, form: { ...snapshot, prescriptions: [{ name: 'Synthetic Medicine', inventoryId: fixture('fixture-stock'), quantity }] },
    })));
    assert.equal(outcomes.filter(item => item.status === 'fulfilled').length, 1);
    const visit = (await getDoc(doc(doctor.db, 'visits', fixture('single-save')))).data();
    assert.equal((await getDoc(doc(doctor.db, 'inventory', fixture('fixture-stock')))).data().stock, 95 - visit.prescriptions[0].quantity);
});

test('editing and clearing a return update the legacy follow-up instead of duplicating it', async () => {
    await create(doctor, fixture('legacy-return-visit'), form());
    await seed('followups/' + fixture('random-legacy-id'), { visitId: fixture('legacy-return-visit'), patientId: fixture('fixture-patient'), date: '2026-09-20', time: '', status: 'pending' });
    const ref = doc(doctor.db, 'visits', fixture('legacy-return-visit'));
    let previous = (await getDoc(ref)).data();
    await saveVisit(doctor.db, { visitId: ref.id, isNew: false, expectedRevision: visitRevision(previous), form: { ...previous, nextVisitDate: '2026-09-22', nextVisitTime: '18:00' }, user: doctor.user });
    assert.equal((await getDoc(doc(doctor.db, 'followups', fixture('random-legacy-id')))).data().date, '2026-09-22');
    assert.equal((await getDoc(doc(doctor.db, 'followups', 'visit-' + fixture('legacy-return-visit')))).exists(), false);
    previous = (await getDoc(ref)).data();
    await saveVisit(doctor.db, { visitId: ref.id, isNew: false, expectedRevision: visitRevision(previous), form: { ...previous, nextVisitDate: '', nextVisitTime: '' }, user: doctor.user });
    assert.equal((await getDoc(doc(doctor.db, 'followups', fixture('random-legacy-id')))).data().status, 'cancelled');
});

test('starting from a follow-up completes it once and rejects a mismatched patient', async () => {
    await seed('followups/' + fixture('return-to-complete'), { visitId: 'previous', patientId: fixture('fixture-patient'), date: '2026-09-12', status: 'pending' });
    await saveVisit(doctor.db, { visitId: fixture('completed-return'), isNew: true, form: form(), triggeringFollowupId: fixture('return-to-complete'), user: doctor.user });
    assert.equal((await getDoc(doc(doctor.db, 'followups', fixture('return-to-complete')))).data().status, 'completed');
    await assert.rejects(saveVisit(doctor.db, { visitId: fixture('duplicate-return'), isNew: true, form: form(), triggeringFollowupId: fixture('return-to-complete'), user: doctor.user }), /no longer pending/);
    await seed('followups/' + fixture('other-patient'), { visitId: 'previous', patientId: 'different-patient', date: '2026-09-12', status: 'pending' });
    await assert.rejects(saveVisit(doctor.db, { visitId: fixture('wrong-patient'), isNew: true, form: form(), triggeringFollowupId: fixture('other-patient'), user: doctor.user }), /no longer pending/);
    assert.equal((await getDocs(collection(doctor.db, 'visits'))).docs.some(item => item.id === fixture('wrong-patient')), false);
});

test('patient registration validates required fields and prevents duplicate retries', async () => {
    const patientId = 'registration-' + Date.now();
    const data = { name: ' Synthetic registration ', contact: '0000000000', age: '39', gender: '', address: '', medicalHistory: [], familyHistory: [], ongoingMedications: [], allergies: [] };
    await assert.rejects(savePatient(doctor.db, { patientId, isNew: true, form: { ...data, contact: '' } }), /Enter a name/);
    assert.equal((await getDoc(doc(doctor.db, 'patients', patientId))).exists(), false);
    const outcomes = await Promise.allSettled([1,2].map(() => savePatient(doctor.db, { patientId, isNew: true, form: data })));
    assert.equal(outcomes.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal((await getDoc(doc(doctor.db, 'patients', patientId))).data().name, 'Synthetic registration');
});

test('patient edits preserve legacy fields and reject stale changes', async () => {
    const patientId = 'patient-edit-' + Date.now();
    const ref = doc(doctor.db, 'patients', patientId);
    const data = { name: 'Synthetic edit', contact: '0000000000', age: 40, gender: '', address: '', medicalHistory: [], familyHistory: [], ongoingMedications: [], allergies: [], legacyReference: 'Preserve this field' };
    await setDoc(ref, data);
    const expectedRevision = visitRevision((await getDoc(ref)).data());
    await savePatient(assistant.db, { patientId, isNew: false, expectedRevision, form: { ...data, age: 41, legacyReference: 'Do not write this field' } });
    assert.equal((await getDoc(ref)).data().legacyReference, 'Preserve this field');
    await assert.rejects(savePatient(doctor.db, { patientId, isNew: false, expectedRevision, form: { ...data, age: 42 } }), /changed/);
    assert.equal((await getDoc(ref)).data().age, 41);
});

test('reused clinical treatment saves without consuming previous dispensing stock', async () => {
    const inventoryRef = doc(doctor.db, 'inventory', fixture('fixture-stock'));
    const before = (await getDoc(inventoryRef)).data().stock;
    const prescription = reusablePrescription({ name: 'Synthetic Medicine', dosage: 'Fixture dose', frequency: 'Fixture frequency', duration: 'Fixture duration', notes: 'Fixture directions', quantity: 7, inventoryId: fixture('fixture-stock') });
    const visitId = 'reuse-' + Date.now();
    await create(doctor, visitId, form({ prescriptions: [prescription] }));
    assert.equal((await getDoc(inventoryRef)).data().stock, before);
    const saved = (await getDoc(doc(doctor.db, 'visits', visitId))).data();
    assert.equal(saved.prescriptions[0].inventoryId, undefined);
    assert.equal(saved.prescriptions[0].quantity, '');
});
