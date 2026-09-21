import { useState, useEffect, useRef } from 'react';
import { db } from '../config/firebase';
import { collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { useNavigate, useSearchParams, useParams, Link } from 'react-router-dom';
import { Save, Mic, MicOff, ArrowLeft } from 'lucide-react';
import PrescriptionListInput from '../components/PrescriptionListInput';
import InventoryQuickAddModal from '../components/InventoryQuickAddModal';
import InvestigationListInput from '../components/InvestigationListInput';
import Loader from '../components/Loader';
import VisitTreatment from '../components/VisitTreatment';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { newVisit, visitRevision, validateVisit } from '../utils/visits';
import { previousVisits } from '../utils/consultations';
import { patientIdentity } from '../utils/patients';
import usePatientVisits from '../hooks/usePatientVisits';
import PatientPicker from '../components/PatientPicker';
import PatientSafetySummary from '../components/PatientSafetySummary';
import PreviousVisitContext from '../components/PreviousVisitContext';
import ConsultationReview from '../components/ConsultationReview';
import { draftKey, readDraft, writeDraft } from '../utils/visitDrafts';
import { saveVisit, VisitSaveError } from '../services/saveVisit';

export default function VisitForm() {
    const { id } = useParams();
    const [params] = useSearchParams();
    const { currentUser } = useAuth();
    const patientId = params.get('patientId') || '';
    const followupId = params.get('followupId') || '';
    const appointmentId = params.get('appointmentId') || '';
    const scope = id ? 'edit:' + id : appointmentId ? 'appointment:' + appointmentId : 'new:' + patientId + ':' + followupId;
    return <VisitEditor key={currentUser.uid + scope} id={id} initialPatientId={patientId} followupId={followupId} appointmentId={appointmentId} storageKey={draftKey(currentUser.uid, scope)} />;
}

function VisitEditor({ id, initialPatientId, followupId, appointmentId, storageKey }) {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { currentUser, userRole, userName } = useAuth();
    const [patients, setPatients] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [formData, setFormData] = useState(() => newVisit(initialPatientId));
    const [initialLoading, setInitialLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [appointmentError, setAppointmentError] = useState('');
    const [retry, setRetry] = useState(0);
    const [loading, setLoading] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [reviewOpen, setReviewOpen] = useState(false);
    const errorRef = useRef(null);
    const [dirty, setDirty] = useState(false);
    const [recovery, setRecovery] = useState(null);
    const [draftStatus, setDraftStatus] = useState('');
    const [isAddMedicineModalOpen, setIsAddMedicineModalOpen] = useState(false);
    const [newMedicineName, setNewMedicineName] = useState('');
    const [medicineRow, setMedicineRow] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef(null);
    const revisionRef = useRef(null);
    const [initialVisitId] = useState(() => id || doc(collection(db, 'visits')).id);
    const visitIdRef = useRef(initialVisitId);
    const savingRef = useRef(false);
    const history = usePatientVisits(formData.patientId);
    const earlier = previousVisits(history.visits, formData.patientId, id, formData.date, formData.time);
    const selectedPatient = patients.find(patient => patient.id === formData.patientId);

    useEffect(() => { if (saveError && !reviewOpen) errorRef.current?.focus(); }, [saveError, reviewOpen]);

    useEffect(() => {
        let active = true;
        async function load() {
            try {
                const [patientSnapshot, inventorySnapshot, visitSnapshot, appointmentSnapshot] = await Promise.all([
                    getDocs(query(collection(db, 'patients'), orderBy('name'))),
                    getDocs(query(collection(db, 'inventory'), orderBy('name'))),
                    id ? getDoc(doc(db, 'visits', id)) : Promise.resolve(null),
                    appointmentId && !id ? getDoc(doc(db, 'appointments', appointmentId)) : Promise.resolve(null),
                ]);
                if (!active) return;
                if (id && !visitSnapshot.exists()) throw new Error('missing-visit');
                const appointment = appointmentSnapshot?.data();
                if (appointmentId && !id) {
                    if (!appointment || appointment.patientId !== initialPatientId || appointment.status !== 'in_progress') {
                        setAppointmentError('This booking is not an active consultation. Return to Today to open its current state.');
                        return;
                    }
                    visitIdRef.current = appointment.visitId;
                }
                setPatients(patientSnapshot.docs.map(item => ({ ...item.data(), id: item.id })));
                setInventory(inventorySnapshot.docs.map(item => ({ ...item.data(), id: item.id })));
                if (visitSnapshot) {
                    const data = visitSnapshot.data();
                    setFormData({ ...newVisit(), ...data });
                    revisionRef.current = visitRevision(data);
                }
                try {
                    const candidate = readDraft(window.sessionStorage, storageKey);
                    if (candidate && (!id || candidate.visitId === id) && (!appointment || candidate.visitId === appointment.visitId) &&
                        (!initialPatientId || candidate.form.patientId === initialPatientId)) setRecovery(candidate);
                }
                catch { setDraftStatus('unavailable'); }
                setLoadError(false);
            } catch {
                if (active) setLoadError(true);
            } finally {
                if (active) setInitialLoading(false);
            }
        }
        load();
        return () => { active = false; };
    }, [id, initialPatientId, appointmentId, retry, storageKey]);

    useEffect(() => {
        if (!dirty || initialLoading || recovery || loadError) return;
        try {
            writeDraft(window.sessionStorage, storageKey, {
                visitId: visitIdRef.current, revision: revisionRef.current, form: formData,
            });
            setDraftStatus('saved');
        } catch { setDraftStatus('unavailable'); }
    }, [formData, dirty, initialLoading, recovery, loadError, storageKey]);

    useEffect(() => {
        if (!dirty) return;
        const warn = event => { event.preventDefault(); event.returnValue = ''; };
        const guardLinks = event => {
            if (!event.target.closest('a[href]')) return;
            if (savingRef.current || (draftStatus !== 'saved' &&
                !window.confirm('Draft recovery is unavailable. Leave and lose these changes?'))) {
                event.preventDefault();
                event.stopPropagation();
            }
        };
        window.addEventListener('beforeunload', warn);
        document.addEventListener('click', guardLinks, true);
        return () => {
            window.removeEventListener('beforeunload', warn);
            document.removeEventListener('click', guardLinks, true);
        };
    }, [dirty, draftStatus]);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        recognition.onresult = event => {
            let transcript = '';
            for (let index = event.resultIndex; index < event.results.length; index++) {
                if (event.results[index].isFinal) transcript += event.results[index][0].transcript;
            }
            if (transcript && !savingRef.current) {
                setFormData(previous => ({ ...previous, notes: (previous.notes + ' ' + transcript).trim() }));
                setDirty(true);
            }
        };
        recognition.onend = () => setIsListening(false);
        recognition.onerror = () => { setIsListening(false); showToast('Dictation stopped. You can continue typing.', 'error'); };
        recognitionRef.current = recognition;
        return () => {
            recognition.onresult = null; recognition.onend = null; recognition.onerror = null;
            recognition.abort(); recognitionRef.current = null;
        };
    }, [showToast]);

    function toggleListening() {
        if (!recognitionRef.current) return showToast('Dictation is not supported in this browser.', 'error');
        try {
            if (isListening) recognitionRef.current.stop();
            else recognitionRef.current.start();
            setIsListening(!isListening);
        } catch { setIsListening(false); showToast('Could not start dictation. You can continue typing.', 'error'); }
    }
    function changeForm(update) {
        setDirty(true); setSaveError('');
        setFormData(previous => ({ ...previous, ...update }));
    }
    const handleChange = event => changeForm({ [event.target.name]: event.target.value });
    const handlePrescriptionsChange = prescriptions => changeForm({ prescriptions });
    const handleInvestigationsChange = investigations => changeForm({ investigations });
    function handleOpenAddMedicine(name, index) {
        setNewMedicineName(name); setMedicineRow(index); setIsAddMedicineModalOpen(true);
    }
    function handleMedicineAdded(item) {
        setInventory(previous => [...previous, item].sort((a, b) => a.name.localeCompare(b.name)));
        if (medicineRow != null) changeForm({ prescriptions: formData.prescriptions.map((row, index) =>
            index === medicineRow ? { ...row, name: item.name, inventoryId: item.id } : row) });
        showToast('Medicine added to inventory.', 'success');
    }
    function restoreDraft() {
        visitIdRef.current = recovery.visitId;
        revisionRef.current = recovery.revision;
        setFormData({ ...newVisit(initialPatientId), ...recovery.form });
        setDirty(true); setRecovery(null);
    }
    function discardDraft() {
        try { window.sessionStorage.removeItem(storageKey); } catch { /* No clinical records are affected. */ }
        setRecovery(null);
    }
    async function handleSubmit(event) {
        event.preventDefault();
        if (savingRef.current) return;
        if (!navigator.onLine) {
            setSaveError('You are offline. Keep this tab open and save the visit when you reconnect.');
            return;
        }
        savingRef.current = true;
        recognitionRef.current?.stop();
        setLoading(true); setSaveError('');
        try {
            await saveVisit(db, {
                visitId: visitIdRef.current, isNew: !id, expectedRevision: revisionRef.current,
                form: formData, triggeringFollowupId: followupId,
                appointmentId,
                user: { uid: currentUser.uid, role: userRole, name: userName },
            });
            setDirty(false);
            try { window.sessionStorage.removeItem(storageKey); } catch { /* The clinical save succeeded. */ }
            showToast('Visit saved to the clinic.', 'success');
            navigate('/patients/' + formData.patientId);
        } catch (error) {
            setSaveError(error instanceof VisitSaveError ? error.message :
                error.code === 'permission-denied'
                    ? 'Your account cannot complete this save. Your entries are kept; ask the clinic administrator to check access.'
                    : 'The visit could not be saved. Your entries are kept. Check your connection and try again.');
        } finally { savingRef.current = false; setLoading(false); }
    }

    if (initialLoading) return <Loader text="Loading consultation..." />;
    if (appointmentError) return <div role="alert" className="workflow-error space-y-3"><p>{appointmentError}</p><Link className="btn btn-secondary" to="/today">Open Today</Link></div>;
    if (loadError) return <div role="alert" className="card space-y-4"><p>Could not load the consultation. No changes have been saved.</p><button className="btn btn-secondary" onClick={() => { setInitialLoading(true); setRetry(value => value + 1); }}>Try again</button></div>;

    if (!Array.isArray(formData.prescriptions) || !Array.isArray(formData.investigations)) return <div role="alert" className="workflow-error">This treatment format cannot be edited safely. Open the original patient record; no data was changed.</div>;

    function requestReview(event) {
        event.preventDefault();
        const message = validateVisit(formData);
        if (message) { setSaveError(message); return; }
        setSaveError(''); setReviewOpen(true);
    }

    return (
        <div className="consultation-workspace space-y-5">
            <header className="workflow-header">
                <div className="min-w-0"><p className="workflow-eyebrow">{id ? 'Edit consultation' : 'New consultation'}</p>
                    <h1>{selectedPatient?.name || 'Start a consultation'}</h1>
                    {selectedPatient && <p className="text-sm text-slate-600">{patientIdentity(selectedPatient)}</p>}
                </div>
                <button type="button" className="btn btn-secondary" disabled={loading} onClick={() => {
                    if (!dirty || draftStatus === 'saved' || window.confirm('Draft recovery is unavailable. Leave and lose these changes?')) navigate(-1);
                }}><ArrowLeft size={18} />Back</button>
            </header>
            {recovery && <section className="workflow-panel space-y-3" role="status">
                <p>An unfinished consultation was found in this tab. Review it before saving to the clinic.</p>
                <div className="flex flex-wrap gap-3"><button type="button" className="btn btn-primary" onClick={restoreDraft}>Restore draft</button>
                    <button type="button" className="btn btn-secondary" onClick={discardDraft}>Discard draft</button></div>
            </section>}
            {saveError && <p ref={errorRef} tabIndex={-1} role="alert" className="workflow-error">{saveError}</p>}
            {appointmentId && <p className="workflow-panel text-sm">Linked to the appointment. Saving this visit completes it on Today. Unsaved notes remain recoverable only in this browser tab. <Link className="workflow-link" to="/today">Return to Today</Link></p>}
            {!formData.patientId && !recovery && <PatientPicker patients={patients} onSelect={value => navigate('/visits/new?patientId=' + encodeURIComponent(value))} />}
            {formData.patientId && !selectedPatient && <p role="alert" className="workflow-error">The selected patient is no longer available. Open Patients to verify the record before continuing.</p>}
            {selectedPatient && <>
                <PatientSafetySummary patient={selectedPatient} />
                <div className="consultation-grid">
                    <form onSubmit={requestReview} noValidate className="min-w-0">
                        <fieldset disabled={loading || Boolean(recovery)} className="workflow-panel consultation-entry min-w-0">
                            <legend className="sr-only">Consultation details</legend>
                            <section className="consultation-section">
                                <h2>Today's consultation</h2>
                                <details><summary>Visit date and time · {formData.date} · {formData.time}</summary>
                                    <div className="grid sm:grid-cols-2 gap-4 mt-3">
                                        <label className="workflow-field" htmlFor="date">Date<input id="date" name="date" type="date" className="input" value={formData.date} onChange={handleChange} required /></label>
                                        <label className="workflow-field" htmlFor="time">Time<input id="time" name="time" type="time" className="input" value={formData.time} onChange={handleChange} required /></label>
                                    </div>
                                </details>
                                <label className="workflow-field" htmlFor="complaint">Chief complaint / change since last visit
                                    <textarea id="complaint" name="complaint" rows="2" className="input" value={formData.complaint} onChange={handleChange} placeholder="What brought the patient in today?" /></label>
                                <label className="workflow-field" htmlFor="diagnosis">Diagnosis
                                    <input id="diagnosis" name="diagnosis" className="input" value={formData.diagnosis} onChange={handleChange} required />
                                    <span className="text-sm text-slate-600 font-normal">Required when saving a visit record. An unfinished recovery draft can remain incomplete.</span></label>
                                <details open={Boolean(formData.notes) || undefined}><summary>Private clinical notes {formData.notes ? '· entered' : '(optional)'}</summary>
                                    <div className="space-y-3 mt-3"><label className="workflow-field" htmlFor="notes">Clinical notes / improvements — not printed
                                        <textarea id="notes" name="notes" rows="4" className="input" value={formData.notes} onChange={handleChange} /></label>
                                        <button type="button" onClick={toggleListening} className="btn btn-secondary">{isListening ? <MicOff size={18} /> : <Mic size={18} />}{isListening ? 'Stop listening' : 'Dictate notes (English)'}</button>
                                    </div>
                                </details>
                            </section>
                            <section className="consultation-section">
                                <h2>Treatment & patient advice</h2>
                                {formData.prescription && <VisitTreatment visit={{ prescription: formData.prescription }} />}
                                <PrescriptionListInput label="Prescriptions" items={formData.prescriptions} onChange={handlePrescriptionsChange} inventory={inventory}
                                    onAddNewMedicine={userRole === 'doctor' ? handleOpenAddMedicine : undefined} />
                                <label className="workflow-field" htmlFor="patientInstructions">Instructions for the patient — printed
                                    <textarea id="patientInstructions" name="patientInstructions" rows="2" className="input" value={formData.patientInstructions} onChange={handleChange} /></label>
                                <details open={formData.investigations.length > 0 || undefined}><summary>Investigations / labs {formData.investigations.length ? '· ' + formData.investigations.length : '(optional)'}</summary>
                                    <div className="mt-3"><InvestigationListInput label="Investigations advised" items={formData.investigations} onChange={handleInvestigationsChange} /></div>
                                </details>
                            </section>
                            <section className="consultation-section">
                                <h2>Return plan & fees</h2>
                                <details open={Boolean(formData.nextVisitDate || formData.nextVisitTime) || undefined}><summary>Follow-up date and time {formData.nextVisitDate ? '· ' + formData.nextVisitDate : '(optional)'}</summary>
                                    <p className="text-sm text-slate-600 mt-3">This creates a follow-up record. Appointment capacity is not checked.</p>
                                    <div className="grid sm:grid-cols-2 gap-4 mt-3">
                                        <label className="workflow-field" htmlFor="nextVisitDate">Return date<input id="nextVisitDate" name="nextVisitDate" type="date" className="input" value={formData.nextVisitDate} onChange={handleChange} /></label>
                                        <label className="workflow-field" htmlFor="nextVisitTime">Return time (optional)<input id="nextVisitTime" name="nextVisitTime" type="time" className="input" value={formData.nextVisitTime} onChange={handleChange} /></label>
                                    </div>
                                </details>
                                <details open={Boolean(formData.consultationFee || formData.medicineFee) || undefined}><summary>Fees · Rs. {Number(formData.consultationFee || 0) + Number(formData.medicineFee || 0)}</summary>
                                    <div className="grid sm:grid-cols-2 gap-4 mt-3">
                                        <label className="workflow-field" htmlFor="consultationFee">Consultation fee (Rs.)<input id="consultationFee" name="consultationFee" type="number" min="0" step="any" className="input" value={formData.consultationFee} onChange={handleChange} /></label>
                                        <label className="workflow-field" htmlFor="medicineFee">Medicine fee (Rs.)<input id="medicineFee" name="medicineFee" type="number" min="0" step="any" className="input" value={formData.medicineFee} onChange={handleChange} /></label>
                                    </div>
                                </details>
                            </section>
                        </fieldset>
                        <footer className="consultation-actions">
                            <div className="space-y-1"><p role="status" className="text-sm">{dirty ? draftStatus === 'saved' ? 'Recovery draft kept in this tab · not saved to clinic' : 'Draft recovery unavailable — keep this page open' : 'Not yet saved to clinic'}</p>
                                <details><summary className="text-xs">About recovery</summary><p className="text-xs mt-1">Keep this tab open. Recovery lasts up to 24 hours and is cleared on sign-out. It is not shared with other devices.</p></details></div>
                            <button type="submit" className="btn btn-primary" disabled={loading || Boolean(recovery)}><Save size={18} />Review & save</button>
                        </footer>
                    </form>
                    <PreviousVisitContext key={selectedPatient.id + ':' + (earlier[0]?.id || '')} patient={selectedPatient}
                        history={{ ...history, visits: earlier }} disabled={loading || Boolean(recovery)} onReuse={rows => {
                            changeForm({ prescriptions: [...formData.prescriptions, ...rows] });
                            showToast('Selected treatment added for review. Dispensed quantities and stock links were cleared.', 'success');
                        }} />
                </div>
            </>}
            {reviewOpen && selectedPatient && <ConsultationReview patient={selectedPatient} visit={formData} loading={loading} error={saveError}
                onCancel={() => { setReviewOpen(false); setSaveError(''); }} onSave={handleSubmit} />}
            <InventoryQuickAddModal isOpen={isAddMedicineModalOpen} onClose={() => setIsAddMedicineModalOpen(false)} initialName={newMedicineName} onAdded={handleMedicineAdded} />
        </div>
    );
}
