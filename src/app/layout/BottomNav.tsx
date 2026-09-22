import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/cn';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
}

const ITEMS: NavItem[] = [
  { to: '/', label: 'Inicio', end: true, icon: 'M3 10 12 3l9 7M5 9v11h5v-6h4v6h5V9' },
  {
    to: '/alimentacion',
    label: 'Comida',
    icon: 'M4 3v6a3 3 0 0 0 6 0V3M7 3v18M18 3c-3 3-3 7 0 9h2V3h-2Zm2 9v9',
  },
  { to: '/entrenamiento', label: 'Gym', icon: 'M3 8v8M6 5v14M6 12h12M18 5v14M21 8v8' },
  { to: '/progreso', label: 'Progreso', icon: 'M4 4v16h16M7 14l4-4 4 2 5-7' },
  {
    to: '/ajustes',
    label: 'Ajustes',
    icon: 'M4 6h6m4 0h6M4 12h10m4 0h2M4 18h2m4 0h10M10 3v6m4 0v6M6 15v6',
  },
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-4 pb-safe" aria-label="Navegación principal">
      <ul className="mx-auto mb-3 flex max-w-md items-stretch justify-around rounded-2xl border border-line bg-paper/85 px-1.5 py-1.5 shadow-card backdrop-blur-xl">
        {ITEMS.map(({ to, label, end, icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl py-1.5 transition-colors',
                  isActive && 'bg-brand-500/10',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={cn('h-5 w-5', isActive ? 'text-brand-500' : 'text-ink-faint')}
                  >
                    <path d={icon} />
                  </svg>
                  <span
                    className={cn(
                      'text-[11px] tracking-tight transition-colors duration-200',
                      isActive ? 'font-semibold text-brand-500' : 'font-medium text-ink-faint',
                    )}
                  >
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
