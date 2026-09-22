import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  analyzeRoutineDocument,
  editRoutineDocumentSets,
  prepareRoutineDocument,
  routineDocumentIssues,
  routineDocumentSchema,
  validateRoutineFile,
  type RoutineDocument,
} from './routineImportDocument';
import { applyRoutineImport, buildImportEntities } from './routineImport';
import { getRepositories } from '@/lib/repositories';
import { getDb } from '@/lib/db/database';
import {
  routinePrescriptionNotes,
  startSessionFromRoutine,
} from '@/features/training/sessionActions';

export function reviewFixture(): RoutineDocument {
  return {
    routines: [
      {
        name: 'Lunes · Empuje',
        description: 'Calentar antes de empezar',
        daysOfWeek: [1],
        exercises: [
          {
            name: 'Pec deck',
            targetSets: 2,
            repRangeMin: 6,
            repRangeMax: 8,
            toFailure: null,
            restSeconds: 120,
            equipment: 'maquina',
            primaryMuscle: 'pecho',
            notes: 'Movimiento controlado',
            source: 'Pec deck 2 × 6–8. Serie 1 RIR 1. Serie 2 RIR 0 técnico.',
            prescribedSets: [
              { repRangeMin: 6, repRangeMax: 8, toFailure: false, notes: 'RIR 1' },
              { repRangeMin: 6, repRangeMax: 8, toFailure: true, notes: 'RIR 0 técnico' },
            ],
          },
        ],
      },
    ],
    warnings: [],
  };
}

afterEach(() => vi.restoreAllMocks());

