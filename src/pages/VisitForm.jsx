import React, { useState, useEffect, useRef } from 'react';
import { db } from '../config/firebase';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, doc, updateDoc, writeBatch, increment, getDoc, setDoc } from 'firebase/firestore';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { Save, Mic, MicOff, ArrowLeft } from 'lucide-react';
import PrescriptionListInput from '../components/PrescriptionListInput';
import InventoryQuickAddModal from '../components/InventoryQuickAddModal';
import InvestigationListInput from '../components/InvestigationListInput';
import { useToast } from '../contexts/ToastContext';

export default function VisitForm() {
    const { id } = useParams(); // Visit ID for editing
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const initialPatientId = searchParams.get('patientId') || '';
    const followupId = searchParams.get('followupId'); // Get followupId from URL
    const { showToast } = useToast();

    const [patients, setPatients] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [isAddMedicineModalOpen, setIsAddMedicineModalOpen] = useState(false);
    const [newMedicineName, setNewMedicineName] = useState('');

    // Ref to store original prescriptions for inventory adjustment
    const originalPrescriptionsRef = useRef([]);

    const [formData, setFormData] = useState({
        patientId: initialPatientId,

        date: (() => {
            const d = new Date();
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        })(),
        time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        complaint: '',
        diagnosis: '',
        notes: '',
        prescriptions: [], // Array of prescription objects
        investigations: [], // Array of strings
        consultationFee: '',
        medicineFee: '',
        nextVisitDate: '',
        nextVisitTime: '' // New field for time
    });

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
            fetchInventory();

            // Fetch Visit if Editing
            if (id) {
                try {
                    const visitDoc = await getDoc(doc(db, 'visits', id));
                    if (visitDoc.exists()) {
                        const data = visitDoc.data();
                        setFormData({ ...data, id: visitDoc.id });
                        // Deep copy prescriptions to avoid reference issues
                        originalPrescriptionsRef.current = JSON.parse(JSON.stringify(data.prescriptions || []));
                    } else {
                        showToast("Visit not found!", "error");
                        navigate('/patients');
                    }
                } catch (error) {
                    console.error("Error fetching visit:", error);
                    showToast("Error fetching visit details", "error");
                }
            }
        };
        fetchData();

        // Speech Recognition Setup
        if ('webkitSpeechRecognition' in window) {
            const recognition = new window.webkitSpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onresult = (event) => {
                let interimTranscript = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }

                if (finalTranscript) {
                    setFormData(prev => ({
                        ...prev,
                        notes: (prev.notes + ' ' + finalTranscript).trim()
                    }));
                }
            };
            recognitionRef.current = recognition;
        }
    }, [id, navigate, showToast]);

    const fetchInventory = async () => {
        const qInventory = query(collection(db, 'inventory'), orderBy('name'));
        const snapInventory = await getDocs(qInventory);
        setInventory(snapInventory.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };

    const toggleListening = () => {
        if (!recognitionRef.current) {
            showToast("Speech recognition not supported in this browser.", "error");
            return;
        }
        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handlePrescriptionsChange = (newPrescriptions) => {
        setFormData(prev => ({ ...prev, prescriptions: newPrescriptions }));
    };

    const handleInvestigationsChange = (newInvestigations) => {
        setFormData(prev => ({ ...prev, investigations: newInvestigations }));
    };

    const handleOpenAddMedicine = (name) => {
        setNewMedicineName(name);
        setIsAddMedicineModalOpen(true);
    };

    const handleMedicineAdded = (newItem) => {
        setInventory(prev => [...prev, newItem].sort((a, b) => a.name.localeCompare(b.name)));
        showToast(`Added ${newItem.name} to inventory`, "success");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const totalCost = Number(formData.consultationFee || 0) + Number(formData.medicineFee || 0);
            const batch = writeBatch(db);

            // Determine if creating or updating
            const visitRef = id ? doc(db, 'visits', id) : doc(collection(db, 'visits'));

            const visitData = {
                ...formData,
                consultationFee: Number(formData.consultationFee),
                medicineFee: Number(formData.medicineFee),
                cost: totalCost,
                updatedAt: serverTimestamp()
            };

            if (!id) {
                visitData.createdAt = serverTimestamp();
            }

            // Add/Update Visit to Batch
            batch.set(visitRef, visitData, { merge: true });

            // Handle Inventory Stock Logic
            if (id) {
                // If Editing: Revert ORIGINAL prescriptions first
                for (const oldPrescription of originalPrescriptionsRef.current) {
                    if (oldPrescription.inventoryId && oldPrescription.quantity) {
                        const inventoryRef = doc(db, 'inventory', oldPrescription.inventoryId);
                        batch.update(inventoryRef, {
                            stock: increment(Number(oldPrescription.quantity))
                        });
                    }
                }
            }

            // Then Apply NEW prescriptions (Deduct stock)
            for (const prescription of formData.prescriptions) {
                if (prescription.inventoryId && prescription.quantity) {
                    const inventoryRef = doc(db, 'inventory', prescription.inventoryId);
                    batch.update(inventoryRef, {
                        stock: increment(-Number(prescription.quantity))
                    });
                }
            }

            // Triggering Follow-up Logic (Only for new visits)
            if (!id && formData.nextVisitDate) {
                const followupRef = doc(collection(db, 'followups'));
                batch.set(followupRef, {
                    patientId: formData.patientId,
                    visitId: visitRef.id,
                    date: formData.nextVisitDate,
                    time: formData.nextVisitTime || '',
                    status: 'pending',
                    notes: `Scheduled from visit on ${formData.date}`
                });
            }

            // Mark triggering follow-up as completed (only if new visit from follow-up)
            if (!id && followupId) {
                const followupRef = doc(db, 'followups', followupId);
                batch.update(followupRef, {
                    status: 'completed'
                });
            }

            // Commit all changes
            await batch.commit();

            showToast("Visit saved successfully!", "success");
            navigate(`/patients/${formData.patientId}`);
        } catch (error) {
            console.error("Error saving visit:", error);
            showToast("Failed to save visit.", "error");
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
                <h1 className="text-3xl font-bold text-slate-800">{id ? 'Edit Visit' : 'New Visit'}</h1>
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

                {/* Investigations Section */}
                <div className="border-t border-slate-100 pt-6">
                    <InvestigationListInput
                        label="Investigations / Labs"
                        items={formData.investigations}
                        onChange={handleInvestigationsChange}
                    />
                </div>

                {/* Prescription Section */}
                <div className="border-t border-slate-100 pt-6">
                    <PrescriptionListInput
                        label="Prescriptions"
                        items={formData.prescriptions}
                        onChange={handlePrescriptionsChange}
                        inventory={inventory}
                        onAddNewMedicine={handleOpenAddMedicine}
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

                {/* Next Visit Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="block text-lg font-medium text-slate-700">Next Scheduled Visit (Date)</label>
                        <input
                            type="date"
                            name="nextVisitDate"
                            value={formData.nextVisitDate}
                            onChange={handleChange}
                            className="input"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-lg font-medium text-slate-700">Time (Optional)</label>
                        <input
                            type="time"
                            name="nextVisitTime"
                            value={formData.nextVisitTime}
                            onChange={handleChange}
                            className="input"
                        />
                    </div>
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

            <InventoryQuickAddModal
                isOpen={isAddMedicineModalOpen}
                onClose={() => setIsAddMedicineModalOpen(false)}
                initialName={newMedicineName}
                onAdded={handleMedicineAdded}
            />
        </div>
    );
}
