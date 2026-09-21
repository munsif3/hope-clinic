export default function VisitTreatment({ visit }) {
    const prescriptions = Array.isArray(visit.prescriptions) ? visit.prescriptions : [];
    const investigations = Array.isArray(visit.investigations) ? visit.investigations : [];
    return (
        <div className="space-y-4">
            {prescriptions.length > 0 && (
                <section aria-label="Prescriptions" className="space-y-2">
                    <h3 className="text-base font-bold mb-2">Prescriptions</h3>
                    {prescriptions.map((item, index) => (
                        <div key={index} className="rounded-lg border border-slate-200 p-3 break-inside-avoid">
                            <p className="font-bold">{item.name}</p>
                            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm mt-2">
                                {Object.entries({ Dosage: item.dosage, Frequency: item.frequency, Duration: item.duration, Quantity: item.quantity }).map(([label, value]) => (
                                    value !== '' && value != null && <div key={label}><dt className="text-slate-500">{label}</dt><dd>{value}</dd></div>
                                ))}
                            </dl>
                            {item.notes && <p className="mt-2 whitespace-pre-wrap text-sm">{item.notes}</p>}
                        </div>
                    ))}
                </section>
            )}
            {typeof visit.prescription === 'string' && visit.prescription.trim() && (
                <section className="bg-slate-50 p-3 rounded border border-slate-200">
                    <h3 className="text-base font-bold mb-2">{prescriptions.length ? 'Earlier prescription text' : 'Prescription'}</h3>
                    <p className="whitespace-pre-wrap">{visit.prescription}</p>
                </section>
            )}
            {investigations.length > 0 && (
                <section aria-label="Investigations">
                    <h3 className="text-base font-bold mb-2">Investigations advised</h3>
                    <ul className="list-disc pl-5">{investigations.map((item, index) => <li key={index}>{item}</li>)}</ul>
                </section>
            )}
        </div>
    );
}
