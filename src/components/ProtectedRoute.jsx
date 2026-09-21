import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';

import Loader from './Loader';

export default function ProtectedRoute({ children }) {
    const { currentUser, userRole, loading } = useAuth();

    if (loading) {
        return <Loader text="Checking authentication..." fullScreen />;
    }

    if (!currentUser) {
        return <Navigate to="/login" />;
    }

    if (!['doctor', 'assistant'].includes(userRole)) {
        return <div className="min-h-screen flex items-center justify-center p-6"><div className="card space-y-4">
            <h1 className="text-xl">Clinic access unavailable</h1>
            <p>Your account needs an approved clinic role. If access was already granted, check your connection and sign in again.</p>
            <button className="btn btn-secondary" onClick={() => signOut(auth)}>Sign out</button>
        </div></div>;
    }
    return children;
}
