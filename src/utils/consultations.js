export function compareVisits(a, b) {
    return String(b.date || '').localeCompare(String(a.date || '')) ||
        String(b.time || '').localeCompare(String(a.time || '')) || String(b.id || '').localeCompare(String(a.id || ''));
}

export function previousVisits(visits, patientId, currentId, date, time) {
    const boundary = `${date || ''}T${time || '23:59'}`;
    return visits.filter(visit => visit.patientId === patientId && visit.id !== currentId &&
        (!date || `${visit.date || ''}T${visit.time || '00:00'}` <= boundary)).sort(compareVisits);
}

// Copy only clinical text. A prior dispensing action must never be repeated by reuse.
export function reusablePrescription(item) {
    if (!item || typeof item.name !== 'string' || !item.name.trim()) return null;
    return Object.fromEntries(['name', 'dosage', 'frequency', 'duration', 'notes'].map(key =>
        [key, typeof item[key] === 'string' ? item[key] : '']).concat([['quantity', '']]));
}
