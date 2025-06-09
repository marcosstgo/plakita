import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import PetProfile from '@/pages/PetProfile';
import PublicPetProfile from '@/pages/PublicPetProfile';
import Help from '@/pages/Help';
import ProtectedRoute from '@/components/ProtectedRoute';
import ActivateTagPage from '@/pages/ActivateTagPage.jsx'; 
import AdminDashboard from '@/pages/AdminDashboard';
import AdminDiagnostic from '@/pages/AdminDiagnostic';
import UserVerification from '@/pages/UserVerification';
import DatabaseDiagnostic from '@/pages/DatabaseDiagnostic';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500">
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
              <Route path="help" element={<Help />} />
              <Route path="activate-plakita" element={ 
                <ProtectedRoute>
                  <ActivateTagPage /> 
                </ProtectedRoute>
              } />
              <Route path="activate-tag/:tagCode" element={ 
                <ProtectedRoute>
                  <ActivateTagPage /> 
                </ProtectedRoute>
              } />
              <Route path="dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="pet/:id" element={
                <ProtectedRoute>
                  <PetProfile />
                </ProtectedRoute>
              } />
               <Route path="admin" element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="admin-diagnostic" element={
                <ProtectedRoute>
                  <AdminDiagnostic />
                </ProtectedRoute>
              } />
              <Route path="verify-user" element={
                <ProtectedRoute>
                  <UserVerification />
                </ProtectedRoute>
              } />
              <Route path="database-diagnostic" element={
                <ProtectedRoute>
                  <DatabaseDiagnostic />
                </ProtectedRoute>
              } />
            </Route>
            <Route path="/public/pet/:petId" element={<PublicPetProfile />} />
          </Routes>
          <Toaster />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;