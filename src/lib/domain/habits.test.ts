import { describe, expect, it } from 'vitest';
import { dayHabitStatus, type HabitDayInput } from './habits';
import type { NutritionGoal } from '@/lib/schema';

const goal: NutritionGoal = {
  id: 'g1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  effectiveDate: '2026-01-01',
  calories: 2000,
  protein: 150,
  carbs: 200,
  fat: 60,
  waterMl: 3000,
};

function base(overrides: Partial<HabitDayInput> = {}): HabitDayInput {
  return {
    goal,
    macros: { calories: 2000, protein: 150 },
    waterMl: 3000,
    scheduledSupplements: 2,
    completedSupplements: 2,
    hasAnyData: true,
    ...overrides,
  };
}

describe('dayHabitStatus', () => {
  it('marca complete cuando macros, agua y suplementos se cumplen', () => {
    const s = dayHabitStatus(base());
    expect(s).toMatchObject({ macros: true, water: true, supplements: true, level: 'complete' });
  });

  it('acepta macros dentro del umbral (90%)', () => {
    const s = dayHabitStatus(base({ macros: { calories: 1850, protein: 140 } }));
    expect(s.macros).toBe(true);
  });

  it('marca partial cuando falta la hidratación', () => {
    const s = dayHabitStatus(base({ waterMl: 1000 }));
    expect(s.water).toBe(false);
    expect(s.level).toBe('partial');
  });

  it('considera suplementos cumplidos si no hay ninguno programado', () => {
    const s = dayHabitStatus(base({ scheduledSupplements: 0, completedSupplements: 0 }));
    expect(s.supplements).toBe(true);
  });

  it('marca none cuando hay datos pero no se cumple nada', () => {
    const s = dayHabitStatus(
      base({ macros: { calories: 100, protein: 5 }, waterMl: 0, completedSupplements: 0 }),
    );
    expect(s.level).toBe('none');
  });

  it('marca empty cuando no hubo actividad', () => {
    const s = dayHabitStatus(base({ hasAnyData: false }));
    expect(s.level).toBe('empty');
  });

  it('sin objetivo, macros e hidratación no se consideran cumplidos', () => {
    const s = dayHabitStatus(base({ goal: undefined }));
    expect(s.macros).toBe(false);
    expect(s.water).toBe(false);
  });
});
