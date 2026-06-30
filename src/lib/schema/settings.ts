import { z } from 'zod';
import {
  baseEntityShape,
  oneRmFormulaSchema,
  themeSchema,
  volumeUnitSchema,
  weightUnitSchema,
} from './common';

/** Un tiempo de comida configurable (Desayuno, Almuerzo, "Pre-entreno"…). */
export const mealDefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});
export type MealDef = z.infer<typeof mealDefSchema>;

/** Ajustes globales de la app (un único registro, id = 'singleton'). */
export const userSettingsSchema = z.object({
  ...baseEntityShape,
  id: z.literal('singleton'),
  /** Zona horaria IANA usada para calcular el "día" local. */
  timeZone: z.string().min(1),
  weightUnit: weightUnitSchema,
  volumeUnit: volumeUnitSchema,
  theme: themeSchema,
  locale: z.literal('es'),
  oneRmFormula: oneRmFormulaSchema,
  /** Tiempos de comida del usuario (en orden). Si falta, se usan los defaults. */
  meals: z.array(mealDefSchema).optional(),
  /** Si el usuario ya pasó por la pantalla inicial de configuración. */
  onboarded: z.boolean(),
});

export type UserSettings = z.infer<typeof userSettingsSchema>;

export const SETTINGS_ID = 'singleton' as const;
