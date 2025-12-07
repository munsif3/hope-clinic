import React from 'react';
import { useToast } from '../contexts/ToastContext';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export default function ToastContainer() {
    const { toasts, removeToast } = useToast();

    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className={`
                        min-w-[300px] p-4 rounded-xl shadow-lg border flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300
                        ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : ''}
                        ${toast.type === 'error' ? 'bg-red-50 border-red-100 text-red-800' : ''}
                        ${toast.type === 'info' ? 'bg-blue-50 border-blue-100 text-blue-800' : ''}
                    `}
                >
                    <div className="mt-0.5">
                        {toast.type === 'success' && <CheckCircle size={18} className="text-emerald-600" />}
                        {toast.type === 'error' && <AlertCircle size={18} className="text-red-600" />}
                        {toast.type === 'info' && <Info size={18} className="text-blue-600" />}
                    </div>
                    <p className="flex-1 text-sm font-medium">{toast.message}</p>
                    <button
                        onClick={() => removeToast(toast.id)}
                        className="opacity-50 hover:opacity-100 transition-opacity"
                    >
                        <X size={16} />
                    </button>
                </div>
            ))}
        </div>
    );
}
