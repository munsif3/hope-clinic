import test from 'node:test';
import assert from 'node:assert/strict';
import { availableStarts, slotIds, validateSession, validateBooking, clinicDate, bookingTimeHasPassed } from '../src/utils/scheduling.js';

test('clinic date uses the configured timezone across midnight', () => {
    assert.equal(clinicDate(new Date('2026-09-16T19:00:00Z')), '2026-09-17');
    assert.equal(bookingTimeHasPassed('2026-09-16', 1200, new Date('2026-09-16T19:00:00Z')), true);
    assert.equal(bookingTimeHasPassed('2026-09-17', 60, new Date('2026-09-16T19:00:00Z')), false);
});
test('session validation rejects invalid dates and reversed or unaligned times', () => {
    assert.ok(validateSession({ date: '2026-02-30', startMinute: 600, endMinute: 780 }));
    assert.ok(validateSession({ date: '2026-09-16', startMinute: 780, endMinute: 600 }));
    assert.ok(validateSession({ date: '2026-09-16', startMinute: 601, endMinute: 780 }));
    assert.equal(validateSession({ date: '2026-09-16', startMinute: 600, endMinute: 780 }), '');
});
test('availability respects full duration, shared session capacity and released bookings', () => {
    const session = { date: '2026-09-16', startMinute: 600, endMinute: 780, enabled: true };
    const booked = { id: 'a', date: session.date, startMinute: 660, duration: 30, status: 'booked', sessionId: 'another-session' };
    assert.deepEqual(availableStarts(session, 60, [booked]), [600, 690, 705, 720]);
    assert.ok(!availableStarts(session, 60, [booked]).includes(645));
    assert.ok(availableStarts(session, 60, [{ ...booked, status: 'cancelled' }]).includes(645));
    assert.ok(availableStarts(session, 60, [booked], 'a').includes(645));
    assert.deepEqual(availableStarts({ ...session, enabled: false }, 30, []), []);
    assert.equal(slotIds({ ...booked, status: 'completed' }).length, 2);
});
test('a booking must fit one open session and use a supported duration', () => {
    const session = { date: '2026-09-16', startMinute: 600, endMinute: 780, enabled: true };
    const booking = { patientId: 'synthetic', date: session.date, startMinute: 750, duration: 60 };
    assert.match(validateBooking(booking, session), /entirely/);
    assert.equal(validateBooking({ ...booking, duration: 30 }, session), '');
    assert.ok(validateBooking({ ...booking, duration: 15 }, session));
    assert.ok(validateBooking(booking, { ...session, enabled: false }));
});
