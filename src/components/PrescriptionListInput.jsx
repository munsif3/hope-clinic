import React from 'react';
import { Plus, Trash2, Pill } from 'lucide-react';

export default function PrescriptionListInput({
    label,
    items,
    onChange
}) {
    // Ensure items is always an array
    const listItems = Array.isArray(items) ? items : [];

    const handleAdd = () => {
        onChange([...listItems, { name: '', dosage: '', frequency: '', duration: '', notes: '' }]);
    };

    const handleRemove = (index) => {
        const newItems = listItems.filter((_, i) => i !== index);
        onChange(newItems);
    };

    const handleChange = (index, field, value) => {
        const newItems = [...listItems];
        newItems[index] = { ...newItems[index], [field]: value };
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
                    <Plus size={16} /> Add Prescription
                </button>
            </div>

            <div className="space-y-3">
                {listItems.length > 0 ? (
                    listItems.map((item, index) => (
                        <div key={index} className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 shadow-sm relative">
                            <button
                                type="button"
                                onClick={() => handleRemove(index)}
                                className="absolute top-3 right-3 text-slate-400 hover:text-red-500 transition-colors"
                                title="Remove"
                            >
                                <Trash2 size={18} />
                            </button>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                {/* Medication Name */}
                                <div className="md:col-span-4 space-y-1">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        Medication
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                            <Pill size={14} />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="e.g. Paracetamol"
                                            className="input py-2 pl-9 text-sm font-bold text-slate-700 w-full"
                                            value={item.name || ''}
                                            onChange={(e) => handleChange(index, 'name', e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Dosage */}
                                <div className="md:col-span-2 space-y-1">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        Dosage
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="500mg"
                                        className="input py-2 text-sm w-full"
                                        value={item.dosage || ''}
                                        onChange={(e) => handleChange(index, 'dosage', e.target.value)}
                                    />
                                </div>

                                {/* Frequency */}
                                <div className="md:col-span-3 space-y-1">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        Frequency
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="1-0-1 (After Food)"
                                        className="input py-2 text-sm w-full"
                                        value={item.frequency || ''}
                                        onChange={(e) => handleChange(index, 'frequency', e.target.value)}
                                    />
                                </div>

                                {/* Duration */}
                                <div className="md:col-span-3 space-y-1">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        Duration
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="5 Days"
                                        className="input py-2 text-sm w-full"
                                        value={item.duration || ''}
                                        onChange={(e) => handleChange(index, 'duration', e.target.value)}
                                    />
                                </div>

                                {/* Notes */}
                                <div className="md:col-span-12 space-y-1">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        Notes / Instructions
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Take with warm water"
                                        className="input py-2 text-sm w-full text-slate-600"
                                        value={item.notes || ''}
                                        onChange={(e) => handleChange(index, 'notes', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
                        No prescriptions added. Click "Add Prescription" to start.
                    </div>
                )}
            </div>
        </div>
    );
}
