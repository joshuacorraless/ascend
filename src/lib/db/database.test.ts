import { describe, expect, it } from 'vitest';
import { AscendDatabase } from './database';

describe('AscendDatabase', () => {
  it('abre en la versión 1 y expone todas las tablas esperadas', async () => {
    const db = new AscendDatabase();
    await db.open();
    expect(db.verno).toBe(1);
    const names = db.tables.map((t) => t.name);
    for (const expected of [
      'settings',
      'goals',
      'foods',
      'recipes',
      'mealEntries',
      'waterEntries',
      'supplements',
      'supplementLogs',
      'exercises',
      'routines',
      'sessions',
      'exerciseLogs',
      'setLogs',
      'bodyWeightEntries',
    ]) {
      expect(names).toContain(expected);
    }
    db.close();
  });
});
