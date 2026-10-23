import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api';
import { useAuth } from '../auth';

const steps = ['Open', 'Fixed', 'Verified', 'Closed'];
const severityClass = { Medium: 'badge-amber', High: 'badge-orange', Critical: 'badge-red' };

export default function DashboardPage({ onToast }) {
  const { session } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [filters, setFilters] = useState({ status: '', severity: '' });
  const [loading, setLoading] = useState(true);
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try { const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value)); setIncidents((await apiFetch(`/api/incidents?${query}`, {}, session.token)).incidents); }
    catch (error) { onToast(error.message, 'error'); } finally { if (!silent) setLoading(false); }
  }, [filters, onToast, session.token]);
  useEffect(() => { load(); const timer = setInterval(() => load(true), 5000); return () => clearInterval(timer); }, [load]);
  useEffect(() => { if (!selected) { setDetail(null); return; } apiFetch(`/api/incidents/${selected}`, {}, session.token).then(setDetail).catch((error) => onToast(error.message, 'error')); }, [selected, session.token, onToast]);
  const counts = useMemo(() => Object.fromEntries(['Open', 'Fixed', 'Verified', 'Closed'].map((status) => [status, incidents.filter((i) => i.status === status).length])), [incidents]);
  async function resetDemo() {
    if (!window.confirm('Reset all demo orders, complaints, incidents, logs, and uploaded proofs?')) return;
    try { await apiFetch('/api/demo/reset', { method: 'POST' }, session.token); onToast('Demo data reset', 'success'); setSelected(null); load(); }
    catch (error) { onToast(error.message, 'error'); }
  }
  return <main className="mx-auto max-w-7xl px-5 py-8"><div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Kitchen control room</p><h1 className="text-3xl font-bold">Incident dashboard</h1></div>{session.role === 'manager' && <button className="button-danger" onClick={resetDemo}>Reset demo data</button>}</div>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">{[['Open','Open'],['Fixed','Fixed'],['Verified','Verified'],['Closed','Closed'],['Critical','Critical']].map(([label, key]) => <div className="card p-4" key={label}><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-3xl font-bold">{key === 'Critical' ? incidents.filter((i) => i.severity === 'Critical').length : counts[key]}</p></div>)}</div>
    <div className="mt-6 flex flex-wrap gap-3"><select className="field max-w-xs" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">All statuses</option>{steps.map((s) => <option key={s}>{s}</option>)}</select><select className="field max-w-xs" value={filters.severity} onChange={(e) => setFilters({ ...filters, severity: e.target.value })}><option value="">All severities</option><option>Medium</option><option>High</option><option>Critical</option></select></div>
    <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_420px]"><section className="card overflow-x-auto p-0">{loading ? <p className="p-6 text-slate-500">Loading incidents…</p> : incidents.length === 0 ? <p className="p-6 text-slate-500">No incidents match these filters.</p> : <table className="w-full text-left text-sm"><thead className="border-b bg-slate-50 text-slate-500"><tr><th className="p-4">Severity</th><th className="p-4">Incident</th><th className="p-4">Status</th><th className="p-4">Age / assignee</th></tr></thead><tbody>{incidents.map((incident) => <tr className={`cursor-pointer border-b last:border-0 hover:bg-emerald-50 ${selected === incident.id ? 'bg-emerald-50' : ''}`} key={incident.id} onClick={() => setSelected(incident.id)}><td className="p-4"><span className={severityClass[incident.severity] || 'badge-gray'}>{incident.severity}</span></td><td className="p-4"><strong>{incident.type}</strong><div className="text-xs text-slate-500">{incident.order_number ? `Order #${incident.order_number}` : 'No order link'}{incident.complaint_issue_type ? ` · ${incident.complaint_issue_type}` : ''}</div></td><td className="p-4">{incident.status}</td><td className="p-4 text-xs text-slate-500">{age(incident.created_at)}<br />{incident.assigned_to || 'Unassigned'}</td></tr>)}</tbody></table>}</section>{selected && <IncidentDetail detail={detail} session={session} onToast={onToast} onRefresh={() => { load(true); apiFetch(`/api/incidents/${selected}`, {}, session.token).then(setDetail); }} />}</div>
  </main>;
}

function age(created) { const minutes = Math.max(0, Math.floor((Date.now() - new Date(`${created.replace(' ', 'T')}Z`).getTime()) / 60000)); return minutes < 60 ? `${minutes}m old` : `${Math.floor(minutes / 60)}h old`; }

