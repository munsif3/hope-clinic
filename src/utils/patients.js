export function matchesPatient(patient, search) {
    const term = search.trim().toLocaleLowerCase();
    if (!term) return true;
    const contact = String(patient.contact || '');
    const digits = term.replace(/\D/g, '');
    return [patient.name, patient.id, contact].some(value => String(value || '').toLocaleLowerCase().includes(term)) ||
        (digits.length >= 3 && /^[\d\s+()-]+$/.test(term) && contact.replace(/\D/g, '').includes(digits));
}

export function patientIdentity(patient) {
    return [patient.age !== '' && patient.age != null ? `${patient.age} years (recorded age)` : 'Age not recorded',
        patient.gender || 'Gender not recorded', patient.contact || 'Contact not recorded'].join(' · ');
}

export function historyEntries(value) {
    if (typeof value === 'string') return value.trim() ? [{ name: '', notes: value }] : [];
    if (!Array.isArray(value)) return value && typeof value === 'object' ? historyEntries([value]) : [];
    return value.flatMap(item => {
        if (typeof item === 'string') return historyEntries(item);
        if (!item || typeof item !== 'object') return [];
        const name = typeof (item.name || item.condition) === 'string' ? item.name || item.condition : '';
        const notes = typeof item.notes === 'string' ? item.notes : '';
        return name.trim() || notes.trim() ? [{ ...item, name, notes }] : [];
    });
}

export function possibleDuplicates(patients, form, currentId) {
    const name = String(form.name || '').trim().toLocaleLowerCase();
    const contact = String(form.contact || '').replace(/\D/g, '');
    return patients.filter(patient => patient.id !== currentId &&
        ((name.length >= 3 && String(patient.name || '').trim().toLocaleLowerCase() === name) ||
        (contact.length >= 3 && String(patient.contact || '').replace(/\D/g, '') === contact)));
}
