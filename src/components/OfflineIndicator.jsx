import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export default function OfflineIndicator() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [showSyncMessage, setShowSyncMessage] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setShowSyncMessage(true);
            // Hide sync message after 3 seconds
            setTimeout(() => setShowSyncMessage(false), 3000);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setShowSyncMessage(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (isOnline && !showSyncMessage) {
        return null; // Don't show anything when online and not syncing
    }

    return (
        <div className={`fixed top-0 left-0 right-0 z-50 ${isOnline
                ? 'bg-emerald-500'
                : 'bg-amber-500'
            } text-white py-3 px-4 shadow-lg transition-all duration-300`}>
            <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-lg font-medium">
                {isOnline ? (
                    <>
                        <RefreshCw size={20} className="animate-spin" />
                        <span>Back online! Syncing data...</span>
                    </>
                ) : (
                    <>
                        <WifiOff size={20} />
                        <span>You're offline. Changes will sync when reconnected.</span>
                    </>
                )}
            </div>
        </div>
    );
}
