import { Link } from 'react-router-dom';

export default function BrandBar() {
  return (
    <header className="border-b border-emerald-100 bg-white">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
        <Link className="flex items-center gap-2 font-bold text-slate-900" to="/">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-600 text-white">P</span>
          PlateProof 360
        </Link>
        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Verified kitchen</span>
      </div>
    </header>
  );
}
