import { DEFAULT_MEALS } from '@/lib/defaults';
import type { MealDef, UserSettings } from '@/lib/schema';

/** Tiempos de comida configurados (o los por defecto si aún no hay ninguno). */
export function mealsOf(settings: Pick<UserSettings, 'meals'>): MealDef[] {
  return settings.meals && settings.meals.length > 0 ? settings.meals : DEFAULT_MEALS;
}

/** Nombre legible de un tiempo de comida por su id (cae al id si no se encuentra). */
export function mealLabel(settings: Pick<UserSettings, 'meals'>, id: string): string {
  return mealsOf(settings).find((m) => m.id === id)?.name ?? id;
}

/**
 * Tiempos a mostrar para un conjunto de entradas: primero los configurados (en
 * orden) y después cualquier id presente en datos que ya no esté configurado
 * (p. ej. un tiempo personalizado borrado), para no ocultar el historial.
 */
export function mealsForEntries(
  settings: Pick<UserSettings, 'meals'>,
  entryMealTypes: string[],
): MealDef[] {
  const base = mealsOf(settings);
  const known = new Set(base.map((m) => m.id));
  const extras = [...new Set(entryMealTypes)]
    .filter((id) => !known.has(id))
    .map((id) => ({ id, name: id }));
  return [...base, ...extras];
}

export function newMealId(): string {
  return `meal-${crypto.randomUUID().slice(0, 8)}`;
}
