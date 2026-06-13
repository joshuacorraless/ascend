import { z } from 'zod';
import { SCHEMA_VERSION, isoSchema } from './common';
import { userSettingsSchema } from './settings';
import { foodSchema, mealEntrySchema, nutritionGoalSchema, recipeSchema } from './nutrition';
import { waterEntrySchema } from './water';
import { supplementLogSchema, supplementSchema } from './supplement';
import {
  exerciseLogSchema,
  exerciseSchema,
  setLogSchema,
  workoutRoutineSchema,
  workoutSessionSchema,
} from './training';
import { bodyWeightEntrySchema } from './bodyweight';

/** Colección completa de datos del usuario. Una clave por tabla de Dexie. */
export const backupDataSchema = z.object({
  settings: userSettingsSchema.nullable(),
  goals: z.array(nutritionGoalSchema),
  foods: z.array(foodSchema),
  recipes: z.array(recipeSchema),
  mealEntries: z.array(mealEntrySchema),
  waterEntries: z.array(waterEntrySchema),
  supplements: z.array(supplementSchema),
  supplementLogs: z.array(supplementLogSchema),
  exercises: z.array(exerciseSchema),
  routines: z.array(workoutRoutineSchema),
  sessions: z.array(workoutSessionSchema),
  exerciseLogs: z.array(exerciseLogSchema),
  setLogs: z.array(setLogSchema),
  bodyWeightEntries: z.array(bodyWeightEntrySchema),
});
export type BackupData = z.infer<typeof backupDataSchema>;

/** Sobre del archivo de respaldo exportado/importado. */
export const backupEnvelopeSchema = z.object({
  app: z.literal('ascend'),
  schemaVersion: z.number().int().positive(),
  exportedAt: isoSchema,
  data: backupDataSchema,
});
export type BackupEnvelope = z.infer<typeof backupEnvelopeSchema>;

/** Lista ordenada de claves de tabla, fuente única de verdad para el respaldo. */
export const BACKUP_TABLE_KEYS = [
  'goals',
  'foods',
  'recipes',
  'mealEntries',
  'waterEntries',
  'supplements',
  'supplementLogs',
  'exercises',
  'routines',
  'sessions',
  'exerciseLogs',
  'setLogs',
  'bodyWeightEntries',
] as const;

export const CURRENT_SCHEMA_VERSION = SCHEMA_VERSION;
