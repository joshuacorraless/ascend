import { describe, expect, it } from 'vitest';
import { buildEntryFromFood, describeAmount, previewFoodMacros } from './entryBuilders';
import type { Food } from '@/lib/schema';

function food(partial: Partial<Food>): Food {
  return {
    id: 'f1',
    name: 'Test',
    portionSize: 100,
    portionUnit: 'g',
    calories: 200,
    protein: 20,
    carbs: 10,
    fat: 5,
    source: 'manual',
    favorite: false,
    archived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

describe('buildEntryFromFood', () => {
  it('convierte gramos a porciones y hace snapshot de macros', () => {
    const entry = buildEntryFromFood(food({}), 'almuerzo', '2026-06-12', 150);
    expect(entry.quantity).toBeCloseTo(1.5);
    expect(entry.calories).toBe(300);
    expect(entry.protein).toBe(30);
    expect(entry.portionLabel).toBe('150 g');
    expect(entry.mealType).toBe('almuerzo');
    expect(entry.foodId).toBe('f1');
  });

  it('para unidades la cantidad es el número de unidades', () => {
    const entry = buildEntryFromFood(
      food({ portionUnit: 'unidad', portionSize: 1, calories: 80 }),
      'merienda',
      '2026-06-12',
      2,
    );
    expect(entry.quantity).toBe(2);
    expect(entry.calories).toBe(160);
    expect(entry.portionLabel).toBe('2 unidades');
  });
});

describe('describeAmount', () => {
  it('singular/plural en unidades', () => {
    expect(describeAmount(food({ portionUnit: 'unidad', portionSize: 1 }), 1)).toBe('1 unidad');
    expect(describeAmount(food({ portionUnit: 'unidad', portionSize: 1 }), 3)).toBe('3 unidades');
  });
});

describe('previewFoodMacros', () => {
  it('previsualiza macros para una cantidad en gramos', () => {
    const m = previewFoodMacros(food({}), 50);
    expect(m.calories).toBe(100);
    expect(m.protein).toBe(10);
  });
});
