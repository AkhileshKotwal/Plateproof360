import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import BrandBar from '../components/BrandBar';
import LoadingCard from '../components/LoadingCard';
import { API_URL } from '../App';

const SAFE_COOK_TEMP_C = 75;
const ISSUE_TYPES = ['Undercooked', 'Hygiene issue', 'Foreign object', 'Allergen concern', 'Taste/Spoiled', 'Other'];
const STATUS_STEPS = [
  ['received', 'Received'],
  ['being_fixed', 'Being fixed'],
  ['verified', 'Verified'],
  ['closed', 'Closed']
];

async function getJson(path, options) {
  const response = await fetch(`${API_URL}${path}`, options);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Request failed');
  return body;
}

export default function CustomerPage() {
  const { token } = useParams();
  const [order, setOrder] = useState(null);
  const [loadState, setLoadState] = useState('loading');
  const [showForm, setShowForm] = useState(false);
  const [issueType, setIssueType] = useState(ISSUE_TYPES[0]);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [complaint, setComplaint] = useState(null);
  const [status, setStatus] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const timer = useRef(null);

  const loadOrder = useCallback(async () => {
    setLoadState('loading');
    try {
      setOrder(await getJson(`/api/public/order/${token}`));
      setLoadState('ready');
    } catch (error) {
      setLoadState(error.message.startsWith('Invalid or expired') ? 'invalid' : 'network');
    }
  }, [token]);

  useEffect(() => {
    loadOrder();
    return () => clearInterval(timer.current);
  }, [loadOrder]);

  const pollStatus = useCallback(async () => {
    try {
      const next = await getJson(`/api/public/order/${token}/complaint-status`);
      setStatus(next);
      if (next.status === 'closed') clearInterval(timer.current);
      return next;
    } catch {
      // Keep the confirmation visible if a status refresh temporarily fails.
    }
  }, [token]);

  async function submitComplaint(event) {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    try {
      const result = await getJson(`/api/public/order/${token}/complaint`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ issue_type: issueType, text })
      });
      setComplaint(result);
      setShowForm(false);
      const initialStatus = await pollStatus();
      if (initialStatus?.status !== 'closed') timer.current = setInterval(pollStatus, 5000);
    } catch (error) {
      setSubmitError('We could not send that report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loadState === 'loading') return <><BrandBar /><main className="page-shell"><LoadingCard /></main></>;
  if (loadState === 'invalid') return <><BrandBar /><main className="page-shell"><MessageCard title="QR link unavailable">This QR link has expired or is invalid. Please ask staff for a new one.</MessageCard></main></>;
  if (loadState === 'network') return <><BrandBar /><main className="page-shell"><MessageCard title="Connection problem">We could not reach the kitchen record right now.<button className="button-primary mt-5" onClick={loadOrder}>Retry</button></MessageCard></main></>;

  const isSafe = Number(order.cook_temp_c) >= SAFE_COOK_TEMP_C;
  return (
    <>
      <BrandBar />
      <main className="page-shell space-y-5">
        <section>
          <p className="text-sm font-semibold text-emerald-700">Order #{order.order_number}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{order.dish}</h1>
        </section>
        <section className="card">
          <h2 className="section-title">Allergen information</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {order.allergens.length ? order.allergens.map((allergen) => <span className="allergen-chip" key={allergen}>{allergen.toUpperCase()}</span>) : <span className="text-slate-600">No listed allergens</span>}
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">Based on the recipe. Cross-contact is possible. Please confirm with staff if you have a severe allergy.</p>
        </section>
        <section className="card">
          <h2 className="section-title">Cooking record</h2>
          <p className="mt-3 text-lg font-semibold text-slate-800">Cooked at {order.cook_temp_c}°C for {order.cook_time_min} min</p>
          <span className={isSafe ? 'badge-green mt-4' : 'badge-red mt-4'}>{isSafe ? 'Temperature passed' : 'Temperature flagged'}</span>
          <div className="mt-5 border-t border-slate-100 pt-4">
            <span className={order.hygiene_ok ? 'badge-green' : 'badge-red'}>{order.hygiene_ok ? 'Hygiene check passed' : 'Hygiene check flagged'}</span>
          </div>
        </section>
        {complaint ? <ComplaintConfirmation complaint={complaint} status={status} /> : (
          <section className="card">
            {!showForm ? <button className="button-secondary w-full" onClick={() => setShowForm(true)}>Report a problem</button> : (
              <form onSubmit={submitComplaint}>
                <h2 className="section-title">Report a problem</h2>
                <label className="field-label" htmlFor="issue-type">What happened?</label>
                <select className="field" id="issue-type" value={issueType} onChange={(event) => setIssueType(event.target.value)}>{ISSUE_TYPES.map((type) => <option key={type}>{type}</option>)}</select>
                <label className="field-label" htmlFor="details">Details <span className="font-normal text-slate-400">(optional)</span></label>
                <textarea className="field min-h-28" id="details" maxLength={500} value={text} onChange={(event) => setText(event.target.value)} placeholder="Tell the kitchen team what you noticed" />
                {submitError && <p className="text-sm text-red-700">{submitError}</p>}
                <button className="button-primary w-full" disabled={submitting}>{submitting ? 'Sending report…' : 'Send report'}</button>
              </form>
            )}
          </section>
        )}
      </main>
    </>
  );
}

function ComplaintConfirmation({ complaint, status }) {
  const currentIndex = Math.max(0, STATUS_STEPS.findIndex(([value]) => value === status?.status));
  return <section className="card"><span className="badge-green">Report received</span><h2 className="mt-3 text-xl font-bold text-slate-900">Thank you for telling us</h2><p className="mt-2 text-slate-600">Reference: <strong>{complaint.reference}</strong></p><div className="mt-6 space-y-3">{STATUS_STEPS.map(([value, label], index) => <div className="flex items-center gap-3" key={value}><span className={index <= currentIndex ? 'status-dot-active' : 'status-dot'} /> <span className={index === currentIndex ? 'font-bold text-emerald-700' : 'text-slate-600'}>{label}</span></div>)}</div></section>;
}

function MessageCard({ title, children }) {
  return <section className="card"><h1 className="text-xl font-bold text-slate-900">{title}</h1><p className="mt-2 text-slate-600">{children}</p></section>;
}
