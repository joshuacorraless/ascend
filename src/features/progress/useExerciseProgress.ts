import { useLiveQuery } from 'dexie-react-hooks';
import { getRepositories } from '@/lib/repositories';
import type { SetLog, WorkoutSession } from '@/lib/schema';
import { selectExerciseProgress } from './progressData';

export interface ExerciseProgressData {
  sets: SetLog[];
  /** sessionId → localDate. */
  sessionDates: Map<string, string>;
  /** Exact start time, used to order multiple sessions on the same local day. */
  sessionStarts: Map<string, string>;
  sessionCount: number;
}

const EMPTY: ExerciseProgressData = {
  sets: [],
  sessionDates: new Map(),
  sessionStarts: new Map(),
  sessionCount: 0,
};

export function useExerciseProgress(
  exerciseId?: string,
  routineId?: string,
): ExerciseProgressData | undefined {
  return useLiveQuery(async () => {
    if (!exerciseId) return EMPTY;
    const repos = getRepositories();
    const sets = await repos.workout.listSetLogsForExercise(exerciseId);
    const sessionIds = [...new Set(sets.map((s) => s.sessionId))];
    const sessions = (
      await Promise.all(sessionIds.map((id) => repos.workout.getSession(id)))
    ).filter((s): s is WorkoutSession => !!s && s.status === 'completed');
    return selectExerciseProgress(sets, sessions, exerciseId, routineId);
  }, [exerciseId, routineId]);
}
