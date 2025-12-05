import React from 'react';
import { Plus, Trash2, Calendar } from 'lucide-react';

export default function DynamicListInput({
    label,
    items,
    onChange,
    placeholderName = "Condition",
    placeholderNotes = "Notes..."
}) {
    // Ensure items is always an array
    const listItems = Array.isArray(items) ? items : [];

    const handleAdd = () => {
        const today = new Date().toISOString();
        onChange([...listItems, { name: '', notes: '', date: today }]);
    };

    const handleRemove = (index) => {
        const newItems = listItems.filter((_, i) => i !== index);
        onChange(newItems);
    };

    const handleChange = (index, field, value) => {
        const newItems = [...listItems];
        newItems[index] = {
            ...newItems[index],
            [field]: value,
            date: new Date().toISOString() // Auto-update timestamp
        };
        onChange(newItems);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <label className="block text-lg font-medium text-slate-700">{label}</label>
                <button
                    type="button"
                    onClick={handleAdd}
                    className="text-sm btn btn-secondary py-1 px-3 flex items-center gap-1"
                >
                    <Plus size={16} /> Add Item
                </button>
            </div>

            <div className="space-y-3">
                {listItems.length > 0 ? (
                    listItems.map((item, index) => (
                        <div key={index} className="flex flex-col md:flex-row gap-3 items-start bg-slate-50 p-4 rounded-xl border border-slate-200/60 shadow-sm">
                            <div className="flex-1 space-y-3 w-full">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                        {placeholderName.split(' ')[0]} Name
                                    </label>
                                    <input
                                        type="text"
                                        placeholder={placeholderName}
                                        className="input py-2 text-sm font-bold text-slate-700 w-full"
                                        value={item.name || ''}
                                        onChange={(e) => handleChange(index, 'name', e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                        Notes / Details
                                    </label>
                                    <textarea
                                        placeholder={placeholderNotes}
                                        className="input py-2 text-sm resize-none w-full"
                                        rows="2"
                                        value={item.notes || ''}
                                        onChange={(e) => handleChange(index, 'notes', e.target.value)}
                                    />
                                </div>

                                {item.date && (
                                    <p className="text-xs text-slate-400 text-right italic flex items-center justify-end gap-1">
                                        <span>Last updated:</span>
                                        <span className="font-medium text-slate-500">{new Date(item.date).toLocaleDateString()}</span>
                                    </p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => handleRemove(index)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors md:mt-1 self-end md:self-start"
                                title="Remove"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    ))
                ) : (
                    <div className="text-center p-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
                        No records. Click "Add Item" to start.
                    </div>
                )}
            </div>
        </div>
    );
}
