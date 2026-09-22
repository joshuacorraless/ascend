import type { SetLog, WorkoutSession } from '@/lib/schema';

/** Scope before calculating records: the same exercise can belong to several routines. */
export function selectExerciseProgress(
  sets: SetLog[],
  sessions: WorkoutSession[],
  exerciseId: string,
  routineId?: string,
) {
  const eligible = sessions
    .filter(
      (session) =>
        session.status === 'completed' && (!routineId || session.routineId === routineId),
    )
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const ids = new Set(eligible.map((session) => session.id));
  const scoped = sets.filter((set) => set.exerciseId === exerciseId && ids.has(set.sessionId));
  const recorded = new Set(
    scoped
      .filter((set) => set.completed && set.setType !== 'calentamiento')
      .map((set) => set.sessionId),
  );
  return {
    sets: scoped,
    sessionDates: new Map(
      eligible
        .filter((session) => recorded.has(session.id))
        .map((session) => [session.id, session.localDate]),
    ),
    sessionStarts: new Map(
      eligible
        .filter((session) => recorded.has(session.id))
        .map((session) => [session.id, session.startedAt]),
    ),
    sessionCount: recorded.size,
  };
}