describe('document routine import', () => {
  it('repairs per-set counts with explicit add/remove while preserving order and leaving new targets empty', () => {
    const document = reviewFixture();
    const original = document.routines[0]!.exercises[0]!;
    const added = editRoutineDocumentSets(original, { type: 'add' });
    expect(added.targetSets).toBe(3);
    expect(added.prescribedSets!.slice(0, 2)).toEqual(original.prescribedSets);
    expect(added.prescribedSets![2]).toEqual({
      repRangeMin: null,
      repRangeMax: null,
      toFailure: null,
      notes: '',
    });
    document.routines[0]!.exercises[0] = added;
    expect(routineDocumentIssues(document)).toEqual(
      expect.arrayContaining([expect.stringContaining('serie 3: faltan repeticiones')]),
    );
    const removed = editRoutineDocumentSets(added, { type: 'remove', index: 0 });
    expect(removed.targetSets).toBe(2);
    expect(removed.prescribedSets![0]!.notes).toBe('RIR 0 técnico');
    expect(original.prescribedSets).toHaveLength(2);
    const onlyOne = editRoutineDocumentSets(removed, { type: 'remove', index: 1 });
    expect(editRoutineDocumentSets(onlyOne, { type: 'remove', index: 0 })).toBe(onlyOne);
  });
  it('keeps missing prescriptions empty and refuses to invent set or rep counts', () => {
    const document = reviewFixture();
    Object.assign(document.routines[0]!.exercises[0]!, {
      targetSets: null,
      repRangeMin: null,
      repRangeMax: null,
      prescribedSets: null,
    });
    expect(routineDocumentSchema.parse(document).routines[0]!.exercises[0]!.targetSets).toBeNull();
    expect(routineDocumentIssues(document)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('indicá las series'),
        expect.stringContaining('indicá las repeticiones'),
      ]),
    );
    expect(() => prepareRoutineDocument(document)).toThrow('indicá las series');
  });

  it('preserves exact day/exercise ordering, failure and individual rep prescriptions', () => {
    const document = reviewFixture();
    document.routines[0]!.exercises[0]!.prescribedSets![0]!.repRangeMin = 10;
    document.routines[0]!.exercises[0]!.prescribedSets![0]!.repRangeMax = 12;
    document.routines.push({
      ...structuredClone(document.routines[0]!),
      name: 'Viernes',
      daysOfWeek: [5],
    });
    const parsed = prepareRoutineDocument(document);
    expect(parsed.map((routine) => routine.daysOfWeek)).toEqual([[1], [5]]);
    expect(parsed[0]!.exercises[0]!.prescribedSets).toEqual([
      { repRangeMin: 10, repRangeMax: 12, toFailure: false, notes: 'RIR 1' },
      { repRangeMin: 6, repRangeMax: 8, toFailure: true, notes: 'RIR 0 técnico' },
    ]);
    expect(parsed[0]!.exercises[0]!.restSeconds).toBe(120);
  });

  it('rejects mismatched per-set count, inverted ranges and out-of-bounds values', () => {
    const document = reviewFixture();
    const exercise = document.routines[0]!.exercises[0]!;
    exercise.targetSets = 3;
    exercise.prescribedSets![0]!.repRangeMin = 12;
    exercise.restSeconds = -1;
    const issues = routineDocumentIssues(document);
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining('cantidad de series'),
        expect.stringContaining('revisá el rango'),
        expect.stringContaining('límites'),
      ]),
    );
    expect(() => prepareRoutineDocument(document)).toThrow();
  });

  it('allows failure-only targets and preserves missing rest as absent', () => {
    const document = reviewFixture();
    Object.assign(document.routines[0]!.exercises[0]!, {
      repRangeMin: null,
      repRangeMax: null,
      toFailure: true,
      prescribedSets: null,
      restSeconds: null,
    });
    expect(routineDocumentIssues(document)).toEqual([]);
    expect(prepareRoutineDocument(document)[0]!.exercises[0]).toMatchObject({ toFailure: true });
    expect(prepareRoutineDocument(document)[0]!.exercises[0]).not.toHaveProperty('restSeconds');
  });

  it('never displays the legacy numeric placeholder for a uniform failure-only target', () => {
    const document = reviewFixture();
    Object.assign(document.routines[0]!.exercises[0]!, {
      repRangeMin: null,
      repRangeMax: null,
      toFailure: true,
      prescribedSets: null,
    });
    const { routines } = buildImportEntities(prepareRoutineDocument(document), []);
    const imported = routines[0]!.exercises[0]!;
    expect(imported.prescribedSets).toEqual([{ toFailure: true }, { toFailure: true }]);
    const notes = routinePrescriptionNotes(imported);
    expect(notes).toContain('Serie 1: al fallo\nSerie 2: al fallo');
    expect(notes).not.toContain('1–100');
    expect(notes).not.toContain('reps');
  });

  it('keeps an actual uniform rep range when the same exercise also prescribes failure', () => {
    const document = reviewFixture();
    Object.assign(document.routines[0]!.exercises[0]!, { toFailure: true, prescribedSets: null });
    const { routines } = buildImportEntities(prepareRoutineDocument(document), []);
    expect(routinePrescriptionNotes(routines[0]!.exercises[0]!)).toContain(
      '2 series · 6–8 reps · al fallo',
    );
  });

  it('rejects unsupported, empty and oversize uploads', () => {
    expect(
      validateRoutineFile({ name: 'plan.pdf', type: 'application/pdf', size: 100 }),
    ).toBeNull();
    expect(
      validateRoutineFile({ name: 'plan.exe', type: 'application/octet-stream', size: 100 }),
    ).toContain('Elegí');
    expect(validateRoutineFile({ name: 'plan.pdf', type: 'application/pdf', size: 0 })).toContain(
      'vacío',
    );
    expect(
      validateRoutineFile({ name: 'plan.pdf', type: 'application/pdf', size: 3 * 1024 * 1024 + 1 }),
    ).toContain('3 MB');
  });

  it('surfaces provider overload, then accepts a retry with the same input', async () => {
    const fetcher = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'IA ocupada' }), { status: 429 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ analysis: reviewFixture() })));
    const input = { text: 'Lunes: Pec deck 2x6-8' };
    await expect(analyzeRoutineDocument(input)).rejects.toThrow('IA ocupada');
    await expect(analyzeRoutineDocument(input)).resolves.toEqual(reviewFixture());
    expect(fetcher.mock.calls[0]![1]!.body).toBe(fetcher.mock.calls[1]![1]!.body);
  });

  it('rejects malformed provider output before any routine is saved', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ analysis: { routines: [] } })),
    );
    await expect(analyzeRoutineDocument({ text: 'Lunes' })).rejects.toThrow('incompleta');
  });
});

