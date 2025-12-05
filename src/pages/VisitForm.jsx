import React, { useState, useEffect, useRef } from 'react';
import { db } from '../config/firebase';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Save, Mic, MicOff, ArrowLeft } from 'lucide-react';
import PrescriptionListInput from '../components/PrescriptionListInput';

export default function VisitForm() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const initialPatientId = searchParams.get('patientId') || '';
    const followupId = searchParams.get('followupId'); // Get followupId from URL

    const [patients, setPatients] = useState([]);
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

    const handlePrescriptionsChange = (newPrescriptions) => {
        setFormData(prev => ({ ...prev, prescriptions: newPrescriptions }));
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
                createdAt: serverTimestamp()
            });

            // If next visit date is set, create a follow-up
            if (formData.nextVisitDate) {
                await addDoc(collection(db, 'followups'), {
                    patientId: formData.patientId,
                    visitId: visitRef.id,
                    date: formData.nextVisitDate,
                    time: formData.nextVisitTime || '', // Save time
                    status: 'pending',
                    notes: `Scheduled from visit on ${formData.date}`
                });
            }

            // Mark triggering follow-up as completed (if any)
            if (followupId) {
                const followupRef = doc(db, 'followups', followupId);
                await updateDoc(followupRef, {
                    status: 'completed'
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

                {/* Prescription Section */}
                <div className="border-t border-slate-100 pt-6">
                    <PrescriptionListInput
                        label="Prescriptions"
                        items={formData.prescriptions}
                        onChange={handlePrescriptionsChange}
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
        </div>
    );
}
