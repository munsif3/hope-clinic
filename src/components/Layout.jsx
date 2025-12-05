import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../config/firebase';
import { signOut } from 'firebase/auth';
import {
    LayoutDashboard,
    Users,
    Stethoscope,
    Package,
    LogOut,
    Menu,
    X
} from 'lucide-react';
import { useState } from 'react';
import OfflineIndicator from './OfflineIndicator';

export default function Layout() {
    const { userRole, userName } = useAuth();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/login');
        } catch (error) {
            console.error("Failed to log out", error);
        }
    };

    const navItems = [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/patients', label: 'Patients', icon: Users },
        { path: '/visits', label: 'Visits', icon: Stethoscope },
        { path: '/inventory', label: 'Inventory', icon: Package },
    ];

    return (
        <div className="min-h-screen bg-background flex flex-col md:flex-row">
            <OfflineIndicator />
            {/* Mobile Header */}
            <div className="md:hidden bg-white p-4 flex justify-between items-center shadow-sm z-20">
                <div className="flex items-center gap-2">
                    <img src="/logo.png" alt="Hope Clinic" className="w-8 h-8" />
                    <h1 className="text-xl font-bold text-primary">Hope Clinic</h1>
                </div>
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2">
                    {sidebarOpen ? <X size={28} /> : <Menu size={28} />}
                </button>
            </div>

            {/* Sidebar Overlay for Mobile */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-10 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
        fixed inset-y-0 left-0 z-20 w-72 bg-slate-900 text-white shadow-2xl transform transition-transform duration-300 ease-out
        md:relative md:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
                <div className="p-8 border-b border-slate-800/50 hidden md:block">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm">
                            <img src="/logo.png" alt="Hope Clinic" className="w-10 h-10" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-tight font-heading leading-none">Hope Clinic</h1>
                            <span className="text-xs text-indigo-300 font-medium tracking-wider uppercase">Management</span>
                        </div>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4 mt-6 border border-slate-700/50">
                        <p className="text-sm text-slate-300 font-medium">
                            {userRole === 'doctor' ? 'Doctor\'s Portal' : 'Assistant\'s Portal'}
                        </p>
                        <p className="text-xs text-slate-500 mt-1 truncate font-medium" title={userName}>
                            {userName || 'User'}
                        </p>
                    </div>
                </div>

                <nav className="p-4 space-y-2 mt-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={() => setSidebarOpen(false)}
                            className={({ isActive }) => `
                flex items-center gap-4 px-6 py-4 rounded-xl text-base font-medium transition-all duration-200 group relative overflow-hidden
                ${isActive
                                    ? 'bg-primary text-white shadow-lg shadow-indigo-900/20'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
              `}
                        >
                            {({ isActive }) => (
                                <>
                                    <item.icon size={22} className={isActive ? 'animate-pulse' : ''} />
                                    <span className="relative z-10">{item.label}</span>
                                    {/* Hover Glow Effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                <div className="absolute bottom-0 w-full p-6 border-t border-slate-800/50 bg-slate-900">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-6 py-4 w-full text-base font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl transition-all duration-200"
                    >
                        <LogOut size={22} />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-8 overflow-y-auto overflow-x-hidden h-[calc(100vh-64px)] md:h-screen">
                <div className="max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
