import { getDb, type AscendDatabase } from '@/lib/db/database';
import { newEntity, touch } from '@/lib/factories';
import type { ExerciseLog, SetLog } from '@/lib/schema';
import { spokenSetSchema, type SpokenSet } from '@/lib/training/voiceSets';
import { weightToKg } from '@/lib/units';

export function canFillSpokenSet(set: SetLog, weightKg: number): boolean {
  return (
    !set.completed &&
    set.reps === 0 &&
    set.rpe === undefined &&
    set.rir === undefined &&
    (set.weightKg === 0 || Math.abs(set.weightKg - weightKg) < 0.001)
  );
}

export function nextSpokenSetNumber(
  sets: SetLog[],
  usedNumbers: number[],
  weightKg?: number,
): number {
  const available = [...sets]
    .sort((a, b) => a.setNumber - b.setNumber)
    .find((set) => !usedNumbers.includes(set.setNumber) && canFillSpokenSet(set, weightKg ?? 0));
  return (
    available?.setNumber ?? Math.max(0, ...sets.map((set) => set.setNumber), ...usedNumbers) + 1
  );
}

/** Rechecks current data and saves all rows in one transaction; retries never duplicate a set. */
export async function saveSpokenSets(
  log: ExerciseLog,
  input: SpokenSet[],
  db: AscendDatabase = getDb(),
): Promise<void> {
  if (!input.length || input.length > 20) throw new Error('Revisa la cantidad de series.');
  const rows = input.map((row) => spokenSetSchema.parse(row));
  if (new Set(rows.map((row) => row.setNumber)).size !== rows.length) {
    throw new Error('Cada serie debe tener un número distinto.');
  }
  await db.transaction('rw', db.sessions, db.exerciseLogs, db.setLogs, async () => {
    const session = await db.sessions.get(log.sessionId);
    const currentLog = await db.exerciseLogs.get(log.id);
    if (session?.status !== 'active' || !currentLog || currentLog.sessionId !== session.id) {
      throw new Error('La sesión ya terminó o el ejercicio fue eliminado.');
    }
    const existing = await db.setLogs.where('exerciseLogId').equals(log.id).toArray();
    const writes: SetLog[] = rows.map((row) => {
      const weightKg = weightToKg(row.weight, row.unit);
      const current = existing.find((set) => set.setNumber === row.setNumber);
      if (current && !canFillSpokenSet(current, weightKg)) {
        throw new Error(
          `La serie ${row.setNumber} ya tiene datos. Elige otra serie para conservar lo registrado.`,
        );
      }
      const data = {
        weightKg,
        reps: row.reps,
        ...(row.rir !== undefined ? { rir: row.rir } : {}),
        ...(row.rpe !== undefined ? { rpe: row.rpe } : {}),
        completed: true,
      };
      return current
        ? touch({ ...current, ...data })
        : newEntity<SetLog>({
            sessionId: log.sessionId,
            exerciseLogId: log.id,
            exerciseId: log.exerciseId,
            setNumber: row.setNumber,
            setType: 'efectiva',
            ...data,
          });
    });
    await db.setLogs.bulkPut(writes);
  });
}
