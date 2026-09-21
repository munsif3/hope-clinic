import { useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export default function AppUpdateNotice() {
    const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW();
    const [error, setError] = useState(false);
    if (!needRefresh) return null;
    return <aside className="clinic-navigation fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-md z-50 workflow-panel shadow-lg space-y-3" role="status">
        <p>A clinic app update is ready. Save your work in all open clinic tabs before updating.</p>
        {error && <p>Could not apply the update. Save your work, then close and reopen the app.</p>}
        <button className="btn btn-secondary" onClick={async () => {
            if (!window.confirm('Have you saved your work in all clinic tabs? Applying this update reloads the app.')) return;
            try { await updateServiceWorker(true); } catch { setError(true); }
        }}>Apply update after saving</button>
    </aside>;
}