describe('reviewed import persistence', () => {
  beforeEach(async () => getRepositories().storage.clearAll());

  it('rolls back a partially initialized session and preserves a replaced session on write failure', async () => {
    const repos = getRepositories();
    const { routines, newExercises } = buildImportEntities(
      prepareRoutineDocument(reviewFixture()),
      [],
    );
    const routine = routines[0]!;
    const exercises = new Map(newExercises.map((exercise) => [exercise.id, exercise]));
    const originalId = await startSessionFromRoutine(routine, exercises, '2026-09-22');
    const originalSets = await repos.workout.listSetLogs(originalId);
    const originalPut = repos.workout.putSetLog;
    vi.spyOn(repos.workout, 'putSetLog')
      .mockImplementationOnce(originalPut)
      .mockRejectedValueOnce(new Error('Sin espacio'));
    await expect(
      startSessionFromRoutine(routine, exercises, '2026-09-22', { replaceSessionId: originalId }),
    ).rejects.toThrow('Sin espacio');
    expect(await getDb().sessions.count()).toBe(1);
    expect((await repos.workout.getActiveSession())!.id).toBe(originalId);
    expect(await repos.workout.listSetLogs(originalId)).toEqual(originalSets);
    expect(await getDb().exerciseLogs.count()).toBe(1);
    expect(await getDb().setLogs.count()).toBe(2);
  });

  it('allows only one concurrent session initialization', async () => {
    const { routines, newExercises } = buildImportEntities(
      prepareRoutineDocument(reviewFixture()),
      [],
    );
    const exercises = new Map(newExercises.map((exercise) => [exercise.id, exercise]));
    const results = await Promise.allSettled([
      startSessionFromRoutine(routines[0]!, exercises, '2026-09-22'),
      startSessionFromRoutine(routines[0]!, exercises, '2026-09-22'),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(await getDb().sessions.count()).toBe(1);
    expect(await getDb().setLogs.count()).toBe(2);
  });

  it('starts a session with exact target notes, correct failure flags and no fabricated performed weights/reps', async () => {
    const repos = getRepositories();
    await applyRoutineImport(prepareRoutineDocument(reviewFixture()), { activate: true });
    const routine = (await repos.routines.list())[0]!;
    expect(routine.active).toBe(true);
    const exercises = new Map(
      (await repos.exercises.list()).map((exercise) => [exercise.id, exercise]),
    );
    const sessionId = await startSessionFromRoutine(routine, exercises, '2026-09-22');
    const logs = await repos.workout.listExerciseLogs(sessionId);
    const sets = await repos.workout.listSetLogs(sessionId);
    expect(logs[0]!.notes).toContain('Serie 1: 6–8 reps · RIR 1');
    expect(logs[0]!.notes).toContain('RIR 0 técnico');
    expect(logs[0]!.notes).toContain('Serie 2: 6–8 reps · al fallo · RIR 0 técnico');
    expect(logs[0]!.notes).toContain('Descanso: 120 s');
    expect(sets.map((set) => set.setType)).toEqual(['efectiva', 'fallo']);
    expect(sets.every((set) => set.weightKg === 0 && set.reps === 0 && !set.completed)).toBe(true);
  });

  it('rolls back all exercises and routines if a later routine fails to save', async () => {
    const repos = getRepositories();
    const parsed = prepareRoutineDocument(reviewFixture());
    parsed.push({ ...parsed[0]!, name: 'Martes' });
    const realPut = repos.routines.put;
    vi.spyOn(repos.routines, 'put')
      .mockImplementationOnce(realPut)
      .mockRejectedValueOnce(new Error('Disco lleno'));
    await expect(applyRoutineImport(parsed)).rejects.toThrow('Disco lleno');
    expect(await repos.routines.list()).toHaveLength(0);
    expect(await repos.exercises.list()).toHaveLength(0);
  });
});
