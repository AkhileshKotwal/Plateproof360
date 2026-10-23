import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import CustomerPage from './pages/CustomerPage';
import NewOrderPage from './pages/NewOrderPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ChecklistPage from './pages/ChecklistPage';
import StoragePage from './pages/StoragePage';
import { AuthProvider, useAuth } from './auth';
import ProtectedRoute from './components/ProtectedRoute';

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');

function LandingPage() {
  return <main className="min-h-screen bg-slate-100 px-5 py-10"><section className="mx-auto max-w-xl rounded-3xl bg-white p-8 shadow-sm"><div className="mb-8 flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-600 text-xl font-bold text-white">P</div><div><p className="text-xl font-bold">PlateProof 360</p><p className="text-sm text-slate-500">Food safety, made visible.</p></div></div><h1 className="text-3xl font-bold">Trust every bite.</h1><p className="mt-3 text-slate-600">Kitchen teams can create orders, track incidents, and prove every fix.</p><Link className="button-primary mt-8 inline-flex" to="/login">Open kitchen demo</Link></section></main>;
}

function Protected({ children, toast, onDismiss }) {
  return <ProtectedRoute toast={toast} onDismiss={onDismiss}>{children}</ProtectedRoute>;
}

function AppRoutes() {
  const [toast, setToast] = useState(null);
  const notify = (message, type = 'success') => setToast({ message, type });
  return <Routes>
    <Route path="/o/:token" element={<CustomerPage />} />
    <Route path="/login" element={<LoginPage onToast={notify} />} />
    <Route path="/" element={<LandingPage />} />
    <Route path="/new-order" element={<Protected toast={toast} onDismiss={() => setToast(null)}><NewOrderPage /></Protected>} />
    <Route path="/dashboard" element={<Protected toast={toast} onDismiss={() => setToast(null)}><DashboardPage onToast={notify} /></Protected>} />
    <Route path="/checklist" element={<Protected toast={toast} onDismiss={() => setToast(null)}><ChecklistPage onToast={notify} /></Protected>} />
    <Route path="/storage" element={<Protected toast={toast} onDismiss={() => setToast(null)}><StoragePage onToast={notify} /></Protected>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}

export default function App() { return <AuthProvider><AppRoutes /></AuthProvider>; }
