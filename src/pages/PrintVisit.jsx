import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import Loader from '../components/Loader';
import { formatDate } from '../utils/formatters';

export default function PrintVisit() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [visit, setVisit] = useState(null);
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const visitDoc = await getDoc(doc(db, 'visits', id));
                if (visitDoc.exists()) {
                    const visitData = { id: visitDoc.id, ...visitDoc.data() };
                    setVisit(visitData);

                    const patientDoc = await getDoc(doc(db, 'patients', visitData.patientId));
                    if (patientDoc.exists()) {
                        setPatient({ id: patientDoc.id, ...patientDoc.data() });
                    }
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    useEffect(() => {
        if (!loading && visit && patient) {
            window.print();
        }
    }, [loading, visit, patient]);

    if (loading) return <Loader text="Preparing print view..." />;
    if (!visit || !patient) return <div>Data not found</div>;

    return (
        <div className="bg-white min-h-screen p-8 text-slate-900 print:p-0">
            {/* Header */}
            <div className="border-b-2 border-slate-800 pb-4 mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">HOPE CLINIC</h1>
                    <p className="text-sm font-medium text-slate-600 mt-1">123 Health Street, Wellness City</p>
                    <p className="text-sm font-medium text-slate-600">Ph: +91 98765 43210</p>
                </div>
                <div className="text-right">
                    <p className="font-bold text-lg">Dr. A. Smith, MD</p>
                    <p className="text-sm text-slate-600">General Physician</p>
                    <p className="text-slate-500 text-xs mt-1">Reg No: 123456</p>
                </div>
            </div>

            {/* Patient Details */}
            <div className="flex justify-between items-start mb-8 bg-slate-50 p-4 rounded-lg border border-slate-200 print:border-none print:bg-transparent print:p-0">
                <div>
                    <p><span className="font-bold text-slate-600 w-24 inline-block">Patient:</span> <span className="font-bold text-lg">{patient.name}</span></p>
                    <p><span className="font-bold text-slate-600 w-24 inline-block">Age/Sex:</span> {patient.age} Y / {patient.gender}</p>
                </div>
                <div className="text-right">
                    <p><span className="font-bold text-slate-600">Date:</span> {formatDate(visit.date)}</p>
                    <p><span className="font-bold text-slate-600">Visit ID:</span> #{visit.id.slice(0, 6).toUpperCase()}</p>
                </div>
            </div>

            {/* Diagnosis */}
            <div className="mb-8">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 border-b border-slate-300 mb-2">Diagnosis</h3>
                <p className="text-lg font-medium">{visit.diagnosis}</p>
                {visit.complaint && <p className="text-slate-600 mt-1">C/O: {visit.complaint}</p>}
            </div>

            {/* Prescriptions */}
            {visit.prescriptions && visit.prescriptions.length > 0 && (
                <div className="mb-8">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 border-b border-slate-300 mb-4">Rx / Medications</h3>
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 text-sm text-slate-500">
                                <th className="py-2 pr-4 font-semibold">Medicine</th>
                                <th className="py-2 pr-4 font-semibold w-24">Dosage</th>
                                <th className="py-2 pr-4 font-semibold w-24">Freq</th>
                                <th className="py-2 font-semibold w-24">Duration</th>
                                <th className="py-2 font-semibold w-16 text-right">Qty</th>
                            </tr>
                        </thead>
                        <tbody className="text-slate-800">
                            {visit.prescriptions.map((p, i) => (
                                <tr key={i} className="border-b border-slate-100 last:border-0">
                                    <td className="py-3 pr-4 font-bold align-top">
                                        {p.name}
                                        {p.notes && <div className="text-xs font-normal text-slate-500 italic mt-0.5">{p.notes}</div>}
                                    </td>
                                    <td className="py-3 pr-4 align-top">{p.dosage}</td>
                                    <td className="py-3 pr-4 align-top">{p.frequency}</td>
                                    <td className="py-3 align-top">{p.duration}</td>
                                    <td className="py-3 align-top text-right font-mono">{p.quantity}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Investigations */}
            {visit.investigations && visit.investigations.length > 0 && (
                <div className="mb-8">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 border-b border-slate-300 mb-2">Investigations Advised</h3>
                    <ul className="list-disc pl-5 space-y-1">
                        {visit.investigations.map((inv, i) => (
                            <li key={i}>{inv}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Instructions / Notes */}
            {visit.notes && (
                <div className="mb-12">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 border-b border-slate-300 mb-2">Instructions</h3>
                    <p className="whitespace-pre-wrap text-slate-800">{visit.notes}</p>
                </div>
            )}

            {/* Footer / Signature */}
            <div className="mt-20 flex justify-between items-end">
                <div className="text-xs text-slate-400">
                    <p>Printed on {new Date().toLocaleString()}</p>
                    <p>Hope Clinic Management System</p>
                </div>
                <div className="text-center">
                    <div className="h-16 border-b border-slate-800 w-48 mb-2"></div>
                    <p className="font-bold text-slate-800">Doctor's Signature</p>
                </div>
            </div>

            {/* Screen-only Back Button */}
            <div className="fixed top-4 left-4 print:hidden">
                <button
                    onClick={() => navigate(-1)}
                    className="bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-slate-700 transition-colors"
                >
                    Back
                </button>
            </div>
        </div>
    );
}
