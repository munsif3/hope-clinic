import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { Users, IndianRupee, AlertTriangle, Calendar } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

export default function Dashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        todayPatients: 0,
        todayRevenue: 0,
        todayVisitsList: [],
        lowStockCount: 0,
        pendingFollowups: 0,
        chartData: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Fix Date Logic: Use local date string (YYYY-MM-DD) to match input type="date"
                const today = new Date();
                const todayStr = today.toLocaleDateString('en-CA'); // YYYY-MM-DD in local time

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

                // 3. Follow-ups for today
                const followupsRef = collection(db, 'followups');
                const followupsQuery = query(
                    followupsRef,
                    where('date', '==', todayStr),
                    where('status', '==', 'pending')
                );
                const followupsSnapshot = await getDocs(followupsQuery);

                // 4. Chart Data (Last 7 Days)
                const chartData = [];
                for (let i = 6; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    const dateStr = d.toLocaleDateString('en-CA');

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
                    pendingFollowups: followupsSnapshot.size,
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
        return <div className="p-8 text-xl text-slate-500">Loading dashboard...</div>;
    }

    const widgets = [
        {
            label: "Today's Patients",
            value: stats.todayPatients,
            icon: Users,
            color: "bg-blue-500",
            link: "/visits"
        },
        {
            label: "Revenue Today",
            value: formatCurrency(stats.todayRevenue),
            icon: IndianRupee,
            color: "bg-emerald-500",
            link: "/visits"
        },
        {
            label: "Low Stock Alerts",
            value: stats.lowStockCount,
            icon: AlertTriangle,
            color: "bg-amber-500",
            link: "/inventory",
            alert: stats.lowStockCount > 0
        },
        {
            label: "Pending Follow-ups",
            value: stats.pendingFollowups,
            icon: Calendar,
            color: "bg-purple-500",
            link: "/followups"
        }
    ];

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {widgets.map((widget, index) => (
                    <div
                        key={index}
                        onClick={() => navigate(widget.link)}
                        className={`card p-6 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer ${widget.alert ? 'border-amber-400 bg-amber-50' : ''}`}
                    >
                        <div>
                            <p className="text-slate-500 font-medium text-lg mb-1">{widget.label}</p>
                            <p className={`text-3xl font-bold ${widget.alert ? 'text-amber-700' : 'text-slate-800'}`}>
                                {widget.value}
                            </p>
                        </div>
                        <div className={`${widget.color} p-4 rounded-full text-white`}>
                            <widget.icon size={32} />
                        </div>
                    </div>
                ))}
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="card">
                    <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => navigate('/visits/new')}
                            className="btn btn-primary h-24 text-lg"
                        >
                            New Visit
                        </button>
                        <button
                            onClick={() => navigate('/patients/new')}
                            className="btn btn-secondary h-24 text-lg"
                        >
                            Add Patient
                        </button>
                    </div>
                </div>

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
