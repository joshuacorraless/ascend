import { Link } from 'react-router-dom';

export function NotFoundScreen() {
  return (
    <div className="grid place-items-center py-24 text-center">
      <div className="space-y-3">
        <p className="text-5xl font-bold text-brand-500">404</p>
        <p className="text-zinc-500">No encontramos esta página.</p>
        <Link to="/" className="btn-primary inline-flex">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
