import { describe, expect, it } from 'vitest';
import { guidedMacroPlan, inspectMacroPlan, macroEnergy } from './macroPlan';

describe('guidedMacroPlan', () => {
  it('reparte 250 g de proteína dentro de un presupuesto compatible', () => {
    const result = guidedMacroPlan(3000, 250);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.protein).toBe(250);
    expect(macroEnergy(result.plan)).toBeCloseTo(3000, 0);
    expect(inspectMacroPlan(result.plan).outsideGuidance).toEqual([]);
  });

  it('no inventa calorías ni reduce proteína si no caben en el reparto', () => {
    expect(guidedMacroPlan(2000, 250)).toMatchObject({ ok: false });
    expect(guidedMacroPlan(2000, 20)).toMatchObject({ ok: false });
  });

  it.each([0, -10, NaN, Infinity])('rechaza calorías inválidas: %s', (calories) => {
    expect(guidedMacroPlan(calories, 160).ok).toBe(false);
  });

  it('mantiene todos los rangos en los límites y para presupuestos distintos', () => {
    for (const calories of [1500, 2200, 3000, 4200]) {
      for (let percent = 10; percent <= 35; percent += 1) {
        const result = guidedMacroPlan(calories, (calories * percent) / 100 / 4);
        expect(result.ok).toBe(true);
        if (!result.ok) continue;
        expect(inspectMacroPlan(result.plan).outsideGuidance).toEqual([]);
        expect(inspectMacroPlan(result.plan).consistent).toBe(true);
      }
    }
  });
});

describe('inspectMacroPlan', () => {
  it('separa coherencia energética de rangos orientativos', () => {
    const plan = inspectMacroPlan({ calories: 2000, protein: 250, carbs: 125, fat: 500 / 9 });
    expect(plan.consistent).toBe(true);
    expect(plan.outsideGuidance).toEqual(['protein', 'carbs']);
  });

  it('detecta metas cuyos gramos no suman las calorías', () => {
    expect(inspectMacroPlan({ calories: 2000, protein: 150, carbs: 250, fat: 80 }).consistent).toBe(
      false,
    );
    expect(inspectMacroPlan({ calories: 0, protein: 0, carbs: 0, fat: 0 }).consistent).toBe(false);
  });
});
