import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { clearVisitDrafts } from '../utils/visitDrafts';

const AuthContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState(null); // 'doctor' or 'assistant'
    const [userName, setUserName] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Fetch user role from Firestore
                try {
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        setUserRole(userData.role);
                        // Check for name OR displayName in the Firestore document
                        setUserName(userData.name || userData.displayName || user.displayName);
                    } else {
                        // Default or handle missing role
                        setUserRole(null);
                        setUserName(user.displayName);
                    }
                } catch (error) {
                    console.error("Error fetching user role:", error);
                    setUserRole(null);
                }
                setCurrentUser(user);
            } else {
                try { clearVisitDrafts(window.sessionStorage); } catch { /* Storage may be disabled. */ }
                setCurrentUser(null);
                setUserRole(null);
                setUserName(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        userRole,
        userName,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
