import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

import Loader from './Loader';

export default function ProtectedRoute({ children }) {
    const { currentUser, loading } = useAuth();

    if (loading) {
        return <Loader text="Checking authentication..." fullScreen />;
    }

    if (!currentUser) {
        return <Navigate to="/login" />;
    }

    return children;
}
