import type { Macros, NutritionGoal } from '@/lib/schema';

/**
 * Evalúa si un día cumplió los hábitos (para el calendario de Progreso):
 * macros, hidratación y suplementos. Función pura y testeable; la carga de
 * datos vive en el hook de la pantalla.
 */

/** Fracción del objetivo de macros que se considera "cumplido". */
export const MACRO_GOAL_THRESHOLD = 0.9;

export type HabitLevel = 'complete' | 'partial' | 'none' | 'empty';

export interface HabitDayInput {
  goal: NutritionGoal | undefined;
  /** Macros consumidos en el día (totales). */
  macros: Pick<Macros, 'calories' | 'protein'>;
  /** Agua consumida en el día (ml). */
  waterMl: number;
  /** Suplementos programados para ese día de la semana. */
  scheduledSupplements: number;
  /** De los programados, cuántos quedaron marcados como tomados. */
  completedSupplements: number;
  /** Si hubo cualquier actividad ese día (comida, agua o suplemento). */
  hasAnyData: boolean;
}

export interface HabitDayStatus {
  macros: boolean;
  water: boolean;
  supplements: boolean;
  level: HabitLevel;
}

export function dayHabitStatus(input: HabitDayInput): HabitDayStatus {
  const { goal, macros, waterMl, scheduledSupplements, completedSupplements, hasAnyData } = input;

  const macrosMet =
    !!goal && goal.calories > 0 && goal.protein > 0
      ? macros.calories >= goal.calories * MACRO_GOAL_THRESHOLD &&
        macros.protein >= goal.protein * MACRO_GOAL_THRESHOLD
      : false;

  const waterMet = !!goal && goal.waterMl > 0 ? waterMl >= goal.waterMl : false;

  // Si no hay suplementos programados ese día, no hay nada que cumplir → cuenta como ok.
  const supplementsMet =
    scheduledSupplements === 0 ? true : completedSupplements >= scheduledSupplements;

  const metCount = [macrosMet, waterMet, supplementsMet].filter(Boolean).length;

  let level: HabitLevel;
  if (!hasAnyData) level = 'empty';
  else if (macrosMet && waterMet && supplementsMet) level = 'complete';
  else if (metCount > 0) level = 'partial';
  else level = 'none';

  return { macros: macrosMet, water: waterMet, supplements: supplementsMet, level };
}
