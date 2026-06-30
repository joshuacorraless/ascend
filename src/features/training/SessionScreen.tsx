import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Modal } from '@/components/ui/Modal';
import { Caret } from '@/components/ui/Caret';
import { useSettings } from '@/app/providers/settings';
import { useToast } from '@/app/providers/toast';
import { useConfirm } from '@/app/providers/confirm';
import { getRepositories } from '@/lib/repositories';
import { touch } from '@/lib/factories';
import { SET_TYPE_LABELS } from './constants';
import {
  addExerciseToSession,
  addSet,
  cancelSession,
  finishSession,
  previousExerciseSets,
} from './sessionActions';
import { totalVolume } from '@/lib/domain';
import { formatDuration } from '@/lib/datetime';
import { round, weightToDisplay, weightToKg } from '@/lib/units';
import { cn } from '@/lib/cn';
import { parseDecimalInput } from '@/lib/numberInput';
import type { Exercise, ExerciseLog, SetLog, SetType, WeightUnit } from '@/lib/schema';

const SET_TYPE_CYCLE: SetType[] = ['efectiva', 'calentamiento', 'dropset', 'fallo'];

export function SessionScreen() {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { success } = useToast();
  const confirm = useConfirm();
  const repos = getRepositories();

  const session = useLiveQuery(() => repos.workout.getSession(sessionId), [sessionId]);
  const logs = useLiveQuery(() => repos.workout.listExerciseLogs(sessionId), [sessionId], [] as ExerciseLog[]);
  const sets = useLiveQuery(() => repos.workout.listSetLogs(sessionId), [sessionId], [] as SetLog[]);
  const [addOpen, setAddOpen] = useState(false);

  const elapsed = useElapsed(session?.startedAt);

  if (session === undefined) {
    return <p className="py-20 text-center text-sm text-ink-muted">Cargando sesión…</p>;
  }
  if (session === null) {
    return (
      <div className="py-20 text-center">
        <p className="text-ink-muted">Esta sesión ya no existe.</p>
        <button className="btn-primary mt-4" onClick={() => navigate('/entrenamiento')}>
          Volver
        </button>
      </div>
    );
  }

  const readOnly = session.status !== 'active';
  const orderedLogs = [...(logs ?? [])].sort((a, b) => a.order - b.order);
  const allSets = sets ?? [];
  const volume = totalVolume(allSets);
  const doneSets = allSets.filter((s) => s.completed).length;

  const finish = async () => {
    if (doneSets === 0) {
      const ok = await confirm({
        title: 'Finalizar sin series',
        message: 'No marcaste ninguna serie como completada. ¿Finalizar igual?',
        confirmLabel: 'Finalizar',
      });
      if (!ok) return;
    }
    await finishSession(session);
    success('Sesión finalizada. ¡Buen trabajo!');
    navigate('/entrenamiento');
  };

  const cancel = async () => {
    const ok = await confirm({
      title: 'Descartar sesión',
      message: 'Se eliminará esta sesión y sus series registradas. ¿Continuar?',
      danger: true,
      confirmLabel: 'Descartar',
    });
    if (!ok) return;
    await cancelSession(session.id);
    navigate('/entrenamiento');
  };

  const removeExercise = async (log: ExerciseLog) => {
    const ok = await confirm({
      title: 'Quitar ejercicio',
      message: `¿Quitar ${log.exerciseName} de la sesión?`,
      danger: true,
      confirmLabel: 'Quitar',
    });
    if (ok) await repos.workout.removeExerciseLog(log.id);
  };

  const moveExercise = async (index: number, dir: -1 | 1) => {
    const a = orderedLogs[index];
    const b = orderedLogs[index + dir];
    if (!a || !b) return;
    await repos.workout.putExerciseLog(touch({ ...a, order: b.order }));
    await repos.workout.putExerciseLog(touch({ ...b, order: a.order }));
  };

  return (
    <div className="space-y-4">
      <header className="sticky top-0 z-10 -mx-5 border-b border-line bg-canvas/90 px-5 py-3 pt-safe backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-ink">{session.name}</h1>
            <p className="nums text-xs text-ink-muted">
              {readOnly ? 'Completada' : formatDuration(elapsed)} · {doneSets} series · vol {round(volume)} {settings.weightUnit}
            </p>
          </div>
          {!readOnly ? (
            <div className="flex shrink-0 items-center gap-1">
              <button className="rounded-lg px-2.5 py-2 text-sm font-medium text-ink-muted transition hover:text-danger-600" onClick={cancel}>
                Descartar
              </button>
              <button className="btn-primary !min-h-0 px-3.5 py-2 text-sm" onClick={finish}>
                Finalizar
              </button>
            </div>
          ) : (
            <button className="btn-secondary !min-h-0 px-3.5 py-2 text-sm" onClick={() => navigate('/entrenamiento')}>
              Volver
            </button>
          )}
        </div>
      </header>

      {orderedLogs.length === 0 && (
        <p className="py-8 text-center text-sm text-ink-muted">
          Esta sesión no tiene ejercicios. Agrega uno para empezar.
        </p>
      )}

      {orderedLogs.map((log, i) => (
        <ExerciseCard
          key={log.id}
          log={log}
          sets={allSets.filter((s) => s.exerciseLogId === log.id)}
          readOnly={readOnly}
          isFirst={i === 0}
          isLast={i === orderedLogs.length - 1}
          onRemove={() => removeExercise(log)}
          onMoveUp={() => moveExercise(i, -1)}
          onMoveDown={() => moveExercise(i, 1)}
        />
      ))}

      {!readOnly && (
        <button className="btn-secondary w-full" onClick={() => setAddOpen(true)}>
          Agregar ejercicio
        </button>
      )}

      <AddExerciseModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onPick={async (ex) => {
          await addExerciseToSession(session.id, ex, orderedLogs.length);
          setAddOpen(false);
        }}
      />
    </div>
  );
}

