import { describe, expect, it } from 'vitest';
import {
  assessSetChange,
  buildSetSessions,
  compareSessionSets,
  setChartData,
} from './setPerformance';
import type { SetLog } from '@/lib/schema';
import { weightToKg } from '@/lib/units';

const set = (sessionId: string, setNumber: number, patch: Partial<SetLog> = {}): SetLog => ({
  id: `${sessionId}-${setNumber}`,
  sessionId,
  exerciseId: 'pec',
  exerciseLogId: sessionId,
  setNumber,
  weightKg: weightToKg(170, 'lb'),
  reps: 8,
  completed: true,
  setType: 'efectiva',
  createdAt: '2026-09-22T12:00:00.000Z',
  updatedAt: '2026-09-22T12:00:00.000Z',
  ...patch,
});
const dates = new Map([
  ['first', '2026-09-21'],
  ['second', '2026-09-28'],
]);
const starts = new Map([
  ['first', '2026-09-21T12:00:00.000Z'],
  ['second', '2026-09-28T12:00:00.000Z'],
]);

describe('individual set performance', () => {
  it('compares like-numbered sets without summing reps or choosing max weight', () => {
    const sessions = buildSetSessions(
      [
        set('second', 2, { reps: 6 }),
        set('first', 1),
        set('second', 1, { reps: 9 }),
        set('first', 2, { reps: 7 }),
      ],
      dates,
      starts,
    );
    const rows = compareSessionSets(sessions[1]!, sessions[0]);
    expect(rows.map((row) => [row.setNumber, row.change])).toEqual([
      [1, 'progress'],
      [2, 'regress'],
    ]);
    const chart = setChartData(sessions, 'reps', 'lb');
    expect(chart.data[1]).toMatchObject({
      set_1: 9,
      set_2: 6,
      set_1_weight: 170,
      set_2_weight: 170,
    });
  });

  it('leaves missing sets and missing RIR as gaps, while preserving explicit RIR zero', () => {
    const sessions = buildSetSessions(
      [set('first', 1, { rir: 0 }), set('first', 2), set('second', 1)],
      dates,
      starts,
    );
    expect(setChartData(sessions, 'rir', 'kg').data).toMatchObject([
      { set_1: 0, set_2: null },
      { set_1: null, set_2: null },
    ]);
    expect(setChartData(sessions, 'weight', 'lb').data[1]).toMatchObject({
      set_1: 170,
      set_2: null,
    });
    expect(compareSessionSets(sessions[1]!, sessions[0])[1]?.change).toBe('missing');
  });

  it('excludes warmups, incomplete sets and sessions outside the supplied scope', () => {
    const sessions = buildSetSessions(
      [
        set('first', 1),
        set('first', 2, { setType: 'calentamiento' }),
        set('second', 1, { completed: false }),
        set('other-routine', 1),
      ],
      dates,
      starts,
    );
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.sets).toHaveLength(1);
  });

  it('orders same-day sessions by time independent of set order', () => {
    const day = new Map([
      ['first', '2026-09-21'],
      ['second', '2026-09-21'],
    ]);
    const times = new Map([
      ['first', '2026-09-21T20:00:00.000Z'],
      ['second', '2026-09-21T12:00:00.000Z'],
    ]);
    expect(
      buildSetSessions([set('first', 1), set('second', 1)], day, times).map(
        (session) => session.sessionId,
      ),
    ).toEqual(['second', 'first']);
  });

  it('does not arbitrarily merge duplicate set numbers from repeated exercise logs', () => {
    const sessions = buildSetSessions(
      [
        set('first', 1),
        set('first', 1, { id: 'duplicate', exerciseLogId: 'other', reps: 12 }),
        set('second', 1),
      ],
      dates,
      starts,
    );
    expect(setChartData(sessions, 'reps', 'kg').data[0]?.set_1).toBeNull();
    expect(compareSessionSets(sessions[1]!, sessions[0])[0]?.change).toBe('ambiguous');
  });
});

describe('weight, repetitions and RIR assessment', () => {
  it.each([
    [{ weightKg: 80, reps: 8 }, { weightKg: 75, reps: 8 }, 'progress'],
    [{ weightKg: 75, reps: 9 }, { weightKg: 75, reps: 8 }, 'progress'],
    [{ weightKg: 80, reps: 7 }, { weightKg: 75, reps: 8 }, 'mixed'],
    [{ weightKg: 70, reps: 9 }, { weightKg: 75, reps: 8 }, 'mixed'],
    [{ weightKg: 70, reps: 7 }, { weightKg: 75, reps: 8 }, 'regress'],
    [{ weightKg: 75, reps: 8, rir: 2 }, { weightKg: 75, reps: 8, rir: 0 }, 'progress'],
    [{ weightKg: 75, reps: 8, rir: 0 }, { weightKg: 75, reps: 8, rir: 2 }, 'harder'],
    [{ weightKg: 80, reps: 8, rir: 0 }, { weightKg: 75, reps: 8, rir: 2 }, 'mixed'],
    [{ weightKg: 70, reps: 8, rir: 3 }, { weightKg: 75, reps: 8, rir: 1 }, 'mixed'],
    [{ weightKg: 75, reps: 8 }, { weightKg: 75, reps: 8, rir: 2 }, 'same'],
  ] as const)('assesses %j against %j as %s', (current, previous, result) => {
    expect(assessSetChange(current, previous)).toBe(result);
  });
});
