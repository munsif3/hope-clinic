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
    const { currentUser, userRole, userName } = useAuth();
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
        fixed inset-y-0 left-0 z-20 w-64 bg-white shadow-lg transform transition-transform duration-200 ease-in-out
        md:relative md:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
                <div className="p-6 border-b border-slate-100 hidden md:block">
                    <div className="flex items-center gap-3 mb-3">
                        <img src="/logo.png" alt="Hope Clinic" className="w-12 h-12 flex-shrink-0" />
                        <h1 className="text-2xl font-bold text-primary truncate">Hope Clinic</h1>
                    </div>
                    <p className="text-sm text-slate-500 truncate">
                        {userRole === 'doctor' ? 'Doctor\'s Dashboard' : 'Assistant\'s Dashboard'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 truncate" title={userName}>
                        {userName || 'User'}
                    </p>
                </div>

                <nav className="p-4 space-y-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={() => setSidebarOpen(false)}
                            className={({ isActive }) => `
                flex items-center gap-3 px-4 py-4 rounded-xl text-lg font-medium transition-colors
                ${isActive
                                    ? 'bg-primary text-white shadow-md'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-primary'}
              `}
                        >
                            <item.icon size={24} />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="absolute bottom-0 w-full p-4 border-t border-slate-100">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-4 w-full text-lg font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    >
                        <LogOut size={24} />
                        Log Out
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
