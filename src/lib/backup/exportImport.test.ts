import { beforeEach, describe, expect, it } from 'vitest';
import { getRepositories } from '@/lib/repositories';
import { ensureInitialized } from '@/lib/bootstrap';
import { createGoal } from '@/lib/defaults';
import { newEntity } from '@/lib/factories';
import { nowIso } from '@/lib/ids';
import { applyBackup, buildBackupJson, parseBackup } from './exportImport';
import type { Food } from '@/lib/schema';

function demoFood(): Food {
  return newEntity<Food>({
    name: 'Avena',
    portionSize: 40,
    portionUnit: 'g',
    calories: 150,
    protein: 5,
    carbs: 27,
    fat: 3,
    source: 'manual',
    favorite: false,
    archived: false,
  });
}

describe('export / import JSON', () => {
  beforeEach(async () => {
    await getRepositories().storage.clearAll();
  });

  it('exporta, valida e importa conservando los datos', async () => {
    const repos = getRepositories();
    await ensureInitialized();
    await repos.goals.put(createGoal({ calories: 2000, protein: 150, carbs: 200, fat: 60, waterMl: 3000 }));
    await repos.foods.put(demoFood());

    const json = await buildBackupJson();
    const parsed = parseBackup(json);
    expect(parsed.ok).toBe(true);

    await repos.storage.clearAll();
    expect(await repos.foods.list()).toHaveLength(0);

    if (parsed.ok) await applyBackup(parsed.envelope);

    expect(await repos.foods.list()).toHaveLength(1);
    const goal = await repos.goals.latest();
    expect(goal?.calories).toBe(2000);
  });

  it('rechaza un respaldo de versión más nueva', () => {
    const r = parseBackup(
      JSON.stringify({ app: 'ascend', schemaVersion: 999, exportedAt: nowIso(), data: {} }),
    );
    expect(r.ok).toBe(false);
  });

  it('rechaza un JSON inválido', () => {
    expect(parseBackup('esto no es json').ok).toBe(false);
  });

  it('rechaza una estructura que no cumple el esquema', () => {
    const r = parseBackup(JSON.stringify({ app: 'ascend', schemaVersion: 1, exportedAt: nowIso() }));
    expect(r.ok).toBe(false);
  });
});
