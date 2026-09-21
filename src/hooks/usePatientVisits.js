import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function usePatientVisits(patientId) {
    const [result, setResult] = useState(null);
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        if (!patientId) return;
        let active = true;
        getDocs(query(collection(db, 'visits'), where('patientId', '==', patientId)))
            .then(snapshot => {
                if (active) setResult({ patientId, attempt, visits: snapshot.docs.map(item => ({ ...item.data(), id: item.id })), error: false });
            }).catch(() => { if (active) setResult({ patientId, attempt, visits: [], error: true }); });
        return () => { active = false; };
    }, [patientId, attempt]);
    const current = result?.patientId === patientId && result?.attempt === attempt;
    return {
        visits: current ? result.visits : [], loading: Boolean(patientId && !current),
        error: current && result.error, retry: () => setAttempt(value => value + 1),
    };
}
