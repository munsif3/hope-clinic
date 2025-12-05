import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { Package, Plus, AlertTriangle, Edit, Trash2, Search } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';
import Loader from '../components/Loader';

export default function Inventory() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

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

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-3xl font-bold text-slate-800">Inventory</h1>
                <Link to="/inventory/new" className="btn btn-primary flex items-center gap-2 text-lg">
                    <Plus size={24} />
                    Add Item
                </Link>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search size={20} />
                </div>
                <input
                    type="text"
                    placeholder="Search inventory..."
                    className="input pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {loading ? (
                <Loader text="Loading inventory..." />
            ) : (
                <div className="grid gap-4">
                    {filteredItems.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 text-lg">
                            {searchTerm ? 'No items match your search.' : 'No items in inventory.'}
                        </div>
                    ) : (
                        filteredItems.map(item => (
                            <div key={item.id} className={`card p-5 flex flex-col md:flex-row justify-between items-center gap-4 hover:shadow-lg transition-all duration-300 ${isLowStock(item) ? 'border-amber-300 bg-amber-50/50' : 'bg-white'}`}>
                                <div className="flex-1 w-full">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-xl font-bold text-slate-800">{item.name}</h3>
                                        {isLowStock(item) && (
                                            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 border border-amber-200">
                                                <AlertTriangle size={12} /> Low Stock
                                            </span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                            <p className="text-slate-500 text-xs uppercase font-bold">Stock</p>
                                            <p className="text-slate-800 font-bold text-lg">{item.stock} <span className="text-sm font-normal text-slate-500">{item.unit}</span></p>
                                        </div>
                                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                            <p className="text-slate-500 text-xs uppercase font-bold">Price</p>
                                            <p className="text-slate-800 font-bold text-lg">{formatCurrency(item.sellingPrice)}</p>
                                        </div>
                                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                            <p className="text-slate-500 text-xs uppercase font-bold">Cost</p>
                                            <p className="text-slate-600 font-medium">{formatCurrency(item.cost)}</p>
                                        </div>
                                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                            <p className="text-slate-500 text-xs uppercase font-bold">Supplier</p>
                                            <p className="text-slate-600 font-medium truncate">{item.supplier || '-'}</p>
                                        </div>
                                    </div>
                                    {item.expiryDate && (
                                        <div className={`mt-2 text-xs font-medium flex items-center gap-1 ${isExpiring(item.expiryDate) ? 'text-red-600' : 'text-slate-400'}`}>
                                            <span>Expires: {formatDate(item.expiryDate)}</span>
                                            {isExpiring(item.expiryDate) && <span className="bg-red-100 text-red-600 px-1.5 rounded text-[10px] font-bold">EXPIRING SOON</span>}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 border-slate-100 pt-3 md:pt-0 mt-2 md:mt-0">
                                    <Link to={`/inventory/${item.id}/edit`} className="p-2 text-slate-400 hover:text-primary hover:bg-indigo-50 rounded-lg transition-colors">
                                        <Edit size={20} />
                                    </Link>
                                    <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                        <Trash2 size={20} />
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
