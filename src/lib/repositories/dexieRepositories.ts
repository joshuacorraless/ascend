import type { AscendDatabase } from '@/lib/db/database';
import { nowIso } from '@/lib/ids';
import { CURRENT_SCHEMA_VERSION, type BackupEnvelope } from '@/lib/schema';
import type { DateKey } from '@/lib/datetime';
import type {
  BodyWeightRepository,
  ExerciseRepository,
  FoodRepository,
  GoalRepository,
  ListOptions,
  MealRepository,
  RecipeRepository,
  Repositories,
  RoutineRepository,
  SettingsRepository,
  StorageRepository,
  SupplementLogRepository,
  SupplementRepository,
  TableCounts,
  WaterRepository,
  WorkoutRepository,
} from './types';

const notArchived = <T extends { archived: boolean }>(items: T[], opts?: ListOptions): T[] =>
  opts?.includeArchived ? items : items.filter((i) => !i.archived);

const byNameEs = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });

/**
 * Construye la implementación de todos los repositorios sobre Dexie.
 * Para migrar a Supabase, basta con escribir otra fábrica que cumpla la misma
 * interfaz `Repositories` y cambiar la línea de `index.ts`.
 */
export function createDexieRepositories(db: AscendDatabase): Repositories {
  const settings: SettingsRepository = {
    get: () => db.settings.get('singleton'),
    put: async (s) => {
      await db.settings.put(s);
    },
    async update(patch) {
      const current = await db.settings.get('singleton');
      if (!current) throw new Error('Ajustes no inicializados');
      const next = { ...current, ...patch, id: 'singleton' as const, updatedAt: nowIso() };
      await db.settings.put(next);
      return next;
    },
  };

  const goals: GoalRepository = {
    list: () => db.goals.orderBy('effectiveDate').toArray(),
    put: async (g) => {
      await db.goals.put(g);
    },
    remove: async (id) => {
      await db.goals.delete(id);
    },
    resolveForDate: (date: DateKey) =>
      db.goals.where('effectiveDate').belowOrEqual(date).last(),
    latest: () => db.goals.orderBy('effectiveDate').last(),
  };

  const foods: FoodRepository = {
    async list(opts) {
      const all = await db.foods.toArray();
      return notArchived(all, opts).sort(byNameEs);
    },
    get: (id) => db.foods.get(id),
    put: async (f) => {
      await db.foods.put(f);
    },
    remove: async (id) => {
      await db.foods.delete(id);
    },
    setArchived: async (id, archived) => {
      await db.foods.update(id, { archived, updatedAt: nowIso() });
    },
    setFavorite: async (id, favorite) => {
      await db.foods.update(id, { favorite, updatedAt: nowIso() });
    },
  };

  const recipes: RecipeRepository = {
    async list(opts) {
      const all = await db.recipes.toArray();
      return notArchived(all, opts).sort(byNameEs);
    },
    get: (id) => db.recipes.get(id),
    put: async (r) => {
      await db.recipes.put(r);
    },
    remove: async (id) => {
      await db.recipes.delete(id);
    },
    setArchived: async (id, archived) => {
      await db.recipes.update(id, { archived, updatedAt: nowIso() });
    },
    setFavorite: async (id, favorite) => {
      await db.recipes.update(id, { favorite, updatedAt: nowIso() });
    },
  };

  const meals: MealRepository = {
    listByDate: (date) =>
      db.mealEntries.where('localDate').equals(date).toArray(),
    get: (id) => db.mealEntries.get(id),
    put: async (e) => {
      await db.mealEntries.put(e);
    },
    remove: async (id) => {
      await db.mealEntries.delete(id);
    },
    async recent(limit) {
      const all = await db.mealEntries.toArray();
      return all.sort((a, b) => b.loggedAt.localeCompare(a.loggedAt)).slice(0, limit);
    },
    async lastEntriesForMeal(mealType, excludeDate) {
      const all = await db.mealEntries.where('mealType').equals(mealType).toArray();
      const otherDates = all.map((e) => e.localDate).filter((d) => d !== excludeDate);
      if (otherDates.length === 0) return [];
      const lastDate = otherDates.sort().at(-1);
      return all.filter((e) => e.localDate === lastDate);
    },
    async datesWithEntries() {
      const keys = await db.mealEntries.orderBy('localDate').uniqueKeys();
      return keys.map((k) => String(k));
    },
  };

  const water: WaterRepository = {
    listByDate: (date) => db.waterEntries.where('localDate').equals(date).toArray(),
    add: async (e) => {
      await db.waterEntries.put(e);
    },
    remove: async (id) => {
      await db.waterEntries.delete(id);
    },
    listRange: (from, to) =>
      db.waterEntries.where('localDate').between(from, to, true, true).toArray(),
  };

  const supplements: SupplementRepository = {
    async list(opts) {
      const all = await db.supplements.toArray();
      return notArchived(all, opts).sort(byNameEs);
    },
    get: (id) => db.supplements.get(id),
    put: async (s) => {
      await db.supplements.put(s);
    },
    remove: async (id) => {
      await db.supplements.delete(id);
    },
    setArchived: async (id, archived) => {
      await db.supplements.update(id, { archived, updatedAt: nowIso() });
    },
  };

  const supplementLogs: SupplementLogRepository = {
    listByDate: (date) => db.supplementLogs.where('localDate').equals(date).toArray(),
    getFor: (supplementId, date) =>
      db.supplementLogs.where('[supplementId+localDate]').equals([supplementId, date]).first(),
    put: async (log) => {
      await db.supplementLogs.put(log);
    },
    remove: async (id) => {
      await db.supplementLogs.delete(id);
    },
  };

  const exercises: ExerciseRepository = {
    async list(opts) {
      const all = await db.exercises.toArray();
      return notArchived(all, opts).sort(byNameEs);
    },
    get: (id) => db.exercises.get(id),
    put: async (e) => {
      await db.exercises.put(e);
    },
    remove: async (id) => {
      await db.exercises.delete(id);
    },
    setArchived: async (id, archived) => {
      await db.exercises.update(id, { archived, updatedAt: nowIso() });
    },
    count: () => db.exercises.count(),
    bulkPut: async (list) => {
      await db.exercises.bulkPut(list);
    },
  };

  const routines: RoutineRepository = {
    async list(opts) {
      const all = await db.routines.toArray();
      return notArchived(all, opts).sort(byNameEs);
    },
    get: (id) => db.routines.get(id),
    put: async (r) => {
      await db.routines.put(r);
    },
    remove: async (id) => {
      await db.routines.delete(id);
    },
    setArchived: async (id, archived) => {
      await db.routines.update(id, { archived, updatedAt: nowIso() });
    },
  };

  const workout: WorkoutRepository = {
    getActiveSession: () => db.sessions.where('status').equals('active').first(),
    getSession: (id) => db.sessions.get(id),
    async listSessions() {
      const all = await db.sessions.where('status').equals('completed').toArray();
      return all.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    },
    putSession: async (s) => {
      await db.sessions.put(s);
    },
    removeSession: async (id) => {
      await db.transaction('rw', db.sessions, db.exerciseLogs, db.setLogs, async () => {
        await db.setLogs.where('sessionId').equals(id).delete();
        await db.exerciseLogs.where('sessionId').equals(id).delete();
        await db.sessions.delete(id);
      });
    },
    async listExerciseLogs(sessionId) {
      const logs = await db.exerciseLogs.where('sessionId').equals(sessionId).toArray();
      return logs.sort((a, b) => a.order - b.order);
    },
    putExerciseLog: async (log) => {
      await db.exerciseLogs.put(log);
    },
    removeExerciseLog: async (id) => {
      await db.transaction('rw', db.exerciseLogs, db.setLogs, async () => {
        await db.setLogs.where('exerciseLogId').equals(id).delete();
        await db.exerciseLogs.delete(id);
      });
    },
    async listSetLogs(sessionId) {
      const sets = await db.setLogs.where('sessionId').equals(sessionId).toArray();
      return sets.sort((a, b) => a.setNumber - b.setNumber);
    },
    listSetLogsForExercise: (exerciseId) =>
      db.setLogs.where('exerciseId').equals(exerciseId).toArray(),
    putSetLog: async (set) => {
      await db.setLogs.put(set);
    },
    removeSetLog: async (id) => {
      await db.setLogs.delete(id);
    },
  };

  const bodyWeight: BodyWeightRepository = {
    list: () => db.bodyWeightEntries.orderBy('localDate').toArray(),
    get: (id) => db.bodyWeightEntries.get(id),
    getByDate: (date) => db.bodyWeightEntries.where('localDate').equals(date).first(),
    put: async (e) => {
      await db.bodyWeightEntries.put(e);
    },
    remove: async (id) => {
      await db.bodyWeightEntries.delete(id);
    },
    latest: () => db.bodyWeightEntries.orderBy('localDate').last(),
  };

  const storage: StorageRepository = {
    async exportAll() {
      const [
        s,
        goalsList,
        foodsList,
        recipesList,
        mealEntries,
        waterEntries,
        supplementsList,
        supplementLogsList,
        exercisesList,
        routinesList,
        sessions,
        exerciseLogs,
        setLogs,
        bodyWeightEntries,
      ] = await Promise.all([
        db.settings.get('singleton'),
        db.goals.toArray(),
        db.foods.toArray(),
        db.recipes.toArray(),
        db.mealEntries.toArray(),
        db.waterEntries.toArray(),
        db.supplements.toArray(),
        db.supplementLogs.toArray(),
        db.exercises.toArray(),
        db.routines.toArray(),
        db.sessions.toArray(),
        db.exerciseLogs.toArray(),
        db.setLogs.toArray(),
        db.bodyWeightEntries.toArray(),
      ]);
      const envelope: BackupEnvelope = {
        app: 'ascend',
        schemaVersion: CURRENT_SCHEMA_VERSION,
        exportedAt: nowIso(),
        data: {
          settings: s ?? null,
          goals: goalsList,
          foods: foodsList,
          recipes: recipesList,
          mealEntries,
          waterEntries,
          supplements: supplementsList,
          supplementLogs: supplementLogsList,
          exercises: exercisesList,
          routines: routinesList,
          sessions,
          exerciseLogs,
          setLogs,
          bodyWeightEntries,
        },
      };
      return envelope;
    },

    async importReplace(envelope) {
      const d = envelope.data;
      await db.transaction(
        'rw',
        [
          db.settings,
          db.goals,
          db.foods,
          db.recipes,
          db.mealEntries,
          db.waterEntries,
          db.supplements,
          db.supplementLogs,
          db.exercises,
          db.routines,
          db.sessions,
          db.exerciseLogs,
          db.setLogs,
          db.bodyWeightEntries,
        ],
        async () => {
          await Promise.all([
            db.settings.clear(),
            db.goals.clear(),
            db.foods.clear(),
            db.recipes.clear(),
            db.mealEntries.clear(),
            db.waterEntries.clear(),
            db.supplements.clear(),
            db.supplementLogs.clear(),
            db.exercises.clear(),
            db.routines.clear(),
            db.sessions.clear(),
            db.exerciseLogs.clear(),
            db.setLogs.clear(),
            db.bodyWeightEntries.clear(),
          ]);
          if (d.settings) await db.settings.put(d.settings);
          await Promise.all([
            db.goals.bulkPut(d.goals),
            db.foods.bulkPut(d.foods),
            db.recipes.bulkPut(d.recipes),
            db.mealEntries.bulkPut(d.mealEntries),
            db.waterEntries.bulkPut(d.waterEntries),
            db.supplements.bulkPut(d.supplements),
            db.supplementLogs.bulkPut(d.supplementLogs),
            db.exercises.bulkPut(d.exercises),
            db.routines.bulkPut(d.routines),
            db.sessions.bulkPut(d.sessions),
            db.exerciseLogs.bulkPut(d.exerciseLogs),
            db.setLogs.bulkPut(d.setLogs),
            db.bodyWeightEntries.bulkPut(d.bodyWeightEntries),
          ]);
        },
      );
    },

    async clearAll() {
      await db.transaction(
        'rw',
        [
          db.settings,
          db.goals,
          db.foods,
          db.recipes,
          db.mealEntries,
          db.waterEntries,
          db.supplements,
          db.supplementLogs,
          db.exercises,
          db.routines,
          db.sessions,
          db.exerciseLogs,
          db.setLogs,
          db.bodyWeightEntries,
        ],
        async () => {
          await Promise.all([
            db.settings.clear(),
            db.goals.clear(),
            db.foods.clear(),
            db.recipes.clear(),
            db.mealEntries.clear(),
            db.waterEntries.clear(),
            db.supplements.clear(),
            db.supplementLogs.clear(),
            db.exercises.clear(),
            db.routines.clear(),
            db.sessions.clear(),
            db.exerciseLogs.clear(),
            db.setLogs.clear(),
            db.bodyWeightEntries.clear(),
          ]);
        },
      );
    },

    async counts(): Promise<TableCounts> {
      const [
        goalsC,
        foodsC,
        recipesC,
        mealsC,
        waterC,
        supplementsC,
        supplementLogsC,
        exercisesC,
        routinesC,
        sessionsC,
        bodyWeightC,
      ] = await Promise.all([
        db.goals.count(),
        db.foods.count(),
        db.recipes.count(),
        db.mealEntries.count(),
        db.waterEntries.count(),
        db.supplements.count(),
        db.supplementLogs.count(),
        db.exercises.count(),
        db.routines.count(),
        db.sessions.count(),
        db.bodyWeightEntries.count(),
      ]);
      return {
        goals: goalsC,
        foods: foodsC,
        recipes: recipesC,
        mealEntries: mealsC,
        waterEntries: waterC,
        supplements: supplementsC,
        supplementLogs: supplementLogsC,
        exercises: exercisesC,
        routines: routinesC,
        sessions: sessionsC,
        bodyWeightEntries: bodyWeightC,
      };
    },

    async isEmpty() {
      const total =
        (await db.foods.count()) +
        (await db.mealEntries.count()) +
        (await db.sessions.count()) +
        (await db.bodyWeightEntries.count()) +
        (await db.exercises.count());
      return total === 0;
    },
  };

  return {
    settings,
    goals,
    foods,
    recipes,
    meals,
    water,
    supplements,
    supplementLogs,
    exercises,
    routines,
    workout,
    bodyWeight,
    storage,
  };
}
