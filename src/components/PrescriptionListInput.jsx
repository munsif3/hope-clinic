import React, { useState, useRef, useEffect, useId } from 'react';
import { changePrescription } from '../utils/visits';
import { Plus, Trash2, Pill, Search, AlertCircle } from 'lucide-react';

export default function PrescriptionListInput({
    label,
    items,
    onChange,
    inventory = [], // List of { id, name, stock, ... }
    onAddNewMedicine // Function(name) -> void (opens modal)
}) {
    // Ensure items is always an array
    const inputPrefix = useId();
    const listItems = Array.isArray(items) ? items : [];
    const [focusedIndex, setFocusedIndex] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const containerRef = useRef(null);

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setFocusedIndex(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleAdd = () => {
        onChange([...listItems, { name: '', dosage: '', frequency: '', duration: '', notes: '' }]);
    };

    const handleRemove = (index) => {
        const newItems = listItems.filter((_, i) => i !== index);
        onChange(newItems);
    };

    const handleChange = (index, field, value) => {
        const newItems = [...listItems];
        newItems[index] = changePrescription(newItems[index], field, value);
        onChange(newItems);

        // Update suggestions if name changes
        if (field === 'name') {
            updateSuggestions(value);
        }
    };

    const updateSuggestions = (query) => {
        if (!query) {
            setSuggestions([]);
            return;
        }
        const filtered = inventory.filter(item =>
            item.name.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 5); // Limit to 5 suggestions
        setSuggestions(filtered);
    };

    const handleFocus = (index, value) => {
        setFocusedIndex(index);
        updateSuggestions(value);
    };

    const handleSelectSuggestion = (index, item) => {
        const newItems = [...listItems];
        newItems[index] = {
            ...newItems[index],
            name: item.name,
            inventoryId: item.id  // Store the inventory ID
        };
        onChange(newItems);
        setFocusedIndex(null);
    };

    const handleAddNew = (index, name) => {
        onAddNewMedicine(name, index);
        setFocusedIndex(null);
    };

    return (
        <div className="space-y-4" ref={containerRef}>
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
                        <div key={index} className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 shadow-sm relative animate-in fade-in slide-in-from-top-2 duration-200">
                            <button
                                type="button"
                                onClick={() => handleRemove(index)}
                                className="absolute top-1 right-1 p-2 text-slate-500 hover:text-red-600 transition-colors"
                                aria-label={"Remove medicine " + (index + 1)}
                            >
                                <Trash2 size={18} />
                            </button>

                            <div className="prescription-fields grid grid-cols-1 md:grid-cols-12 gap-4 pr-5">
                                {/* Medication Name with Autocomplete */}
                                <div className="md:col-span-4 space-y-1 relative">
                                    <label htmlFor={inputPrefix + index + "-name"} className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
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
                                            id={inputPrefix + index + "-name"}
                                        value={item.name || ''}
                                            onChange={(e) => handleChange(index, 'name', e.target.value)}
                                            onFocus={(e) => handleFocus(index, e.target.value)}
                                            autoComplete="off"
                                        />
                                    </div>

                                    {/* Suggestions Dropdown */}
                                    {focusedIndex === index && (item.name && (suggestions.length > 0 || item.name)) && (
                                        <div className="absolute z-10 w-full bg-white mt-1 border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                            {suggestions.map(suggestion => (
                                                <button
                                                    key={suggestion.id}
                                                    type="button"
                                                    className="w-full text-left px-4 py-2 hover:bg-indigo-50 flex items-center justify-between group transition-colors"
                                                    onClick={() => handleSelectSuggestion(index, suggestion)}
                                                >
                                                    <span className="font-medium text-slate-700 group-hover:text-indigo-700">{suggestion.name}</span>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${Number(suggestion.stock) <= 5 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                                                        {suggestion.stock} {suggestion.unit}
                                                    </span>
                                                </button>
                                            ))}

                                            {/* Add New Option */}
                                            {onAddNewMedicine && (!suggestions.some(s => s.name.toLowerCase() === item.name.toLowerCase())) && (
                                                <button
                                                    type="button"
                                                    className="w-full text-left px-4 py-2 hover:bg-indigo-50 text-indigo-600 font-medium flex items-center gap-2 border-t border-slate-100"
                                                    onClick={() => handleAddNew(index, item.name)}
                                                >
                                                    <Plus size={16} />
                                                    Add "{item.name}" to Inventory
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Quantity */}
                                <div className="md:col-span-2 space-y-1">
                                    <label htmlFor={inputPrefix + index + "-quantity"} className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        Dispensed qty
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="10"
                                        min="0"
                                        step="any"
                                        aria-label="Medicine quantity"
                                        className="input py-2 text-sm w-full font-bold text-slate-800"
                                        id={inputPrefix + index + "-quantity"}
                                        value={item.quantity || ''}
                                        onChange={(e) => handleChange(index, 'quantity', e.target.value)}
                                    />
                                </div>

                                {/* Dosage */}
                                <div className="md:col-span-2 space-y-1">
                                    <label htmlFor={inputPrefix + index + "-dosage"} className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        Dosage
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="500mg"
                                        className="input py-2 text-sm w-full"
                                        id={inputPrefix + index + "-dosage"}
                                        value={item.dosage || ''}
                                        onChange={(e) => handleChange(index, 'dosage', e.target.value)}
                                    />
                                </div>

                                {/* Frequency */}
                                <div className="md:col-span-2 space-y-1">
                                    <label htmlFor={inputPrefix + index + "-frequency"} className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        Frequency
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="1-0-1"
                                        className="input py-2 text-sm w-full"
                                        id={inputPrefix + index + "-frequency"}
                                        value={item.frequency || ''}
                                        onChange={(e) => handleChange(index, 'frequency', e.target.value)}
                                    />
                                </div>

                                {/* Duration */}
                                <div className="md:col-span-2 space-y-1">
                                    <label htmlFor={inputPrefix + index + "-duration"} className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        Duration
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="5 Days"
                                        className="input py-2 text-sm w-full"
                                        id={inputPrefix + index + "-duration"}
                                        value={item.duration || ''}
                                        onChange={(e) => handleChange(index, 'duration', e.target.value)}
                                    />
                                </div>

                                {/* Notes */}
                                <div className="md:col-span-12 space-y-1">
                                    <label htmlFor={inputPrefix + index + "-notes"} className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        Notes / Instructions
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Take with warm water"
                                        className="input py-2 text-sm w-full text-slate-600"
                                        id={inputPrefix + index + "-notes"}
                                        value={item.notes || ''}
                                        onChange={(e) => handleChange(index, 'notes', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="py-2 text-slate-600 text-sm">
                        No prescriptions added. Click "Add Prescription" to start.
                    </div>
                )}
            </div>
        </div>
    );
}
