import { diffDaysKeys } from '@/lib/datetime';
import { round } from '@/lib/units';
import type { BodyWeightEntry } from '@/lib/schema';

export interface BodyWeightPoint {
  date: string;
  weightKg: number;
  /** Media móvil de 7 días (incluye el punto actual). */
  averageKg: number;
}

/** Ordena las entradas por fecha ascendente (no muta el original). */
export function sortByDate(entries: BodyWeightEntry[]): BodyWeightEntry[] {
  return [...entries].sort((a, b) => a.localDate.localeCompare(b.localDate));
}

/**
 * Media móvil de 7 días: para cada punto, promedia las entradas cuya fecha está
 * dentro de los 6 días previos (ventana de 7 días naturales, inclusive).
 */
export function withMovingAverage(entries: BodyWeightEntry[], windowDays = 7): BodyWeightPoint[] {
  const sorted = sortByDate(entries);
  return sorted.map((entry, i) => {
    let sum = 0;
    let count = 0;
    for (let j = i; j >= 0; j--) {
      const other = sorted[j];
      if (!other) break;
      if (diffDaysKeys(entry.localDate, other.localDate) >= windowDays) break;
      sum += other.weightKg;
      count += 1;
    }
    return {
      date: entry.localDate,
      weightKg: round(entry.weightKg, 2),
      averageKg: count > 0 ? round(sum / count, 2) : round(entry.weightKg, 2),
    };
  });
}

export interface BodyWeightStats {
  current?: number;
  first?: number;
  totalChange: number;
  /** Cambio en los últimos 7 días (actual − valor de hace ~7 días). */
  weeklyChange: number;
  trend: 'subiendo' | 'bajando' | 'estable' | 'sin_datos';
}

export function bodyWeightStats(entries: BodyWeightEntry[]): BodyWeightStats {
  const sorted = sortByDate(entries);
  if (sorted.length === 0) {
    return { totalChange: 0, weeklyChange: 0, trend: 'sin_datos' };
  }
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  const totalChange = round(last.weightKg - first.weightKg, 2);

  // Valor de referencia ~7 días antes del último registro.
  let reference = first;
  for (const e of sorted) {
    if (diffDaysKeys(last.localDate, e.localDate) >= 7) reference = e;
    else break;
  }
  const weeklyChange = round(last.weightKg - reference.weightKg, 2);

  let trend: BodyWeightStats['trend'] = 'estable';
  if (weeklyChange > 0.15) trend = 'subiendo';
  else if (weeklyChange < -0.15) trend = 'bajando';

  return {
    current: round(last.weightKg, 2),
    first: round(first.weightKg, 2),
    totalChange,
    weeklyChange,
    trend,
  };
}
