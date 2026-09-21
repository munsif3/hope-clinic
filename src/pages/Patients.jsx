import { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import Loader from '../components/Loader';
import { matchesPatient, patientIdentity } from '../utils/patients';

export default function Patients() {
    const [patients, setPatients] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [retry, setRetry] = useState(0);
    useEffect(() => {
        let active = true;
        getDocs(query(collection(db, 'patients'), orderBy('name'))).then(snapshot => {
            if (active) { setPatients(snapshot.docs.map(item => ({ ...item.data(), id: item.id }))); setError(false); }
        }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [retry]);
    const matches = patients.filter(patient => matchesPatient(patient, search));
    return <div className="space-y-5">
        <header className="workflow-header"><div><h1>Patients</h1><p className="text-slate-600">Find the patient, review their history, and continue to care.</p></div>
            <Link to="/patients/new?startVisit=1" className="btn btn-primary"><UserPlus size={20} />Register & start visit</Link></header>
        <label className="workflow-field">Search patients<input type="search" className="input" value={search} onChange={event => setSearch(event.target.value)} placeholder="Name, contact or record ID" /></label>
        {loading ? <Loader text="Loading patients…" /> : error ? <section role="alert" className="workflow-panel space-y-3"><p>Patients could not be loaded.</p>
            <button className="btn btn-secondary" onClick={() => { setLoading(true); setRetry(value => value + 1); }}>Try again</button></section> :
            <section className="patient-directory" aria-label="Patient results"><p className="text-sm text-slate-600 p-4" role="status">{matches.length} matching {matches.length === 1 ? 'patient' : 'patients'}</p>
                {matches.map(patient => <article key={patient.id} className="patient-directory-row">
                    <div className="min-w-0"><Link to={`/patients/${patient.id}`} className="font-semibold text-lg workflow-link">{patient.name}</Link>
                        <p className="text-sm text-slate-600">{patientIdentity(patient)}</p><details><summary className="text-xs">Record ID</summary><p className="text-xs break-all">{patient.id}</p></details></div>
                    <div className="flex gap-3 flex-wrap"><Link className="btn btn-secondary" to={`/patients/${patient.id}`}>Open record</Link>
                        <Link className="btn btn-primary" to={`/visits/new?patientId=${encodeURIComponent(patient.id)}`}>Start visit</Link></div>
                </article>)}
                {!matches.length && <p className="p-5">{search ? 'No matches. Try a different name or contact before creating a record.' : 'No patients registered yet.'}</p>}
            </section>}
    </div>;
}
