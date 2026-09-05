import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuthContext } from './context/AuthContext';
import { LicenseProvider } from './context/LicenseContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Layout } from './components/layout/Layout';

// Auth Pages
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { NotFound } from './pages/404';

// Admin Pages
import { Dashboard as AdminDashboard } from './pages/admin/Dashboard';
import { LicenseManager } from './pages/admin/LicenseManager';
import { SubscriptionPlans } from './pages/admin/SubscriptionPlans';
import { Clients } from './pages/admin/Clients';
import { Payments } from './pages/admin/Payments';
import { Reports } from './pages/admin/Reports';

// Client Pages
import { ClientDashboard } from './pages/client/Dashboard';
import { SubscriptionStatus } from './pages/client/SubscriptionStatus';
import { Billing } from './pages/client/Billing';
import { Profile } from './pages/client/Profile';

const RoleRedirect: React.FC = () => {
  const { user } = useAuthContext();
  if (user?.role === 'admin' || user?.role === 'manager') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <Navigate to="/client/dashboard" replace />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <LicenseProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Routes inside shared Layout */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<RoleRedirect />} />

                {/* Admin Management Routes */}
                <Route element={<ProtectedRoute allowedRoles={['admin', 'manager']} />}>
                  <Route path="/admin/dashboard" element={<AdminDashboard />} />
                  <Route path="/admin/licenses" element={<LicenseManager />} />
                  <Route path="/admin/plans" element={<SubscriptionPlans />} />
                  <Route path="/admin/clients" element={<Clients />} />
                  <Route path="/admin/payments" element={<Payments />} />
                  <Route path="/admin/reports" element={<Reports />} />
                </Route>

                {/* Client Portal Routes */}
                <Route path="/client/dashboard" element={<ClientDashboard />} />
                <Route path="/client/subscription" element={<SubscriptionStatus />} />
                <Route path="/client/billing" element={<Billing />} />
                <Route path="/client/profile" element={<Profile />} />
              </Route>
            </Route>

            {/* 404 Catch-All */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </LicenseProvider>
    </AuthProvider>
  );
};

export default App;
