import { describe, expect, it } from 'vitest';
import { amountToQuantity, macroProgress, recipeMacros, scaleMacros, sumMacros } from './macros';
import type { Food, Macros, Recipe } from '@/lib/schema';

const base: Macros = { calories: 100, protein: 10, carbs: 20, fat: 5, fiber: 2 };

describe('scaleMacros', () => {
  it('multiplica los macros por la cantidad (decimales incluidos)', () => {
    const r = scaleMacros(base, 2.5);
    expect(r.calories).toBe(250);
    expect(r.protein).toBe(25);
    expect(r.carbs).toBe(50);
    expect(r.fat).toBe(12.5);
    expect(r.fiber).toBe(5);
  });

  it('escalar por 0 da todo en 0', () => {
    expect(scaleMacros(base, 0).calories).toBe(0);
  });
});

describe('sumMacros', () => {
  it('suma una lista de macros', () => {
    const total = sumMacros([base, scaleMacros(base, 2)]);
    expect(total.calories).toBe(300);
    expect(total.protein).toBe(30);
  });
});

describe('amountToQuantity', () => {
  it('convierte gramos a porciones cuando la unidad es g', () => {
    // 150 g con porción de 100 g → 1.5 porciones
    expect(amountToQuantity(150, 'g', 100)).toBeCloseTo(1.5);
  });

  it('para unidades "unidad" la cantidad es directa', () => {
    expect(amountToQuantity(3, 'unidad', 1)).toBe(3);
  });

  it('evita dividir por cero', () => {
    expect(amountToQuantity(150, 'g', 0)).toBe(0);
  });
});

describe('macroProgress', () => {
  it('calcula restante cuando aún no se alcanza la meta', () => {
    const p = macroProgress(1500, 2000);
    expect(p.remaining).toBe(500);
    expect(p.over).toBe(0);
    expect(p.percent).toBe(75);
  });

  it('marca excedente cuando se supera la meta (sin números negativos confusos)', () => {
    const p = macroProgress(2200, 2000);
    expect(p.remaining).toBe(0);
    expect(p.over).toBe(200);
    expect(p.percent).toBe(110);
  });

  it('meta 0 no rompe el porcentaje', () => {
    expect(macroProgress(100, 0).percent).toBe(0);
  });
});

describe('recipeMacros', () => {
  it('suma los macros de los ingredientes escalados', () => {
    const food: Food = {
      id: 'f1',
      name: 'Arroz',
      portionSize: 100,
      portionUnit: 'g',
      calories: 130,
      protein: 2.4,
      carbs: 28,
      fat: 0.3,
      source: 'manual',
      favorite: false,
      archived: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const recipe: Recipe = {
      id: 'r1',
      name: 'Plato',
      servings: 2,
      ingredients: [{ foodId: 'f1', quantity: 3 }],
      favorite: false,
      archived: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const total = recipeMacros(recipe, new Map([['f1', food]]));
    expect(total.calories).toBe(390);
    expect(total.carbs).toBe(84);
  });
});
