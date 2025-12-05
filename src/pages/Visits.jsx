import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, query, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, User, FileText, Plus } from 'lucide-react';
import { formatDate, formatCurrency } from '../utils/formatters';
import Loader from '../components/Loader';

export default function Visits() {
    const navigate = useNavigate();
    const [visits, setVisits] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchVisits = async () => {
            try {
                const q = query(collection(db, 'visits'), orderBy('date', 'desc'), limit(50));
                const querySnapshot = await getDocs(q);

                const visitsData = await Promise.all(querySnapshot.docs.map(async (visitDoc) => {
                    const data = visitDoc.data();
                    let patientName = 'Unknown';
                    if (data.patientId) {
                        const patientSnap = await getDoc(doc(db, 'patients', data.patientId));
                        if (patientSnap.exists()) {
                            patientName = patientSnap.data().name;
                        }
                    }
                    return {
                        id: visitDoc.id,
                        patientName,
                        ...data
                    };
                }));

                setVisits(visitsData);
            } catch (error) {
                console.error("Error fetching visits:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchVisits();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-800">Recent Visits</h1>
                <Link to="/visits/new" className="btn btn-primary flex items-center gap-2 text-lg">
                    <Plus size={24} />
                    New Visit
                </Link>
            </div>

            {loading ? (
                <Loader text="Loading visits..." />
            ) : (
                <div className="grid gap-4">
                    {visits.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-lg">
                            No visits recorded.
                        </div>
                    ) : (
                        visits.map(visit => (
                            <div
                                key={visit.id}
                                onClick={() => navigate(`/patients/${visit.patientId}`)}
                                className="card p-6 flex flex-col md:flex-row justify-between gap-4 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-transparent hover:border-l-primary"
                            >
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-slate-500 font-medium">
                                        <Calendar size={20} />
                                        <span>{formatDate(visit.date)}</span>
                                        {visit.time && <span className="text-slate-400">at {visit.time}</span>}
                                    </div>
                                    <div className="flex items-center gap-2 text-xl font-bold text-slate-800">
                                        <User size={24} className="text-primary" />
                                        {visit.patientName}
                                    </div>
                                    <div className="flex items-start gap-2 text-slate-600">
                                        <FileText size={20} className="mt-1 flex-shrink-0" />
                                        <div>
                                            <p className="font-medium">{visit.diagnosis}</p>
                                            {visit.complaint && <p className="text-sm text-slate-500 line-clamp-1">Complaint: {visit.complaint}</p>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col justify-between items-end">
                                    <span className="text-xl font-bold text-emerald-600">
                                        {formatCurrency(visit.cost)}
                                    </span>
                                    <span className="text-primary text-sm mt-2">
                                        View Details →
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
