import { amountToQuantity, macrosOf, macrosOfEntry, recipeMacros, scaleMacros } from '@/lib/domain';
import { newEntity } from '@/lib/factories';
import { nowIso } from '@/lib/ids';
import { formatNumber, PORTION_UNIT_LABELS } from '@/lib/units';
import type { DateKey } from '@/lib/datetime';
import type { Food, Macros, MealEntry, MealType, Recipe } from '@/lib/schema';

/**
 * Para alimentos en g/ml, el usuario introduce gramos/ml; para unidad/porción,
 * introduce un número de porciones. Esta función normaliza a "nº de porciones".
 */
export function amountToPortions(food: Food, amount: number): number {
  return amountToQuantity(amount, food.portionUnit, food.portionSize);
}

export function defaultAmount(food: Food): number {
  return food.portionUnit === 'g' || food.portionUnit === 'ml' ? food.portionSize : 1;
}

const PLURALS: Record<string, string> = { unidad: 'unidades', porción: 'porciones' };

export function describeAmount(food: Food, amount: number): string {
  const singular = PORTION_UNIT_LABELS[food.portionUnit] ?? food.portionUnit;
  if (food.portionUnit === 'g' || food.portionUnit === 'ml') {
    return `${formatNumber(amount)} ${singular}`;
  }
  const label = amount === 1 ? singular : (PLURALS[singular] ?? `${singular}s`);
  return `${formatNumber(amount)} ${label}`;
}

export function previewFoodMacros(food: Food, amount: number): Macros {
  return scaleMacros(macrosOf(food), amountToPortions(food, amount));
}

/** Construye una MealEntry (snapshot) a partir de un alimento + cantidad. */
export function buildEntryFromFood(
  food: Food,
  mealType: MealType,
  dateKey: DateKey,
  amount: number,
): MealEntry {
  const quantity = amountToPortions(food, amount);
  return newEntity<MealEntry>({
    localDate: dateKey,
    loggedAt: nowIso(),
    mealType,
    foodId: food.id,
    name: food.name,
    ...(food.brand ? { brand: food.brand } : {}),
    quantity,
    portionLabel: describeAmount(food, amount),
    ...scaleMacros(macrosOf(food), quantity),
  });
}

export function cloneEntryToDate(
  entry: MealEntry,
  dateKey: DateKey,
  mealType?: MealType,
): MealEntry {
  return newEntity<MealEntry>({
    localDate: dateKey,
    loggedAt: nowIso(),
    mealType: mealType ?? entry.mealType,
    ...(entry.foodId ? { foodId: entry.foodId } : {}),
    ...(entry.recipeId ? { recipeId: entry.recipeId } : {}),
    name: entry.name,
    ...(entry.brand ? { brand: entry.brand } : {}),
    quantity: entry.quantity,
    ...(entry.portionLabel ? { portionLabel: entry.portionLabel } : {}),
    ...macrosOfEntry(entry),
  });
}

/** Construye una MealEntry a partir de una receta + nº de porciones de la receta. */
export function buildEntryFromRecipe(
  recipe: Recipe,
  foodsById: Map<string, Food>,
  mealType: MealType,
  dateKey: DateKey,
  servings: number,
): MealEntry {
  const totalMacros = recipeMacros(recipe, foodsById);
  const perServing = scaleMacros(totalMacros, recipe.servings > 0 ? 1 / recipe.servings : 0);
  return newEntity<MealEntry>({
    localDate: dateKey,
    loggedAt: nowIso(),
    mealType,
    recipeId: recipe.id,
    name: recipe.name,
    quantity: servings,
    portionLabel: `${formatNumber(servings)} porción${servings === 1 ? '' : 'es'} de receta`,
    ...scaleMacros(perServing, servings),
  });
}
