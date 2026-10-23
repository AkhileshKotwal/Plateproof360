import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../App';

async function getJson(path, options) {
  const response = await fetch(`${API_URL}${path}`, options);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Request failed');
  return body;
}

export default function NewOrderPage() {
  const [dishes, setDishes] = useState([]);
  const [dishId, setDishId] = useState('');
  const [temperature, setTemperature] = useState(82);
  const [time, setTime] = useState(25);
  const [hygiene, setHygiene] = useState(true);
  const [created, setCreated] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    getJson('/api/dishes').then((body) => {
      setDishes(body.dishes);
      if (body.dishes[0]) setDishId(String(body.dishes[0].id));
    }).catch(() => setError('Could not load the menu. Please refresh and try again.')).finally(() => setLoading(false));
  }, []);

  async function createOrder(event) {
    event.preventDefault();
    setCreating(true);
    setError('');
    try {
      setCreated(await getJson('/api/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ dish_id: Number(dishId), cook_temp_c: Number(temperature), cook_time_min: Number(time), hygiene_ok: hygiene })
      }));
    } catch {
      setError('Could not create the order. Please try again.');
    } finally {
      setCreating(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(created.qr_url);
  }

  if (created) return <main className="page-shell"><section className="card text-center"><p className="text-sm font-semibold text-emerald-700">Order #{created.order.order_number} created</p><h1 className="mt-2 text-2xl font-bold text-slate-900">{created.order.dish_name}</h1>{created.qr_url.includes('localhost') && <p className="warning-banner mt-5 text-left">This QR will not open on a phone. Set CLIENT_URL in server/.env to this computer&apos;s Wi-Fi IP address.</p>}<img className="mx-auto mt-6 w-full max-w-xs rounded-2xl border border-slate-200" src={created.qr_code_png} alt={`QR code for order ${created.order.order_number}`} /><p className="mt-5 break-all text-sm text-slate-500">{created.qr_url}</p><div className="mt-5 flex flex-col gap-3 sm:flex-row"><button className="button-secondary flex-1" onClick={copyLink}>Copy link</button><button className="button-primary flex-1" onClick={() => setCreated(null)}>Create another order</button></div></section></main>;
  return <main className="page-shell"><section className="card"><div className="mb-6"><p className="text-sm font-semibold text-emerald-700">Staff tool</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Create a new order</h1></div>{loading ? <p className="text-slate-500">Loading menu…</p> : <form className="space-y-5" onSubmit={createOrder}><div><label className="field-label" htmlFor="dish">Dish</label><select className="field" id="dish" value={dishId} onChange={(event) => setDishId(event.target.value)}>{dishes.map((dish) => <option key={dish.id} value={dish.id}>{dish.name} — {dish.allergens.length ? dish.allergens.join(', ') : 'no listed allergens'}</option>)}</select></div><div className="grid gap-4 sm:grid-cols-2"><div><label className="field-label" htmlFor="temperature">Cook temperature (°C)</label><input className="field" id="temperature" min="0" type="number" value={temperature} onChange={(event) => setTemperature(event.target.value)} /></div><div><label className="field-label" htmlFor="time">Cook time (minutes)</label><input className="field" id="time" min="1" type="number" value={time} onChange={(event) => setTime(event.target.value)} /></div></div><label className="flex min-h-11 items-center gap-3 text-slate-700"><input className="h-5 w-5 accent-emerald-600" type="checkbox" checked={hygiene} onChange={(event) => setHygiene(event.target.checked)} /> Hygiene check passed</label>{error && <p className="text-sm text-red-700">{error}</p>}<button className="button-primary w-full" disabled={creating || !dishId}>{creating ? 'Creating…' : 'Create order and QR'}</button></form>}<Link className="mt-6 inline-block text-sm font-semibold text-emerald-700" to="/">← Back home</Link></section></main>;
}
