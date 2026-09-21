import { useState, useEffect, useRef } from 'react';
import { db } from '../config/firebase';
import { collection, doc, getDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { Save } from 'lucide-react';
import Loader from '../components/Loader';
import DynamicListInput from '../components/DynamicListInput';
import { historyEntries, possibleDuplicates, patientIdentity } from '../utils/patients';
import { visitRevision } from '../utils/visits';
import { savePatient, validatePatient, PatientSaveError } from '../services/savePatient';

const fields = ['medicalHistory', 'familyHistory', 'ongoingMedications', 'allergies'];
const emptyPatient = { name: '', age: '', gender: '', contact: '', address: '', medicalHistory: [], familyHistory: [], ongoingMedications: [], allergies: [] };

export default function PatientForm() {
    const { id } = useParams();
    const [params] = useSearchParams();
    return <PatientEditor key={id || 'new'} id={id} nextBooking={params.get('next') === 'booking'} bookingDate={params.get('date') || ''} />;
}

function PatientEditor({ id, nextBooking, bookingDate }) {
    const navigate = useNavigate();
    const [form, setForm] = useState(emptyPatient);
    const [patients, setPatients] = useState([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [retry, setRetry] = useState(0);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [dirty, setDirty] = useState(false);
    const [duplicateReviewed, setDuplicateReviewed] = useState(false);
    const [patientRef] = useState(() => doc(db, 'patients', id || doc(collection(db, 'patients')).id));
    const original = useRef(null);
    const savingRef = useRef(false);
    const errorRef = useRef(null);
    const duplicates = possibleDuplicates(patients, form, id);
    useEffect(() => {
        let active = true;
        Promise.all([getDocs(query(collection(db, 'patients'), orderBy('name'))), id ? getDoc(patientRef) : Promise.resolve(null)])
            .then(([list, snapshot]) => {
                if (!active) return;
                if (id && !snapshot.exists()) throw new Error('missing-patient');
                setPatients(list.docs.map(item => ({ ...item.data(), id: item.id })));
                if (snapshot) {
                    const data = snapshot.data(); original.current = visitRevision(data);
                    setForm({ ...emptyPatient, ...Object.fromEntries(Object.keys(emptyPatient).map(key => [key, data[key] ?? emptyPatient[key]])),
                        ...Object.fromEntries(fields.map(key => [key, historyEntries(data[key])])) });
                }
                setLoadError(false);
            }).catch(() => { if (active) setLoadError(true); }).finally(() => { if (active) setInitialLoading(false); });
        return () => { active = false; };
    }, [id, patientRef, retry]);
    useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
    useEffect(() => {
        if (!dirty) return;
        const warn = event => { event.preventDefault(); event.returnValue = ''; };
        const guard = event => {
            if (event.target.closest('a[href]') && (savingRef.current || !window.confirm('Leave without saving this patient form?'))) {
                event.preventDefault(); event.stopPropagation();
            }
        };
        window.addEventListener('beforeunload', warn); document.addEventListener('click', guard, true);
        return () => { window.removeEventListener('beforeunload', warn); document.removeEventListener('click', guard, true); };
    }, [dirty]);
    const change = update => { setForm(previous => ({ ...previous, ...update })); setDirty(true); setError(''); if ('name' in update || 'contact' in update) setDuplicateReviewed(false); };
    const handleChange = event => change({ [event.target.name]: event.target.value });
    async function save(event) {
        event.preventDefault();
        if (savingRef.current) return;
        const validation = validatePatient(form);
        if (validation) { setError(validation); return; }
        if (duplicates.length && !duplicateReviewed) { setError('Review the possible matching records before saving a separate patient.'); return; }
        if (!navigator.onLine) { setError('You are offline. Keep this page open and save when connected.'); return; }
        savingRef.current = true; setSaving(true); setError('');
        const startVisit = event.nativeEvent.submitter?.value === 'start';
        const startBooking = event.nativeEvent.submitter?.value === 'book';
        try {
            await savePatient(db, { patientId: patientRef.id, isNew: !id, expectedRevision: original.current, form });
            setDirty(false);
            navigate(startBooking ? '/today?patientId=' + patientRef.id + '&date=' + encodeURIComponent(bookingDate) : startVisit ? '/visits/new?patientId=' + patientRef.id : '/patients/' + patientRef.id);
        } catch (failure) {
            setError(failure instanceof PatientSaveError && failure.message === 'changed' ? 'This patient record changed after you opened it. Your entries are still here; review the latest record before saving.' :
                failure instanceof PatientSaveError && failure.message === 'already-saved' ? 'This patient was already saved. Open the saved record rather than creating it again.' :
                    'Could not save the patient. Your entries are still here. Check the connection and try again.');
        } finally { savingRef.current = false; setSaving(false); }
    }
    if (initialLoading) return <Loader text="Loading patient form…" />;
    if (loadError) return <section role="alert" className="workflow-panel space-y-3"><p>The patient form could not be loaded. No changes were saved.</p>
        <button className="btn btn-secondary" onClick={() => { setInitialLoading(true); setRetry(value => value + 1); }}>Try again</button></section>;
    return <div className="max-w-3xl mx-auto space-y-5"><header className="workflow-header"><div><h1>{id ? 'Edit patient' : 'Register a patient'}</h1>
        <p className="text-slate-600">{id ? 'Keep the patient record up to date.' : 'Start with identity and allergies. Other history can be added during care.'}</p></div>
        <Link className="btn btn-secondary" to={id ? '/patients/' + id : '/patients'}>Back</Link></header>
        {error && <div ref={errorRef} tabIndex={-1} role="alert" className="workflow-error"><p>{error}</p>{error.includes('already saved') && <Link to={'/patients/' + patientRef.id} className="workflow-link">Open saved record</Link>}</div>}
        <form onSubmit={save} noValidate><fieldset disabled={saving} className="workflow-panel space-y-5 min-w-0"><legend className="sr-only">Patient details</legend>
            <label className="workflow-field" htmlFor="patient-name">Full name<input id="patient-name" name="name" className="input" value={form.name} onChange={handleChange} required /></label>
            <div className="grid sm:grid-cols-2 gap-4"><label className="workflow-field" htmlFor="patient-age">Age<input id="patient-age" name="age" type="number" className="input" min="0" max="130" value={form.age} onChange={handleChange} required /></label>
                <label className="workflow-field" htmlFor="patient-gender">Gender<select id="patient-gender" name="gender" className="input" value={form.gender} onChange={handleChange}>
                    <option value="">Not recorded</option><option>Female</option><option>Male</option><option>Other</option></select></label></div>
            <label className="workflow-field" htmlFor="patient-contact">Contact number<input id="patient-contact" name="contact" type="tel" className="input" value={form.contact} onChange={handleChange} required /></label>
            {duplicates.length > 0 && <section className="duplicate-notice space-y-3"><h2>Possible matching records</h2><p>Families can share a number. Check identity before creating a separate record.</p>
                {duplicates.map(patient => <Link key={patient.id} className="patient-choice" to={'/patients/' + patient.id}><strong>{patient.name}</strong><span>{patientIdentity(patient)}</span><small>Record: {patient.id}</small></Link>)}
                <label className="flex gap-2 items-start"><input type="checkbox" checked={duplicateReviewed} onChange={event => setDuplicateReviewed(event.target.checked)} /><span>I checked these matches and need to save this separate patient record.</span></label></section>}
            <section className="space-y-3"><DynamicListInput label="Allergies" items={form.allergies} onChange={allergies => change({ allergies })} placeholderName="Allergen" placeholderNotes="Reaction and relevant details" />
                {!form.allergies.length && <p className="text-sm text-slate-600">Allergies are not recorded. An empty list does not mean no known allergies.</p>}</section>
            <details open={Boolean(form.address) || undefined}><summary>Address (optional)</summary><label className="workflow-field mt-3" htmlFor="patient-address">Address<textarea id="patient-address" name="address" rows="2" className="input" value={form.address} onChange={handleChange} /></label></details>
            <details open={fields.slice(0,3).some(key => form[key].length) || undefined}><summary>Other medical history (optional)</summary><div className="space-y-5 mt-4">
                <DynamicListInput label="Past history / other ailments" items={form.medicalHistory} onChange={medicalHistory => change({ medicalHistory })} placeholderName="Condition" />
                <DynamicListInput label="Ongoing medications" items={form.ongoingMedications} onChange={ongoingMedications => change({ ongoingMedications })} placeholderName="Medication" />
                <DynamicListInput label="Family history" items={form.familyHistory} onChange={familyHistory => change({ familyHistory })} placeholderName="Condition" />
            </div></details>
            <footer className="flex gap-3 flex-wrap"><button type="submit" name="action" value={id ? 'save' : nextBooking ? 'book' : 'start'} className="btn btn-primary"><Save size={18} />{saving ? 'Saving…' : id ? 'Save changes' : nextBooking ? 'Save & book appointment' : 'Save & start consultation'}</button>
                {!id && <button type="submit" name="action" value="save" className="btn btn-secondary">Save patient only</button>}</footer>
        </fieldset></form>
    </div>;
}
