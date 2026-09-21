export function localDate(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function newVisit(patientId = '') {
    return {
        patientId, date: localDate(),
        time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        complaint: '', diagnosis: '', notes: '', patientInstructions: '',
        prescriptions: [], investigations: [], consultationFee: '', medicineFee: '',
        nextVisitDate: '', nextVisitTime: '',
    };
}

// A stable comparison also detects changes made by older clients without a revision field.
export function visitRevision(value) {
    if (Array.isArray(value)) return `[${value.map(visitRevision).join(',')}]`;
    if (value && typeof value === 'object') {
        return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${visitRevision(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(value);
}

export function changePrescription(item, field, value) {
    const result = { ...item, [field]: value };
    if (field === 'name' && value !== item.name) delete result.inventoryId;
    return result;
}

export function stockChanges(previous = [], next = []) {
    const changes = new Map();
    for (const [items, sign] of [[previous, 1], [next, -1]]) {
        for (const item of items) {
            if (!item.inventoryId || item.quantity === '' || item.quantity == null) continue;
            const quantity = Number(item.quantity);
            if (!Number.isFinite(quantity) || quantity < 0) throw new Error('Medicine quantities must be valid, non-negative numbers.');
            changes.set(item.inventoryId, (changes.get(item.inventoryId) || 0) + sign * quantity);
        }
    }
    return [...changes].filter(([, delta]) => delta !== 0);
}

function validDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && localDate(new Date(`${value}T12:00:00`)) === value;
}

export function validateVisit(form) {
    if (!form.patientId) return 'Select a patient.';
    if (!validDate(form.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(form.time)) return 'Enter a valid visit date and time.';
    if (!form.diagnosis?.trim()) return 'Enter the diagnosis before saving the visit. You can keep an unfinished draft.';
    if (form.nextVisitDate && (!validDate(form.nextVisitDate) || form.nextVisitDate < form.date)) return 'The return date must be on or after the visit date.';
    if (form.nextVisitTime && (!form.nextVisitDate || !/^([01]\d|2[0-3]):[0-5]\d$/.test(form.nextVisitTime))) return 'Enter a return date and a valid return time.';
    for (const field of ['consultationFee', 'medicineFee']) {
        if (!Number.isFinite(Number(form[field])) || Number(form[field]) < 0) return 'Fees must be valid, non-negative numbers.';
    }
    if (!Array.isArray(form.prescriptions) || !Array.isArray(form.investigations)) return 'The treatment format cannot be edited safely. Open the original record.';
    for (const item of form.prescriptions) {
        if (!item || typeof item !== 'object' || !item.name?.trim()) return 'Enter a medicine name for every prescription, or remove the empty row.';
        if (item.quantity !== '' && item.quantity != null && (!Number.isFinite(Number(item.quantity)) || Number(item.quantity) < 0)) return 'Medicine quantities must be valid, non-negative numbers.';
    }
    if (form.investigations.some(item => typeof item !== 'string' || !item.trim())) return 'Enter each investigation, or remove the empty row.';
    return '';
}

export function followupOverdue(item, now = new Date()) {
    const today = localDate(now);
    if (!item.date || item.status !== 'pending') return false;
    if (item.date !== today) return item.date < today;
    // A date-only return is due today, not overdue at midnight.
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return Boolean(item.time && item.time < time);
}
