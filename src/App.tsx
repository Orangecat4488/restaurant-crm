import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore, reconcileAuthWithLastUser } from './store/authStore';
import './App.css';
import DashboardLayout from './layouts/DashboardLayout';
import LicenseGuard from './components/LicenseGuard';
import Dashboard from './pages/Dashboard';
import Cashier from './pages/Cashier';
import Orders from './pages/Orders';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Receipts from './pages/Receipts';
import Reports from './pages/Reports';
import Balance from './pages/Balance';
import Users from './pages/Users';
import License from './pages/License';
import Login from './pages/Login';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const currentUser = useAuthStore((s) => s.currentUser);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (currentUser?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function App() {
  const validateSession = useAuthStore((s) => s.validateSession);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // On every page load:
  //  1. Reconcile the cached user with the last known userId (drops stale
  //     state when two accounts share a browser).
  //  2. If we have a token, validate it against the server. If the server
  //     rejects it, the store clears itself and we end up on /login.
  useEffect(() => {
    reconcileAuthWithLastUser();
    if (isAuthenticated) {
      validateSession();
    }
  }, [validateSession, isAuthenticated]);

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        <Route
          element={
            <ProtectedRoute>
              <LicenseGuard>
                <DashboardLayout />
              </LicenseGuard>
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/cashier" element={<Cashier />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/products" element={<Products />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/receipts" element={<Receipts />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/balance" element={<Balance />} />
          <Route
            path="/users"
            element={
              <AdminRoute>
                <Users />
              </AdminRoute>
            }
          />
          <Route
            path="/license"
            element={
              <ProtectedRoute>
                <License />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
