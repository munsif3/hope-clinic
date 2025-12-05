import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft } from 'lucide-react';
import Loader from '../components/Loader';

export default function InventoryForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!id;

    const [formData, setFormData] = useState({
        name: '',
        stock: '',
        unit: 'pcs',
        cost: '',
        sellingPrice: '',
        supplier: '',
        expiryDate: '',
        lowStockThreshold: '5'
    });
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(isEditMode);

    useEffect(() => {
        if (isEditMode) {
            const fetchItem = async () => {
                try {
                    const docRef = doc(db, 'inventory', id);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        setFormData(docSnap.data());
                    } else {
                        navigate('/inventory');
                    }
                } catch (error) {
                    console.error("Error fetching item:", error);
                } finally {
                    setInitialLoading(false);
                }
            };
            fetchItem();
        }
    }, [id, isEditMode, navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const data = {
                ...formData,
                stock: Number(formData.stock),
                cost: Number(formData.cost),
                sellingPrice: Number(formData.sellingPrice),
                lowStockThreshold: Number(formData.lowStockThreshold)
            };

            if (isEditMode) {
                await updateDoc(doc(db, 'inventory', id), {
                    ...data,
                    updatedAt: serverTimestamp()
                });
            } else {
                await addDoc(collection(db, 'inventory'), {
                    ...data,
                    createdAt: serverTimestamp()
                });
            }

            navigate('/inventory');
        } catch (error) {
            console.error("Error saving item:", error);
            alert("Failed to save item.");
        } finally {
            setLoading(false);
        }
    };



    if (initialLoading) {
        return <Loader text="Loading item..." />;
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full">
                    <ArrowLeft size={28} />
                </button>
                <h1 className="text-3xl font-bold text-slate-800">
                    {isEditMode ? 'Edit Item' : 'New Item'}
                </h1>
            </div>

            <form onSubmit={handleSubmit} className="card p-8 space-y-6">
                <div className="space-y-2">
                    <label className="block text-lg font-medium text-slate-700">Item Name</label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="input"
                        placeholder="e.g. Paracetamol 500mg"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="block text-lg font-medium text-slate-700">Current Stock</label>
                        <input
                            type="number"
                            name="stock"
                            value={formData.stock}
                            onChange={handleChange}
                            required
                            className="input"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-lg font-medium text-slate-700">Unit</label>
                        <input
                            type="text"
                            name="unit"
                            value={formData.unit}
                            onChange={handleChange}
                            className="input"
                            placeholder="pcs, strips, bottles"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="block text-lg font-medium text-slate-700">Cost (Rs.)</label>
                        <input
                            type="number"
                            name="cost"
                            value={formData.cost}
                            onChange={handleChange}
                            className="input"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-lg font-medium text-slate-700">Selling Price (Rs.)</label>
                        <input
                            type="number"
                            name="sellingPrice"
                            value={formData.sellingPrice}
                            onChange={handleChange}
                            className="input"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="block text-lg font-medium text-slate-700">Low Stock Threshold</label>
                        <input
                            type="number"
                            name="lowStockThreshold"
                            value={formData.lowStockThreshold}
                            onChange={handleChange}
                            className="input"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-lg font-medium text-slate-700">Supplier</label>
                    <input
                        type="text"
                        name="supplier"
                        value={formData.supplier}
                        onChange={handleChange}
                        className="input"
                        placeholder="Supplier Name"
                    />
                </div>

                <div className="space-y-2">
                    <label className="block text-lg font-medium text-slate-700">Expiry Date</label>
                    <input
                        type="date"
                        name="expiryDate"
                        value={formData.expiryDate}
                        onChange={handleChange}
                        className="input"
                    />
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary w-full md:w-auto flex items-center justify-center gap-2 text-lg"
                    >
                        <Save size={24} />
                        {loading ? 'Saving...' : 'Save Item'}
                    </button>
                </div>
            </form>
        </div>
    );
}
