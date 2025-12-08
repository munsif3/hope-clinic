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
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchVisits = async () => {
            try {
                const q = query(collection(db, 'visits'), orderBy('date', 'desc'), limit(50));
                const querySnapshot = await getDocs(q);

                let visitsData = await Promise.all(querySnapshot.docs.map(async (visitDoc) => {
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

                // Sort by Date Descending, then Time Descending client-side
                visitsData.sort((a, b) => {
                    const dateDiff = new Date(b.date) - new Date(a.date);
                    if (dateDiff !== 0) return dateDiff;
                    // If dates are same, sort by time (descending)
                    // Time format is HH:mm (24h) or similar, string comparison works for HH:mm
                    if (a.time && b.time) {
                        return b.time.localeCompare(a.time);
                    }
                    return 0;
                });

                setVisits(visitsData);
            } catch (error) {
                console.error("Error fetching visits:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchVisits();
    }, []);

    const filteredVisits = visits.filter(visit =>
        visit.patientName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const groupedVisits = filteredVisits.reduce((groups, visit) => {
        const date = visit.date;
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(visit);
        return groups;
    }, {});

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-3xl font-bold text-slate-800">Recent Visits</h1>
                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search by patient..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary w-full md:w-64"
                        />
                        <User className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    </div>
                    <Link to="/visits/new" className="btn btn-primary flex items-center justify-center gap-2 text-lg whitespace-nowrap">
                        <Plus size={24} />
                        New Visit
                    </Link>
                </div>
            </div>

            {loading ? (
                <Loader text="Loading visits..." />
            ) : (
                <div className="space-y-8">
                    {Object.keys(groupedVisits).length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-lg">
                            {searchTerm ? 'No visits found matching your search.' : 'No visits recorded.'}
                        </div>
                    ) : (
                        Object.keys(groupedVisits).map(date => (
                            <div key={date} className="space-y-4">
                                <h2 className="text-xl font-semibold text-slate-600 border-b pb-2">
                                    {formatDate(date)}
                                </h2>
                                <div className="grid gap-4">
                                    {groupedVisits[date].map(visit => (
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
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
