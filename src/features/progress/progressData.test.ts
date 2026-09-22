import { describe, expect, it } from 'vitest';
import { newEntity } from '@/lib/factories';
import { personalRecords, totalVolume } from '@/lib/domain';
import type { SetLog, WorkoutSession } from '@/lib/schema';
import { selectExerciseProgress } from './progressData';

const session = (
  id: string,
  routineId: string,
  status: WorkoutSession['status'] = 'completed',
) => ({
  ...newEntity<WorkoutSession>({
    routineId,
    name: routineId,
    status,
    localDate: '2026-09-22',
    startedAt: '2026-09-22T12:00:00.000Z',
  }),
  id,
});
const set = (sessionId: string, weightKg: number, patch: Partial<SetLog> = {}) =>
  newEntity<SetLog>({
    sessionId,
    exerciseId: 'pec-deck',
    exerciseLogId: sessionId,
    setNumber: 1,
    completed: true,
    setType: 'efectiva',
    weightKg,
    reps: 8,
    ...patch,
  });

describe('exercise progress scope', () => {
  it('keeps the same exercise in two routines separate for charts and records', () => {
    const sets = [
      set('push', 60),
      set('upper', 80),
      set('active', 100),
      set('push', 200, { exerciseId: 'other' }),
    ];
    const sessions = [
      session('push', 'tuesday'),
      session('upper', 'friday'),
      session('active', 'tuesday', 'active'),
    ];
    const scoped = selectExerciseProgress(sets, sessions, 'pec-deck', 'tuesday');
    expect(scoped.sessionCount).toBe(1);
    expect(personalRecords(scoped.sets).maxWeightKg).toBe(60);
    expect(totalVolume(scoped.sets)).toBe(480);
    expect([...scoped.sessionDates.keys()]).toEqual(['push']);
    expect([...scoped.sessionStarts.entries()]).toEqual([['push', '2026-09-22T12:00:00.000Z']]);
    expect(selectExerciseProgress(sets, sessions, 'pec-deck').sessionCount).toBe(2);
  });
  it('does not count empty sessions, warmups, unfinished sets or orphaned logs', () => {
    const sessions = [session('warmup', 'a'), session('unfinished', 'a'), session('empty', 'a')];
    const result = selectExerciseProgress(
      [
        set('warmup', 100, { setType: 'calentamiento' }),
        set('unfinished', 100, { completed: false }),
        set('missing', 200),
      ],
      sessions,
      'pec-deck',
      'a',
    );
    expect(result.sessionCount).toBe(0);
    expect(result.sessionDates.size).toBe(0);
    expect(result.sessionStarts.size).toBe(0);
    expect(totalVolume(result.sets)).toBe(0);
  });
});
