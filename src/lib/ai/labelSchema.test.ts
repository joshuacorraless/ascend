import { describe, expect, it } from 'vitest';
import { labelAnalysisSchema } from './labelSchema';

const valid = {
  productName: 'Yogur griego',
  brand: null,
  servingSize: 170,
  servingUnit: 'g',
  servingsPerContainer: 1,
  calories: 100,
  protein: 17,
  carbs: 6,
  fat: 0.7,
  fiber: null,
  sugar: 6,
  sodium: 50,
  confidence: 0.9,
  warnings: [],
};

describe('labelAnalysisSchema', () => {
  it('acepta una extracción válida', () => {
    const r = labelAnalysisSchema.safeParse(valid);
    expect(r.success).toBe(true);
  });

  it('rechaza un macro no numérico', () => {
    const r = labelAnalysisSchema.safeParse({ ...valid, protein: 'mucha' });
    expect(r.success).toBe(false);
  });

  it('rechaza una unidad de porción inválida', () => {
    const r = labelAnalysisSchema.safeParse({ ...valid, servingUnit: 'tazas' });
    expect(r.success).toBe(false);
  });

  it('repara una confianza inválida a 0.5 y warnings ausentes a []', () => {
    const { confidence: _c, warnings: _w, ...rest } = valid;
    void _c;
    void _w;
    const r = labelAnalysisSchema.safeParse({ ...rest, confidence: 'alta' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.confidence).toBe(0.5);
      expect(r.data.warnings).toEqual([]);
    }
  });

  it('permite nulls en valores no legibles', () => {
    const r = labelAnalysisSchema.safeParse({ ...valid, calories: null, sodium: null });
    expect(r.success).toBe(true);
  });
});
