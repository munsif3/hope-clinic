import { useEffect, useRef, useState } from 'react';
import VisitTreatment from './VisitTreatment';
import { patientIdentity } from '../utils/patients';
import { formatDate } from '../utils/formatters';

export default function ConsultationReview({ patient, visit, loading, error, onCancel, onSave }) {
    const dialog = useRef(null);
    const [treatmentReviewed, setTreatmentReviewed] = useState(false);
    useEffect(() => {
        const element = dialog.current;
        element.showModal();
        return () => element.close();
    }, []);
    return <dialog ref={dialog} className="consultation-review" aria-labelledby="review-title" onCancel={event => { event.preventDefault(); if (!loading) onCancel(); }}>
        <form onSubmit={onSave}>
            <header><h2 id="review-title">Review consultation</h2><p><strong>{patient.name}</strong></p><p className="text-sm text-slate-600">{patientIdentity(patient)}</p>
                <p className="text-sm">{formatDate(visit.date)} · {visit.time}</p></header>
            <div className="space-y-4 py-5"><p><strong>Diagnosis: </strong>{visit.diagnosis}</p>
                {visit.complaint && <p><strong>Chief complaint: </strong>{visit.complaint}</p>}
                <VisitTreatment visit={visit} />
                {visit.prescriptions.length > 0 && <label className="flex gap-3 items-start"><input type="checkbox" required disabled={loading}
                    checked={treatmentReviewed} onChange={event => setTreatmentReviewed(event.target.checked)} />
                    <span>I have reviewed the medicines, dose, frequency, duration, directions, and quantities for this encounter.</span></label>}
                <section><h3>Patient instructions</h3><p className="whitespace-pre-wrap">{visit.patientInstructions || 'None entered.'}</p></section>
                <p className="text-sm text-slate-600">Private clinical notes stay in the clinical record. Review the patient printout separately after saving.</p>
                <p><strong>Total fees: </strong>Rs. {Number(visit.consultationFee || 0) + Number(visit.medicineFee || 0)}</p>
                <p><strong>Follow-up: </strong>{visit.nextVisitDate ? `${formatDate(visit.nextVisitDate)} ${visit.nextVisitTime || ''}` : 'No return recorded.'}</p>
                {visit.nextVisitDate && <p className="text-sm text-slate-600">This records a follow-up; it does not check appointment capacity.</p>}
                {error && <p role="alert" className="workflow-error">{error}</p>}
            </div>
            <footer className="flex flex-wrap gap-3 justify-end"><button type="button" className="btn btn-secondary" disabled={loading} onClick={onCancel}>Keep editing</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving to clinic…' : 'Save visit record'}</button></footer>
        </form>
    </dialog>;
}
