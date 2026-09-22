import { useLiveQuery } from 'dexie-react-hooks';
import { getRepositories } from '@/lib/repositories';
import { diffDaysKeys } from '@/lib/datetime';
import type { SetLog, WorkoutRoutine, WorkoutSession } from '@/lib/schema';
import { useToday } from '@/app/hooks/useToday';

export interface RoutineSessionData {
  session: WorkoutSession;
  sets: SetLog[];
}

export interface RoutineProgressData {
  routine: WorkoutRoutine | undefined;
  /** Sesiones completadas de esta rutina, más reciente primero. */
  sessions: RoutineSessionData[];
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
  const { dateKey } = useToday();
  return useLiveQuery(async () => {
    if (!routineId) return EMPTY;
    const repos = getRepositories();
    const routine = await repos.routines.get(routineId);
    const all = await repos.workout.listSessions(); // completadas, desc por startedAt
    const forRoutine = all.filter((s) => s.routineId === routineId);
    const sessions = await Promise.all(
      forRoutine.map(async (session) => {
        const sets = await repos.workout.listSetLogs(session.id);
        return { session, sets };
      }),
    );
    const today = dateKey;
    const recent = forRoutine.filter((s) => {
      const age = diffDaysKeys(today, s.localDate);
      return age >= 0 && age < 28;
    }).length;
    return {
      routine,
      sessions,
      sessionCount: forRoutine.length,
      lastDate: forRoutine[0]?.localDate,
      perWeek: Math.round((recent / 4) * 10) / 10,
    };
  }, [routineId, dateKey]);
}
