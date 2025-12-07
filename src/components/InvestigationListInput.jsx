import React from 'react';
import { Plus, Trash2, Microscope } from 'lucide-react';

export default function InvestigationListInput({ label, items, onChange }) {
    // Ensure items is always an array of strings
    const listItems = Array.isArray(items) ? items : [];

    const handleAdd = () => {
        onChange([...listItems, '']);
    };

    const handleRemove = (index) => {
        const newItems = listItems.filter((_, i) => i !== index);
        onChange(newItems);
    };

    const handleChange = (index, value) => {
        const newItems = [...listItems];
        newItems[index] = value;
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
                    <Plus size={16} /> Add Investigation
                </button>
            </div>

            <div className="space-y-3">
                {listItems.length > 0 ? (
                    listItems.map((item, index) => (
                        <div key={index} className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="relative flex-1">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                    <Microscope size={18} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="e.g. CBC, X-Ray Chest"
                                    className="input pl-10 w-full"
                                    value={item}
                                    onChange={(e) => handleChange(index, e.target.value)}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => handleRemove(index)}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Remove"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    ))
                ) : (
                    <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
                        No investigations added. Click "Add Investigation" to start.
                    </div>
                )}
            </div>
        </div>
    );
}
