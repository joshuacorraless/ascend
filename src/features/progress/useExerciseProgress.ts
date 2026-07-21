import { useLiveQuery } from 'dexie-react-hooks';
import { getRepositories } from '@/lib/repositories';
import type { SetLog, WorkoutSession } from '@/lib/schema';

export interface ExerciseProgressData {
  sets: SetLog[];
  /** sessionId → localDate. */
  sessionDates: Map<string, string>;
  sessionCount: number;
}

const EMPTY: ExerciseProgressData = { sets: [], sessionDates: new Map(), sessionCount: 0 };

export function useExerciseProgress(exerciseId?: string): ExerciseProgressData | undefined {
  return useLiveQuery(async () => {
    if (!exerciseId) return EMPTY;
    const repos = getRepositories();
    const sets = await repos.workout.listSetLogsForExercise(exerciseId);
    const sessionIds = [...new Set(sets.map((s) => s.sessionId))];
    const sessions = (
      await Promise.all(sessionIds.map((id) => repos.workout.getSession(id)))
    ).filter((s): s is WorkoutSession => !!s && s.status === 'completed');
    const completed = new Set(sessions.map((s) => s.id));
    const sessionDates = new Map(sessions.map((s) => [s.id, s.localDate]));
    return {
      sets: sets.filter((s) => completed.has(s.sessionId)),
      sessionDates,
      sessionCount: sessions.length,
    };
  }, [exerciseId]);
}
