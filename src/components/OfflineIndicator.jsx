import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export default function OfflineIndicator() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    useEffect(() => {
        const update = () => setIsOnline(navigator.onLine);
        window.addEventListener('online', update);
        window.addEventListener('offline', update);
        return () => {
            window.removeEventListener('online', update);
            window.removeEventListener('offline', update);
        };
    }, []);
    if (isOnline) return null;
    return <div role="status" className="clinic-navigation fixed bottom-0 left-0 right-0 z-50 bg-amber-100 text-amber-900 p-3 border-t border-amber-300">
        <div className="flex items-center justify-center gap-2"><WifiOff size={20} /><span>You are offline. Keep unfinished work open and check each save when you reconnect.</span></div>
    </div>;
}
