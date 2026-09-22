import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AscendDatabase } from '@/lib/db/database';
import { newEntity } from '@/lib/factories';
import type { ExerciseLog, SetLog, WorkoutSession } from '@/lib/schema';
import { weightToKg } from '@/lib/units';
import { nextSpokenSetNumber, saveSpokenSets } from './voiceSetRepository';

let db: AscendDatabase;
let session: WorkoutSession;
let log: ExerciseLog;
let original: SetLog;

beforeEach(async () => {
  db = new AscendDatabase();
  await db.open();
  await Promise.all([db.sessions.clear(), db.exerciseLogs.clear(), db.setLogs.clear()]);
  session = newEntity<WorkoutSession>({
    name: 'Lunes',
    localDate: '2026-09-22',
    startedAt: new Date().toISOString(),
    status: 'active',
  });
  log = newEntity<ExerciseLog>({
    sessionId: session.id,
    exerciseId: 'pec-deck',
    exerciseName: 'Pec deck',
    trackingType: 'weight_reps',
    order: 0,
  });
  original = newEntity<SetLog>({
    sessionId: session.id,
    exerciseLogId: log.id,
    exerciseId: log.exerciseId,
    setNumber: 1,
    weightKg: 0,
    reps: 0,
    setType: 'efectiva',
    completed: false,
  });
  await db.sessions.put(session);
  await db.exerciseLogs.put(log);
  await db.setLogs.put(original);
});
afterEach(() => db.close());

describe('guardado de series dictadas', () => {
  it('convierte libras a kg, completa una serie vacía y agrega otra manteniendo RIR separado', async () => {
    await saveSpokenSets(
      log,
      [
        { setNumber: 1, weight: 170, unit: 'lb', reps: 8, rir: 0 },
        { setNumber: 2, weight: 170, unit: 'lb', reps: 7, rpe: 10 },
      ],
      db,
    );
    const rows = (await db.setLogs.toArray()).sort((a, b) => a.setNumber - b.setNumber);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ id: original.id, completed: true, reps: 8, rir: 0 });
    expect(rows[0]?.weightKg).toBeCloseTo(weightToKg(170, 'lb'), 6);
    expect(rows[0]?.rpe).toBeUndefined();
    expect(rows[1]).toMatchObject({ exerciseLogId: log.id, reps: 7, rpe: 10 });
  });

  it('no duplica datos si se vuelve a guardar el mismo registro', async () => {
    const rows = [{ setNumber: 1, weight: 170, unit: 'lb' as const, reps: 8 }];
    await saveSpokenSets(log, rows, db);
    await expect(saveSpokenSets(log, rows, db)).rejects.toThrow('ya tiene datos');
    expect(await db.setLogs.count()).toBe(1);
  });

  it('no guarda ninguna serie si otra cambió durante la revisión', async () => {
    await db.setLogs.put({ ...original, weightKg: 25, reps: 8, completed: true });
    await expect(
      saveSpokenSets(
        log,
        [
          { setNumber: 2, weight: 30, unit: 'kg', reps: 7 },
          { setNumber: 1, weight: 30, unit: 'kg', reps: 7 },
        ],
        db,
      ),
    ).rejects.toThrow('ya tiene datos');
    expect(await db.setLogs.count()).toBe(1);
    expect((await db.setLogs.get(original.id))?.weightKg).toBe(25);
  });

  it('rechaza sesión finalizada o ejercicio borrado y números repetidos', async () => {
    const row = { setNumber: 1, weight: 25, unit: 'kg' as const, reps: 8 };
    await expect(saveSpokenSets(log, [row, row], db)).rejects.toThrow('número distinto');
    await db.sessions.put({ ...session, status: 'completed' });
    await expect(saveSpokenSets(log, [row], db)).rejects.toThrow('sesión ya terminó');
    await db.sessions.put(session);
    await db.exerciseLogs.delete(log.id);
    await expect(saveSpokenSets(log, [row], db)).rejects.toThrow('ejercicio fue eliminado');
  });

  it('elige la próxima serie vacía sin pisar un peso distinto o datos parciales', () => {
    const sets = [
      { ...original, completed: true },
      { ...original, id: '2', setNumber: 2, weightKg: 25 },
      { ...original, id: '3', setNumber: 3, reps: 8 },
      { ...original, id: '4', setNumber: 4 },
    ];
    expect(nextSpokenSetNumber(sets, [], 30)).toBe(4);
    expect(nextSpokenSetNumber(sets, [], 25)).toBe(2);
    expect(nextSpokenSetNumber(sets, [4], 30)).toBe(5);
  });
});