function IncidentDetail({ detail, session, onToast, onRefresh }) {
  const [note, setNote] = useState(''); const [assignee, setAssignee] = useState(''); const [proof, setProof] = useState(null); const [busy, setBusy] = useState(false);
  if (!detail) return <aside className="card">Loading incident…</aside>;
  const current = steps.indexOf(detail.status);
  async function action(kind) {
    setBusy(true);
    try {
      let body; let options = { method: 'POST' };
      if (kind === 'assign') body = JSON.stringify({ assignee, note });
      else if (kind === 'fix') { body = new FormData(); body.append('note', note); if (proof) body.append('proof', proof); }
      else body = JSON.stringify({ note });
      if (!(body instanceof FormData)) options.headers = { 'content-type': 'application/json' }; options.body = body;
      await apiFetch(`/api/incidents/${detail.id}/${kind}`, options, session.token); onToast(`Incident ${kind} successful`, 'success'); setNote(''); setProof(null); onRefresh();
    } catch (error) { onToast(error.message, 'error'); } finally { setBusy(false); }
  }
  const canVerify = session.role === 'supervisor' && detail.status === 'Fixed'; const canReject = canVerify; const canClose = ['supervisor', 'manager'].includes(session.role) && detail.status === 'Verified';
  return <aside className="card max-h-[calc(100vh-180px)] overflow-y-auto"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase text-emerald-700">Incident #{detail.id}</p><h2 className="mt-1 text-xl font-bold">{detail.type}</h2></div><span className={severityClass[detail.severity] || 'badge-gray'}>{detail.severity}</span></div>
    <div className="mt-5 grid grid-cols-4 gap-1">{steps.map((step, index) => <div key={step} className="text-center text-xs"><div className={`mx-auto mb-2 h-3 w-3 rounded-full ${index <= current ? 'bg-emerald-600' : 'bg-slate-300'}`} /><span className={index === current ? 'font-bold text-emerald-700' : 'text-slate-500'}>{step}</span></div>)}</div>
    {detail.complaint_text && <div className="mt-5 rounded-xl bg-amber-50 p-4"><strong>{detail.complaint_issue_type}</strong><p className="mt-1 text-sm">{detail.complaint_text}</p></div>}
    <div className="mt-5 text-sm text-slate-600"><p>Order: {detail.order_number ? `#${detail.order_number} · ${detail.dish_name}` : 'Not linked'}</p>{detail.order_number && <p>Cooked at {detail.cook_temp_c}°C for {detail.cook_time_min} min · hygiene {detail.hygiene_ok ? 'passed' : 'flagged'}</p>}<p>Assigned to: {detail.assigned_to || 'Nobody'}</p></div>
    <div className="mt-5 space-y-2">{detail.events.map((event) => <div className="border-l-2 border-emerald-200 pl-3 text-sm" key={event.id}><p className="font-bold">{event.action} <span className="font-normal text-slate-500">by {event.actor} ({event.actor_role})</span></p><p className="text-slate-600">{event.note}</p>{event.proof_url && <a href={`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${event.proof_url}`} target="_blank" rel="noreferrer"><img className="mt-2 h-16 w-16 rounded object-cover" src={`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${event.proof_url}`} alt="Proof" /></a>}<p className="text-xs text-slate-400">{event.created_at}</p></div>)}</div>
    {detail.status !== 'Closed' && <div className="mt-6 space-y-3 border-t pt-5"><input className="field" placeholder="Assignee" value={assignee} onChange={(e) => setAssignee(e.target.value)} /><textarea className="field min-h-20" placeholder="Action note" value={note} onChange={(e) => setNote(e.target.value)} /><div className="flex flex-wrap gap-2"><button className="button-small" disabled={busy || !assignee} onClick={() => action('assign')}>Assign</button>{detail.status === 'Open' && <><label className="button-small cursor-pointer">Photo<input className="hidden" type="file" accept="image/*" onChange={(e) => setProof(e.target.files[0])} /></label><button className="button-primary" disabled={busy} onClick={() => action('fix')}>Mark Fixed</button></>}{canVerify && <button className="button-primary" disabled={busy} onClick={() => action('verify')}>Verify</button>}{canReject && <button className="button-danger" disabled={busy || !note.trim()} onClick={() => action('reject')}>Reject</button>}{canClose && <button className="button-primary" disabled={busy} onClick={() => action('close')}>Close</button>}</div>{session.role !== 'supervisor' && detail.status === 'Fixed' && <p className="text-xs text-slate-500">Only a supervisor can verify or reject an incident.</p>}</div>}</aside>;
}
