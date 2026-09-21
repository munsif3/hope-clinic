import { useEffect, useRef, useState } from 'react';
import { collection, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import PatientPicker from './PatientPicker';
import useClinicSchedule from '../hooks/useClinicSchedule';
import { APPOINTMENT_DURATIONS, CLINIC_TIME_ZONE, availableStarts, minuteTime, bookingTimeHasPassed, clinicDate } from '../utils/scheduling';
import { patientIdentity } from '../utils/patients';
import { bookAppointment, scheduleErrorMessage } from '../services/scheduling';

export default function BookingForm({ initialDate, initialPatientId = '', appointment, kind = 'booked', onClose, onSaved }) {
    const [date, setDate] = useState(initialDate);
    const [patientId, setPatientId] = useState(appointment?.patientId || initialPatientId);
    const [duration, setDuration] = useState(appointment?.duration || 30);
    const [choice, setChoice] = useState(null);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const savingRef = useRef(false);
    const panelRef = useRef(null);
    useEffect(() => { panelRef.current?.focus(); }, []);
    const [id] = useState(() => appointment?.id || doc(collection(db, 'appointments')).id);
    const [visitId] = useState(() => appointment?.visitId || doc(collection(db, 'visits')).id);
    const schedule = useClinicSchedule(date);
    const patient = schedule.patients.find(item => item.id === patientId);
    const available = schedule.sessions.filter(session => session.enabled).flatMap(session =>
        availableStarts(session, duration, schedule.appointments, appointment?.id).filter(startMinute => !bookingTimeHasPassed(date, startMinute)).map(startMinute => ({ sessionId: session.id, startMinute })));
    const unique = available.filter((item, index) => available.findIndex(candidate => candidate.startMinute === item.startMinute) === index);
    const validChoice = choice && available.some(item => item.sessionId === choice.sessionId && item.startMinute === choice.startMinute);
    async function save(event) {
        event.preventDefault();
        if (savingRef.current) return;
        if (!validChoice || !patient) { setError('Select a patient and an available time.'); return; }
        savingRef.current = true; setSaving(true); setError('');
        try {
            await bookAppointment(db, { id, visitId, patientId, date, duration, ...choice, kind, expectedRevision: appointment?.revision });
            onSaved(date);
        } catch (failure) { setError(scheduleErrorMessage(failure)); }
        finally { savingRef.current = false; setSaving(false); }
    }
    return <section ref={panelRef} tabIndex={-1} className="workflow-panel space-y-4" aria-label={appointment ? 'Reschedule appointment' : 'Book an appointment'}>
        <header className="workflow-header"><div><h2>{appointment ? 'Reschedule appointment' : kind === 'walk_in' ? 'Make time for a walk-in' : 'Book an appointment'}</h2>
            <p className="text-sm text-slate-600">{CLINIC_TIME_ZONE} · The time is reserved only after confirmation.</p></div>
            <button className="btn btn-secondary" disabled={saving} onClick={onClose}>Close booking</button></header>
        {error && <p role="alert" className="workflow-error">{error}</p>}
        {schedule.error && <p role="alert">The schedule could not be loaded. <button className="workflow-link" onClick={schedule.retry}>Try again</button></p>}
        <form onSubmit={save}><fieldset disabled={saving} className="space-y-4 min-w-0"><legend className="sr-only">Booking details</legend>
            <div className="grid sm:grid-cols-2 gap-4"><label className="workflow-field">Appointment date<input type="date" min={clinicDate()} max={kind === 'walk_in' ? clinicDate() : undefined} required className="input" value={date} onChange={event => { if (event.target.value) { setDate(event.target.value); setChoice(null); } }} /></label>
                <label className="workflow-field">Appointment length<select className="input" value={duration} onChange={event => { setDuration(Number(event.target.value)); setChoice(null); }}>
                    {APPOINTMENT_DURATIONS.map(value => <option value={value} key={value}>{value} minutes</option>)}</select></label></div>
            {!patientId ? <PatientPicker title="Who is the appointment for?" bookingDate={date} patients={schedule.patients} onSelect={setPatientId} /> :
                <div className="patient-choice"><strong>{patient?.name || 'Loading patient…'}</strong><span>{patient && patientIdentity(patient)}</span>
                    {!appointment && <button type="button" className="workflow-link w-fit" onClick={() => setPatientId('')}>Choose a different patient</button>}</div>}
            {schedule.loading ? <p role="status">Checking the schedule…</p> : schedule.cached ? <p role="status">Waiting for a live schedule connection. Booking confirmation is unavailable.</p> :
                <fieldset className="space-y-3"><legend className="font-semibold">Available start times</legend>
                    {!unique.length && <p>No upcoming times fit this duration. Choose another date or open a clinic session for this date.</p>}
                    <div className="booking-times">{unique.sort((a, b) => a.startMinute - b.startMinute).map(item => <label key={item.startMinute} className="booking-time">
                        <input type="radio" name="start-time" checked={Boolean(validChoice && choice.startMinute === item.startMinute)} onChange={() => setChoice(item)} />
                        <span>{minuteTime(item.startMinute)}–{minuteTime(item.startMinute + duration)}</span></label>)}</div>
                </fieldset>}
            {validChoice && <p className="text-sm">{date} · {minuteTime(choice.startMinute)}–{minuteTime(choice.startMinute + duration)} · {duration} minutes</p>}
            {kind === 'walk_in' && <p className="text-sm text-slate-600">The walk-in is marked waiting after booking. If the day is full, open extra session time or reschedule an existing booking before promising a time.</p>}
            <button className="btn btn-primary" type="submit" disabled={saving || schedule.loading || schedule.cached || schedule.error || !validChoice || !patient}>{saving ? 'Reserving…' : appointment ? 'Confirm new time' : 'Confirm appointment'}</button>
        </fieldset></form>
    </section>;
}
