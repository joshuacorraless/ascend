import { describe, expect, it } from 'vitest';
import {
  findOtherExerciseMentions,
  normalizeSpokenText,
  parseSpokenSets,
  spokenSetSchema,
} from './voiceSets';

describe('interpretación local de series dictadas', () => {
  it('separa el ejemplo de pec deck, conserva libras y no inventa RIR para «10 cero»', () => {
    const result = parseSpokenSets(
      'OK, hice estas dos series para las dos series de pec deck y en la primera hice 170 libras, me saqué 8 reps con 10 cero y en la otra hice 7 reps con 10 cero',
      'kg',
    );
    expect(result.sets).toEqual([
      { setNumber: 1, weight: 170, unit: 'lb', reps: 8 },
      { weight: 170, unit: 'lb', reps: 7 },
    ]);
    expect(result.warnings.join(' ')).toContain('No quedó claro el esfuerzo');
    expect(result.warnings.join(' ')).toContain('último peso');
  });

  it('reconoce números hablados, decimales, ordinales y RIR cero', () => {
    const result = parseSpokenSets(
      'Primera: ciento setenta libras, ocho reps RIR cero. Segunda: setenta y siete coma cinco kilos, siete repeticiones RIR uno',
      'kg',
    );
    expect(result.sets).toEqual([
      { setNumber: 1, weight: 170, unit: 'lb', reps: 8, rir: 0 },
      { setNumber: 2, weight: 77.5, unit: 'kg', reps: 7, rir: 1 },
    ]);
  });

  it('expande una cantidad explícita de series y diferencia RPE', () => {
    expect(parseSpokenSets('3 series de 12 reps con 25 kg RPE 8.5', 'lb').sets).toEqual([
      { weight: 25, unit: 'kg', reps: 12, rpe: 8.5 },
      { weight: 25, unit: 'kg', reps: 12, rpe: 8.5 },
      { weight: 25, unit: 'kg', reps: 12, rpe: 8.5 },
    ]);
  });

  it('admite peso corporal y mantiene vacío el peso ausente', () => {
    expect(parseSpokenSets('20 reps sin peso', 'kg').sets[0]?.weight).toBe(0);
    const missing = parseSpokenSets('8 reps', 'kg');
    expect(missing.sets[0]?.weight).toBeUndefined();
    expect(missing.warnings.join(' ')).toContain('Completa el peso');
  });

  it('separa series con luego y conserva sus pesos individuales', () => {
    expect(parseSpokenSets('20 kg 8 reps, luego 25 kg 7 reps', 'kg').sets).toEqual([
      { weight: 20, unit: 'kg', reps: 8 },
      { weight: 25, unit: 'kg', reps: 7 },
    ]);
  });

  it('no transforma números inconexos ni un esfuerzo ambiguo', () => {
    expect(normalizeSpokenText('ocho y siete, diez cero')).toBe('ocho y siete, diez cero');
    const result = parseSpokenSets('30 kg, 8 reps RIR 0 RPE 10', 'kg');
    expect(result.sets[0]?.rir).toBeUndefined();
    expect(result.sets[0]?.rpe).toBeUndefined();
    expect(result.warnings.join(' ')).toContain('RIR y RPE');
  });

  it('rechaza repeticiones decimales, datos no finitos y esfuerzo fuera de rango', () => {
    const valid = { setNumber: 1, weight: 0, unit: 'kg', reps: 8, rir: 0 };
    expect(spokenSetSchema.safeParse(valid).success).toBe(true);
    for (const patch of [
      { reps: 8.5 },
      { weight: Infinity },
      { weight: -5 },
      { rir: 11 },
      { rpe: 9 },
    ]) {
      expect(spokenSetSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
    }
  });

  it('actualiza el peso heredado al pasar a peso corporal o a un peso sin unidad', () => {
    expect(
      parseSpokenSets('20 kg 8 reps; 10 reps sin peso; 12 reps', 'kg').sets.map(
        (set) => set.weight,
      ),
    ).toEqual([20, 0, 0]);
    expect(
      parseSpokenSets('8 reps con 30; otra 7 reps', 'lb').sets.map((set) => set.weight),
    ).toEqual([30, 30]);
  });

  it('avisa de grupos sin separar y no guarda solo el primero', () => {
    const result = parseSpokenSets('170 libras 8 reps, 160 libras 7 reps', 'kg');
    expect(result.sets).toEqual([]);
    expect(result.warnings.join(' ')).toContain('varias series juntas');
  });

  it('detecta otros ejercicios y distingue variantes de nombre superpuesto', () => {
    expect(
      findOtherExerciseMentions('Pec deck 8 reps; press de banca 10 reps', 'Pec deck', [
        'Pec deck',
        'Press banca',
      ]),
    ).toEqual(['Press banca']);
    expect(
      findOtherExerciseMentions('Press banca inclinado 8 reps', 'Press banca inclinado', [
        'Press banca',
        'Press banca inclinado',
      ]),
    ).toEqual([]);
  });
});
