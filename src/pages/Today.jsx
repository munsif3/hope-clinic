import { useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarDays, Plus, Users } from 'lucide-react';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import useClinicSchedule from '../hooks/useClinicSchedule';
import BookingForm from '../components/BookingForm';
import ClinicSessions from '../components/ClinicSessions';
import { clinicDate, CLINIC_TIME_ZONE, minuteTime, STATUS_LABELS, validScheduleDate } from '../utils/scheduling';
import { patientIdentity } from '../utils/patients';
import { changeAppointmentStatus, scheduleErrorMessage } from '../services/scheduling';

export default function Today() {
    const [params, setParams] = useSearchParams();
    const [date, setDate] = useState(() => validScheduleDate(params.get('date') || '') ? params.get('date') : clinicDate());
    const [booking, setBooking] = useState(() => params.get('patientId') ? { kind: 'booked', initialPatientId: params.get('patientId') } : null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const busyRef = useRef(false);
    const schedule = useClinicSchedule(date);
    const { userRole } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const connected = !schedule.loading && !schedule.cached && !schedule.error;
    const patientMap = new Map(schedule.patients.map(patient => [patient.id, patient]));
    const active = schedule.appointments.filter(item => !['cancelled', 'no_show', 'completed'].includes(item.status));
    const finished = schedule.appointments.filter(item => ['cancelled', 'no_show', 'completed'].includes(item.status));
    async function transition(appointment, status) {
        if (busyRef.current) return;
        if (appointment.status === 'in_progress' && status === 'arrived' && !window.confirm('Return this appointment to waiting? Unsaved notes stay in the original consultation tab and can be restored when you resume.')) return;
        if (['cancelled', 'no_show'].includes(status) && !window.confirm(status === 'cancelled' ? 'Cancel this appointment and release its reserved time?' : 'Mark this patient as not attending and release the reserved time?')) return;
        busyRef.current = true; setBusy(true); setError('');
        try {
            const result = await changeAppointmentStatus(db, { id: appointment.id, expectedRevision: appointment.revision, status });
            if (status === 'in_progress') navigate('/visits/new?patientId=' + encodeURIComponent(result.patientId) + '&appointmentId=' + encodeURIComponent(result.id));
            else showToast('Appointment updated.', 'success');
        } catch (failure) { setError(scheduleErrorMessage(failure)); }
        finally { busyRef.current = false; setBusy(false); }
    }
    function row(appointment) {
        const patient = patientMap.get(appointment.patientId);
        const session = schedule.sessions.find(item => item.id === appointment.sessionId);
        return <article className="agenda-row" key={appointment.id}>
            <div className="agenda-time"><strong>{minuteTime(appointment.startMinute)}</strong><span>to {minuteTime(appointment.startMinute + appointment.duration)}</span><span>{appointment.duration} min</span></div>
            <div className="min-w-0 space-y-1"><Link className="workflow-link font-semibold" to={'/patients/' + appointment.patientId}>{patient?.name || 'Patient record unavailable'}</Link>
                <p className="text-sm text-slate-600">{patient && patientIdentity(patient)}</p>
                <span className={'appointment-status status-' + appointment.status}>{STATUS_LABELS[appointment.status]}</span>
                {appointment.kind === 'walk_in' && <span className="text-sm ml-2">Walk-in</span>}
                {session && !session.enabled && ['booked', 'arrived'].includes(appointment.status) && <p className="text-sm text-amber-800">Session closed to new bookings. This appointment is still reserved.</p>}
                {appointment.status === 'in_progress' && <p className="text-sm text-slate-600">Resume in the original tab to recover unsaved notes. Saving the visit completes this appointment.</p>}
            </div>
            <div className="agenda-actions">
                {appointment.status === 'booked' && appointment.date <= clinicDate() && <button className="btn btn-secondary" disabled={busy || !connected} onClick={() => transition(appointment, 'arrived')}>Mark arrived</button>}
                {['booked', 'arrived', 'in_progress'].includes(appointment.status) && appointment.date <= clinicDate() && <button className="btn btn-primary" disabled={busy || !connected || !patient} onClick={() => transition(appointment, 'in_progress')}>{appointment.status === 'in_progress' ? 'Resume consultation' : 'Start consultation'}</button>}
                {appointment.status === 'booked' && <button className="btn btn-secondary" disabled={busy || !connected} onClick={() => setBooking({ appointment })}>Reschedule</button>}
                {appointment.status === 'in_progress' && <button className="btn btn-secondary" disabled={busy || !connected} onClick={() => transition(appointment, 'arrived')}>Return to waiting</button>}
                {['booked', 'arrived'].includes(appointment.status) && <details><summary>Other actions</summary><div className="flex flex-wrap gap-3 mt-3">
                    <button className="workflow-link" disabled={busy || !connected} onClick={() => transition(appointment, 'cancelled')}>Cancel appointment</button>
                    {appointment.date <= clinicDate() && <button className="workflow-link" disabled={busy || !connected} onClick={() => transition(appointment, 'no_show')}>Did not attend</button>}</div></details>}
                {appointment.status === 'completed' && <Link className="btn btn-secondary" to={'/visits/' + appointment.visitId + '/print'}>Open saved visit</Link>}
            </div>
        </article>;
    }
    return <div className="space-y-5 max-w-7xl mx-auto">
        <header className="workflow-header"><div><p className="workflow-eyebrow">Clinic day</p><h1>{date === clinicDate() ? 'Today' : 'Clinic schedule'}</h1><p className="text-slate-600">Who is expected, who is waiting, and what needs attention.</p></div>
            <Link className="btn btn-secondary" to="/patients"><Users size={18} />Find a patient</Link></header>
        <div className="workflow-panel schedule-toolbar">
            <div className="schedule-date"><label className="workflow-field">Clinic date<input type="date" className="input" value={date} onChange={event => { if (event.target.value) { setDate(event.target.value); setBooking(null); setError(''); } }} /></label>
                <button className="btn btn-secondary" onClick={() => { setDate(clinicDate()); setBooking(null); }}>Today</button></div>
            <div className="schedule-actions">
                <button className="btn btn-primary" disabled={!connected} onClick={() => setBooking({ kind: 'booked' })}><CalendarDays size={18} />Book appointment</button>
                <button className="btn btn-secondary" disabled={!connected || date !== clinicDate()} onClick={() => setBooking({ kind: 'walk_in' })}><Plus size={18} />Add walk-in</button></div>
        </div>
        <p className="text-sm text-slate-600">Clinic time · {CLINIC_TIME_ZONE} · Appointment times reserve capacity; consultations may run over.</p>
        {error && <p role="alert" className="workflow-error">{error}</p>}
        {schedule.error ? <div role="alert" className="workflow-error"><p>The clinic schedule could not be loaded. Booking is unavailable until the connection is restored.</p><button className="btn btn-secondary" onClick={schedule.retry}>Try again</button></div> :
            schedule.loading ? <p role="status">Loading the clinic day…</p> : <>
                {schedule.cached && <p role="status" className="workflow-error">Showing cached information. Waiting for the live schedule before confirming changes.</p>}
                {booking && <BookingForm key={booking.appointment?.id || booking.kind} initialDate={date} {...booking} onClose={() => { setBooking(null); setParams({}, { replace: true }); }} onSaved={savedDate => { setBooking(null); setDate(savedDate); setParams({}, { replace: true }); showToast('Appointment confirmed.', 'success'); }} />}
                <div className="today-counts" aria-label="Day summary"><div><strong>{active.filter(item => item.status === 'booked').length}</strong><span>Expected</span></div><div><strong>{active.filter(item => item.status === 'arrived').length}</strong><span>Waiting</span></div><div><strong>{active.filter(item => item.status === 'in_progress').length}</strong><span>In consultation</span></div><div><strong>{schedule.appointments.filter(item => item.status === 'completed').length}</strong><span>Completed</span></div></div>
                <section className="workflow-panel space-y-4" aria-label="Appointment agenda"><h2>Appointments</h2>
                    {active.length ? active.map(row) : <p className="text-slate-600">No upcoming or waiting appointments for this date. Open a session and book a time, or add a walk-in.</p>}
                    {finished.length > 0 && <details><summary>Completed and closed appointments ({finished.length})</summary><div className="mt-3">{finished.map(row)}</div></details>}
                </section>
                <ClinicSessions key={date} date={date} sessions={schedule.sessions} editable={userRole === 'doctor'} connected={connected} />
                <section className="workflow-panel space-y-3" aria-label="Reviews due"><h2>Reviews due · {schedule.followups.length}</h2><p className="text-sm text-slate-600">These are review tasks due by the selected date, not reserved appointments. Booking a time does not mark a review complete.</p>
                    {schedule.followups.slice(0, 5).map(item => <div className="flex gap-3 flex-wrap justify-between border-t pt-3" key={item.id}><div><Link className="workflow-link" to={'/patients/' + item.patientId}>{patientMap.get(item.patientId)?.name || 'Patient record unavailable'}</Link><p className="text-sm">Review due {item.date}{item.time ? ' · requested ' + item.time : ''}</p></div>
                        {patientMap.has(item.patientId) ? <Link className="btn btn-secondary" to={'/visits/new?patientId=' + encodeURIComponent(item.patientId) + '&followupId=' + encodeURIComponent(item.id)}>Start review</Link> : <span className="text-sm text-slate-600">Verify the patient record before starting care.</span>}</div>)}
                    {!schedule.followups.length && <p>No pending reviews due by this date.</p>}<Link className="workflow-link" to="/followups">Open all follow-ups</Link>
                </section>
            </>}
    </div>;
}
