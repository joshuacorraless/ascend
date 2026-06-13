import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDaysToKey, diffDaysKeys, formatKeyRelative, formatKeyShort, type DateKey } from '@/lib/datetime';

interface DateNavProps {
  dateKey: DateKey;
  onChange: (date: DateKey) => void;
  timeZone: string;
  /** Clave máxima navegable (p. ej. hoy). Si se omite, no hay tope. */
  max?: DateKey;
}

export function DateNav({ dateKey, onChange, timeZone, max }: DateNavProps) {
  const atMax = max ? diffDaysKeys(dateKey, max) >= 0 : false;
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/80 p-1 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-900/80">
      <button
        onClick={() => onChange(addDaysToKey(dateKey, -1))}
        className="rounded-xl p-2 text-zinc-500 hover:bg-stone-100 dark:hover:bg-zinc-800"
        aria-label="Día anterior"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={() => max && onChange(max)}
        className="flex flex-col items-center px-2 leading-tight"
      >
        <span className="text-sm font-semibold capitalize">{formatKeyRelative(dateKey, timeZone)}</span>
        <span className="text-xs text-zinc-400">{formatKeyShort(dateKey)}</span>
      </button>
      <button
        onClick={() => !atMax && onChange(addDaysToKey(dateKey, 1))}
        disabled={atMax}
        className="rounded-xl p-2 text-zinc-500 hover:bg-stone-100 disabled:opacity-30 dark:hover:bg-zinc-800"
        aria-label="Día siguiente"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
