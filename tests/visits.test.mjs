import test from 'node:test';
import assert from 'node:assert/strict';
import { changePrescription, stockChanges, newVisit, validateVisit, visitRevision, followupOverdue } from '../src/utils/visits.js';
import { draftKey, readDraft, writeDraft, clearVisitDrafts } from '../src/utils/visitDrafts.js';

test('renaming a selected medicine clears its stock reference without losing instructions', () => {
    const item = { name: 'Synthetic A', inventoryId: 'stock-a', quantity: 5, notes: 'Fixture directions' };
    assert.deepEqual(changePrescription(item, 'name', 'Synthetic B'), { name: 'Synthetic B', quantity: 5, notes: 'Fixture directions' });
    assert.equal(changePrescription(item, 'quantity', 3).inventoryId, 'stock-a');
    assert.equal(item.inventoryId, 'stock-a');
});

test('stock edits aggregate repeated medicines and restore removed items exactly once', () => {
    assert.deepEqual(stockChanges(
        [{ inventoryId: 'a', quantity: 10 }, { inventoryId: 'b', quantity: 2 }],
        [{ inventoryId: 'a', quantity: 3 }, { inventoryId: 'a', quantity: 4 }, { name: 'external', quantity: 20 }],
    ), [['a', 3], ['b', 2]]);
    assert.deepEqual(stockChanges([{ inventoryId: 'a', quantity: 10 }], [{ inventoryId: 'a', quantity: 10 }]), []);
    assert.throws(() => stockChanges([], [{ inventoryId: 'a', quantity: -2 }]));
});

test('visit validation catches invalid dates, fees, medicine quantities and empty investigations', () => {
    const form = { ...newVisit('fixture'), date: '2026-09-12', time: '17:30', diagnosis: 'Synthetic assessment' };
    assert.equal(validateVisit(form), '');
    for (const invalid of [
        { date: '2026-02-30' }, { time: '25:00' }, { diagnosis: ' ' }, { consultationFee: -1 },
        { medicineFee: 'abc' }, { nextVisitDate: '2026-09-11' }, { nextVisitTime: '17:30' },
        { prescriptions: [{ name: 'Fixture', quantity: -1 }] }, { investigations: [''] },
    ]) assert.notEqual(validateVisit({ ...form, ...invalid }), '');
});

test('legacy record revision is key-order independent and detects clinical changes', () => {
    assert.equal(visitRevision({ a: 1, b: [2] }), visitRevision({ b: [2], a: 1 }));
    assert.notEqual(visitRevision({ notes: 'one' }), visitRevision({ notes: 'two' }));
});

test('returns later today and date-only returns are not prematurely overdue', () => {
    const now = new Date(2026, 8, 12, 10, 30);
    assert.equal(followupOverdue({ status: 'pending', date: '2026-09-12', time: '17:00' }, now), false);
    assert.equal(followupOverdue({ status: 'pending', date: '2026-09-12' }, now), false);
    assert.equal(followupOverdue({ status: 'pending', date: '2026-09-12', time: '09:00' }, now), true);
    assert.equal(followupOverdue({ status: 'completed', date: '2026-09-11' }, now), false);
});

class Storage {
    map = new Map();
    get length() { return this.map.size; }
    key(index) { return [...this.map.keys()][index]; }
    getItem(key) { return this.map.get(key) ?? null; }
    setItem(key, value) { this.map.set(key, value); }
    removeItem(key) { this.map.delete(key); }
}

test('recovery is scoped by account and route, expires, and is removed on sign-out', () => {
    const storage = new Storage();
    const first = draftKey('doctor-a', 'new:patient-a');
    const second = draftKey('doctor-b', 'new:patient-a');
    const draft = { visitId: 'draft-id', revision: null, form: newVisit('fixture') };
    writeDraft(storage, first, draft, 100);
    assert.equal(readDraft(storage, second, 101), null);
    assert.equal(readDraft(storage, first, 101).visitId, 'draft-id');
    assert.equal(readDraft(storage, first, 100 + 24 * 60 * 60 * 1000), null);
    writeDraft(storage, first, draft);
    writeDraft(storage, second, draft);
    storage.setItem('unrelated', 'keep');
    clearVisitDrafts(storage);
    assert.equal(storage.length, 1);
    assert.equal(storage.getItem('unrelated'), 'keep');
});

test('corrupt and future-dated drafts never replace a form, and quota errors are visible to the caller', () => {
    const storage = new Storage();
    storage.setItem('draft', 'invalid json');
    assert.equal(readDraft(storage, 'draft'), null);
    writeDraft(storage, 'draft', { visitId: 'id', form: newVisit('fixture') }, 1000);
    assert.equal(readDraft(storage, 'draft', 999), null);
    assert.throws(() => writeDraft({ setItem() { throw new Error('quota'); } }, 'draft', {}));
});
