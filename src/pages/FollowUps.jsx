import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, orderBy, doc, getDoc, updateDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { Calendar, CheckCircle, Clock } from 'lucide-react';
import { formatDate } from '../utils/formatters';
import { followupOverdue } from '../utils/visits';
import { useToast } from '../contexts/ToastContext';
import Loader from '../components/Loader';

export default function FollowUps() {
    const [followUps, setFollowUps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [completing, setCompleting] = useState(null);
    const { showToast } = useToast();

    useEffect(() => {
        fetchFollowUps();
    }, []);

    const fetchFollowUps = async () => {
        try {
            // Fetch pending follow-ups
            const q = query(
                collection(db, 'followups'),
                where('status', '==', 'pending'),
                orderBy('date', 'asc')
            );
            const snapshot = await getDocs(q);

            const data = await Promise.all(snapshot.docs.map(async (d) => {
                const fData = d.data();
                let patientName = 'Unknown';
                let contact = '';
                if (fData.patientId) {
                    const pSnap = await getDoc(doc(db, 'patients', fData.patientId));
                    if (pSnap.exists()) {
                        patientName = pSnap.data().name;
                        contact = pSnap.data().contact;
                    }
                }
                return {
                    id: d.id,
                    patientName,
                    contact,
                    ...fData
                };
            }));
            setFollowUps(data);
            setError(false);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    const markAsComplete = async (id) => {
        if (completing) return;
        setCompleting(id);
        try {
            await updateDoc(doc(db, 'followups', id), {
                status: 'completed'
            });
            fetchFollowUps();
        } catch {
            showToast("Could not complete this follow-up. Please try again.", "error");
        } finally { setCompleting(null); }
    };

    return (
        <div className="space-y-6">
            <div className="workflow-header"><div><h1 className="text-3xl font-bold text-slate-800">Follow-ups</h1><p className="text-slate-600">Review tasks, not reserved appointments. A due date does not guarantee a booking.</p></div><Link className="btn btn-secondary" to="/today">Open appointment schedule</Link></div>

            {error ? <div role="alert" className="card space-y-3"><p>Follow-ups could not be loaded.</p><button onClick={fetchFollowUps} className="btn btn-secondary">Try again</button></div> : loading ? (
                <Loader text="Loading follow-ups..." />
            ) : (
                <div className="grid gap-4">
                    {followUps.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-lg">
                            No pending follow-ups.
                        </div>
                    ) : (
                        followUps.map(item => (
                            <div key={item.id} className="card p-6 flex flex-col md:flex-row justify-between items-center gap-4 hover:shadow-md transition-shadow">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Calendar className="text-primary" size={24} />
                                        <span className="text-xl font-bold text-slate-800">{formatDate(item.date)}</span>
                                        {item.time && (
                                            <span className="text-lg font-semibold text-slate-600 ml-2 border-l border-slate-300 pl-2 flex items-center gap-1">
                                                <Clock size={18} />
                                                {item.time}
                                            </span>
                                        )}
                                        {followupOverdue(item) && (
                                            <span className="bg-red-100 text-red-600 text-sm px-2 py-1 rounded font-bold">Overdue</span>
                                        )}
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-700">Patient: {item.patientName}</h3>
                                    <p className="text-slate-500">Contact: {item.contact}</p>
                                    {item.notes && <p className="text-slate-600 mt-1 italic">"{item.notes}"</p>}
                                </div>

                                <div className="flex flex-wrap items-center gap-3">
                                    <Link to={"/visits/new?patientId=" + item.patientId + "&followupId=" + item.id} className="btn btn-primary text-sm">Start Visit</Link>
                                    <Link to={`/patients/${item.patientId}`} className="btn btn-secondary text-sm px-4 py-2">
                                        View Profile
                                    </Link>
                                    <button
                                        disabled={Boolean(completing)} onClick={() => markAsComplete(item.id)}
                                        className="btn bg-emerald-100 text-emerald-700 hover:bg-emerald-200 flex items-center gap-2 px-4 py-2 rounded-lg font-medium"
                                    >
                                        <CheckCircle size={20} />
                                        Mark Done
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
