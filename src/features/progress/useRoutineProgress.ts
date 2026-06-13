import { useLiveQuery } from 'dexie-react-hooks';
import { getRepositories } from '@/lib/repositories';
import { totalVolume } from '@/lib/domain';
import { diffDaysKeys, todayKey } from '@/lib/datetime';
import type { WorkoutRoutine, WorkoutSession } from '@/lib/schema';

export interface RoutineSessionVolume {
  session: WorkoutSession;
  volume: number;
}

export interface RoutineProgressData {
  routine: WorkoutRoutine | undefined;
  /** Sesiones completadas de esta rutina (más reciente primero) con su volumen. */
  sessions: RoutineSessionVolume[];
  sessionCount: number;
  lastDate: string | undefined;
  /** Sesiones por semana (promedio de las últimas 4 semanas). */
  perWeek: number;
}

const EMPTY: RoutineProgressData = {
  routine: undefined,
  sessions: [],
  sessionCount: 0,
  lastDate: undefined,
  perWeek: 0,
};

export function useRoutineProgress(routineId?: string): RoutineProgressData | undefined {
  return useLiveQuery(async () => {
    if (!routineId) return EMPTY;
    const repos = getRepositories();
    const routine = await repos.routines.get(routineId);
    const all = await repos.workout.listSessions(); // completadas, desc por startedAt
    const forRoutine = all.filter((s) => s.routineId === routineId);
    const sessions = await Promise.all(
      forRoutine.map(async (session) => ({
        session,
        volume: totalVolume(await repos.workout.listSetLogs(session.id)),
      })),
    );
    const today = todayKey();
    const recent = forRoutine.filter((s) => diffDaysKeys(today, s.localDate) <= 28).length;
    return {
      routine,
      sessions,
      sessionCount: forRoutine.length,
      lastDate: forRoutine[0]?.localDate,
      perWeek: Math.round((recent / 4) * 10) / 10,
    };
  }, [routineId]);
}
