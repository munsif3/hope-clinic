import test from 'node:test';
import assert from 'node:assert/strict';
import { reusablePrescription, previousVisits } from '../src/utils/consultations.js';
import { stockChanges } from '../src/utils/visits.js';
import { historyEntries, matchesPatient, possibleDuplicates } from '../src/utils/patients.js';

test('reviewed reuse preserves clinical text without repeating dispensing or visit metadata', () => {
    const original = { name: 'Fixture medicine', dosage: 'Fixture dose', frequency: 'Fixture frequency', duration: 'Fixture duration', notes: 'Fixture directions', quantity: 12, inventoryId: 'inventory-one', visitId: 'old-visit', createdAt: 'old-date' };
    const copied = reusablePrescription(original);
    assert.deepEqual(copied, { name: original.name, dosage: original.dosage, frequency: original.frequency, duration: original.duration, notes: original.notes, quantity: '' });
    assert.deepEqual(stockChanges([], [copied]), []);
    assert.equal(original.quantity, 12);
    assert.equal(reusablePrescription({ name: '' }), null);
});

test('previous context excludes the edited encounter, other patients, and later treatment', () => {
    const visits = [
        { id: 'edited', patientId: 'p1', date: '2026-09-13', time: '16:00' },
        { id: 'other', patientId: 'p2', date: '2026-09-13', time: '15:30' },
        { id: 'future', patientId: 'p1', date: '2026-09-14', time: '09:00' },
        { id: 'later', patientId: 'p1', date: '2026-09-13', time: '17:00' },
        { id: 'morning', patientId: 'p1', date: '2026-09-13', time: '09:00' },
        { id: 'afternoon', patientId: 'p1', date: '2026-09-13', time: '15:00' },
    ];
    assert.deepEqual(previousVisits(visits, 'p1', 'edited', '2026-09-13', '16:00').map(item => item.id), ['afternoon', 'morning']);
});

test('legacy allergy entries remain explicit without inventing a recording date or negative finding', () => {
    assert.deepEqual(historyEntries('Original reaction details'), [{ name: '', notes: 'Original reaction details' }]);
    assert.deepEqual(historyEntries([{ condition: 'Fixture allergen', notes: 'Reaction', source: 'legacy' }]), [{ condition: 'Fixture allergen', name: 'Fixture allergen', notes: 'Reaction', source: 'legacy' }]);
    assert.deepEqual(historyEntries([null, {}, { name: ' ', notes: '' }]), []);
});

test('lookup normalizes phone punctuation but distinguishes record identity and shared contacts', () => {
    const patients = [
        { id: 'p1', name: 'Same name', contact: '+00 (123) 456', age: 30 },
        { id: 'p2', name: 'Different name', contact: '+00 123456', age: 65 },
    ];
    assert.equal(matchesPatient(patients[0], '00123456'), true);
    assert.equal(matchesPatient(patients[0], 'p1'), true);
    assert.equal(matchesPatient(patients[1], 'p1'), false);
    assert.deepEqual(possibleDuplicates(patients, { name: ' SAME NAME ', contact: '00123456' }).map(p => p.id), ['p1','p2']);
    assert.deepEqual(possibleDuplicates(patients, { name: 'Same name', contact: '00123456' }, 'p1').map(p => p.id), ['p2']);
    assert.equal(patients.length, 2);
});
