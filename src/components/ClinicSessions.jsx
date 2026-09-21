import { useRef, useState } from 'react';
import { collection, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { minuteTime, timeMinutes } from '../utils/scheduling';
import { saveSession, setSessionEnabled, scheduleErrorMessage } from '../services/scheduling';

export default function ClinicSessions({ date, sessions, editable, connected }) {
    const [start, setStart] = useState('10:00'), [end, setEnd] = useState('13:00');
    const [error, setError] = useState(''), [saving, setSaving] = useState(false);
    const busy = useRef(false);
    const sessionId = useRef(null);
    async function act(operation) {
        if (busy.current) return;
        busy.current = true; setSaving(true); setError('');
        try { await operation(); } catch (failure) { setError(scheduleErrorMessage(failure)); }
        finally { busy.current = false; setSaving(false); }
    }
    function open(event) {
        event.preventDefault();
        sessionId.current ||= doc(collection(db, 'clinicSessions')).id;
        act(async () => {
            await saveSession(db, { id: sessionId.current, date, startMinute: timeMinutes(start), endMinute: timeMinutes(end) });
            sessionId.current = null;
        });
    }
    return <details className="workflow-panel" open={sessions.length ? undefined : true}><summary>Clinic hours · {sessions.filter(item => item.enabled).length} open sessions</summary>
        <div className="space-y-4 mt-4"><p className="text-sm text-slate-600">Set this date’s hours. Suggested hours are 10:00–13:00 and 14:00–19:00; they are not opened automatically.</p>
            {error && <p role="alert" className="workflow-error">{error}</p>}
            {sessions.map(session => <div key={session.id} className="flex flex-wrap gap-3 items-center justify-between"><span>{minuteTime(session.startMinute)}–{minuteTime(session.endMinute)} · {session.enabled ? 'Open for bookings' : 'Closed to new bookings'}</span>
                {editable && <button className="btn btn-secondary" disabled={saving || !connected} onClick={() => act(() => setSessionEnabled(db, session.id, !session.enabled))}>{session.enabled ? 'Close session' : 'Reopen session'}</button>}</div>)}
            {editable ? <form onSubmit={open}><fieldset disabled={saving || !connected} className="space-y-3"><legend className="font-semibold">Open a session on {date}</legend>
                <div className="flex gap-3 flex-wrap"><button type="button" className="workflow-link" onClick={() => { setStart('10:00'); setEnd('13:00'); sessionId.current = null; }}>Use morning hours</button>
                    <button type="button" className="workflow-link" onClick={() => { setStart('14:00'); setEnd('19:00'); sessionId.current = null; }}>Use afternoon hours</button></div>
                <div className="grid sm:grid-cols-2 gap-3"><label className="workflow-field">Opening time<input type="time" step="900" className="input" required value={start} onChange={event => { setStart(event.target.value); sessionId.current = null; }} /></label>
                    <label className="workflow-field">Closing time<input type="time" step="900" className="input" required value={end} onChange={event => { setEnd(event.target.value); sessionId.current = null; }} /></label></div>
                <button className="btn btn-secondary" type="submit">{saving ? 'Saving…' : 'Open session'}</button>
                <p className="text-sm text-slate-600">To change hours, close the old session and open one with the new hours. Existing appointments stay booked until you explicitly reschedule or cancel them.</p>
            </fieldset></form> : <p className="text-sm text-slate-600">The doctor manages clinic hours.</p>}
        </div>
    </details>;
}
