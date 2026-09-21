import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

// Single-field queries avoid requiring a new composite index for the pilot.
export default function useClinicSchedule(date) {
    const [result, setResult] = useState({});
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        let active = true;
        const queries = {
            sessions: query(collection(db, 'clinicSessions'), where('date', '==', date)),
            appointments: query(collection(db, 'appointments'), where('date', '==', date)),
            patients: collection(db, 'patients'),
            followups: query(collection(db, 'followups'), where('status', '==', 'pending')),
        };
        const unsubscribes = Object.entries(queries).map(([key, source]) => onSnapshot(source, { includeMetadataChanges: true }, snapshot => {
            if (!active) return;
            setResult(previous => ({ ...(previous.date === date && previous.attempt === attempt ? previous : {}), date, attempt,
                [key]: { items: snapshot.docs.map(item => ({ ...item.data(), id: item.id })), cached: snapshot.metadata.fromCache, error: false } }));
        }, () => { if (active) setResult(previous => ({ ...(previous.date === date && previous.attempt === attempt ? previous : {}), date, attempt,
            [key]: { items: [], cached: true, error: true } })); }));
        return () => { active = false; unsubscribes.forEach(unsubscribe => unsubscribe()); };
    }, [date, attempt]);
    const current = result.date === date && result.attempt === attempt ? result : {};
    const keys = ['sessions', 'appointments', 'patients', 'followups'];
    return {
        sessions: [...(current.sessions?.items || [])].sort((a, b) => a.startMinute - b.startMinute),
        appointments: [...(current.appointments?.items || [])].sort((a, b) => a.startMinute - b.startMinute || a.id.localeCompare(b.id)),
        patients: current.patients?.items || [], followups: current.followups?.items.filter(item => item.date <= date) || [],
        loading: keys.some(key => !current[key]), error: keys.some(key => current[key]?.error),
        cached: keys.some(key => current[key]?.cached), retry: () => setAttempt(value => value + 1),
    };
}
