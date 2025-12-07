import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useParams, Link } from 'react-router-dom';
import { User, Calendar, FileText, Plus, Edit, ArrowLeft, Printer } from 'lucide-react';
import { formatDate, formatCurrency } from '../utils/formatters';
import Loader from '../components/Loader';
import DynamicListDisplay from '../components/DynamicListDisplay';

export default function PatientDetails() {
    const { id } = useParams();
    const [patient, setPatient] = useState(null);
    const [visits, setVisits] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Patient Profile
                const patientDoc = await getDoc(doc(db, 'patients', id));
                if (patientDoc.exists()) {
                    setPatient({ id: patientDoc.id, ...patientDoc.data() });
                }

                // Fetch Visits
                // Note: Removed orderBy('date', 'desc') from query to avoid needing a composite index.
                // Sorting is done client-side instead.
                const visitsQuery = query(
                    collection(db, 'visits'),
                    where('patientId', '==', id)
                );
                const visitsSnapshot = await getDocs(visitsQuery);
                const visitsData = visitsSnapshot.docs
                    .map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }))
                    .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date desc

                setVisits(visitsData);
            } catch (error) {
                console.error("Error fetching patient details:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    if (loading) {
        return <Loader text="Loading details..." />;
    }

    if (!patient) {
        return <div className="p-8 text-xl text-red-500">Patient not found.</div>;
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to="/patients" className="p-2 hover:bg-slate-100 rounded-full">
                        <ArrowLeft size={28} />
                    </Link>
                    <h1 className="text-3xl font-bold text-slate-800">{patient.name}</h1>
                </div>
                <div className="flex gap-3">
                    <Link to={`/patients/${id}/edit`} className="btn btn-secondary flex items-center gap-2">
                        <Edit size={20} />
                        Edit Profile
                    </Link>
                    <Link to={`/visits/new?patientId=${id}`} className="btn btn-primary flex items-center gap-2">
                        <Plus size={20} />
                        New Visit
                    </Link>
                </div>
            </div>

            {/* Patient Profile Card */}
            <div className="card p-6 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-start gap-4">
                        <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                            <User size={32} />
                        </div>
                        <div>
                            <p className="text-slate-500 font-medium">Personal Info</p>
                            <p className="text-lg font-semibold">{patient.gender}, {patient.age} years</p>
                            <p className="text-slate-600">{patient.contact}</p>
                            <p className="text-slate-600 whitespace-pre-wrap">{patient.address}</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <DynamicListDisplay
                            title="Past History / Other Ailments"
                            items={patient.medicalHistory}
                        />
                        <DynamicListDisplay
                            title="Family History"
                            items={patient.familyHistory}
                        />
                        <DynamicListDisplay
                            title="Ongoing Medications"
                            items={patient.ongoingMedications}
                        />
                        <DynamicListDisplay
                            title="Allergies"
                            items={patient.allergies}
                        />
                    </div>
                </div>
            </div>

            {/* Visits History */}
            <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <FileText size={28} />
                    Visit History
                </h2>

                {visits.length === 0 ? (
                    <div className="card p-8 text-center text-slate-500 text-lg">
                        No visits recorded yet. Start a new visit above.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {visits.map(visit => (
                            <div key={visit.id} className="card p-6 hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-2 text-slate-500 font-medium">
                                        <Calendar size={20} />
                                        <span>{formatDate(visit.date)}</span>
                                        {visit.time && <span className="text-slate-400">at {visit.time}</span>}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {visit.complaint && (
                                        <div>
                                            <span className="font-bold text-slate-700">Complaint: </span>
                                            <span className="text-slate-800">{visit.complaint}</span>
                                        </div>
                                    )}
                                    <div>
                                        <span className="font-bold text-slate-700">Diagnosis: </span>
                                        <span className="text-slate-800">{visit.diagnosis}</span>
                                    </div>

                                    {visit.notes && (
                                        <div className="text-slate-600 text-sm bg-yellow-50 p-2 rounded border border-yellow-100">
                                            <span className="font-medium text-yellow-800">Notes / Improvements: </span>
                                            {visit.notes}
                                        </div>
                                    )}

                                    {visit.prescription && (
                                        <div className="bg-slate-50 p-3 rounded border border-slate-200">
                                            <p className="font-bold text-slate-700 text-sm mb-1">Prescription:</p>
                                            <p className="text-slate-800 whitespace-pre-wrap font-mono text-sm">{visit.prescription}</p>
                                        </div>
                                    )}

                                    {visit.nextVisitDate && (
                                        <div className="mt-2 text-sm font-medium text-blue-600">
                                            Next Scheduled Visit: {formatDate(visit.nextVisitDate)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
