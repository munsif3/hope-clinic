import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let server, Treatment, Printout, SafetySummary;
before(async () => {
    server = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true } });
    Treatment = (await server.ssrLoadModule('/src/components/VisitTreatment.jsx')).default;
    Printout = (await server.ssrLoadModule('/src/components/VisitPrintout.jsx')).default;
    SafetySummary = (await server.ssrLoadModule('/src/components/PatientSafetySummary.jsx')).default;
});
after(async () => { await server?.close(); });
test('patient summary distinguishes unrecorded allergies and displays legacy reaction details', () => {
    const empty = renderToStaticMarkup(createElement(SafetySummary, { patient: { allergies: [] } }));
    assert.ok(empty.includes('Not recorded.'));
    assert.ok(empty.includes('does not mean no known allergies'));
    const legacy = renderToStaticMarkup(createElement(SafetySummary, { patient: { allergies: 'Legacy reaction details' } }));
    assert.ok(legacy.includes('Legacy reaction details'));
    assert.equal(legacy.includes('Not recorded.'), false);
});
const visit = {
    id: 'synthetic-visit', date: '2026-09-12', diagnosis: 'Fixture assessment', clinicianName: 'Fixture clinician',
    prescription: 'Original prescription text', prescriptions: [{ name: 'Fixture medicine', dosage: 'Fixture dose', frequency: 'Fixture frequency', duration: 'Fixture duration', quantity: 0, notes: 'Fixture directions' }],
    investigations: ['Fixture investigation'], notes: 'PRIVATE CLINICAL NOTE',
    patientInstructions: 'Patient instructions only', nextVisitDate: '2026-09-20', nextVisitTime: '17:30',
};
test('history renders original and structured treatment including all clinical directions', () => {
    const html = renderToStaticMarkup(createElement(Treatment, { visit }));
    for (const expected of ['Original prescription text', 'Fixture medicine', 'Fixture dose', 'Fixture frequency', 'Fixture duration', 'Fixture directions', 'Fixture investigation', '>0<']) assert.ok(html.includes(expected), expected);
});
test('print uses recorded clinician, keeps private notes out and includes return time', () => {
    const html = renderToStaticMarkup(createElement(Printout, { visit, patient: { name: 'Synthetic patient' }, onBack() {}, clinicAddress: 'Fixture address', clinicPhone: '000' }));
    for (const expected of ['Fixture clinician', 'Patient instructions only', 'Original prescription text', 'Fixture medicine', 'Fixture investigation', '17:30']) assert.ok(html.includes(expected), expected);
    assert.equal(html.includes('PRIVATE CLINICAL NOTE'), false);
    assert.ok(html.includes('Review due'));
    assert.ok(html.includes('does not reserve a time'));
    assert.equal(html.includes('Next scheduled visit'), false);
});
test('older print records do not invent a clinician or automatically print combined notes', () => {
    const legacy = { id: 'fixture', date: '2026-09-12', notes: 'PRIVATE LEGACY NOTE', prescription: 'Original text' };
    const html = renderToStaticMarkup(createElement(Printout, { visit: legacy, patient: { name: 'Synthetic patient' }, onBack() {} }));
    assert.ok(html.includes('Clinician not recorded'));
    assert.ok(html.includes('review first'));
    assert.equal(html.includes('PRIVATE LEGACY NOTE'), false);
});
