import React, { useState, useEffect, useRef } from 'react';
import { db } from '../config/firebase';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Save, Mic, MicOff, ArrowLeft, Plus, Trash2 } from 'lucide-react';

export default function VisitForm() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const initialPatientId = searchParams.get('patientId') || '';

    const [patients, setPatients] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [formData, setFormData] = useState({
        patientId: initialPatientId,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        complaint: '',
        diagnosis: '',
        notes: '',
        prescription: '',
        consultationFee: '',
        medicineFee: '',
        nextVisitDate: ''
    });

    // Medicine Selection State
    const [selectedMedicines, setSelectedMedicines] = useState([]);
    const [currentMedId, setCurrentMedId] = useState('');
    const [currentMedQty, setCurrentMedQty] = useState(1);
    const [showNewMedForm, setShowNewMedForm] = useState(false);
    const [newMedData, setNewMedData] = useState({ name: '', sellingPrice: '', stock: '100', unit: 'pcs' });

    const [loading, setLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef(null);

    useEffect(() => {
        const fetchData = async () => {
            // Fetch Patients
            const qPatients = query(collection(db, 'patients'), orderBy('name'));
            const snapPatients = await getDocs(qPatients);
            setPatients(snapPatients.docs.map(doc => ({ id: doc.id, ...doc.data() })));

            // Fetch Inventory
            const qInventory = query(collection(db, 'inventory'), orderBy('name'));
            const snapInventory = await getDocs(qInventory);
            setInventory(snapInventory.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        };
        fetchData();

        // Setup Speech Recognition
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;

            recognitionRef.current.onresult = (event) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                if (finalTranscript) {
                    setFormData(prev => ({
                        ...prev,
                        notes: prev.notes + (prev.notes ? ' ' : '') + finalTranscript
                    }));
                }
            };
        }
    }, []);

    // Update Medicine Fee when selected medicines change
    useEffect(() => {
        const totalMedCost = selectedMedicines.reduce((sum, item) => sum + (item.price * item.qty), 0);
        setFormData(prev => ({ ...prev, medicineFee: totalMedCost }));

        // Auto-generate prescription text from selected medicines
        if (selectedMedicines.length > 0) {
            const prescriptionText = selectedMedicines.map(m => `${m.name} - ${m.qty} ${m.unit}`).join('\n');
            setFormData(prev => ({ ...prev, prescription: prescriptionText }));
        }
    }, [selectedMedicines]);

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddMedicine = () => {
        if (!currentMedId) return;
        const med = inventory.find(i => i.id === currentMedId);
        if (med) {
            setSelectedMedicines(prev => [
                ...prev,
                {
                    id: med.id,
                    name: med.name,
                    price: Number(med.sellingPrice || 0),
                    unit: med.unit,
                    qty: Number(currentMedQty)
                }
            ]);
            setCurrentMedId('');
            setCurrentMedQty(1);
        }
    };

    const handleRemoveMedicine = (index) => {
        setSelectedMedicines(prev => prev.filter((_, i) => i !== index));
    };

    const handleAddNewInventoryItem = async () => {
        if (!newMedData.name) return;
        try {
            const docRef = await addDoc(collection(db, 'inventory'), {
                ...newMedData,
                stock: Number(newMedData.stock),
                sellingPrice: Number(newMedData.sellingPrice),
                createdAt: serverTimestamp()
            });

            const newItem = { id: docRef.id, ...newMedData, sellingPrice: Number(newMedData.sellingPrice) };
            setInventory(prev => [...prev, newItem].sort((a, b) => a.name.localeCompare(b.name)));

            // Select the new item immediately
            setCurrentMedId(docRef.id);
            setShowNewMedForm(false);
            setNewMedData({ name: '', sellingPrice: '', stock: '100', unit: 'pcs' });
        } catch (error) {
            console.error("Error adding new inventory item:", error);
            alert("Failed to add new item.");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const totalCost = Number(formData.consultationFee || 0) + Number(formData.medicineFee || 0);

            // Create Visit Document
            const visitRef = await addDoc(collection(db, 'visits'), {
                ...formData,
                consultationFee: Number(formData.consultationFee),
                medicineFee: Number(formData.medicineFee),
                cost: totalCost,
                selectedMedicines, // Store structured medicine data too
                createdAt: serverTimestamp()
            });

            // Update Inventory Stock
            for (const med of selectedMedicines) {
                if (med.id) {
                    const medRef = doc(db, 'inventory', med.id);
                    await updateDoc(medRef, {
                        stock: increment(-med.qty)
                    });
                }
            }

            // If next visit date is set, create a follow-up
            if (formData.nextVisitDate) {
                await addDoc(collection(db, 'followups'), {
                    patientId: formData.patientId,
                    visitId: visitRef.id,
                    date: formData.nextVisitDate,
                    status: 'pending',
                    notes: `Scheduled from visit on ${formData.date}`
                });
            }

            navigate(`/patients/${formData.patientId}`);
        } catch (error) {
            console.error("Error saving visit:", error);
            alert("Failed to save visit.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full">
                    <ArrowLeft size={28} />
                </button>
                <h1 className="text-3xl font-bold text-slate-800">New Visit</h1>
            </div>

            <form onSubmit={handleSubmit} className="card p-8 space-y-8">
                {/* Patient & Date Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="block text-lg font-medium text-slate-700">Patient</label>
                        <select
                            name="patientId"
                            value={formData.patientId}
                            onChange={handleChange}
                            required
                            className="input"
                            disabled={!!initialPatientId}
                        >
                            <option value="">Select Patient</option>
                            {patients.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-lg font-medium text-slate-700">Date</label>
                            <input
                                type="date"
                                name="date"
                                value={formData.date}
                                onChange={handleChange}
                                required
                                className="input"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-lg font-medium text-slate-700">Time</label>
                            <input
                                type="time"
                                name="time"
                                value={formData.time}
                                onChange={handleChange}
                                required
                                className="input"
                            />
                        </div>
                    </div>
                </div>

                {/* Clinical Details */}
                <div className="space-y-2">
                    <label className="block text-lg font-medium text-slate-700">Chief Complaint</label>
                    <textarea
                        name="complaint"
                        value={formData.complaint}
                        onChange={handleChange}
                        rows="2"
                        className="input resize-none"
                        placeholder="Patient's main complaint..."
                    />
                </div>

                <div className="space-y-2">
                    <label className="block text-lg font-medium text-slate-700">Diagnosis</label>
                    <input
                        type="text"
                        name="diagnosis"
                        value={formData.diagnosis}
                        onChange={handleChange}
                        required
                        className="input"
                        placeholder="e.g. Viral Fever"
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="block text-lg font-medium text-slate-700">Notes / Improvements (Speech-to-Text)</label>
                        <button
                            type="button"
                            onClick={toggleListening}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-colors ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            {isListening ? <><MicOff size={18} /> Stop Listening</> : <><Mic size={18} /> Start Listening</>}
                        </button>
                    </div>
                    <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        rows="4"
                        className="input resize-none"
                        placeholder="Clinical notes, improvements since last visit..."
                    />
                </div>

                {/* Medicine Selection Section */}
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold text-slate-800">Medicines from Inventory</h3>
                        <button
                            type="button"
                            onClick={() => setShowNewMedForm(!showNewMedForm)}
                            className="text-primary font-bold hover:underline"
                        >
                            {showNewMedForm ? 'Cancel New Item' : '+ Add New Item to Inventory'}
                        </button>
                    </div>

                    {showNewMedForm && (
                        <div className="bg-white p-4 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div className="space-y-1">
                                <label className="text-sm font-medium">Name</label>
                                <input
                                    className="input"
                                    value={newMedData.name}
                                    onChange={e => setNewMedData({ ...newMedData, name: e.target.value })}
                                    placeholder="Medicine Name"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium">Selling Price</label>
                                <input
                                    className="input"
                                    type="number"
                                    value={newMedData.sellingPrice}
                                    onChange={e => setNewMedData({ ...newMedData, sellingPrice: e.target.value })}
                                    placeholder="Price"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium">Unit</label>
                                <input
                                    className="input"
                                    value={newMedData.unit}
                                    onChange={e => setNewMedData({ ...newMedData, unit: e.target.value })}
                                    placeholder="e.g. pcs"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleAddNewInventoryItem}
                                className="btn btn-primary h-[46px]"
                            >
                                Add to Inventory
                            </button>
                        </div>
                    )}

                    <div className="flex gap-4 items-end">
                        <div className="flex-1 space-y-1">
                            <label className="text-sm font-medium text-slate-600">Select Medicine</label>
                            <select
                                className="input"
                                value={currentMedId}
                                onChange={(e) => setCurrentMedId(e.target.value)}
                            >
                                <option value="">Choose medicine...</option>
                                {inventory.map(item => (
                                    <option key={item.id} value={item.id}>
                                        {item.name} (Stock: {item.stock}) - Rs.{item.sellingPrice}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="w-24 space-y-1">
                            <label className="text-sm font-medium text-slate-600">Qty</label>
                            <input
                                type="number"
                                className="input"
                                value={currentMedQty}
                                onChange={(e) => setCurrentMedQty(Number(e.target.value))}
                                min="1"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleAddMedicine}
                            className="btn btn-secondary h-[46px]"
                            disabled={!currentMedId}
                        >
                            Add
                        </button>
                    </div>

                    {selectedMedicines.length > 0 && (
                        <div className="space-y-2">
                            {selectedMedicines.map((item, index) => (
                                <div key={index} className="flex justify-between items-center bg-white p-3 rounded border border-slate-200">
                                    <span>{item.name} x {item.qty} {item.unit}</span>
                                    <div className="flex items-center gap-4">
                                        <span className="font-bold">Rs.{item.price * item.qty}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveMedicine(index)}
                                            className="text-red-500 hover:bg-red-50 p-1 rounded"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="block text-lg font-medium text-slate-700">Prescription (Auto-filled)</label>
                    <textarea
                        name="prescription"
                        value={formData.prescription}
                        onChange={handleChange}
                        rows="4"
                        className="input resize-none"
                        placeholder="Medications and dosage..."
                    />
                </div>

                {/* Fees Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="space-y-2">
                        <label className="block text-lg font-medium text-slate-700">Consultation Fee (Rs.)</label>
                        <input
                            type="number"
                            name="consultationFee"
                            value={formData.consultationFee}
                            onChange={handleChange}
                            className="input"
                            placeholder="0"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-lg font-medium text-slate-700">Medicine Fee (Rs.)</label>
                        <input
                            type="number"
                            name="medicineFee"
                            value={formData.medicineFee}
                            onChange={handleChange}
                            className="input"
                            placeholder="0"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-lg font-medium text-slate-700">Total Cost (Rs.)</label>
                        <div className="input bg-slate-100 flex items-center font-bold text-xl text-slate-800">
                            {Number(formData.consultationFee || 0) + Number(formData.medicineFee || 0)}
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-lg font-medium text-slate-700">Next Scheduled Visit</label>
                    <input
                        type="date"
                        name="nextVisitDate"
                        value={formData.nextVisitDate}
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
                        {loading ? 'Saving Visit...' : 'Save Visit Record'}
                    </button>
                </div>
            </form>
        </div>
    );
}
