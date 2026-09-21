const PREFIX = 'hope-clinic:visit-draft:';
const MAX_AGE = 24 * 60 * 60 * 1000;

export function draftKey(uid, scope) {
    return `${PREFIX}${encodeURIComponent(uid)}:${encodeURIComponent(scope)}`;
}

export function readDraft(storage, key, now = Date.now()) {
    const raw = storage.getItem(key);
    if (!raw) return null;
    try {
        const draft = JSON.parse(raw);
        if (draft.version === 1 && draft.form && typeof draft.form === 'object' &&
            !Array.isArray(draft.form) && typeof draft.form.patientId === 'string' &&
            typeof draft.visitId === 'string' && draft.visitId && !draft.visitId.includes('/') &&
            Number.isFinite(draft.savedAt) && draft.savedAt <= now && now - draft.savedAt < MAX_AGE) return draft;
    } catch { /* An invalid draft must never replace a clinical form. */ }
    storage.removeItem(key);
    return null;
}

export function writeDraft(storage, key, draft, now = Date.now()) {
    storage.setItem(key, JSON.stringify({ ...draft, version: 1, savedAt: now }));
}

export function clearVisitDrafts(storage) {
    for (let index = storage.length - 1; index >= 0; index--) {
        const key = storage.key(index);
        if (key?.startsWith(PREFIX)) storage.removeItem(key);
    }
}
