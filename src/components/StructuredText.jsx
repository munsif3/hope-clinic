import React from 'react';

export default function StructuredText({ text }) {
    if (!text) return <span className="text-slate-400 italic">None recorded.</span>;

    const lines = text.split('\n').filter(line => line.trim() !== '');

    // Check if the text actually uses the bullet format (starts with - or *)
    const hasBullets = lines.some(line => line.trim().startsWith('-') || line.trim().startsWith('*'));

    if (!hasBullets) {
        return <p className="whitespace-pre-wrap text-slate-700">{text}</p>;
    }

    return (
        <div className="space-y-1">
            {lines.map((line, index) => {
                const trimmed = line.trim();
                const isBullet = trimmed.startsWith('-') || trimmed.startsWith('*');

                if (isBullet) {
                    // Remove the bullet char and render bold
                    const content = trimmed.substring(1).trim();
                    return (
                        <div key={index} className="flex items-start gap-2 mt-3 first:mt-0">
                            <span className="text-primary mt-1.5 text-xs">●</span>
                            <span className="font-bold text-slate-800">{content}</span>
                        </div>
                    );
                }

                // Indented note
                return (
                    <div key={index} className="pl-5 text-slate-600 text-sm leading-relaxed">
                        {line}
                    </div>
                );
            })}
        </div>
    );
}
