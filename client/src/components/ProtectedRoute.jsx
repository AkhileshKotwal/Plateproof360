import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth';
import AppShell from './AppShell';

export default function ProtectedRoute({ children, toast, onDismiss }) {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  return <AppShell toast={toast} onDismiss={onDismiss}>{children}</AppShell>;
}
