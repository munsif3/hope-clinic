import React from 'react';
import { Activity } from 'lucide-react';

const Loader = ({ text = "Loading...", fullScreen = false }) => {
    const content = (
        <div className="flex flex-col items-center justify-center gap-4 p-8">
            <div className="relative">
                {/* Outer spinning ring */}
                <div className="w-16 h-16 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>

                {/* Inner pulsing icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <Activity className="text-primary animate-pulse" size={24} />
                </div>
            </div>
            <p className="text-slate-500 font-medium animate-pulse">{text}</p>
        </div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
                {content}
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-[200px]">
            {content}
        </div>
    );
};

export default Loader;
