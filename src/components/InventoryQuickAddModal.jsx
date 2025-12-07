import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { db } from '../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function InventoryQuickAddModal({ isOpen, onClose, initialName, onAdded }) {
    const [formData, setFormData] = useState({
        name: initialName || '',
        stock: '0',
        unit: 'tablets',
        sellingPrice: '',
        cost: '',
        supplier: '',
        expiryDate: ''
    });
    const [loading, setLoading] = useState(false);

    // Update name if initialName changes
    React.useEffect(() => {
        if (initialName) {
            setFormData(prev => ({ ...prev, name: initialName }));
        }
    }, [initialName]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const docRef = await addDoc(collection(db, 'inventory'), {
                ...formData,
                stock: Number(formData.stock),
                sellingPrice: Number(formData.sellingPrice),
                cost: Number(formData.cost),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            onAdded({ id: docRef.id, ...formData });
            onClose();
            // Reset form minimally (name stays empty until filled again)
            setFormData({
                name: '',
                stock: '0',
                unit: 'tablets',
                sellingPrice: '',
                cost: '',
                supplier: '',
                expiryDate: ''
            });
        } catch (error) {
            console.error("Error adding inventory item:", error);
            alert("Failed to add item.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-xl font-bold text-slate-800">Add New Medicine</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-700">Medicine Name</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="input w-full"
                            placeholder="e.g. Dolo 650"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-700">Current Stock</label>
                            <input
                                type="number"
                                name="stock"
                                value={formData.stock}
                                onChange={handleChange}
                                required
                                className="input w-full"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-700">Unit</label>
                            <input
                                list="units"
                                name="unit"
                                value={formData.unit}
                                onChange={handleChange}
                                className="input w-full"
                                placeholder="e.g. tablets"
                            />
                            <datalist id="units">
                                <option value="tablets" />
                                <option value="capsules" />
                                <option value="bottles" />
                                <option value="injections" />
                                <option value="creams" />
                                <option value="sachets" />
                                <option value="ml" />
                                <option value="strips" />
                            </datalist>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-700">Selling Price (₹)</label>
                            <input
                                type="number"
                                name="sellingPrice"
                                value={formData.sellingPrice}
                                onChange={handleChange}
                                required
                                className="input w-full"
                                placeholder="0.00"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-700">Cost (₹)</label>
                            <input
                                type="number"
                                name="cost"
                                value={formData.cost}
                                onChange={handleChange}
                                className="input w-full"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary flex items-center gap-2"
                        >
                            <Save size={18} />
                            {loading ? 'Adding...' : 'Add Medicine'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
