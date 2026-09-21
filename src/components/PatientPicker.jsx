import { useState } from 'react';
import { Link } from 'react-router-dom';
import { matchesPatient, patientIdentity } from '../utils/patients';

export default function PatientPicker({ patients, onSelect, title = 'Who is the consultation for?', bookingDate }) {
    const [search, setSearch] = useState('');
    const matches = patients.filter(patient => matchesPatient(patient, search));
    return <section className="workflow-panel space-y-4" aria-label="Choose a patient">
        <h2>{title}</h2>
        <label className="workflow-field">Find a patient<input className="input" type="search" value={search}
            onChange={event => setSearch(event.target.value)} placeholder="Name, contact or record ID" /></label>
        <p className="text-sm text-slate-600">Check the recorded age and contact before selecting a patient.</p>
        <div className="space-y-2">{matches.slice(0, 12).map(patient => <button key={patient.id} type="button"
            className="patient-choice" onClick={() => onSelect(patient.id)}><strong>{patient.name}</strong>
            <span>{patientIdentity(patient)}</span><small>Record: {patient.id}</small></button>)}</div>
        {!matches.length && <p>No matching patient found.</p>}
        {matches.length > 12 && <p className="text-sm text-slate-600">Showing 12 of {matches.length} matches. Keep typing to narrow the list.</p>}
        <Link to={bookingDate ? '/patients/new?next=booking&date=' + encodeURIComponent(bookingDate) : '/patients/new?startVisit=1'} className="btn btn-secondary w-fit">{bookingDate ? 'Register & book appointment' : 'Register & start consultation'}</Link>
    </section>;
}
