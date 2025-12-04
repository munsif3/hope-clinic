import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft } from 'lucide-react';

export default function PatientForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!id;

    const [formData, setFormData] = useState({
        name: '',
        age: '',
        gender: 'Male',
        contact: '',
        address: '',
        medicalHistory: '',
        familyHistory: '',
        ongoingMedications: ''
    });
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(isEditMode);

    useEffect(() => {
        if (isEditMode) {
            const fetchPatient = async () => {
                try {
                    const docRef = doc(db, 'patients', id);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        setFormData(docSnap.data());
                    } else {
                        console.error("No such patient!");
                        navigate('/patients');
                    }
                } catch (error) {
                    console.error("Error fetching patient:", error);
                } finally {
                    setInitialLoading(false);
                }
            };
            fetchPatient();
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
            if (isEditMode) {
                await updateDoc(doc(db, 'patients', id), {
                    ...formData,
                    updatedAt: serverTimestamp()
                });
            } else {
                await addDoc(collection(db, 'patients'), {
                    ...formData,
                    createdAt: serverTimestamp()
                });
            }

            navigate('/patients');
        } catch (error) {
            console.error("Error saving patient:", error);
            alert("Failed to save patient. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return <div className="p-8 text-xl text-slate-500">Loading patient data...</div>;
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full">
                    <ArrowLeft size={28} />
                </button>
                <h1 className="text-3xl font-bold text-slate-800">
                    {isEditMode ? 'Edit Patient' : 'New Patient'}
                </h1>
            </div>

            <form onSubmit={handleSubmit} className="card p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="block text-lg font-medium text-slate-700">Full Name</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="input"
                            placeholder="e.g. John Doe"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-lg font-medium text-slate-700">Age</label>
                            <input
                                type="number"
                                name="age"
                                value={formData.age}
                                onChange={handleChange}
                                required
                                className="input"
                                placeholder="e.g. 65"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-lg font-medium text-slate-700">Gender</label>
                            <select
                                name="gender"
                                value={formData.gender}
                                onChange={handleChange}
                                className="input"
                            >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-lg font-medium text-slate-700">Contact Number</label>
                        <input
                            type="tel"
                            name="contact"
                            value={formData.contact}
                            onChange={handleChange}
                            required
                            className="input"
                            placeholder="e.g. 9876543210"
                        />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <label className="block text-lg font-medium text-slate-700">Address</label>
                        <textarea
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            rows="2"
                            className="input resize-none"
                            placeholder="e.g. 123 Main St, City"
                        />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <label className="block text-lg font-medium text-slate-700">Past History / Other Ailments</label>
                        <textarea
                            name="medicalHistory"
                            value={formData.medicalHistory}
                            onChange={handleChange}
                            rows="3"
                            className="input resize-none"
                            placeholder="Any known conditions, allergies, or past surgeries..."
                        />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <label className="block text-lg font-medium text-slate-700">Family History</label>
                        <textarea
                            name="familyHistory"
                            value={formData.familyHistory || ''}
                            onChange={handleChange}
                            rows="2"
                            className="input resize-none"
                            placeholder="e.g. Diabetes, Hypertension in family..."
                        />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <label className="block text-lg font-medium text-slate-700">Ongoing Medications (NCDs etc.)</label>
                        <textarea
                            name="ongoingMedications"
                            value={formData.ongoingMedications || ''}
                            onChange={handleChange}
                            rows="2"
                            className="input resize-none"
                            placeholder="e.g. Metformin 500mg daily..."
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
                        {loading ? 'Saving...' : 'Save Patient'}
                    </button>
                </div>
            </form>
        </div>
    );
}
