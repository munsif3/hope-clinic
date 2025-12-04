import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { Package, Plus, AlertTriangle, Edit, Trash2 } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function Inventory() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInventory();
    }, []);

    const fetchInventory = async () => {
        try {
            const q = query(collection(db, 'inventory'), orderBy('name'));
            const querySnapshot = await getDocs(q);
            const itemsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setItems(itemsData);
        } catch (error) {
            console.error("Error fetching inventory:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this item?")) {
            try {
                await deleteDoc(doc(db, 'inventory', id));
                fetchInventory();
            } catch (error) {
                console.error("Error deleting item:", error);
            }
        }
    };

    const isLowStock = (item) => {
        return Number(item.stock) <= Number(item.lowStockThreshold || 5);
    };

    const isExpiring = (dateStr) => {
        if (!dateStr) return false;
        const today = new Date();
        const expiry = new Date(dateStr);
        const diffTime = expiry - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 30; // Expiring in 30 days
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-800">Inventory</h1>
                <Link to="/inventory/new" className="btn btn-primary flex items-center gap-2 text-lg">
                    <Plus size={24} />
                    Add Item
                </Link>
            </div>

            {loading ? (
                <div className="text-center py-8 text-xl text-slate-500">Loading inventory...</div>
            ) : (
                <div className="grid gap-4">
                    {items.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-lg">
                            No items in inventory.
                        </div>
                    ) : (
                        items.map(item => (
                            <div key={item.id} className={`card p-6 flex flex-col md:flex-row justify-between items-center gap-4 hover:shadow-md transition-shadow ${isLowStock(item) ? 'border-amber-300 bg-amber-50' : ''}`}>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-xl font-bold text-slate-800">{item.name}</h3>
                                        {isLowStock(item) && (
                                            <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-sm font-bold flex items-center gap-1">
                                                <AlertTriangle size={16} /> Low Stock
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-slate-600 mt-1 flex flex-wrap gap-4">
                                        <span>Stock: <strong className="text-slate-800">{item.stock} {item.unit}</strong></span>
                                        <span>Cost: <strong>{formatCurrency(item.cost)}</strong></span>
                                        <span>Sell: <strong>{formatCurrency(item.sellingPrice)}</strong></span>
                                        <span>Supplier: {item.supplier}</span>
                                    </div>
                                    {item.expiryDate && (
                                        <div className={`mt-1 text-sm font-medium ${isExpiring(item.expiryDate) ? 'text-red-600' : 'text-slate-500'}`}>
                                            Expires: {formatDate(item.expiryDate)}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-3">
                                    <Link to={`/inventory/${item.id}/edit`} className="p-2 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-full">
                                        <Edit size={24} />
                                    </Link>
                                    <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-full">
                                        <Trash2 size={24} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
