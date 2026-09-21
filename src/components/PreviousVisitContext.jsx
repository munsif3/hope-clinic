import { useState } from 'react';
import { Link } from 'react-router-dom';
import VisitTreatment from './VisitTreatment';
import { reusablePrescription } from '../utils/consultations';
import { historyEntries, patientIdentity } from '../utils/patients';
import { formatDate } from '../utils/formatters';

export default function PreviousVisitContext({ patient, history, onReuse, disabled }) {
    const [selected, setSelected] = useState([]);
    const latest = history.visits[0];
    const candidates = Array.isArray(latest?.prescriptions) ? latest.prescriptions : [];
    return <aside className="workflow-panel consultation-context" aria-label="Patient context">
        <h2>Patient context</h2><strong>{patient.name}</strong><p className="text-sm text-slate-600">{patientIdentity(patient)}</p>
        <Link className="workflow-link" to={`/patients/${patient.id}`}>Open full patient record</Link>
        {history.loading ? <p role="status">Loading previous consultations…</p> : history.error ?
            <div role="alert"><p>Previous treatment could not be loaded.</p><button type="button" className="btn btn-secondary" onClick={history.retry}>Try again</button></div> : latest ?
                <section className="space-y-3 border-t border-slate-200 pt-4">
                    <h3>Previous consultation</h3><p className="text-sm text-slate-600">{formatDate(latest.date)} {latest.time || ''}</p>
                    {candidates.some(reusablePrescription) && <details><summary>Review treatment for reuse</summary>
                        <div className="space-y-3 mt-3"><p className="text-sm text-slate-600">Select medicines to review for this encounter. Stock links and dispensed quantities are not copied.</p>
                            {candidates.map((item, index) => reusablePrescription(item) && <label className="flex gap-2 items-start" key={index}>
                                <input type="checkbox" disabled={disabled} checked={selected.includes(index)}
                                    onChange={event => setSelected(previous => event.target.checked ? [...previous, index] : previous.filter(value => value !== index))} />
                                <span>{item.name}</span></label>)}
                            <button className="btn btn-secondary" type="button" disabled={disabled || !selected.length} onClick={() => {
                                onReuse(selected.map(index => reusablePrescription(candidates[index])).filter(Boolean)); setSelected([]);
                            }}>Add selected for review</button>
                        </div></details>}
                    <p>{latest.diagnosis}</p><VisitTreatment visit={latest} />
                    {latest.patientInstructions && <p className="text-sm whitespace-pre-wrap"><strong>Previous patient advice: </strong>{latest.patientInstructions}</p>}
                    {latest.notes && <details><summary>Previous private clinical notes</summary><p className="whitespace-pre-wrap text-sm mt-3">{latest.notes}</p></details>}
                </section> : <p>No earlier consultations found for this visit date.</p>}
        <details><summary>Relevant medical history</summary><div className="space-y-3 mt-3">
            {[['Past history', patient.medicalHistory], ['Ongoing medications', patient.ongoingMedications], ['Family history', patient.familyHistory]].map(([label, value]) =>
                <section key={label}><h3>{label}</h3>{historyEntries(value).length ? historyEntries(value).map((item,index) =>
                    <p className="text-sm" key={index}>{item.name}{item.name && item.notes ? ' — ' : ''}{item.notes}</p>) : <p className="text-sm text-slate-600">Not recorded.</p>}</section>)}
        </div></details>
    </aside>;
}
