import { z } from 'zod';
import {
  baseEntityShape,
  oneRmFormulaSchema,
  themeSchema,
  volumeUnitSchema,
  weightUnitSchema,
} from './common';

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
  /** Si el usuario ya pasó por la pantalla inicial de configuración. */
  onboarded: z.boolean(),
});

export type UserSettings = z.infer<typeof userSettingsSchema>;

export const SETTINGS_ID = 'singleton' as const;
