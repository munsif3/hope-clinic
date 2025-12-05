import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { Users, Banknote, AlertTriangle, Calendar, Plus, UserPlus, FileText } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import Loader from '../components/Loader';

export default function Dashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        todayPatients: 0,
        todayRevenue: 0,
        todayVisitsList: [],
        lowStockCount: 0,
        pendingFollowups: 0,
        todayFollowupsList: [],
        upcomingFollowupsList: [],
        chartData: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Fix Date Logic: Use manual YYYY-MM-DD construction to strictly match input type="date" values
                const getLocalYYYYMMDD = (d) => {
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                };

                const today = new Date();
                const todayStr = getLocalYYYYMMDD(today);

                // 1. Today's Visits & Revenue
                const visitsRef = collection(db, 'visits');
                const visitsQuery = query(visitsRef, where('date', '==', todayStr));
                const visitsSnapshot = await getDocs(visitsQuery);

                let revenue = 0;
                const visitsList = [];

                for (const docSnap of visitsSnapshot.docs) {
                    const data = docSnap.data();
                    revenue += Number(data.cost || 0);

                    visitsList.push({
                        id: docSnap.id,
                        ...data
                    });
                }

                // Fetch patient names
                const patientsSnapshot = await getDocs(collection(db, 'patients'));
                const patientsMap = {};
                patientsSnapshot.forEach(doc => {
                    patientsMap[doc.id] = doc.data().name;
                });

                const enrichedVisits = visitsList.map(v => ({
                    ...v,
                    patientName: patientsMap[v.patientId] || 'Unknown'
                })).sort((a, b) => (a.time || '').localeCompare(b.time || ''));

                // 2. Low Stock
                const inventoryRef = collection(db, 'inventory');
                const inventorySnapshot = await getDocs(inventoryRef);
                let lowStock = 0;
                inventorySnapshot.forEach(doc => {
                    const data = doc.data();
                    if (Number(data.stock) <= Number(data.lowStockThreshold || 5)) {
                        lowStock++;
                    }
                });

                // 3. Follow-ups
                // A. Today's Consultations (Follow-ups due today)
                const followupsRef = collection(db, 'followups');
                const todayFollowupsQuery = query(
                    followupsRef,
                    where('date', '==', todayStr)
                    // Removed status filter to show both pending and completed
                    // Note: Sorting by time requires a composite index (date, time). 
                    // Can sort client-side to avoid index creation for now.
                );
                const todayFollowupsSnapshot = await getDocs(todayFollowupsQuery);

                const todayFollowupsList = [];
                for (const doc of todayFollowupsSnapshot.docs) {
                    const data = doc.data();
                    let patientName = 'Unknown';
                    if (data.patientId) {
                        patientName = patientsMap[data.patientId] || 'Unknown';
                    }
                    todayFollowupsList.push({ id: doc.id, patientName, ...data });
                }
                // Sort by time
                todayFollowupsList.sort((a, b) => (a.time || '').localeCompare(b.time || ''));

                // B. Upcoming Follow-ups (Future)
                // Note: Simplified query to avoid Need for Composite Index (Date + Status).
                // We query by Date range (which is indexed by default) and filter Status client-side.
                const upcomingFollowupsQuery = query(
                    followupsRef,
                    where('date', '>', todayStr),
                    orderBy('date', 'asc'),
                    limit(20) // Fetch slightly more to account for non-pending ones
                );

                let upcomingFollowupsList = [];
                try {
                    const upcomingFollowupsSnapshot = await getDocs(upcomingFollowupsQuery);
                    const allFutureDocs = upcomingFollowupsSnapshot.docs.map(doc => ({
                        id: doc.id,
                        patientName: patientsMap[doc.data().patientId] || 'Unknown',
                        ...doc.data()
                    }));

                    // Client-side filtering for status='pending'
                    upcomingFollowupsList = allFutureDocs.filter(item => item.status === 'pending').slice(0, 5);
                } catch (err) {
                    console.error("Error fetching upcoming follow-ups:", err);
                    // Fallback to empty list so we don't crash the whole dashboard
                }

                // 4. Chart Data (Last 7 Days)
                const chartData = [];
                for (let i = 6; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    const dateStr = getLocalYYYYMMDD(d);

                    // Note: In a real app, optimize this to one query for range instead of 7 queries
                    const dayQuery = query(visitsRef, where('date', '==', dateStr));
                    const daySnapshot = await getDocs(dayQuery);

                    let dayRevenue = 0;
                    daySnapshot.forEach(doc => {
                        dayRevenue += Number(doc.data().cost || 0);
                    });

                    chartData.push({
                        name: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
                        revenue: dayRevenue,
                        patients: daySnapshot.size
                    });
                }

                setStats({
                    todayPatients: visitsSnapshot.size,
                    todayRevenue: revenue,
                    todayVisitsList: enrichedVisits,
                    lowStockCount: lowStock,
                    pendingFollowups: todayFollowupsList.length + upcomingFollowupsList.length,
                    todayFollowupsList,
                    upcomingFollowupsList,
                    chartData
                });
            } catch (error) {
                console.error("Error fetching dashboard stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return <Loader text="Loading dashboard..." />;
    }

    const widgets = [
        {
            label: "Today's Patients",
            value: stats.todayPatients,
            icon: Users,
            color: "text-blue-600",
            bg: "bg-blue-50",
            border: "border-blue-100",
            link: "/visits"
        },
        {
            label: "Revenue Today",
            value: formatCurrency(stats.todayRevenue),
            icon: Banknote,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            border: "border-emerald-100",
            link: "/visits"
        },
        {
            label: "Low Stock Alerts",
            value: stats.lowStockCount,
            icon: AlertTriangle,
            color: "text-amber-600",
            bg: "bg-amber-50",
            border: "border-amber-100",
            link: "/inventory",
            alert: stats.lowStockCount > 0
        },
        {
            label: "Expected Consultations",
            value: stats.todayFollowupsList.length,
            icon: Calendar,
            color: "text-purple-600",
            bg: "bg-purple-50",
            border: "border-purple-100",
            link: "#expected-consultations" // Internal link anchor
        }
    ];

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">Dashboard</h1>
                    <p className="text-slate-500">Overview of your clinic's performance today.</p>
                </div>
                <div className="text-sm font-medium text-slate-500 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200/60">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {widgets.map((widget, index) => (
                    <div
                        key={index}
                        onClick={() => navigate(widget.link)}
                        className={`card p-6 flex items-start justify-between hover:-translate-y-1 transition-all duration-300 cursor-pointer group ${widget.alert ? 'ring-2 ring-amber-400 ring-offset-2' : ''}`}
                    >
                        <div>
                            <p className="text-slate-500 font-medium text-sm uppercase tracking-wider mb-2">{widget.label}</p>
                            <h3 className="text-3xl font-bold text-slate-800 font-heading tracking-tight">{widget.value}</h3>
                        </div>
                        <div className={`p-3 rounded-xl ${widget.bg} ${widget.color} group-hover:scale-110 transition-transform duration-300`}>
                            <widget.icon size={24} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions Section - Moved to Top */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button
                    onClick={() => navigate('/visits/new')}
                    className="group p-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-between overflow-hidden relative"
                >
                    <div className="relative z-10 text-left">
                        <h3 className="text-xl font-bold text-white mb-1">New Visit</h3>
                        <p className="text-blue-100 text-sm">Start a consultation</p>
                    </div>
                    <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                        <FileText className="text-white" size={28} />
                    </div>
                    <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors duration-300"></div>
                </button>

                <button
                    onClick={() => navigate('/patients/new')}
                    className="group p-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-between overflow-hidden relative"
                >
                    <div className="relative z-10 text-left">
                        <h3 className="text-xl font-bold text-white mb-1">Add Patient</h3>
                        <p className="text-purple-100 text-sm">Register new patient</p>
                    </div>
                    <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                        <UserPlus className="text-white" size={28} />
                    </div>
                    <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors duration-300"></div>
                </button>

                <button
                    onClick={() => navigate('/inventory')}
                    className="group p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex items-center justify-between overflow-hidden relative"
                >
                    <div className="relative z-10 text-left">
                        <h3 className="text-xl font-bold text-slate-800 mb-1">Inventory</h3>
                        <p className="text-slate-500 text-sm">Manage stock & items</p>
                    </div>
                    <div className="bg-slate-100 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
                        <Banknote className="text-slate-600" size={28} />
                    </div>
                </button>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="card p-6">
                    <h2 className="text-xl font-bold mb-4 text-slate-800">Revenue Trend (Last 7 Days)</h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip formatter={(value) => formatCurrency(value)} />
                                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="card p-6">
                    <h2 className="text-xl font-bold mb-4 text-slate-800">Patient Visits (Last 7 Days)</h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Area type="monotone" dataKey="patients" stroke="#3b82f6" fill="#93c5fd" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* New Section: Today's Expected Consultations & Upcoming Follow-ups */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" id="expected-consultations">
                <div className="card">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-slate-800">Today's Expected Consultations</h2>
                        <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded-full">
                            {stats.todayFollowupsList.length} Due
                        </span>
                    </div>

                    {stats.todayFollowupsList.length > 0 ? (
                        <div className="space-y-3">
                            {stats.todayFollowupsList.map((item, index) => (
                                <div key={index} className="p-4 bg-purple-50 rounded-xl border border-purple-100 flex justify-between items-center">
                                    <div className={item.status === 'completed' ? 'opacity-60' : ''}>
                                        <div className="flex items-center gap-2">
                                            <span className={`font-bold text-lg ${item.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                                                {item.patientName}
                                            </span>
                                            {item.time && (
                                                <span className="text-xs font-bold bg-white px-2 py-1 rounded border border-purple-200 text-purple-600">
                                                    {item.time}
                                                </span>
                                            )}
                                        </div>
                                        {item.notes && <p className="text-sm text-slate-600 italic">"{item.notes}"</p>}
                                    </div>
                                    {item.status === 'completed' ? (
                                        <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">
                                            Completed
                                        </span>
                                    ) : (
                                        <button
                                            onClick={() => navigate(`/visits/new?patientId=${item.patientId}&followupId=${item.id}`)}
                                            className="btn bg-white text-purple-600 hover:bg-purple-100 border border-purple-200 text-sm py-1 px-3 shadow-sm"
                                        >
                                            Start Visit
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            No consultations scheduled for today.
                        </div>
                    )}
                </div>

                <div className="card">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-slate-800">Upcoming Follow-ups</h2>
                        <button onClick={() => navigate('/followups')} className="text-blue-600 text-sm font-medium hover:underline">
                            View All
                        </button>
                    </div>

                    {stats.upcomingFollowupsList.length > 0 ? (
                        <div className="space-y-3">
                            {stats.upcomingFollowupsList.map((item, index) => (
                                <div key={index} className="flex justify-between items-center p-3 bg-white hover:bg-slate-50 rounded-lg border border-slate-100 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-blue-50 text-blue-600 p-2 rounded-lg font-bold text-center min-w-[3.5rem]">
                                            <span className="block text-xs uppercase">{new Date(item.date).toLocaleDateString('en-US', { month: 'short' })}</span>
                                            <span className="block text-xl leading-none">{new Date(item.date).getDate()}</span>
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800">{item.patientName}</p>
                                            <p className="text-xs text-slate-500">{new Date(item.date).toLocaleDateString('en-US', { weekday: 'long' })}</p>
                                        </div>
                                    </div>
                                    {item.time && (
                                        <span className="text-sm font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                            {item.time}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-500 py-4">No upcoming follow-ups in the next few days.</p>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8">


                <div className="card">
                    <h2 className="text-xl font-bold mb-4">Today's Patients</h2>
                    {stats.todayVisitsList && stats.todayVisitsList.length > 0 ? (
                        <div className="space-y-3">
                            {stats.todayVisitsList.map((visit, index) => (
                                <div key={index} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div>
                                        <p className="font-bold text-slate-800">{visit.patientName || 'Unknown Patient'}</p>
                                        <p className="text-sm text-slate-500">{visit.diagnosis}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-slate-700">{visit.time || 'N/A'}</p>
                                        <p className="text-sm text-emerald-600 font-medium">{formatCurrency(visit.cost)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-500">No patients visited today.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
