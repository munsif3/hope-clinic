export const CLINIC_TIME_ZONE = 'Asia/Colombo';
export const APPOINTMENT_DURATIONS = [30, 45, 60];
export const OCCUPYING_STATUSES = ['booked', 'arrived', 'in_progress', 'completed'];
export const STATUS_LABELS = { booked: 'Booked', arrived: 'Waiting', in_progress: 'In consultation', completed: 'Completed', cancelled: 'Cancelled', no_show: 'Did not attend' };

export function clinicDate(now = new Date()) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: CLINIC_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function bookingTimeHasPassed(date, startMinute, now = new Date()) {
    const today = clinicDate(now);
    const time = new Intl.DateTimeFormat('en-GB', { timeZone: CLINIC_TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
    return date < today || (date === today && startMinute < timeMinutes(time));
}
export function validScheduleDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value + 'T12:00:00Z');
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function timeMinutes(value) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return NaN;
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
}
export function minuteTime(value) {
    return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}
export function slotIds(appointment) {
    if (!appointment || !OCCUPYING_STATUSES.includes(appointment.status)) return [];
    return Array.from({ length: appointment.duration / 15 }, (_, index) => `${appointment.date}_${appointment.startMinute + index * 15}`);
}
export function validateSession({ date, startMinute, endMinute }) {
    if (!validScheduleDate(date)) return 'Choose a valid clinic date.';
    if (![startMinute, endMinute].every(value => Number.isInteger(value) && value >= 0 && value <= 1440 && value % 15 === 0) || startMinute >= endMinute) {
        return 'Use opening and closing times on a 15-minute boundary, with closing after opening.';
    }
    return '';
}
export function validateBooking(appointment, session) {
    if (!session?.enabled || session.date !== appointment.date) return 'This session is closed or no longer available. Choose an open session.';
    if (!appointment.patientId || !APPOINTMENT_DURATIONS.includes(appointment.duration)) return 'Select a patient and a 30, 45 or 60-minute appointment.';
    if (!Number.isInteger(appointment.startMinute) || appointment.startMinute % 15 || appointment.startMinute < session.startMinute || appointment.startMinute + appointment.duration > session.endMinute) {
        return 'The appointment must fit entirely within the session.';
    }
    return '';
}
export function availableStarts(session, duration, appointments, excludeId = '') {
    if (!session.enabled) return [];
    const occupied = new Set(appointments.filter(item => item.id !== excludeId).flatMap(slotIds));
    const starts = [];
    for (let start = session.startMinute; start + duration <= session.endMinute; start += 15) {
        if (slotIds({ date: session.date, startMinute: start, duration, status: 'booked' }).every(id => !occupied.has(id))) starts.push(start);
    }
    return starts;
}
