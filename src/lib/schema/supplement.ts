import { z } from 'zod';
import {
  baseEntityShape,
  dayOfWeekSchema,
  idSchema,
  isoSchema,
  localDateSchema,
  supplementTimeSchema,
} from './common';

/** Definición de un suplemento configurado por el usuario. */
export const supplementSchema = z.object({
  ...baseEntityShape,
  name: z.string().min(1, 'nombre requerido'),
  /** Dosis libre opcional, p. ej. "5 g" o "1 cápsula". Sin recomendaciones médicas. */
  dose: z.string().optional(),
  time: supplementTimeSchema,
  /** Días de la semana en que se debe tomar (0-6). Vacío = todos los días. */
  daysOfWeek: z.array(dayOfWeekSchema),
  notes: z.string().optional(),
  archived: z.boolean(),
});
export type Supplement = z.infer<typeof supplementSchema>;

/**
 * Registro diario de un suplemento. Marcar como tomado crea/actualiza este
 * registro independiente; NO modifica la definición del suplemento.
 */
export const supplementLogSchema = z.object({
  ...baseEntityShape,
  supplementId: idSchema,
  localDate: localDateSchema,
  completed: z.boolean(),
  completedAt: isoSchema.optional(),
  // Snapshot para conservar el historial aunque cambie la definición:
  name: z.string().min(1),
  dose: z.string().optional(),
});
export type SupplementLog = z.infer<typeof supplementLogSchema>;
