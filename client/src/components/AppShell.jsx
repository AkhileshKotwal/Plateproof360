import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import Toast from './Toast';

export default function AppShell({ children, toast, onDismiss }) {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  return <div className="min-h-screen bg-slate-100">
    <header className="border-b border-emerald-100 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-5 py-4">
        <Link className="mr-auto flex items-center gap-2 font-bold text-slate-900" to="/dashboard"><span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-600 text-white">P</span>PlateProof 360</Link>
        <nav className="flex flex-wrap items-center gap-1 text-sm font-semibold">
          {['/new-order', '/dashboard', '/checklist', '/storage'].map((path) => <NavLink key={path} className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} to={path}>{path === '/new-order' ? 'New order' : path.slice(1).replace('-', ' ')}</NavLink>)}
        </nav>
        <div className="flex items-center gap-2 text-sm">
          <span className="hidden text-slate-600 sm:inline">{session.name} · <strong className="capitalize">{session.role}</strong></span>
          <button className="button-small" onClick={() => { logout(); navigate('/login'); }}>Switch role</button>
        </div>
      </div>
    </header>
    {children}
    <Toast toast={toast} onClose={onDismiss} />
  </div>;
}
