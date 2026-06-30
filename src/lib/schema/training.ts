import { z } from 'zod';
import {
  baseEntityShape,
  dayOfWeekSchema,
  equipmentSchema,
  exerciseTypeSchema,
  idSchema,
  isoSchema,
  localDateSchema,
  muscleGroupSchema,
  nonNegativeNumber,
  sessionStatusSchema,
  setTypeSchema,
  trackingTypeSchema,
  weightUnitSchema,
} from './common';

/** Definición de un ejercicio (biblioteca). Plantilla, no un registro. */
export const exerciseSchema = z.object({
  ...baseEntityShape,
  name: z.string().min(1, 'nombre requerido'),
  /** Detalle breve mostrado bajo el nombre (variante, agarre, ángulo…). */
  description: z.string().optional(),
  primaryMuscle: muscleGroupSchema,
  secondaryMuscles: z.array(muscleGroupSchema),
  type: exerciseTypeSchema,
  equipment: equipmentSchema,
  trackingType: trackingTypeSchema,
  unilateral: z.boolean(),
  notes: z.string().optional(),
  archived: z.boolean(),
});
export type Exercise = z.infer<typeof exerciseSchema>;

/** Ejercicio dentro de una rutina (plantilla): objetivos, no registros reales. */
export const routineExerciseSchema = z.object({
  exerciseId: idSchema,
  order: z.number().int().min(0),
  targetSets: z.number().int().min(1).max(20),
  repRangeMin: z.number().int().min(1).max(100),
  repRangeMax: z.number().int().min(1).max(100),
  restSeconds: z.number().int().min(0).max(3600).optional(),
  /** Series llevadas al fallo: se registran las reps reales alcanzadas. */
  toFailure: z.boolean().optional(),
  notes: z.string().optional(),
});
export type RoutineExercise = z.infer<typeof routineExerciseSchema>;

/** Rutina/programa de entrenamiento (plantilla reutilizable). */
export const workoutRoutineSchema = z.object({
  ...baseEntityShape,
  name: z.string().min(1, 'nombre requerido'),
  description: z.string().optional(),
  daysOfWeek: z.array(dayOfWeekSchema),
  exercises: z.array(routineExerciseSchema),
  active: z.boolean(),
  archived: z.boolean(),
});
export type WorkoutRoutine = z.infer<typeof workoutRoutineSchema>;

/** Sesión de entrenamiento ejecutada (instancia, separada de la plantilla). */
export const workoutSessionSchema = z.object({
  ...baseEntityShape,
  /** Rutina de origen (puede ser nula si fue una sesión libre). */
  routineId: idSchema.optional(),
  /** Snapshot del nombre de la rutina/sesión. */
  name: z.string().min(1),
  localDate: localDateSchema,
  startedAt: isoSchema,
  endedAt: isoSchema.optional(),
  durationSeconds: nonNegativeNumber.optional(),
  status: sessionStatusSchema,
  notes: z.string().optional(),
});
export type WorkoutSession = z.infer<typeof workoutSessionSchema>;

/** Un ejercicio dentro de una sesión concreta. */
export const exerciseLogSchema = z.object({
  ...baseEntityShape,
  sessionId: idSchema,
  exerciseId: idSchema,
  /** Snapshot del nombre del ejercicio en el momento de la sesión. */
  exerciseName: z.string().min(1),
  trackingType: trackingTypeSchema,
  order: z.number().int().min(0),
  /** Unidad de peso elegida para ESTE ejercicio en la sesión (kg por defecto). */
  weightUnit: weightUnitSchema.optional(),
  notes: z.string().optional(),
});
export type ExerciseLog = z.infer<typeof exerciseLogSchema>;

/** Una serie registrada. El peso se guarda internamente en kilogramos. */
export const setLogSchema = z.object({
  ...baseEntityShape,
  sessionId: idSchema,
  exerciseLogId: idSchema,
  exerciseId: idSchema,
  setNumber: z.number().int().min(1),
  weightKg: nonNegativeNumber,
  reps: nonNegativeNumber,
  /** RPE 1-10 o RIR; opcional. */
  rpe: z.number().min(0).max(10).optional(),
  setType: setTypeSchema,
  completed: z.boolean(),
  notes: z.string().optional(),
});
export type SetLog = z.infer<typeof setLogSchema>;