// ── Tarjeta de un ejercicio dentro de la sesión ──────────────────────────────
function ExerciseCard({
  log,
  sets,
  readOnly,
  isFirst,
  isLast,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  log: ExerciseLog;
  sets: SetLog[];
  readOnly: boolean;
  isFirst: boolean;
  isLast: boolean;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { settings } = useSettings();
  const repos = getRepositories();
  const unit = log.weightUnit ?? settings.weightUnit;
  const ordered = [...sets].sort((a, b) => a.setNumber - b.setNumber);
  const prev = useLiveQuery(() => previousExerciseSets(log.exerciseId, log.sessionId), [log.exerciseId, log.sessionId], [] as SetLog[]);
  const exercise = useLiveQuery(() => repos.exercises.get(log.exerciseId), [log.exerciseId]);

  const setUnit = (u: WeightUnit) => repos.workout.putExerciseLog(touch({ ...log, weightUnit: u }));

  // Al fijar el peso de la primera serie, lo replica en las series vacías
  // siguientes (sin pisar las ya editadas ni completadas). Siguen siendo editables.
  const propagateWeight = async (weightKg: number) => {
    if (weightKg <= 0) return;
    await Promise.all(
      ordered
        .filter((s) => s.weightKg === 0 && !s.completed)
        .map((s) => repos.workout.putSetLog(touch({ ...s, weightKg }))),
    );
  };

  const copyPrevious = async () => {
    const previous = prev ?? [];
    if (previous.length === 0) return;
    for (let i = 0; i < previous.length; i++) {
      const p = previous[i]!;
      const current = ordered[i];
      if (current) {
        await repos.workout.putSetLog(touch({ ...current, weightKg: p.weightKg, reps: p.reps }));
      } else {
        await repos.workout.putSetLog(
          touch({ ...p, id: crypto.randomUUID(), sessionId: log.sessionId, exerciseLogId: log.id, completed: false, createdAt: new Date().toISOString() }),
        );
      }
    }
  };

  return (
    <section className="card">
      <div className="mb-3 flex items-start gap-1.5">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold leading-snug text-ink">{log.exerciseName}</h3>
          {exercise?.description && (
            <p className="mt-0.5 text-xs text-ink-muted">{exercise.description}</p>
          )}
        </div>
        {!readOnly && (
          <>
            <UnitToggle unit={unit} onChange={setUnit} />
            <button
              className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition hover:text-ink disabled:opacity-25"
              onClick={onMoveUp}
              disabled={isFirst}
              aria-label="Subir"
            >
              <Caret dir="up" />
            </button>
            <button
              className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition hover:text-ink disabled:opacity-25"
              onClick={onMoveDown}
              disabled={isLast}
              aria-label="Bajar"
            >
              <Caret dir="down" />
            </button>
            <button
              className="rounded-lg px-2 py-1 text-xs font-medium text-ink-muted transition hover:text-danger-600"
              onClick={onRemove}
            >
              Quitar
            </button>
          </>
        )}
      </div>

      {prev && prev.length > 0 && (
        <div className="mb-2.5 flex items-center justify-between gap-2 rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink-muted">
          <span className="nums truncate">
            Anterior: {prev.map((s) => `${round(weightToDisplay(s.weightKg, unit), 1)}×${s.reps}`).join(', ')}
          </span>
          {!readOnly && (
            <button className="shrink-0 font-medium text-brand-600 transition hover:text-brand-700" onClick={copyPrevious}>
              Copiar
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-[2rem_1fr_1fr_2rem] items-center gap-2 px-1 pb-1.5 text-2xs font-medium text-ink-faint">
        <span>#</span>
        <span>{unit}</span>
        <span>Reps</span>
        <span></span>
      </div>

      <div className="space-y-1.5">
        {ordered.map((s, idx) => (
          <SetRow
            key={s.id}
            set={s}
            unit={unit}
            readOnly={readOnly}
            onWeightCommit={idx === 0 ? propagateWeight : undefined}
          />
        ))}
      </div>

      {!readOnly && (
        <button
          className="mt-2.5 w-full rounded-lg border border-dashed border-line py-2 text-xs font-medium text-ink-muted transition hover:border-ink-faint hover:text-ink"
          onClick={() => addSet(log, sets)}
        >
          Agregar serie
        </button>
      )}
    </section>
  );
}

// ── Fila de una serie (autoguardado) ─────────────────────────────────────────
function SetRow({
  set,
  unit,
  readOnly,
  onWeightCommit,
}: {
  set: SetLog;
  unit: WeightUnit;
  readOnly: boolean;
  /** Notifica el peso confirmado (la primera serie lo replica en las demás). */
  onWeightCommit?: (weightKg: number) => void;
}) {
  const repos = getRepositories();
  const [weight, setWeight] = useState(() => (set.weightKg ? String(round(weightToDisplay(set.weightKg, unit), 2)) : ''));
  const [reps, setReps] = useState(() => (set.reps ? String(set.reps) : ''));

  // Resincroniza si el set o la unidad cambian desde fuera (p. ej. "Copiar anterior",
  // autocarga del peso, o cambiar kg/lb).
  useEffect(() => {
    setWeight(set.weightKg ? String(round(weightToDisplay(set.weightKg, unit), 2)) : '');
    setReps(set.reps ? String(set.reps) : '');
  }, [set.weightKg, set.reps, unit]);

  const persist = (patch: Partial<SetLog>) => repos.workout.putSetLog(touch({ ...set, ...patch }));

  const persistWeight = () => {
    const v = parseDecimalInput(weight);
    const kg = Number.isFinite(v) && v > 0 ? weightToKg(v, unit) : 0;
    persist({ weightKg: kg });
    if (kg > 0) onWeightCommit?.(kg);
  };
  const persistReps = () => {
    const v = Number(reps);
    persist({ reps: Number.isFinite(v) && v > 0 ? Math.round(v) : 0 });
  };

  const cycleType = () => {
    const idx = SET_TYPE_CYCLE.indexOf(set.setType);
    const next = SET_TYPE_CYCLE[(idx + 1) % SET_TYPE_CYCLE.length]!;
    persist({ setType: next });
  };

  const typeBadge = set.setType === 'calentamiento' ? 'W' : set.setType === 'dropset' ? 'D' : set.setType === 'fallo' ? 'F' : String(set.setNumber);
  const special = set.setType !== 'efectiva';

  return (
    <div className={cn('grid grid-cols-[2rem_1fr_1fr_2rem] items-center gap-2', set.completed && 'opacity-70')}>
      <button
        onClick={cycleType}
        disabled={readOnly}
        title={SET_TYPE_LABELS[set.setType]}
        className={cn(
          'nums grid h-8 w-8 place-items-center rounded-lg text-xs font-semibold transition',
          special ? 'border border-ink bg-paper text-ink' : 'bg-canvas text-ink-soft',
        )}
      >
        {typeBadge}
      </button>
      <input
        type="text"
        inputMode="decimal"
        disabled={readOnly}
        className="input nums !px-2 !py-1.5 text-center"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        onBlur={persistWeight}
        placeholder="0"
      />
      <input
        type="number"
        inputMode="numeric"
        disabled={readOnly}
        className="input nums !px-2 !py-1.5 text-center"
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        onBlur={persistReps}
        placeholder="0"
      />
      <button
        onClick={() => persist({ completed: !set.completed })}
        disabled={readOnly}
        aria-label="Completada"
        aria-pressed={set.completed}
        className={cn(
          'grid h-8 w-8 place-items-center rounded-lg border transition duration-200 ease-ascend',
          set.completed ? 'border-brand-500 bg-brand-500' : 'border-line',
        )}
      >
        {set.completed && <span className="h-2 w-2 rounded-full bg-canvas" />}
      </button>
    </div>
  );
}

// ── Selector de ejercicio para añadir a la sesión ────────────────────────────
function AddExerciseModal({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (e: Exercise) => void }) {
  const [search, setSearch] = useState('');
  const exercises = useLiveQuery(() => getRepositories().exercises.list(), [], [] as Exercise[]);
  const term = search.trim().toLowerCase();
  const filtered = (exercises ?? []).filter((e) => !term || e.name.toLowerCase().includes(term));

  return (
    <Modal open={open} onClose={onClose} title="Agregar ejercicio">
      <div className="space-y-3">
        <input
          className="input"
          placeholder="Buscar…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        <div className="divide-y divide-line">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-muted">Sin ejercicios. Créalos en la pestaña Ejercicios.</p>
          ) : (
            filtered.map((e) => (
              <button key={e.id} onClick={() => onPick(e)} className="flex w-full items-center gap-2 py-3 text-left">
                <span className="flex-1 font-medium text-ink">{e.name}</span>
                <Caret dir="right" className="text-ink-faint" />
              </button>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}

// ── Toggle compacto kg/lb por ejercicio ──────────────────────────────────────
function UnitToggle({ unit, onChange }: { unit: WeightUnit; onChange: (u: WeightUnit) => void }) {
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-line text-2xs font-semibold">
      {(['kg', 'lb'] as const).map((u) => (
        <button
          key={u}
          onClick={() => onChange(u)}
          aria-pressed={unit === u}
          className={cn(
            'px-2 py-1 transition',
            unit === u ? 'bg-ink text-canvas' : 'text-ink-muted hover:bg-inset',
          )}
        >
          {u}
        </button>
      ))}
    </div>
  );
}

function useElapsed(startedAt?: string): number {
  const start = useMemo(() => (startedAt ? Date.parse(startedAt) : Date.now()), [startedAt]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return Math.max(0, (now - start) / 1000);
}
