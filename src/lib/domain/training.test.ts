import { describe, expect, it } from 'vitest';
import {
  epleyOneRm,
  exerciseSessionSummaries,
  personalRecords,
  progressSeries,
  totalVolume,
} from './training';
import type { SetLog } from '@/lib/schema';

function set(partial: Partial<SetLog>): SetLog {
  return {
    id: partial.id ?? Math.random().toString(36),
    sessionId: partial.sessionId ?? 's1',
    exerciseLogId: partial.exerciseLogId ?? 'el1',
    exerciseId: partial.exerciseId ?? 'ex1',
    setNumber: partial.setNumber ?? 1,
    weightKg: partial.weightKg ?? 100,
    reps: partial.reps ?? 5,
    setType: partial.setType ?? 'efectiva',
    completed: partial.completed ?? true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

describe('epleyOneRm', () => {
  it('con 1 repetición devuelve el propio peso', () => {
    expect(epleyOneRm(100, 1)).toBe(100);
  });

  it('aplica la fórmula de Epley para varias reps', () => {
    // 100 × (1 + 5/30) = 116.67 → 116.7
    expect(epleyOneRm(100, 5)).toBeCloseTo(116.7, 1);
  });

  it('peso o reps en 0 devuelve 0', () => {
    expect(epleyOneRm(0, 5)).toBe(0);
    expect(epleyOneRm(100, 0)).toBe(0);
  });
});

describe('totalVolume', () => {
  it('suma peso×reps solo de series de trabajo completadas', () => {
    const sets = [
      set({ weightKg: 100, reps: 5 }), // 500
      set({ weightKg: 100, reps: 5, setType: 'calentamiento' }), // excluida
      set({ weightKg: 80, reps: 8, completed: false }), // excluida (no completada)
      set({ weightKg: 90, reps: 6 }), // 540
    ];
    expect(totalVolume(sets)).toBe(1040);
  });
});

describe('personalRecords', () => {
  it('excluye calentamientos y calcula PRs por ejercicio', () => {
    const sets = [
      set({ sessionId: 'a', weightKg: 120, reps: 1 }),
      set({ sessionId: 'a', weightKg: 100, reps: 8 }),
      set({ sessionId: 'b', weightKg: 110, reps: 5 }),
      set({ sessionId: 'b', weightKg: 200, reps: 12, setType: 'calentamiento' }), // ignorada
    ];
    const pr = personalRecords(sets);
    expect(pr.maxWeightKg).toBe(120);
    expect(pr.maxReps).toBe(8);
    // Mejor 1RM estimado = 110×(1+5/30) = 128.3 (serie de la sesión b)
    expect(pr.bestEstimatedOneRm).toBeCloseTo(128.3, 1);
  });
});

describe('progressSeries', () => {
  it('ordena sesiones del mismo día por hora para el gráfico y la comparación', () => {
    const sets = [
      set({ sessionId: 'morning', weightKg: 50 }),
      set({ sessionId: 'evening', weightKg: 60 }),
    ];
    const dates = new Map([
      ['evening', '2026-09-22'],
      ['morning', '2026-09-22'],
    ]);
    const starts = new Map([
      ['evening', '2026-09-22T23:00:00.000Z'],
      ['morning', '2026-09-22T13:00:00.000Z'],
    ]);
    for (const input of [sets, [...sets].reverse()]) {
      expect(
        progressSeries(input, dates, 'maxWeight', 'epley', starts).map((p) => p.sessionId),
      ).toEqual(['morning', 'evening']);
      const summaries = exerciseSessionSummaries(input, dates, 'epley', starts);
      expect(summaries.map((summary) => summary.sessionId)).toEqual(['evening', 'morning']);
      expect(summaries[0]!.maxWeightKg - summaries[1]!.maxWeightKg).toBe(10);
    }
  });

  it('produce un punto por sesión ordenado por fecha', () => {
    const sets = [
      set({ sessionId: 'a', weightKg: 100, reps: 5 }),
      set({ sessionId: 'b', weightKg: 110, reps: 5 }),
    ];
    const dates = new Map([
      ['a', '2026-01-01'],
      ['b', '2026-01-08'],
    ]);
    const series = progressSeries(sets, dates, 'maxWeight');
    expect(series.map((p) => p.value)).toEqual([100, 110]);
    expect(series[0]?.date).toBe('2026-01-01');
  });
});
