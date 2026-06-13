import { z } from 'zod';
import {
  baseEntityShape,
  foodSourceSchema,
  idSchema,
  isoSchema,
  localDateSchema,
  mealTypeSchema,
  nonNegativeNumber,
  portionUnitSchema,
  positiveNumber,
} from './common';

/**
 * Macros de una porción. Reutilizado tanto en la definición del alimento
 * (por porción) como en el snapshot de una entrada registrada (total).
 */
export const macrosShape = {
  calories: nonNegativeNumber,
  protein: nonNegativeNumber,
  carbs: nonNegativeNumber,
  fat: nonNegativeNumber,
  fiber: nonNegativeNumber.optional(),
  sugar: nonNegativeNumber.optional(),
  sodium: nonNegativeNumber.optional(),
};

export const macrosSchema = z.object(macrosShape);
export type Macros = z.infer<typeof macrosSchema>;

/** Alimento o producto de la biblioteca personal. Macros por porción. */
export const foodSchema = z.object({
  ...baseEntityShape,
  name: z.string().min(1, 'nombre requerido'),
  brand: z.string().optional(),
  portionSize: positiveNumber,
  portionUnit: portionUnitSchema,
  ...macrosShape,
  /** Imagen opcional como data URL (no se persiste foto de etiqueta de IA). */
  imageDataUrl: z.string().optional(),
  source: foodSourceSchema,
  favorite: z.boolean(),
  notes: z.string().optional(),
  archived: z.boolean(),
});
export type Food = z.infer<typeof foodSchema>;

/** Ingrediente de una receta: referencia a un alimento + cantidad en porciones. */
export const recipeIngredientSchema = z.object({
  foodId: idSchema,
  /** Multiplicador de porciones del alimento. */
  quantity: positiveNumber,
});
export type RecipeIngredient = z.infer<typeof recipeIngredientSchema>;

/** Receta/comida compuesta de varios alimentos. */
export const recipeSchema = z.object({
  ...baseEntityShape,
  name: z.string().min(1, 'nombre requerido'),
  /** Cuántas porciones rinde la receta completa. */
  servings: positiveNumber,
  ingredients: z.array(recipeIngredientSchema).min(1, 'agrega al menos un ingrediente'),
  notes: z.string().optional(),
  favorite: z.boolean(),
  archived: z.boolean(),
});
export type Recipe = z.infer<typeof recipeSchema>;

/**
 * Objetivo nutricional con fecha de vigencia: al cambiarlo se crea uno nuevo,
 * y los días pasados se interpretan con el objetivo vigente en su momento.
 */
export const nutritionGoalSchema = z.object({
  ...baseEntityShape,
  effectiveDate: localDateSchema,
  calories: nonNegativeNumber,
  protein: nonNegativeNumber,
  carbs: nonNegativeNumber,
  fat: nonNegativeNumber,
  /** Objetivo de agua, almacenado internamente en mililitros. */
  waterMl: nonNegativeNumber,
});
export type NutritionGoal = z.infer<typeof nutritionGoalSchema>;

/**
 * Entrada de comida registrada. Guarda un SNAPSHOT de los macros del total
 * consumido para que editar/archivar el alimento no altere el historial.
 */
export const mealEntrySchema = z.object({
  ...baseEntityShape,
  localDate: localDateSchema,
  loggedAt: isoSchema,
  mealType: mealTypeSchema,
  /** Referencia opcional al alimento/receta de origen (puede archivarse). */
  foodId: idSchema.optional(),
  recipeId: idSchema.optional(),
  /** Snapshot del nombre y la marca al momento de registrar. */
  name: z.string().min(1),
  brand: z.string().optional(),
  /** Cantidad en porciones (admite decimales). */
  quantity: positiveNumber,
  /** Etiqueta legible de la porción, p. ej. "100 g" o "1 unidad". */
  portionLabel: z.string().optional(),
  // Snapshot de macros del total consumido (ya multiplicado por quantity):
  ...macrosShape,
});
export type MealEntry = z.infer<typeof mealEntrySchema>;
