/** General adult AMDR guidance; these are not individual medical limits. */
export const MACRO_RANGES = {
  protein: { min: 10, max: 35, kcalPerGram: 4, label: 'Proteína' },
  carbs: { min: 45, max: 65, kcalPerGram: 4, label: 'Carbohidratos' },
  fat: { min: 20, max: 35, kcalPerGram: 9, label: 'Grasas' },
} as const;

export type MacroKey = keyof typeof MACRO_RANGES;
export interface MacroPlan {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export const MACRO_GUIDANCE_URL =
  'https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/dietary-reference-intakes/tables/reference-values-macronutrients.html';

const oneDecimal = (n: number) => Math.round(n * 10) / 10;

export function macroEnergy(plan: Pick<MacroPlan, MacroKey>): number {
  return plan.protein * 4 + plan.carbs * 4 + plan.fat * 9;
}

export function macroGramsRange(calories: number, key: MacroKey) {
  const range = MACRO_RANGES[key];
  return {
    min: oneDecimal((calories * range.min) / 100 / range.kcalPerGram),
    max: oneDecimal((calories * range.max) / 100 / range.kcalPerGram),
  };
}

/** Keep protein and calories fixed, choose feasible fat near 25%, fill with carbs. */
export function guidedMacroPlan(
  calories: number,
  protein: number,
): { ok: true; plan: MacroPlan } | { ok: false; error: string } {
  if (!Number.isFinite(calories) || calories <= 0) {
    return { ok: false, error: 'Indica una meta de calorías mayor que cero.' };
  }
  if (!Number.isFinite(protein) || protein < 0) {
    return { ok: false, error: 'Indica cuántos gramos de proteína quieres planificar.' };
  }
  const proteinShare = (protein * 4) / calories;
  if (proteinShare < 0.1 - 1e-9 || proteinShare > 0.35 + 1e-9) {
    const range = macroGramsRange(calories, 'protein');
    return {
      ok: false,
      error: `Con ${calories} kcal, el rango guía de proteína es ${range.min}–${range.max} g. Ajusta la proteína o revisa tu meta de calorías.`,
    };
  }
  const minFat = Math.max(0.2, 1 - proteinShare - 0.65);
  const maxFat = Math.min(0.35, 1 - proteinShare - 0.45);
  const fatShare = Math.max(minFat, Math.min(0.25, maxFat));
  const fat = oneDecimal((calories * fatShare) / 9);
  const carbs = oneDecimal((calories - protein * 4 - fat * 9) / 4);
  return { ok: true, plan: { calories, protein, carbs, fat } };
}

export function inspectMacroPlan(plan: MacroPlan) {
  const finite = Object.values(plan).every((n) => Number.isFinite(n) && n >= 0);
  const energy = finite ? macroEnergy(plan) : 0;
  const percentages = Object.fromEntries(
    (Object.keys(MACRO_RANGES) as MacroKey[]).map((key) => [
      key,
      finite && plan.calories > 0
        ? (plan[key] * MACRO_RANGES[key].kcalPerGram * 100) / plan.calories
        : 0,
    ]),
  ) as Record<MacroKey, number>;
  // A tenth of a percentage point allows rounding grams to one decimal.
  const outsideGuidance = (Object.keys(MACRO_RANGES) as MacroKey[]).filter(
    (key) =>
      percentages[key] < MACRO_RANGES[key].min - 0.1 ||
      percentages[key] > MACRO_RANGES[key].max + 0.1,
  );
  return {
    energy,
    percentages,
    outsideGuidance,
    // Rounding to whole grams should never make an otherwise valid plan fail.
    consistent: finite && plan.calories > 0 && Math.abs(energy - plan.calories) <= 10,
  };
}
