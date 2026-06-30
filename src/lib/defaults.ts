import { DEFAULT_TIME_ZONE, todayKey } from './datetime';
import { nowIso } from './ids';
import { newEntity } from './factories';
import type { MealDef, NutritionGoal, UserSettings } from './schema';
import { SETTINGS_ID } from './schema';

/** Tiempos de comida por defecto. El usuario puede añadir, renombrar y reordenar. */
export const DEFAULT_MEALS: MealDef[] = [
  { id: 'desayuno', name: 'Desayuno' },
  { id: 'almuerzo', name: 'Almuerzo' },
  { id: 'cena', name: 'Cena' },
  { id: 'merienda', name: 'Merienda' },
];

export function createDefaultSettings(): UserSettings {
  const ts = nowIso();
  return {
    id: SETTINGS_ID,
    timeZone: DEFAULT_TIME_ZONE,
    weightUnit: 'kg',
    volumeUnit: 'ml',
    theme: 'system',
    locale: 'es',
    oneRmFormula: 'epley',
    meals: DEFAULT_MEALS.map((m) => ({ ...m })),
    onboarded: false,
    createdAt: ts,
    updatedAt: ts,
  };
}

/** Sugerencias iniciales del formulario de objetivos (el usuario las ajusta). */
export const SUGGESTED_GOAL = {
  calories: 2200,
  protein: 160,
  carbs: 220,
  fat: 70,
  waterMl: 3000,
} as const;

export function createGoal(
  values: Pick<NutritionGoal, 'calories' | 'protein' | 'carbs' | 'fat' | 'waterMl'>,
  effectiveDate: string = todayKey(),
): NutritionGoal {
  return newEntity<NutritionGoal>({ ...values, effectiveDate });
}
