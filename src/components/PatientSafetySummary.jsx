import { ShieldCheck } from 'lucide-react';
import { historyEntries } from '../utils/patients';

export default function PatientSafetySummary({ patient }) {
    const entries = historyEntries(patient.allergies);
    return <section aria-label="Recorded allergies" className={`patient-safety ${entries.length ? 'has-allergies' : ''}`}>
        <ShieldCheck size={20} aria-hidden="true" />
        <div><strong>Allergies</strong>{entries.length ? <ul>{entries.map((item, index) =>
            <li key={index}>{item.name}{item.name && item.notes ? ' — ' : ''}{item.notes}</li>)}</ul> :
            <p>Not recorded. Confirm with the patient; this does not mean no known allergies.</p>}</div>
    </section>;
}
