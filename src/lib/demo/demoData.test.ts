import { beforeEach, describe, expect, it } from 'vitest';
import { getRepositories } from '@/lib/repositories';
import { newEntity } from '@/lib/factories';
import { hasDemoData, loadDemoData, removeDemoData } from './demoData';
import type { Food } from '@/lib/schema';

describe('datos de demostración', () => {
  beforeEach(async () => {
    await getRepositories().storage.clearAll();
  });

  it('se cargan y se eliminan sin afectar los datos reales', async () => {
    const repos = getRepositories();
    const realFood = newEntity<Food>({
      name: 'Mi alimento real',
      portionSize: 100,
      portionUnit: 'g',
      calories: 100,
      protein: 10,
      carbs: 10,
      fat: 1,
      source: 'manual',
      favorite: false,
      archived: false,
    });
    await repos.foods.put(realFood);

    expect(await hasDemoData()).toBe(false);
    await loadDemoData();
    expect(await hasDemoData()).toBe(true);
    expect((await repos.foods.list()).length).toBeGreaterThan(1);
    expect((await repos.bodyWeight.list()).length).toBeGreaterThan(0);

    await removeDemoData();
    expect(await hasDemoData()).toBe(false);
    const remaining = await repos.foods.list();
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.id).toBe(realFood.id);
    expect(await repos.bodyWeight.list()).toHaveLength(0);
  });
});
