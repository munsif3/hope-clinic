import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { Search, UserPlus, ChevronRight } from 'lucide-react';
import Loader from '../components/Loader';

export default function Patients() {
    const [patients, setPatients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPatients = async () => {
            try {
                const q = query(collection(db, 'patients'), orderBy('name'));
                const querySnapshot = await getDocs(q);
                const patientsData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setPatients(patientsData);
            } catch (error) {
                console.error("Error fetching patients:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPatients();
    }, []);

    const filteredPatients = patients.filter(patient =>
        patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.contact?.includes(searchTerm)
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-3xl font-bold text-slate-800">Patients</h1>
                <Link to="/patients/new" className="btn btn-primary flex items-center gap-2 text-lg">
                    <UserPlus size={24} />
                    Add New Patient
                </Link>
            </div>

            <div className="card p-4">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={24} />
                    <input
                        type="text"
                        placeholder="Search by name or phone number..."
                        className="input pl-12"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <Loader text="Loading patients..." />
            ) : (
                <div className="grid gap-4">
                    {filteredPatients.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-lg">
                            No patients found.
                        </div>
                    ) : (
                        filteredPatients.map(patient => (
                            <Link
                                key={patient.id}
                                to={`/patients/${patient.id}`}
                                className="card p-6 flex justify-between items-center hover:shadow-md transition-shadow group"
                            >
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800 group-hover:text-primary transition-colors">
                                        {patient.name}
                                    </h3>
                                    <p className="text-slate-500 text-lg">
                                        {patient.gender}, {patient.age} years • {patient.contact}
                                    </p>
                                </div>
                                <ChevronRight className="text-slate-300 group-hover:text-primary" size={32} />
                            </Link>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
