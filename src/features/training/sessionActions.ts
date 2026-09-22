import { getRepositories } from '@/lib/repositories';
import { getDb } from '@/lib/db/database';
import { newEntity } from '@/lib/factories';
import { nowIso } from '@/lib/ids';
import type { DateKey } from '@/lib/datetime';
import type {
  Exercise,
  ExerciseLog,
  SetLog,
  SetType,
  RoutineExercise,
  WorkoutRoutine,
  WorkoutSession,
} from '@/lib/schema';

export function routinePrescriptionNotes(exercise: RoutineExercise): string {
  const range = (min?: number, max?: number) =>
    min === undefined
      ? 'reps no indicadas'
      : min === max || max === undefined
        ? `${min} reps`
        : `${min}–${max} reps`;
  const targets = exercise.prescribedSets?.length
    ? exercise.prescribedSets
        .map(
          (set, i) =>
            `Serie ${i + 1}: ${set.toFailure ? `${set.repRangeMin !== undefined ? `${range(set.repRangeMin, set.repRangeMax)} · ` : ''}al fallo` : range(set.repRangeMin, set.repRangeMax)}${set.notes ? ` · ${set.notes}` : ''}`,
        )
        .join('\n')
    : `${exercise.targetSets} series · ${range(exercise.repRangeMin, exercise.repRangeMax)}${exercise.toFailure ? ' · al fallo' : ''}`;
  return [
    targets,
    exercise.restSeconds !== undefined ? `Descanso: ${exercise.restSeconds} s` : '',
    exercise.notes ?? '',
  ]
    .filter(Boolean)
    .join('\n');
}

function blankSet(
  sessionId: string,
  exerciseLogId: string,
  exerciseId: string,
  setNumber: number,
  defaults?: { weightKg?: number; reps?: number; setType?: SetType },
): SetLog {
  return newEntity<SetLog>({
    sessionId,
    exerciseLogId,
    exerciseId,
    setNumber,
    weightKg: defaults?.weightKg ?? 0,
    reps: defaults?.reps ?? 0,
    setType: defaults?.setType ?? 'efectiva',
    completed: false,
  });
}

/** Inicia una sesión a partir de una rutina: crea logs y series en blanco. */
export async function startSessionFromRoutine(
  routine: WorkoutRoutine,
  exercisesById: Map<string, Exercise>,
  dateKey: DateKey,
  options?: { replaceSessionId?: string },
): Promise<string> {
  const repos = getRepositories();
  const db = getDb();
  return db.transaction('rw', db.sessions, db.exerciseLogs, db.setLogs, async () => {
    const active = await repos.workout.getActiveSession();
    if (active && active.id !== options?.replaceSessionId) {
      throw new Error('Ya hay una sesión activa. Continuá esa sesión o volvé a elegir la rutina.');
    }
    if (active && active.id === options?.replaceSessionId)
      await repos.workout.removeSession(active.id);
    const session = newEntity<WorkoutSession>({
      routineId: routine.id,
      name: routine.name,
      localDate: dateKey,
      startedAt: nowIso(),
      status: 'active',
    });
    await repos.workout.putSession(session);

    const ordered = [...routine.exercises].sort((a, b) => a.order - b.order);
    for (const [i, rex] of ordered.entries()) {
      const exercise = exercisesById.get(rex.exerciseId);
      const log = newEntity<ExerciseLog>({
        sessionId: session.id,
        exerciseId: rex.exerciseId,
        exerciseName: exercise?.name ?? 'Ejercicio',
        trackingType: exercise?.trackingType ?? 'weight_reps',
        order: i,
        notes: routinePrescriptionNotes(rex),
      });
      await repos.workout.putExerciseLog(log);
      for (let n = 1; n <= rex.targetSets; n++) {
        const prescribed = rex.prescribedSets?.[n - 1];
        const setType: SetType | undefined =
          (prescribed?.toFailure ?? rex.toFailure) ? 'fallo' : undefined;
        await repos.workout.putSetLog(
          blankSet(session.id, log.id, rex.exerciseId, n, setType ? { setType } : undefined),
        );
      }
    }
    return session.id;
  });
}

export async function startEmptySession(dateKey: DateKey, name = 'Sesión libre'): Promise<string> {
  const repos = getRepositories();
  const session = newEntity<WorkoutSession>({
    name,
    localDate: dateKey,
    startedAt: nowIso(),
    status: 'active',
  });
  await repos.workout.putSession(session);
  return session.id;
}

/** Añade un ejercicio a una sesión en curso, con una serie en blanco. */
export async function addExerciseToSession(
  sessionId: string,
  exercise: Exercise,
  order: number,
  options?: { toFailure?: boolean },
): Promise<void> {
  const repos = getRepositories();
  const log = newEntity<ExerciseLog>({
    sessionId,
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    trackingType: exercise.trackingType,
    order,
  });
  await repos.workout.putExerciseLog(log);
  await repos.workout.putSetLog(
    blankSet(
      sessionId,
      log.id,
      exercise.id,
      1,
      options?.toFailure ? { setType: 'fallo' } : undefined,
    ),
  );
}

/**
 * Añade una serie heredando el peso y el tipo de la última (las reps quedan en
 * blanco para registrarlas de nuevo, útil al entrenar al fallo).
 */
export async function addSet(log: ExerciseLog, existing: SetLog[]): Promise<void> {
  const repos = getRepositories();
  const sets = existing
    .filter((s) => s.exerciseLogId === log.id)
    .sort((a, b) => a.setNumber - b.setNumber);
  const last = sets.at(-1);
  await repos.workout.putSetLog(
    blankSet(log.sessionId, log.id, log.exerciseId, (last?.setNumber ?? 0) + 1, {
      weightKg: last?.weightKg ?? 0,
      ...(last ? { setType: last.setType } : {}),
    }),
  );
}

export async function finishSession(session: WorkoutSession): Promise<void> {
  const repos = getRepositories();
  const endedAt = nowIso();
  const durationSeconds = Math.max(0, (Date.parse(endedAt) - Date.parse(session.startedAt)) / 1000);
  await repos.workout.putSession({
    ...session,
    status: 'completed',
    endedAt,
    durationSeconds,
    updatedAt: endedAt,
  });
}

/** Cancela y elimina la sesión (con sus logs y series). */
export async function cancelSession(sessionId: string): Promise<void> {
  await getRepositories().workout.removeSession(sessionId);
}

/** Series completadas del mismo ejercicio en la última sesión completada previa. */
export async function previousExerciseSets(
  exerciseId: string,
  excludeSessionId: string,
): Promise<SetLog[]> {
  const repos = getRepositories();
  const sets = await repos.workout.listSetLogsForExercise(exerciseId);
  const sessionIds = [...new Set(sets.map((s) => s.sessionId))].filter(
    (id) => id !== excludeSessionId,
  );
  if (sessionIds.length === 0) return [];
  const sessions = (await Promise.all(sessionIds.map((id) => repos.workout.getSession(id)))).filter(
    (s): s is WorkoutSession => !!s && s.status === 'completed',
  );
  const last = sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
  if (!last) return [];
  return sets
    .filter((s) => s.sessionId === last.id && s.completed)
    .sort((a, b) => a.setNumber - b.setNumber);
}
