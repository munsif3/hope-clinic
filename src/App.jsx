import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientForm from './pages/PatientForm';
import PatientDetails from './pages/PatientDetails';
import Visits from './pages/Visits';
import VisitForm from './pages/VisitForm';
import Inventory from './pages/Inventory';
import InventoryForm from './pages/InventoryForm';
import FollowUps from './pages/FollowUps';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="patients" element={<Patients />} />
            <Route path="patients/new" element={<PatientForm />} />
            <Route path="patients/:id" element={<PatientDetails />} />
            <Route path="patients/:id/edit" element={<PatientForm />} />
            <Route path="visits" element={<Visits />} />
            <Route path="visits/new" element={<VisitForm />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="inventory/new" element={<InventoryForm />} />
            <Route path="inventory/:id/edit" element={<InventoryForm />} />
            <Route path="followups" element={<FollowUps />} />
          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
