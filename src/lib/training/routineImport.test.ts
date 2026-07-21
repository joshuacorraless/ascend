import { beforeEach, describe, expect, it } from 'vitest';
import { getRepositories } from '@/lib/repositories';
import { newEntity } from '@/lib/factories';
import { applyRoutineImport, buildImportEntities, parseRoutineImport } from './routineImport';
import type { Exercise } from '@/lib/schema';

function existingExercise(name: string): Exercise {
  return newEntity<Exercise>({
    name,
    primaryMuscle: 'pecho',
    secondaryMuscles: [],
    type: 'compuesto',
    equipment: 'barra',
    trackingType: 'weight_reps',
    unilateral: false,
    archived: false,
  });
}

describe('parseRoutineImport', () => {
  it('mapea días (nombres con/sin acento) a 0-6 y ordena', () => {
    const r = parseRoutineImport(
      JSON.stringify({
        rutinas: [
          {
            nombre: 'Push',
            dias: ['Miércoles', 'lunes', 'dom'],
            ejercicios: [{ nombre: 'Press' }],
          },
        ],
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.routines[0]!.daysOfWeek).toEqual([0, 1, 3]);
  });

  it('aplica defaults de series/reps y reconoce sinónimos de músculo/equipo', () => {
    const r = parseRoutineImport(
      JSON.stringify({
        rutinas: [
          {
            nombre: 'A',
            ejercicios: [
              { nombre: 'Jalón', musculo: 'lat', equipo: 'cable', reps: '8-12' },
              { nombre: 'Fondos', equipo: 'bodyweight', series: 99 },
            ],
          },
        ],
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const [a, b] = r.routines[0]!.exercises;
    expect(a).toMatchObject({
      primaryMuscle: 'espalda',
      equipment: 'polea',
      repRangeMin: 8,
      repRangeMax: 12,
      targetSets: 3,
    });
    expect(b).toMatchObject({
      equipment: 'peso_corporal',
      trackingType: 'bodyweight_reps',
      targetSets: 20,
    }); // clamp 1..20
  });

  it('reconoce "al fallo" por campo explícito o dentro de reps', () => {
    const r = parseRoutineImport(
      JSON.stringify({
        rutinas: [
          {
            nombre: 'A',
            ejercicios: [
              { nombre: 'Curl', alFallo: true },
              { nombre: 'Fondos', fallo: 'sí' },
              { nombre: 'Remo', reps: 'al fallo' },
              { nombre: 'Press', reps: '6-10 AMRAP' },
              { nombre: 'Jalón', reps: '8-12', alFallo: false },
              { nombre: 'Sentadilla', reps: '5-8' },
            ],
          },
        ],
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const exs = r.routines[0]!.exercises;
    expect(exs.map((e) => e.toFailure)).toEqual([true, true, true, true, false, false]);
    // El rango sigue presente (defaults) aunque sea al fallo, como en el editor.
    expect(exs[0]).toMatchObject({ repRangeMin: 8, repRangeMax: 12 });
    expect(exs[3]).toMatchObject({ repRangeMin: 6, repRangeMax: 10 });
  });

  it('acepta un arreglo de rutinas y una rutina suelta', () => {
    expect(
      parseRoutineImport(JSON.stringify([{ nombre: 'X', ejercicios: [{ nombre: 'Y' }] }])).ok,
    ).toBe(true);
    expect(
      parseRoutineImport(JSON.stringify({ nombre: 'X', ejercicios: [{ nombre: 'Y' }] })).ok,
    ).toBe(true);
  });

  it('rechaza JSON inválido o sin ejercicios', () => {
    expect(parseRoutineImport('no es json').ok).toBe(false);
    expect(
      parseRoutineImport(JSON.stringify({ rutinas: [{ nombre: 'A', ejercicios: [] }] })).ok,
    ).toBe(false);
  });
});

describe('buildImportEntities', () => {
  it('reutiliza ejercicios existentes por nombre (sin acentos) y no los duplica', () => {
    const existing = [existingExercise('Press de Banca')];
    const parsed = parseRoutineImport(
      JSON.stringify({
        rutinas: [
          { nombre: 'Push', ejercicios: [{ nombre: 'press de banca' }, { nombre: 'Aperturas' }] },
        ],
      }),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const { newExercises, routines } = buildImportEntities(parsed.routines, existing);
    // Solo "Aperturas" es nuevo; "press de banca" se casa con el existente.
    expect(newExercises.map((e) => e.name)).toEqual(['Aperturas']);
    expect(routines[0]!.exercises[0]!.exerciseId).toBe(existing[0]!.id);
  });

  it('propaga toFailure al ejercicio de la rutina construida', () => {
    const parsed = parseRoutineImport(
      JSON.stringify({
        rutinas: [
          { nombre: 'A', ejercicios: [{ nombre: 'Curl', alFallo: true }, { nombre: 'Remo' }] },
        ],
      }),
    );
    if (!parsed.ok) throw new Error('parse falló');
    const { routines } = buildImportEntities(parsed.routines, []);
    expect(routines[0]!.exercises.map((e) => e.toFailure)).toEqual([true, false]);
  });

  it('deduplica ejercicios repetidos dentro del mismo import', () => {
    const parsed = parseRoutineImport(
      JSON.stringify({
        rutinas: [
          { nombre: 'Lun', ejercicios: [{ nombre: 'Sentadilla' }] },
          { nombre: 'Vie', ejercicios: [{ nombre: 'sentadilla' }] },
        ],
      }),
    );
    if (!parsed.ok) throw new Error('parse falló');
    const { newExercises, routines } = buildImportEntities(parsed.routines, []);
    expect(newExercises).toHaveLength(1);
    expect(routines[0]!.exercises[0]!.exerciseId).toBe(routines[1]!.exercises[0]!.exerciseId);
  });
});

describe('applyRoutineImport (integración)', () => {
  beforeEach(async () => {
    await getRepositories().storage.clearAll();
  });

  it('persiste ejercicios nuevos y rutinas, y es aditivo al reimportar', async () => {
    const repos = getRepositories();
    const parsed = parseRoutineImport(
      JSON.stringify({
        rutinas: [{ nombre: 'Push', dias: ['lunes'], ejercicios: [{ nombre: 'Press' }] }],
      }),
    );
    if (!parsed.ok) throw new Error('parse falló');

    const first = await applyRoutineImport(parsed.routines);
    expect(first).toMatchObject({ routinesCreated: 1, exercisesCreated: 1 });
    expect(await repos.exercises.list()).toHaveLength(1);

    // Reimportar vuelve a crear la rutina, pero no duplica el ejercicio.
    const second = await applyRoutineImport(parsed.routines);
    expect(second.exercisesCreated).toBe(0);
    expect(await repos.exercises.list()).toHaveLength(1);
    expect(await repos.routines.list()).toHaveLength(2);
  });
});
