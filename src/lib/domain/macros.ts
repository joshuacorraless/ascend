import { round } from '@/lib/units';
import type { Food, Macros, MealEntry, PortionUnit, Recipe } from '@/lib/schema';

export const MACRO_KEYS = ['calories', 'protein', 'carbs', 'fat'] as const;

export function emptyMacros(): Macros {
  return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };
}

/** Escala los macros de una porción por una cantidad (nº de porciones, decimal). */
export function scaleMacros(base: Macros, quantity: number): Macros {
  const s = (v: number | undefined) => (v === undefined ? undefined : round(v * quantity, 2));
  return {
    calories: round((base.calories ?? 0) * quantity, 1),
    protein: round((base.protein ?? 0) * quantity, 2),
    carbs: round((base.carbs ?? 0) * quantity, 2),
    fat: round((base.fat ?? 0) * quantity, 2),
    fiber: s(base.fiber),
    sugar: s(base.sugar),
    sodium: s(base.sodium),
  };
}

/** Suma dos conjuntos de macros (los opcionales se acumulan si existen). */
export function addMacros(a: Macros, b: Macros): Macros {
  const add = (x?: number, y?: number) =>
    x === undefined && y === undefined ? undefined : round((x ?? 0) + (y ?? 0), 2);
  return {
    calories: round((a.calories ?? 0) + (b.calories ?? 0), 1),
    protein: round((a.protein ?? 0) + (b.protein ?? 0), 2),
    carbs: round((a.carbs ?? 0) + (b.carbs ?? 0), 2),
    fat: round((a.fat ?? 0) + (b.fat ?? 0), 2),
    fiber: add(a.fiber, b.fiber),
    sugar: add(a.sugar, b.sugar),
    sodium: add(a.sodium, b.sodium),
  };
}

export function sumMacros(items: Macros[]): Macros {
  return items.reduce<Macros>((acc, m) => addMacros(acc, m), emptyMacros());
}

/** Extrae solo los macros (descarta metadatos) de un alimento. */
export function macrosOf(food: Food): Macros {
  return {
    calories: food.calories,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat,
    fiber: food.fiber,
    sugar: food.sugar,
    sodium: food.sodium,
  };
}

/**
 * Convierte gramos/ml introducidos por el usuario a "número de porciones" cuando
 * la unidad del alimento es g o ml (porción = `portionSize` g/ml).
 * Para unidades 'unidad'/'porcion', la cantidad ya es el nº de porciones.
 */
export function amountToQuantity(
  amount: number,
  portionUnit: PortionUnit,
  portionSize: number,
): number {
  if (portionUnit === 'g' || portionUnit === 'ml') {
    return portionSize > 0 ? amount / portionSize : 0;
  }
  return amount;
}

/** Macros totales de una entrada registrada (ya vienen como snapshot). */
export function macrosOfEntry(entry: MealEntry): Macros {
  return {
    calories: entry.calories,
    protein: entry.protein,
    carbs: entry.carbs,
    fat: entry.fat,
    fiber: entry.fiber,
    sugar: entry.sugar,
    sodium: entry.sodium,
  };
}

export function totalsForEntries(entries: MealEntry[]): Macros {
  return sumMacros(entries.map(macrosOfEntry));
}

/** Calcula los macros totales de una receta (rinde `servings` porciones). */
export function recipeMacros(recipe: Recipe, foodsById: Map<string, Food>): Macros {
  const parts: Macros[] = [];
  for (const ing of recipe.ingredients) {
    const food = foodsById.get(ing.foodId);
    if (food) parts.push(scaleMacros(macrosOf(food), ing.quantity));
  }
  return sumMacros(parts);
}

/** Macros de una porción de la receta (total / servings). */
export function recipeMacrosPerServing(recipe: Recipe, foodsById: Map<string, Food>): Macros {
  const total = recipeMacros(recipe, foodsById);
  return scaleMacros(total, recipe.servings > 0 ? 1 / recipe.servings : 0);
}

// Progreso frente a un objetivo

export interface MacroProgress {
  consumed: number;
  target: number;
  /** Lo que falta para llegar al objetivo (0 si ya se superó). */
  remaining: number;
  /** Lo que se excedió por encima del objetivo (0 si aún no se alcanza). */
  over: number;
  /** Porcentaje consumido respecto al objetivo (sin tope; la UI decide). */
  percent: number;
}

export function macroProgress(consumed: number, target: number): MacroProgress {
  const safeTarget = Math.max(0, target);
  const remaining = Math.max(0, round(safeTarget - consumed, 1));
  const over = Math.max(0, round(consumed - safeTarget, 1));
  const percent = safeTarget > 0 ? round((consumed / safeTarget) * 100, 0) : 0;
  return { consumed: round(consumed, 1), target: safeTarget, remaining, over, percent };
}
