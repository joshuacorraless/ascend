import { z } from 'zod';

/** Versión del esquema persistido; las migraciones de Dexie y del import JSON dependen de ella. */
export const SCHEMA_VERSION = 1;

// Primitivas reutilizables

/** Identificador único (UUID v4 generado con crypto.randomUUID). */
export const idSchema = z.string().min(1, 'id requerido');

/** Marca de tiempo ISO 8601 (la producimos con Date.toISOString()). */
export const isoSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/,
    'fecha-hora ISO inválida',
  );

/** Fecha local en formato YYYY-MM-DD (clave del "día" del usuario). */
export const localDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'fecha local inválida (YYYY-MM-DD)');

/** Número finito y no negativo (kcal, gramos, ml, peso…). */
export const nonNegativeNumber = z
  .number({ invalid_type_error: 'debe ser un número' })
  .finite('número inválido')
  .min(0, 'no puede ser negativo');

/** Número finito estrictamente positivo (tamaños de porción, cantidades…). */
export const positiveNumber = z
  .number({ invalid_type_error: 'debe ser un número' })
  .finite('número inválido')
  .gt(0, 'debe ser mayor que 0');

/** Campos comunes a toda entidad persistida. */
export const baseEntityShape = {
  id: idSchema,
  createdAt: isoSchema,
  updatedAt: isoSchema,
};

// Enums de dominio

/** Ids de los tiempos de comida por defecto (el usuario puede añadir más). */
export const mealTypes = ['desayuno', 'almuerzo', 'cena', 'merienda'] as const;
/** Id libre (string) para admitir tiempos de comida personalizados además de los por defecto. */
export const mealTypeSchema = z.string().min(1, 'tiempo de comida requerido');
export type MealType = z.infer<typeof mealTypeSchema>;

export const weightUnitSchema = z.enum(['kg', 'lb']);
export type WeightUnit = z.infer<typeof weightUnitSchema>;

export const volumeUnitSchema = z.enum(['ml', 'l']);
export type VolumeUnit = z.infer<typeof volumeUnitSchema>;

/** Unidad del tamaño de porción de un alimento. */
export const portionUnitSchema = z.enum(['g', 'ml', 'unidad', 'porcion']);
export type PortionUnit = z.infer<typeof portionUnitSchema>;

export const foodSourceSchema = z.enum(['manual', 'ai', 'import', 'demo']);
export type FoodSource = z.infer<typeof foodSourceSchema>;

export const muscleGroups = [
  'pecho',
  'espalda',
  'hombros',
  'biceps',
  'triceps',
  'cuadriceps',
  'femoral',
  'gluteo',
  'gemelo',
  'core',
  'antebrazo',
  'trapecio',
  'cardio',
  'otro',
] as const;
export const muscleGroupSchema = z.enum(muscleGroups);
export type MuscleGroup = z.infer<typeof muscleGroupSchema>;

export const exerciseTypeSchema = z.enum(['compuesto', 'aislamiento', 'cardio', 'otro']);
export type ExerciseType = z.infer<typeof exerciseTypeSchema>;

export const equipmentSchema = z.enum([
  'barra',
  'mancuerna',
  'maquina',
  'polea',
  'peso_corporal',
  'smith',
]);
export type Equipment = z.infer<typeof equipmentSchema>;

/** Cómo se registra/grafica el ejercicio. */
export const trackingTypeSchema = z.enum(['weight_reps', 'bodyweight_reps', 'time', 'distance']);
export type TrackingType = z.infer<typeof trackingTypeSchema>;

export const setTypeSchema = z.enum(['calentamiento', 'efectiva', 'dropset', 'fallo']);
export type SetType = z.infer<typeof setTypeSchema>;

export const supplementTimeSchema = z.enum([
  'mañana',
  'tarde',
  'noche',
  'preentreno',
  'postentreno',
  'con_comida',
  'otro',
]);
export type SupplementTime = z.infer<typeof supplementTimeSchema>;

/** 0 = domingo … 6 = sábado (consistente con Date.getDay()). */
export const dayOfWeekSchema = z.number().int().min(0).max(6);

export const sessionStatusSchema = z.enum(['active', 'completed', 'cancelled']);
export type SessionStatus = z.infer<typeof sessionStatusSchema>;

export const oneRmFormulaSchema = z.enum(['epley']);
export type OneRmFormula = z.infer<typeof oneRmFormulaSchema>;

export const themeSchema = z.enum(['light', 'dark', 'system']);
export type ThemePreference = z.infer<typeof themeSchema>;
