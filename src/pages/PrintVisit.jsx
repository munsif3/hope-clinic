import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import Loader from '../components/Loader';
import VisitPrintout from '../components/VisitPrintout';


export default function PrintVisit() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [visit, setVisit] = useState(null);
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);

    const clinicAddress = import.meta.env.VITE_CLINIC_ADDRESS || "No. 52/3A, Quarry Road, Dehiwala";
    const clinicPhone = import.meta.env.VITE_CLINIC_PHONE || "0714422396";

    useEffect(() => {
        const fetchData = async () => {
            try {
                const visitDoc = await getDoc(doc(db, 'visits', id));
                if (visitDoc.exists()) {
                    const visitData = { id: visitDoc.id, ...visitDoc.data() };
                    setVisit(visitData);

                    const patientDoc = await getDoc(doc(db, 'patients', visitData.patientId));
                    if (patientDoc.exists()) {
                        setPatient({ id: patientDoc.id, ...patientDoc.data() });
                    }
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);



    if (loading) return <Loader text="Preparing print view..." />;
    if (!visit || !patient) return <div>Data not found</div>;

    return <VisitPrintout visit={visit} patient={patient} onBack={() => navigate(-1)} clinicAddress={clinicAddress} clinicPhone={clinicPhone} />;
}
