import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

export default function LoginPage({ onToast }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('Demo User');
  const [role, setRole] = useState('staff');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true);
    try { await login(name, role); navigate('/dashboard'); }
    catch (error) { onToast(error.message, 'error'); }
    finally { setBusy(false); }
  }
  return <main className="grid min-h-screen place-items-center bg-slate-100 px-5"><form className="card w-full max-w-md" onSubmit={submit}>
    <div className="mb-8 flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-600 text-xl font-bold text-white">P</span><div><h1 className="text-2xl font-bold">PlateProof 360</h1><p className="text-sm text-slate-500">Kitchen demo login</p></div></div>
    <label className="field-label" htmlFor="name">Your name</label><input className="field" id="name" value={name} onChange={(e) => setName(e.target.value)} required />
    <label className="field-label" htmlFor="role">Demo role</label><select className="field" id="role" value={role} onChange={(e) => setRole(e.target.value)}><option value="staff">Staff</option><option value="supervisor">Supervisor</option><option value="manager">Manager</option></select>
    <button className="button-primary mt-6 w-full" disabled={busy}>{busy ? 'Signing in…' : 'Enter kitchen dashboard'}</button>
  </form></main>;
}
