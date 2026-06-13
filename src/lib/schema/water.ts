import { z } from 'zod';
import { baseEntityShape, isoSchema, localDateSchema, positiveNumber } from './common';

/** Registro individual de hidratación. El volumen se guarda en mililitros. */
export const waterEntrySchema = z.object({
  ...baseEntityShape,
  localDate: localDateSchema,
  loggedAt: isoSchema,
  amountMl: positiveNumber,
});
export type WaterEntry = z.infer<typeof waterEntrySchema>;
