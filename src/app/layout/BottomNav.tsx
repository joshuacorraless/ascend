import { NavLink } from 'react-router-dom';
import { Dumbbell, House, TrendingUp, UtensilsCrossed, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const ITEMS: NavItem[] = [
  { to: '/', label: 'Inicio', icon: House, end: true },
  { to: '/alimentacion', label: 'Comida', icon: UtensilsCrossed },
  { to: '/entrenamiento', label: 'Gym', icon: Dumbbell },
  { to: '/progreso', label: 'Progreso', icon: TrendingUp },
  { to: '/ajustes', label: 'Ajustes', icon: Settings },
];

export function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 pb-safe"
      aria-label="Navegación principal"
    >
      <ul className="mx-auto mb-3 flex max-w-[34rem] items-stretch justify-around gap-1 rounded-[1.35rem] border border-white/70 bg-white/88 p-1.5 shadow-[0_18px_60px_-30px_rgba(15,23,42,0.8)] ring-1 ring-black/[0.04] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/88 dark:ring-white/[0.04]">
        {ITEMS.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-semibold transition',
                  isActive
                    ? 'bg-stone-950 text-white shadow-sm dark:bg-white dark:text-zinc-950'
                    : 'text-zinc-500 hover:bg-stone-100 hover:text-stone-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="h-6 w-6" strokeWidth={isActive ? 2.4 : 1.8} aria-hidden />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
