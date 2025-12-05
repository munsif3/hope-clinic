import React from 'react';
import StructuredText from './StructuredText';
import { Calendar } from 'lucide-react';
import { formatDate } from '../utils/formatters';

export default function DynamicListDisplay({ title, items, icon: Icon }) {
    // Helper to normalize items (handle legacy strings or objects)
    const normalizedItems = Array.isArray(items) ? items : [];
    const isLegacyString = typeof items === 'string' && items.trim() !== '';

    return (
        <div>
            <p className="text-slate-500 font-medium mb-1 flex items-center gap-2">
                {Icon && <Icon size={16} />}
                {title}
            </p>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                {normalizedItems.length > 0 ? (
                    <div className="space-y-3">
                        {normalizedItems.map((item, index) => (
                            <div key={index} className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                                <div className="flex justify-between items-start mb-1">
                                    <p className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                                        {item.name || item.condition} {/* Support both keys for now */}
                                    </p>
                                    {item.date && (
                                        <span className="text-xs text-slate-400 flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                                            <Calendar size={10} />
                                            {formatDate(item.date)}
                                        </span>
                                    )}
                                </div>
                                {item.notes && (
                                    <p className="text-slate-600 text-sm pl-3.5 border-l-2 border-slate-100 mt-1">
                                        {item.notes}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                ) : isLegacyString ? (
                    <StructuredText text={items} />
                ) : (
                    <span className="text-slate-400 text-sm italic pl-2">None recorded.</span>
                )}
            </div>
        </div>
    );
}
