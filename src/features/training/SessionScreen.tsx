import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  Copy,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
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
import type { Exercise, ExerciseLog, SetLog, SetType } from '@/lib/schema';

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
    return <p className="py-20 text-center text-sm text-zinc-400">Cargando sesión…</p>;
  }
  if (session === null) {
    return (
      <div className="py-20 text-center">
        <p className="text-zinc-500">Esta sesión ya no existe.</p>
        <button className="btn-primary mt-3" onClick={() => navigate('/entrenamiento')}>
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
      <header className="sticky top-0 z-10 -mx-4 border-b border-zinc-200 bg-zinc-50/95 px-4 py-3 pt-safe backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold">{session.name}</h1>
            <p className="text-xs text-zinc-500">
              {readOnly ? 'Completada' : formatDuration(elapsed)} · {doneSets} series · vol {round(volume)} {settings.weightUnit}
            </p>
          </div>
          {!readOnly ? (
            <div className="flex shrink-0 gap-2">
              <button className="btn-ghost !min-h-0 !px-2 !py-1.5 text-xs" onClick={cancel}>
                <X className="h-4 w-4" />
              </button>
              <button className="btn-primary !min-h-0 !px-3 !py-1.5 text-sm" onClick={finish}>
                <CheckCircle2 className="h-4 w-4" /> Finalizar
              </button>
            </div>
          ) : (
            <button className="btn-secondary !min-h-0 !px-3 !py-1.5 text-sm" onClick={() => navigate('/entrenamiento')}>
              Volver
            </button>
          )}
        </div>
      </header>

      {orderedLogs.length === 0 && (
        <p className="py-8 text-center text-sm text-zinc-500">
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
          <Plus className="h-4 w-4" /> Agregar ejercicio
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
  const ordered = [...sets].sort((a, b) => a.setNumber - b.setNumber);
  const prev = useLiveQuery(() => previousExerciseSets(log.exerciseId, log.sessionId), [log.exerciseId, log.sessionId], [] as SetLog[]);

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
      <div className="mb-2 flex items-center gap-2">
        <h3 className="flex-1 font-semibold">{log.exerciseName}</h3>
        {!readOnly && (
          <>
            <button className="rounded p-1 text-zinc-400 hover:text-brand-600 disabled:opacity-30" onClick={onMoveUp} disabled={isFirst} aria-label="Subir">
              <ArrowUp className="h-4 w-4" />
            </button>
            <button className="rounded p-1 text-zinc-400 hover:text-brand-600 disabled:opacity-30" onClick={onMoveDown} disabled={isLast} aria-label="Bajar">
              <ArrowDown className="h-4 w-4" />
            </button>
            <button className="rounded p-1 text-zinc-400 hover:text-red-600" onClick={onRemove} aria-label="Quitar ejercicio">
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {prev && prev.length > 0 && (
        <div className="mb-2 flex items-center justify-between rounded-lg bg-zinc-50 px-2 py-1.5 text-xs text-zinc-500 dark:bg-zinc-800/50">
          <span className="truncate">
            Anterior: {prev.map((s) => `${round(weightToDisplay(s.weightKg, settings.weightUnit), 1)}×${s.reps}`).join(', ')}
          </span>
          {!readOnly && (
            <button className="ml-2 flex shrink-0 items-center gap-1 font-medium text-brand-600" onClick={copyPrevious}>
              <Copy className="h-3.5 w-3.5" /> Copiar
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-[2rem_1fr_1fr_2.5rem_2rem] items-center gap-2 px-1 pb-1 text-[11px] font-medium text-zinc-400">
        <span>#</span>
        <span>{settings.weightUnit}</span>
        <span>Reps</span>
        <span>RPE</span>
        <span></span>
      </div>

      <div className="space-y-1.5">
        {ordered.map((s) => (
          <SetRow key={s.id} set={s} readOnly={readOnly} />
        ))}
      </div>

      {!readOnly && (
        <button className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-zinc-200 py-2 text-xs text-zinc-500 hover:text-brand-600 dark:border-zinc-700" onClick={() => addSet(log, sets)}>
          <Plus className="h-3.5 w-3.5" /> Agregar serie
        </button>
      )}
    </section>
  );
}

// ── Fila de una serie (autoguardado) ─────────────────────────────────────────
function SetRow({ set, readOnly }: { set: SetLog; readOnly: boolean }) {
  const { settings } = useSettings();
  const repos = getRepositories();
  const [weight, setWeight] = useState(() => (set.weightKg ? String(round(weightToDisplay(set.weightKg, settings.weightUnit), 2)) : ''));
  const [reps, setReps] = useState(() => (set.reps ? String(set.reps) : ''));
  const [rpe, setRpe] = useState(() => (set.rpe != null ? String(set.rpe) : ''));

  // Resincroniza si el set cambia desde fuera (p. ej. "Copiar anterior").
  useEffect(() => {
    setWeight(set.weightKg ? String(round(weightToDisplay(set.weightKg, settings.weightUnit), 2)) : '');
    setReps(set.reps ? String(set.reps) : '');
    setRpe(set.rpe != null ? String(set.rpe) : '');
  }, [set.weightKg, set.reps, set.rpe, settings.weightUnit]);

  const persist = (patch: Partial<SetLog>) => repos.workout.putSetLog(touch({ ...set, ...patch }));

  const persistWeight = () => {
    const v = parseDecimalInput(weight);
    persist({ weightKg: Number.isFinite(v) && v > 0 ? weightToKg(v, settings.weightUnit) : 0 });
  };
  const persistReps = () => {
    const v = Number(reps);
    persist({ reps: Number.isFinite(v) && v > 0 ? Math.round(v) : 0 });
  };
  const persistRpe = () => {
    const v = parseDecimalInput(rpe);
    persist({ rpe: rpe.trim() !== '' && Number.isFinite(v) ? Math.min(10, Math.max(0, v)) : undefined });
  };

  const cycleType = () => {
    const idx = SET_TYPE_CYCLE.indexOf(set.setType);
    const next = SET_TYPE_CYCLE[(idx + 1) % SET_TYPE_CYCLE.length]!;
    persist({ setType: next });
  };

  const typeBadge = set.setType === 'calentamiento' ? 'W' : set.setType === 'dropset' ? 'D' : set.setType === 'fallo' ? 'F' : String(set.setNumber);

  return (
    <div className={cn('grid grid-cols-[2rem_1fr_1fr_2.5rem_2rem] items-center gap-2', set.completed && 'opacity-70')}>
      <button
        onClick={cycleType}
        disabled={readOnly}
        title={SET_TYPE_LABELS[set.setType]}
        className={cn(
          'grid h-8 w-8 place-items-center rounded-lg text-xs font-bold',
          set.setType === 'calentamiento' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
        )}
      >
        {typeBadge}
      </button>
      <input
        type="text"
        inputMode="decimal"
        disabled={readOnly}
        className="input !px-2 !py-1.5 text-center"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        onBlur={persistWeight}
        placeholder="0"
      />
      <input
        type="number"
        inputMode="numeric"
        disabled={readOnly}
        className="input !px-2 !py-1.5 text-center"
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        onBlur={persistReps}
        placeholder="0"
      />
      <input
        type="text"
        inputMode="decimal"
        disabled={readOnly}
        className="input !px-1 !py-1.5 text-center"
        value={rpe}
        onChange={(e) => setRpe(e.target.value)}
        onBlur={persistRpe}
        placeholder="–"
      />
      <button
        onClick={() => persist({ completed: !set.completed })}
        disabled={readOnly}
        aria-label="Completada"
        className={cn(
          'grid h-8 w-8 place-items-center rounded-lg border-2 transition',
          set.completed ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-zinc-300 text-transparent dark:border-zinc-600',
        )}
      >
        <Check className="h-4 w-4" strokeWidth={3} />
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
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input className="input pl-9" placeholder="Buscar…" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
        </div>
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-500">Sin ejercicios. Créalos en la pestaña Ejercicios.</p>
          ) : (
            filtered.map((e) => (
              <button key={e.id} onClick={() => onPick(e)} className="flex w-full items-center gap-2 py-3 text-left">
                <span className="flex-1 font-medium">{e.name}</span>
                <Plus className="h-4 w-4 text-brand-500" />
              </button>
            ))
          )}
        </div>
      </div>
    </Modal>
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
