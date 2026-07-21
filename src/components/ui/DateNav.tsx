import { Caret } from './Caret';
import {
  addDaysToKey,
  diffDaysKeys,
  formatKeyRelative,
  formatKeyShort,
  type DateKey,
} from '@/lib/datetime';

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
    <div className="flex items-center justify-between rounded-xl border border-line bg-paper p-1 shadow-card">
      <button
        onClick={() => onChange(addDaysToKey(dateKey, -1))}
        className="grid h-9 w-9 place-items-center rounded-lg text-ink-muted transition hover:bg-canvas hover:text-ink"
        aria-label="Día anterior"
      >
        <Caret dir="left" />
      </button>
      <button
        onClick={() => max && onChange(max)}
        className="flex flex-col items-center px-2 leading-tight"
      >
        <span className="text-sm font-semibold capitalize text-ink">
          {formatKeyRelative(dateKey, timeZone)}
        </span>
        <span className="nums text-xs text-ink-muted">{formatKeyShort(dateKey)}</span>
      </button>
      <button
        onClick={() => !atMax && onChange(addDaysToKey(dateKey, 1))}
        disabled={atMax}
        className="grid h-9 w-9 place-items-center rounded-lg text-ink-muted transition hover:bg-canvas hover:text-ink disabled:opacity-25"
        aria-label="Día siguiente"
      >
        <Caret dir="right" />
      </button>
    </div>
  );
}
