import { z } from 'zod';
import { baseEntityShape, isoSchema, localDateSchema, positiveNumber } from './common';

/** Registro de peso corporal. El peso se guarda internamente en kilogramos. */
export const bodyWeightEntrySchema = z.object({
  ...baseEntityShape,
  localDate: localDateSchema,
  loggedAt: isoSchema,
  weightKg: positiveNumber,
  /** Hora opcional en formato HH:mm. */
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'hora inválida (HH:mm)')
    .optional(),
  notes: z.string().optional(),
});
export type BodyWeightEntry = z.infer<typeof bodyWeightEntrySchema>;
