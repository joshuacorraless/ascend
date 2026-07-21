import { round } from '@/lib/units';
import type { OneRmFormula, SetLog, WorkoutSession } from '@/lib/schema';

/** 1RM estimado con la fórmula de Epley: peso × (1 + reps / 30). Con 1 rep devuelve el propio peso. */
export function epleyOneRm(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return round(weightKg, 1);
  return round(weightKg * (1 + reps / 30), 1);
}

export function estimateOneRm(
  weightKg: number,
  reps: number,
  formula: OneRmFormula = 'epley',
): number {
  switch (formula) {
    case 'epley':
    default:
      return epleyOneRm(weightKg, reps);
  }
}

/** Una serie cuenta como "efectiva" (de trabajo) si no es de calentamiento. */
export function isWorkingSet(set: SetLog): boolean {
  return set.setType !== 'calentamiento';
}

/** Volumen de una serie = peso × repeticiones. */
export function setVolume(set: SetLog): number {
  return round(set.weightKg * set.reps, 1);
}

/** Volumen total de las series de trabajo completadas. */
export function totalVolume(sets: SetLog[]): number {
  return round(
    sets
      .filter((s) => isWorkingSet(s) && s.completed)
      .reduce((sum, s) => sum + s.weightKg * s.reps, 0),
    1,
  );
}

export function effectiveSetCount(sets: SetLog[]): number {
  return sets.filter((s) => isWorkingSet(s) && s.completed).length;
}

/** Mejor serie por 1RM estimado (excluye calentamientos). */
export function bestSetByOneRm(
  sets: SetLog[],
  formula: OneRmFormula = 'epley',
): SetLog | undefined {
  let best: SetLog | undefined;
  let bestVal = -1;
  for (const s of sets) {
    if (!isWorkingSet(s) || !s.completed) continue;
    const val = estimateOneRm(s.weightKg, s.reps, formula);
    if (val > bestVal) {
      bestVal = val;
      best = s;
    }
  }
  return best;
}

// Récords personales por ejercicio

export interface ExercisePersonalRecords {
  /** Mayor peso movido en una serie de trabajo. */
  maxWeightKg: number;
  /** Mayor nº de repeticiones en una serie de trabajo. */
  maxReps: number;
  /** Mayor volumen en una sola sesión. */
  maxSessionVolume: number;
  /** Mejor 1RM estimado. */
  bestEstimatedOneRm: number;
}

/**
 * PRs de un ejercicio a partir de sus series de trabajo completadas.
 * El llamador filtra por exerciseId; aquí no se mezclan ejercicios.
 */
export function personalRecords(
  sets: SetLog[],
  formula: OneRmFormula = 'epley',
): ExercisePersonalRecords {
  const working = sets.filter((s) => isWorkingSet(s) && s.completed);
  const bySession = new Map<string, number>();
  let maxWeightKg = 0;
  let maxReps = 0;
  let bestEstimatedOneRm = 0;
  for (const s of working) {
    if (s.weightKg > maxWeightKg) maxWeightKg = s.weightKg;
    if (s.reps > maxReps) maxReps = s.reps;
    const orm = estimateOneRm(s.weightKg, s.reps, formula);
    if (orm > bestEstimatedOneRm) bestEstimatedOneRm = orm;
    bySession.set(s.sessionId, (bySession.get(s.sessionId) ?? 0) + s.weightKg * s.reps);
  }
  let maxSessionVolume = 0;
  for (const v of bySession.values()) if (v > maxSessionVolume) maxSessionVolume = v;
  return {
    maxWeightKg: round(maxWeightKg, 1),
    maxReps,
    maxSessionVolume: round(maxSessionVolume, 1),
    bestEstimatedOneRm: round(bestEstimatedOneRm, 1),
  };
}

// Series temporales para gráficos (un punto por sesión)

export type ProgressMetric =
  | 'maxWeight'
  | 'totalReps'
  | 'volume'
  | 'bestSet'
  | 'effectiveSets'
  | 'estimatedOneRm';

