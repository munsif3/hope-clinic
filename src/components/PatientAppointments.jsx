import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db } from '../config/firebase';
import { CLINIC_TIME_ZONE, minuteTime, STATUS_LABELS } from '../utils/scheduling';
import { formatDate } from '../utils/formatters';

export default function PatientAppointments({ patientId }) {
    const [result, setResult] = useState(null);
    useEffect(() => onSnapshot(query(collection(db, 'appointments'), where('patientId', '==', patientId)), { includeMetadataChanges: true }, snapshot => {
        setResult({ patientId, cached: snapshot.metadata.fromCache, items: snapshot.docs.map(item => ({ ...item.data(), id: item.id })) });
    }, () => setResult({ patientId, error: true })), [patientId]);
    const current = result?.patientId === patientId ? result : null;
    const appointments = (current?.items || []).filter(item => ['booked', 'arrived', 'in_progress'].includes(item.status))
        .sort((a, b) => a.date.localeCompare(b.date) || a.startMinute - b.startMinute);
    return <section className="workflow-panel space-y-3" aria-label="Patient appointments"><div className="workflow-header"><h2>Appointments</h2>
        <Link className="btn btn-secondary" to={'/today?patientId=' + encodeURIComponent(patientId)}>Book a return</Link></div>
        {!current ? <p role="status">Loading appointments…</p> : current.error ? <p role="alert">Appointments could not be loaded. <Link className="workflow-link" to="/today">Check the clinic schedule</Link></p> : <>
            {current.cached && <p className="text-sm text-slate-600">Cached schedule; waiting for the live connection.</p>}
            {appointments.length ? appointments.slice(0, 5).map(item => <div className="flex flex-wrap gap-2 justify-between border-t pt-3" key={item.id}>
                <p>{formatDate(item.date)} · {minuteTime(item.startMinute)}–{minuteTime(item.startMinute + item.duration)} · {STATUS_LABELS[item.status]}</p>
                <Link className="workflow-link" to={'/today?date=' + item.date}>Open this clinic day</Link></div>) : <p className="text-sm text-slate-600">No open appointments recorded. Review due dates do not reserve a time.</p>}
            {appointments.length > 5 && <p className="text-sm">Showing the first five open appointments.</p>}
            {appointments.length > 0 && <p className="text-sm text-slate-600">Clinic time · {CLINIC_TIME_ZONE}</p>}
        </>}
    </section>;
}
