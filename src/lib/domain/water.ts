import { rangeOfKeys, type DateKey } from '@/lib/datetime';
import { round } from '@/lib/units';
import type { WaterEntry } from '@/lib/schema';

export function sumWater(entries: WaterEntry[]): number {
  return entries.reduce((sum, e) => sum + e.amountMl, 0);
}

/** Total de ml por día dentro del rango (incluye días sin registro = 0). */
export function dailyWaterTotals(
  entries: WaterEntry[],
  from: DateKey,
  to: DateKey,
): { date: DateKey; ml: number }[] {
  const totals = new Map<DateKey, number>();
  for (const e of entries) totals.set(e.localDate, (totals.get(e.localDate) ?? 0) + e.amountMl);
  return rangeOfKeys(from, to).map((date) => ({ date, ml: round(totals.get(date) ?? 0) }));
}

/** Promedio diario de ml en el rango (divide por el nº de días del rango). */
export function weeklyWaterAverage(entries: WaterEntry[], from: DateKey, to: DateKey): number {
  const days = dailyWaterTotals(entries, from, to);
  if (days.length === 0) return 0;
  return round(days.reduce((sum, d) => sum + d.ml, 0) / days.length);
}
