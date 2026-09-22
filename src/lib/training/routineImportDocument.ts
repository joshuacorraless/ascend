import { z } from 'zod';
import { equipmentSchema, muscleGroupSchema } from '@/lib/schema';
import type { ParsedRoutine } from './routineImport';

export const MAX_ROUTINE_FILE_BYTES = 3 * 1024 * 1024;
export const MAX_ROUTINE_TEXT_LENGTH = 50_000;
export const ROUTINE_DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

const nullableInteger = (min: number, max: number) => z.number().int().min(min).max(max).nullable();

// Missing prescriptions stay null until the user reviews them. Never insert 3 × 8–12 defaults.
export const routineDocumentExerciseSchema = z.object({
  name: z.string().trim().min(1).max(200),
  targetSets: nullableInteger(1, 20),
  repRangeMin: nullableInteger(1, 100),
  repRangeMax: nullableInteger(1, 100),
  toFailure: z.boolean().nullable(),
  restSeconds: nullableInteger(0, 3600),
  equipment: equipmentSchema.nullable(),
  primaryMuscle: muscleGroupSchema.nullable(),
  prescribedSets: z
    .array(
      z.object({
        repRangeMin: nullableInteger(1, 100),
        repRangeMax: nullableInteger(1, 100),
        toFailure: z.boolean().nullable(),
        notes: z.string().max(1000),
      }),
    )
    .min(1)
    .max(20)
    .nullable(),
  notes: z.string().max(4000),
  source: z.string().max(4000),
});

export const routineDocumentSchema = z.object({
  routines: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(200),
        description: z.string().max(4000),
        daysOfWeek: z.array(z.number().int().min(0).max(6)).max(7),
        exercises: z.array(routineDocumentExerciseSchema).min(1).max(60),
      }),
    )
    .min(1)
    .max(21),
  warnings: z.array(z.string().max(1000)).max(100),
});

export type RoutineDocument = z.infer<typeof routineDocumentSchema>;
export type RoutineDocumentExercise = z.infer<typeof routineDocumentExerciseSchema>;
export type RoutineDocumentInput = { text: string } | { base64: string; mimeType: string };

/** Explicit review actions preserve other sets and never infer new prescriptions. */
export function editRoutineDocumentSets(
  exercise: RoutineDocumentExercise,
  action: { type: 'add' } | { type: 'remove'; index: number },
): RoutineDocumentExercise {
  if (!exercise.prescribedSets) return exercise;
  const sets = exercise.prescribedSets;
  if (action.type === 'add') {
    if (sets.length >= 20) return exercise;
    const prescribedSets = [
      ...sets,
      { repRangeMin: null, repRangeMax: null, toFailure: null, notes: '' },
    ];
    return { ...exercise, prescribedSets, targetSets: prescribedSets.length };
  }
  if (sets.length <= 1 || action.index < 0 || action.index >= sets.length) return exercise;
  const prescribedSets = sets.filter((_, index) => index !== action.index);
  return { ...exercise, prescribedSets, targetSets: prescribedSets.length };
}

export function validateRoutineFile(file: Pick<File, 'type' | 'size' | 'name'>): string | null {
  const isText =
    file.type === 'text/plain' ||
    file.type === 'application/json' ||
    /\.(txt|json)$/i.test(file.name);
  if (!isText && !ROUTINE_DOCUMENT_TYPES.includes(file.type)) {
    return 'Elegí un PDF, una imagen JPG, PNG o WebP, o un archivo TXT.';
  }
  if (!file.size) return 'El archivo está vacío.';
  if (file.size > MAX_ROUTINE_FILE_BYTES)
    return 'El archivo supera los 3 MB. Elegí una versión más ligera.';
  return null;
}

export async function readRoutineFile(file: File): Promise<RoutineDocumentInput> {
  const error = validateRoutineFile(file);
  if (error) throw new Error(error);
  if (
    file.type === 'text/plain' ||
    file.type === 'application/json' ||
    /\.(txt|json)$/i.test(file.name)
  ) {
    const text = await file.text();
    if (text.length > MAX_ROUTINE_TEXT_LENGTH)
      throw new Error('El texto supera los 50.000 caracteres.');
    return { text };
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo. Volvé a elegirlo.'));
    reader.onload = () =>
      resolve({
        base64: String(reader.result).split(',')[1] ?? '',
        mimeType: file.type,
      });
    reader.readAsDataURL(file);
  });
}

