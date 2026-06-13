/**
 * Utilidades de fecha. La app razona en "días locales" (YYYY-MM-DD) calculados
 * según la zona horaria configurada por el usuario. Una clave de día es una
 * fecha de calendario pura: la tratamos en UTC para hacer aritmética sin que el
 * horario de verano la desplace.
 */

export const DEFAULT_TIME_ZONE = 'America/Costa_Rica';

export type DateKey = string; // 'YYYY-MM-DD'

/** Devuelve la clave de día local (YYYY-MM-DD) de una fecha en una zona horaria. */
export function localDateKey(date: Date = new Date(), timeZone: string = DEFAULT_TIME_ZONE): DateKey {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Clave del día de hoy en la zona horaria dada. */
export function todayKey(timeZone: string = DEFAULT_TIME_ZONE): DateKey {
  return localDateKey(new Date(), timeZone);
}

/** Hora local "HH:mm" en la zona horaria dada. */
export function localTime(date: Date = new Date(), timeZone: string = DEFAULT_TIME_ZONE): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function parseKey(key: DateKey): [number, number, number] {
  const [y, m, d] = key.split('-').map(Number);
  return [y ?? 1970, m ?? 1, d ?? 1];
}

function formatUTCKey(date: Date): DateKey {
  const y = date.getUTCFullYear().toString().padStart(4, '0');
  const m = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const d = date.getUTCDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Suma (o resta) días a una clave de día. */
export function addDaysToKey(key: DateKey, days: number): DateKey {
  const [y, m, d] = parseKey(key);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return formatUTCKey(dt);
}

/** Diferencia en días enteros entre dos claves (a - b). */
export function diffDaysKeys(a: DateKey, b: DateKey): number {
  const [ay, am, ad] = parseKey(a);
  const [by, bm, bd] = parseKey(b);
  const da = Date.UTC(ay, am - 1, ad);
  const db = Date.UTC(by, bm - 1, bd);
  return Math.round((da - db) / 86_400_000);
}

/** Día de la semana de una clave (0 = domingo … 6 = sábado). */
export function weekdayOfKey(key: DateKey): number {
  const [y, m, d] = parseKey(key);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Genera un rango inclusivo de claves entre `from` y `to`. */
export function rangeOfKeys(from: DateKey, to: DateKey): DateKey[] {
  const out: DateKey[] = [];
  const total = diffDaysKeys(to, from);
  const step = total >= 0 ? 1 : -1;
  for (let i = 0; i !== total + step; i += step) out.push(addDaysToKey(from, i));
  return out;
}

/** Convierte una clave de día a un Date estable (mediodía UTC) para formatear. */
export function keyToDisplayDate(key: DateKey): Date {
  return new Date(`${key}T12:00:00Z`);
}

/** Primer día del mes de una clave (YYYY-MM-01). */
export function startOfMonthKey(key: DateKey): DateKey {
  return `${key.slice(0, 7)}-01`;
}

/** Suma (o resta) meses, devolviendo el primer día del mes resultante. */
export function addMonthsToKey(key: DateKey, months: number): DateKey {
  const y = Number(key.slice(0, 4));
  const m = Number(key.slice(5, 7));
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny.toString().padStart(4, '0')}-${nm.toString().padStart(2, '0')}-01`;
}

/** Todas las claves de día del mes al que pertenece `key`. */
export function daysInMonth(key: DateKey): DateKey[] {
  const start = startOfMonthKey(key);
  const lastDay = addDaysToKey(addMonthsToKey(start, 1), -1);
  return rangeOfKeys(start, lastDay);
}

const HUMAN_FMT = new Intl.DateTimeFormat('es', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

const SHORT_FMT = new Intl.DateTimeFormat('es', {
  day: '2-digit',
  month: 'short',
  timeZone: 'UTC',
});

const MONTH_FMT = new Intl.DateTimeFormat('es', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/** "junio de 2026" */
export function formatMonthKey(key: DateKey): string {
  return MONTH_FMT.format(keyToDisplayDate(key));
}

/** "lunes, 12 de junio" */
export function formatKeyHuman(key: DateKey): string {
  return HUMAN_FMT.format(keyToDisplayDate(key));
}

/** "12 jun" */
export function formatKeyShort(key: DateKey): string {
  return SHORT_FMT.format(keyToDisplayDate(key));
}

/** Etiqueta relativa amigable: Hoy / Ayer / Mañana, o la fecha corta. */
export function formatKeyRelative(key: DateKey, timeZone: string = DEFAULT_TIME_ZONE): string {
  const delta = diffDaysKeys(key, todayKey(timeZone));
  if (delta === 0) return 'Hoy';
  if (delta === -1) return 'Ayer';
  if (delta === 1) return 'Mañana';
  return formatKeyShort(key);
}

export const WEEKDAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const;

/** Formatea una duración en segundos como "1h 05m" o "45m 10s". */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${sec.toString().padStart(2, '0')}s`;
  return `${sec}s`;
}