export interface ProgressPoint {
  sessionId: string;
  date: string; // localDate
  value: number;
}

/**
 * Agrega las series de un ejercicio por sesión y produce un punto por sesión
 * para la métrica elegida. `sessionDates` mapea sessionId → localDate.
 */
export function progressSeries(
  sets: SetLog[],
  sessionDates: Map<string, string>,
  metric: ProgressMetric,
  formula: OneRmFormula = 'epley',
): ProgressPoint[] {
  const grouped = new Map<string, SetLog[]>();
  for (const s of sets) {
    if (!s.completed) continue;
    const arr = grouped.get(s.sessionId);
    if (arr) arr.push(s);
    else grouped.set(s.sessionId, [s]);
  }

  const points: ProgressPoint[] = [];
  for (const [sessionId, group] of grouped) {
    const working = group.filter(isWorkingSet);
    if (working.length === 0) continue;
    let value = 0;
    switch (metric) {
      case 'maxWeight':
        value = Math.max(...working.map((s) => s.weightKg));
        break;
      case 'totalReps':
        value = working.reduce((sum, s) => sum + s.reps, 0);
        break;
      case 'volume':
        value = working.reduce((sum, s) => sum + s.weightKg * s.reps, 0);
        break;
      case 'effectiveSets':
        value = working.length;
        break;
      case 'bestSet':
      case 'estimatedOneRm':
        value = Math.max(...working.map((s) => estimateOneRm(s.weightKg, s.reps, formula)));
        break;
    }
    points.push({ sessionId, date: sessionDates.get(sessionId) ?? '', value: round(value, 1) });
  }

  return points.sort((a, b) => a.date.localeCompare(b.date));
}

/** Duración de una sesión: usa durationSeconds o el delta start→end. */
export function sessionDurationSeconds(session: WorkoutSession): number {
  if (typeof session.durationSeconds === 'number') return session.durationSeconds;
  if (session.endedAt) {
    return Math.max(0, (Date.parse(session.endedAt) - Date.parse(session.startedAt)) / 1000);
  }
  return 0;
}

// Resumen por sesión de un ejercicio (historial y comparación)

export interface ExerciseSessionSummary {
  sessionId: string;
  date: string; // localDate
  /** Series de trabajo completadas en esa sesión. */
  sets: SetLog[];
  maxWeightKg: number;
  totalReps: number;
  workingSets: number;
  /** Volumen = Σ peso × reps de series de trabajo completadas. */
  volume: number;
  estOneRm: number;
}

/** Resumen por sesión de un ejercicio, ordenado de la más reciente a la más antigua. */
export function exerciseSessionSummaries(
  sets: SetLog[],
  sessionDates: Map<string, string>,
  formula: OneRmFormula = 'epley',
): ExerciseSessionSummary[] {
  const grouped = new Map<string, SetLog[]>();
  for (const s of sets) {
    if (!s.completed || !isWorkingSet(s)) continue;
    const arr = grouped.get(s.sessionId);
    if (arr) arr.push(s);
    else grouped.set(s.sessionId, [s]);
  }

  const summaries: ExerciseSessionSummary[] = [];
  for (const [sessionId, group] of grouped) {
    if (group.length === 0) continue;
    const ordered = [...group].sort((a, b) => a.setNumber - b.setNumber);
    summaries.push({
      sessionId,
      date: sessionDates.get(sessionId) ?? '',
      sets: ordered,
      maxWeightKg: round(Math.max(...group.map((s) => s.weightKg)), 1),
      totalReps: group.reduce((sum, s) => sum + s.reps, 0),
      workingSets: group.length,
      volume: round(
        group.reduce((sum, s) => sum + s.weightKg * s.reps, 0),
        1,
      ),
      estOneRm: round(Math.max(...group.map((s) => estimateOneRm(s.weightKg, s.reps, formula))), 1),
    });
  }

  return summaries.sort((a, b) => b.date.localeCompare(a.date));
}