export async function analyzeRoutineDocument(
  input: RoutineDocumentInput,
  signal?: AbortSignal,
): Promise<RoutineDocument> {
  let response: Response;
  try {
    response = await fetch('/api/analyze-routine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal,
    });
  } catch (error) {
    if (signal?.aborted)
      throw new Error('Se canceló el análisis. Podés reintentarlo con el mismo archivo.');
    throw new Error(
      error instanceof TypeError
        ? 'Sin conexión. Tu archivo sigue aquí para reintentar.'
        : 'No se pudo analizar la rutina.',
    );
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
        ? body.error
        : `No se pudo analizar la rutina (${response.status}).`;
    throw new Error(message);
  }
  const parsed = routineDocumentSchema.safeParse(
    body && typeof body === 'object' && 'analysis' in body ? body.analysis : null,
  );
  if (!parsed.success)
    throw new Error(
      'La respuesta está incompleta. Reintentá con el mismo archivo o con el texto de la rutina.',
    );
  return parsed.data;
}

export function routineDocumentIssues(document: RoutineDocument): string[] {
  const issues: string[] = [];
  if (!document.routines.length) issues.push('Agregá al menos una rutina.');
  document.routines.forEach((routine, r) => {
    if (!routine.name.trim()) issues.push(`Rutina ${r + 1}: falta el nombre.`);
    if (!routine.exercises.length) issues.push(`${routine.name}: no tiene ejercicios.`);
    routine.exercises.forEach((exercise, i) => {
      const prefix = `${routine.name} · ${exercise.name || `ejercicio ${i + 1}`}`;
      if (!exercise.name.trim()) issues.push(`${prefix}: falta el nombre.`);
      if (exercise.targetSets === null) issues.push(`${prefix}: indicá las series.`);
      if (exercise.equipment === null) issues.push(`${prefix}: elegí el equipo.`);
      if (
        !exercise.prescribedSets &&
        !exercise.toFailure &&
        (exercise.repRangeMin === null || exercise.repRangeMax === null)
      )
        issues.push(`${prefix}: indicá las repeticiones o marcá al fallo.`);
      if (
        exercise.repRangeMin !== null &&
        exercise.repRangeMax !== null &&
        exercise.repRangeMin > exercise.repRangeMax
      )
        issues.push(`${prefix}: el mínimo de reps supera el máximo.`);
      if (exercise.prescribedSets) {
        if (exercise.prescribedSets.length !== exercise.targetSets)
          issues.push(
            `${prefix}: la cantidad de series no coincide con los objetivos individuales.`,
          );
        exercise.prescribedSets.forEach((set, s) => {
          if (!set.toFailure && (set.repRangeMin === null || set.repRangeMax === null))
            issues.push(`${prefix}, serie ${s + 1}: faltan repeticiones.`);
          if (
            set.repRangeMin !== null &&
            set.repRangeMax !== null &&
            set.repRangeMin > set.repRangeMax
          )
            issues.push(`${prefix}, serie ${s + 1}: revisá el rango de reps.`);
        });
      }
    });
  });
  if (!routineDocumentSchema.safeParse(document).success)
    issues.push('Revisá los límites: 1–20 series, 1–100 reps y 0–3600 segundos de descanso.');
  return issues;
}

export function prepareRoutineDocument(document: RoutineDocument): ParsedRoutine[] {
  const issues = routineDocumentIssues(document);
  if (issues.length) throw new Error(issues[0]);
  return document.routines.map((routine) => ({
    name: routine.name.trim(),
    description: routine.description.trim() || undefined,
    daysOfWeek: [...new Set(routine.daysOfWeek)],
    exercises: routine.exercises.map((exercise) => ({
      name: exercise.name.trim(),
      targetSets: exercise.targetSets!,
      // The legacy schema requires a numeric range; failure-only sets never use it as a target.
      repRangeMin: exercise.repRangeMin ?? 1,
      repRangeMax: exercise.repRangeMax ?? 100,
      toFailure: exercise.toFailure === true,
      ...(exercise.prescribedSets
        ? {
            prescribedSets: exercise.prescribedSets.map((set) => ({
              ...(set.repRangeMin !== null ? { repRangeMin: set.repRangeMin } : {}),
              ...(set.repRangeMax !== null ? { repRangeMax: set.repRangeMax } : {}),
              toFailure: set.toFailure === true,
              ...(set.notes ? { notes: set.notes } : {}),
            })),
          }
        : exercise.toFailure && exercise.repRangeMin === null && exercise.repRangeMax === null
          ? {
              prescribedSets: Array.from({ length: exercise.targetSets! }, () => ({
                toFailure: true,
              })),
            }
          : {}),
      equipment: exercise.equipment!,
      primaryMuscle: exercise.primaryMuscle ?? 'otro',
      type: 'otro',
      trackingType: exercise.equipment === 'peso_corporal' ? 'bodyweight_reps' : 'weight_reps',
      ...(exercise.restSeconds !== null ? { restSeconds: exercise.restSeconds } : {}),
      ...(exercise.notes.trim() ? { notes: exercise.notes.trim() } : {}),
    })),
  }));
}
