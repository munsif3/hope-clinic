import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft } from 'lucide-react';
import Loader from '../components/Loader';
import DynamicListInput from '../components/DynamicListInput';

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
        medicalHistory: [],
        familyHistory: [],
        ongoingMedications: [],
        allergies: []
    });
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(isEditMode);

    // Helper to migrate legacy data (string or old object) to new array format
    const migrateToDynamicList = (data, fieldName) => {
        let value = data[fieldName];
        const today = new Date().toISOString().split('T')[0];

        if (Array.isArray(value)) {
            // Already an array, ensure all items have a date and 'name' key
            return value.map(item => ({
                name: item.name || item.condition || '', // Map 'condition' to 'name'
                notes: item.notes || '',
                date: item.date || today
            }));
        } else if (typeof value === 'string' && value.trim() !== '') {
            // Convert legacy string to single item
            return [{ name: 'History', notes: value, date: today }];
        }

        return [];
    };

    useEffect(() => {
        if (isEditMode) {
            const fetchPatient = async () => {
                try {
                    const docRef = doc(db, 'patients', id);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();

                        setFormData({
                            ...data,
                            medicalHistory: migrateToDynamicList(data, 'medicalHistory'),
                            familyHistory: migrateToDynamicList(data, 'familyHistory'),
                            ongoingMedications: migrateToDynamicList(data, 'ongoingMedications'),
                            allergies: migrateToDynamicList(data, 'allergies')
                        });
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

    const handleListChange = (field, newItems) => {
        setFormData(prev => ({ ...prev, [field]: newItems }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const dataToSave = {
                ...formData,
                updatedAt: serverTimestamp()
            };

            if (!isEditMode) {
                dataToSave.createdAt = serverTimestamp();
            }

            if (isEditMode) {
                await updateDoc(doc(db, 'patients', id), dataToSave);
            } else {
                await addDoc(collection(db, 'patients'), dataToSave);
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
        return <Loader text="Loading patient data..." />;
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

                    <div className="md:col-span-2 border-t border-slate-100 my-4"></div>

                    <div className="md:col-span-2">
                        <DynamicListInput
                            label="Past History / Other Ailments"
                            items={formData.medicalHistory}
                            onChange={(items) => handleListChange('medicalHistory', items)}
                            placeholderName="Condition (e.g. Diabetes)"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <DynamicListInput
                            label="Family History"
                            items={formData.familyHistory}
                            onChange={(items) => handleListChange('familyHistory', items)}
                            placeholderName="Condition (e.g. Hypertension)"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <DynamicListInput
                            label="Ongoing Medications"
                            items={formData.ongoingMedications}
                            onChange={(items) => handleListChange('ongoingMedications', items)}
                            placeholderName="Medication (e.g. Metformin)"
                            placeholderNotes="Dosage and frequency..."
                        />
                    </div>

                    <div className="md:col-span-2">
                        <DynamicListInput
                            label="Allergies"
                            items={formData.allergies}
                            onChange={(items) => handleListChange('allergies', items)}
                            placeholderName="Allergen (e.g. Penicillin)"
                            placeholderNotes="Reaction details..."
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
