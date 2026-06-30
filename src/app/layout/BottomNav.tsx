import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/cn';

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

const ITEMS: NavItem[] = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/alimentacion', label: 'Comida' },
  { to: '/entrenamiento', label: 'Gym' },
  { to: '/progreso', label: 'Progreso' },
  { to: '/ajustes', label: 'Ajustes' },
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-4 pb-safe" aria-label="Navegación principal">
      <ul className="mx-auto mb-3 flex max-w-md items-stretch justify-around rounded-2xl border border-line bg-paper/85 px-1.5 py-1.5 shadow-card backdrop-blur-xl">
        {ITEMS.map(({ to, label, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className="flex min-h-[48px] flex-col items-center justify-center gap-1.5 rounded-xl py-1.5"
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'text-[13px] tracking-tight transition-colors duration-200',
                      isActive ? 'font-semibold text-ink' : 'font-medium text-ink-faint',
                    )}
                  >
                    {label}
                  </span>
                  <span
                    className={cn(
                      'h-1 w-1 rounded-full transition-colors duration-200',
                      isActive ? 'bg-ink' : 'bg-transparent',
                    )}
                    aria-hidden
                  />
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
