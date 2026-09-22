import { useEffect, useRef, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/app/providers/toast';
import { WEEKDAY_LABELS } from '@/lib/datetime';
import { cn } from '@/lib/cn';
import { applyRoutineImport } from '@/lib/training/routineImport';
import {
  analyzeRoutineDocument,
  editRoutineDocumentSets,
  MAX_ROUTINE_TEXT_LENGTH,
  prepareRoutineDocument,
  readRoutineFile,
  routineDocumentIssues,
  routineDocumentSchema,
  validateRoutineFile,
  type RoutineDocument,
  type RoutineDocumentExercise,
} from '@/lib/training/routineImportDocument';
import { EQUIPMENT_LABELS, MUSCLE_LABELS } from './constants';

export function RoutineImportModal({ onClose }: { onClose: () => void }) {
  const { success } = useToast();
  const [mode, setMode] = useState<'file' | 'text'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [document, setDocument] = useState<RoutineDocument | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'reading' | 'saving' | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const locked = useRef(false);
  useEffect(() => () => controller.current?.abort(), []);
  const issues = document ? routineDocumentIssues(document) : [];
  const close = () => {
    if (busy !== 'saving') {
      controller.current?.abort();
      onClose();
    }
  };

  const analyze = async () => {
    if (locked.current) return;
    locked.current = true;
    setError('');
    setBusy('reading');
    const abort = new AbortController();
    controller.current = abort;
    const timeout = window.setTimeout(() => abort.abort(), 70_000);
    try {
      const input = mode === 'file' && file ? await readRoutineFile(file) : { text: text.trim() };
      let result: RoutineDocument | null = null;
      if ('text' in input && /^[\s]*\{/.test(input.text)) {
        try {
          const parsed = routineDocumentSchema.safeParse(JSON.parse(input.text));
          if (parsed.success) result = parsed.data;
        } catch {
          /* Plain-text documents may contain braces. */
        }
        if (mode === 'file' && file && /\.json$/i.test(file.name) && !result)
          throw new Error(
            'El JSON no tiene el formato de revisión de rutinas. El formato anterior se importa desde Ajustes.',
          );
      }
      result ??= await analyzeRoutineDocument(input, abort.signal);
      if (!abort.signal.aborted) {
        setDocument(result);
        setReviewed(false);
      }
    } catch (caught) {
      if (controller.current === abort)
        setError(caught instanceof Error ? caught.message : 'No se pudo leer la rutina.');
    } finally {
      window.clearTimeout(timeout);
      locked.current = false;
      if (controller.current === abort) {
        setBusy(null);
        controller.current = null;
      }
    }
  };

  const save = async () => {
    if (!document || !reviewed || locked.current) return;
    locked.current = true;
    setBusy('saving');
    setError('');
    try {
      const result = await applyRoutineImport(prepareRoutineDocument(document), { activate: true });
      success(`${result.routinesCreated} rutinas listas. Ya podés empezar a entrenar.`);
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'No se pudo guardar. Tu revisión sigue aquí.',
      );
    } finally {
      locked.current = false;
      setBusy(null);
    }
  };

  const updateRoutine = (r: number, patch: Partial<RoutineDocument['routines'][number]>) => {
    setDocument(
      (current) =>
        current && {
          ...current,
          routines: current.routines.map((routine, i) =>
            i === r ? { ...routine, ...patch } : routine,
          ),
        },
    );
    setReviewed(false);
  };
  const updateExercise = (r: number, e: number, patch: Partial<RoutineDocumentExercise>) => {
    if (!document) return;
    updateRoutine(r, {
      exercises: document.routines[r]!.exercises.map((exercise, i) =>
        i === e ? { ...exercise, ...patch } : exercise,
      ),
    });
  };

  return (
    <Modal
      open
      onClose={close}
      title={document ? 'Revisá tu plan' : 'Cargá tu rutina'}
      size="lg"
      footer={
        document ? (
          <button
            className="btn-primary w-full"
            onClick={save}
            disabled={!!busy || !reviewed || issues.length > 0}
          >
            {busy === 'saving' ? 'Guardando…' : `Crear ${document.routines.length} rutinas`}
          </button>
        ) : (
          <button
            className="btn-primary w-full"
            onClick={analyze}
            disabled={!!busy || (mode === 'file' ? !file : !text.trim())}
          >
            {busy === 'reading'
              ? 'Leyendo días, ejercicios y series…'
              : error
                ? 'Volver a intentar'
                : 'Leer rutina'}
          </button>
        )
      }
    >
      <div className="space-y-5">
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700"
          >
            {error}
          </p>
        )}
        {!document ? (
          <>
            <p className="text-sm leading-relaxed text-ink-muted">
              Subí tu plan y Ascend lo separa por días. Antes de guardarlo, podés revisar y corregir
              cada ejercicio.
            </p>
            <div className="flex gap-2">
              <button
                className={cn('chip', mode === 'file' && 'chip-active')}
                disabled={!!busy}
                onClick={() => setMode('file')}
              >
                Archivo o imagen
              </button>
              <button
                className={cn('chip', mode === 'text' && 'chip-active')}
                disabled={!!busy}
                onClick={() => setMode('text')}
              >
                Pegar texto
              </button>
            </div>
            {mode === 'file' ? (
              <label className="block rounded-2xl border border-dashed border-line bg-inset p-6">
                <span className="block font-semibold">{file ? file.name : 'Elegí tu rutina'}</span>
                <span className="mt-1 block text-xs text-ink-muted">
                  PDF, JPG, PNG, WebP, TXT o JSON de revisión · hasta 3 MB
                </span>
                <input
                  aria-label="Archivo de rutina"
                  type="file"
                  className="mt-4 block w-full text-sm"
                  accept="application/pdf,image/jpeg,image/png,image/webp,text/plain,application/json,.txt,.json"
                  disabled={!!busy}
                  onChange={(event) => {
                    const next = event.target.files?.[0];
                    if (!next) return;
                    const validation = validateRoutineFile(next);
                    setError(validation ?? '');
                    if (!validation) setFile(next);
                    event.target.value = '';
                  }}
                />
              </label>
            ) : (
              <label className="block">
                <span className="label">Tu rutina, tal como la recibiste</span>
                <textarea
                  className="input min-h-52"
                  value={text}
                  maxLength={MAX_ROUTINE_TEXT_LENGTH}
                  onChange={(event) => setText(event.target.value)}
                  disabled={!!busy}
                  placeholder={
                    'Lunes · Pecho\nPec deck: 2 series de 6–8 reps\nSerie 1: RIR 1. Serie 2: RIR 0 técnico.'
                  }
                />
                <span className="mt-1 block text-xs text-ink-muted">
                  {text.length.toLocaleString('es')} / 50.000 caracteres
                </span>
              </label>
            )}
            <p className="text-xs leading-relaxed text-ink-muted">
              Al pulsar «Leer rutina», el archivo o texto se envía al servicio de IA configurado
              para interpretarlo. Un JSON de revisión válido se abre en este dispositivo sin
              enviarse. Si falla la conexión, podés reintentar sin volver a elegir el archivo.
            </p>
            {busy === 'reading' && (
              <button className="btn-secondary w-full" onClick={() => controller.current?.abort()}>
                Cancelar lectura
              </button>
            )}
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-ink-muted">
                {document.routines.length} días o rutinas ·{' '}
                {document.routines.reduce((sum, routine) => sum + routine.exercises.length, 0)}{' '}
                ejercicios. Se agregarán a tu biblioteca.
              </p>
              <button
                className="shrink-0 text-sm font-medium text-ink-muted underline"
                disabled={!!busy}
                onClick={() => {
                  setDocument(null);
                  setError('');
                }}
              >
                Volver
              </button>
            </div>
            {document.warnings.length > 0 && (
              <div className="rounded-xl border border-line bg-inset p-3 text-sm">
                <p className="mb-2 font-semibold">El documento necesita revisión</p>
                <ul className="list-disc space-y-1 pl-4">
                  {document.warnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs leading-relaxed text-ink-muted">
              Los campos vacíos no se indicaron o no se pudieron leer. El peso realizado queda en
              blanco para registrarlo al entrenar. Los días sin asignar se guardan sin calendario.
            </p>
            {document.routines.map((routine, r) => (
              <details
                key={r}
                open={r === 0}
                className="space-y-3 rounded-2xl border border-line p-4"
              >
                <summary className="cursor-pointer font-semibold">
                  {routine.name || `Rutina ${r + 1}`}
                  <span className="ml-2 text-xs font-normal text-ink-muted">
                    {routine.exercises.length} ejercicios ·{' '}
                    {routine.exercises.reduce(
                      (sum, exercise) => sum + (exercise.targetSets ?? 0),
                      0,
                    )}{' '}
                    series
                  </span>
                </summary>
                <label className="block">
                  <span className="label">Rutina {r + 1}</span>
                  <input
                    aria-label={`Nombre de rutina ${r + 1}`}
                    className="input font-semibold"
                    value={routine.name}
                    maxLength={200}
                    disabled={!!busy}
                    onChange={(event) => updateRoutine(r, { name: event.target.value })}
                  />
                </label>
                <div className="flex flex-wrap gap-1">
                  {WEEKDAY_LABELS.map((label, day) => (
                    <button
                      key={day}
                      aria-pressed={routine.daysOfWeek.includes(day)}
                      disabled={!!busy}
                      className={cn('chip', routine.daysOfWeek.includes(day) && 'chip-active')}
                      onClick={() =>
                        updateRoutine(r, {
                          daysOfWeek: routine.daysOfWeek.includes(day)
                            ? routine.daysOfWeek.filter((d) => d !== day)
                            : [...routine.daysOfWeek, day],
                        })
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <label className="block">
                  <span className="label">Indicaciones del día</span>
                  <textarea
                    className="input"
                    value={routine.description}
                    maxLength={4000}
                    disabled={!!busy}
                    onChange={(event) => updateRoutine(r, { description: event.target.value })}
                  />
                </label>
                {routine.exercises.map((exercise, e) => (
                  <div key={e} className="space-y-3 border-t border-line pt-4">
                    <div className="flex items-center gap-2">
                      <span className="nums text-sm text-ink-muted">{e + 1}.</span>
                      <input
                        className="input flex-1 font-medium"
                        aria-label={`Ejercicio ${e + 1} de ${routine.name}`}
                        value={exercise.name}
                        maxLength={200}
                        disabled={!!busy}
                        onChange={(event) => updateExercise(r, e, { name: event.target.value })}
                      />
                    </div>
                    {exercise.source && (
                      <details className="text-xs text-ink-muted">
                        <summary className="cursor-pointer">Ver texto original</summary>
                        <p className="mt-2 whitespace-pre-wrap leading-relaxed">
                          {exercise.source}
                        </p>
                      </details>
                    )}
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <NumberField
                        label="Series"
                        value={exercise.targetSets}
                        max={20}
                        disabled={!!busy || !!exercise.prescribedSets}
                        onChange={(value) => updateExercise(r, e, { targetSets: value })}
                      />
                      {!exercise.prescribedSets && (
                        <>
                          <NumberField
                            label="Reps mín."
                            value={exercise.repRangeMin}
                            max={100}
                            disabled={!!busy}
                            onChange={(value) => updateExercise(r, e, { repRangeMin: value })}
                          />
                          <NumberField
                            label="Reps máx."
                            value={exercise.repRangeMax}
                            max={100}
                            disabled={!!busy}
                            onChange={(value) => updateExercise(r, e, { repRangeMax: value })}
                          />
                        </>
                      )}
                      <NumberField
                        label="Descanso (s)"
                        value={exercise.restSeconds}
                        max={3600}
                        min={0}
                        disabled={!!busy}
                        onChange={(value) => updateExercise(r, e, { restSeconds: value })}
                      />
                    </div>
                    {!exercise.prescribedSets && (
                      <FailureField
                        value={exercise.toFailure}
                        disabled={!!busy}
                        onChange={(value) => updateExercise(r, e, { toFailure: value })}
                      />
                    )}
                    {exercise.prescribedSets && (
                      <div className="space-y-2 rounded-xl bg-inset p-3">
                        <p className="text-xs font-semibold">Objetivo por serie</p>
                        <p className="text-xs text-ink-muted">
                          Para corregir la cantidad, añadí o quitá una serie aquí.
                        </p>
                        {exercise.prescribedSets.map((set, s) => {
                          const updateSet = (patch: Partial<typeof set>) =>
                            updateExercise(r, e, {
                              prescribedSets: exercise.prescribedSets!.map((entry, i) =>
                                i === s ? { ...entry, ...patch } : entry,
                              ),
                            });
                          return (
                            <div
                              key={s}
                              className="space-y-2 border-b border-line pb-3 last:border-0 last:pb-0"
                            >
                              <span className="text-xs font-semibold">Serie {s + 1}</span>
                              <div className="grid grid-cols-2 gap-2">
                                {
                                  <>
                                    <NumberField
                                      label="Reps mín."
                                      value={set.repRangeMin}
                                      max={100}
                                      disabled={!!busy}
                                      onChange={(value) => updateSet({ repRangeMin: value })}
                                    />
                                    <NumberField
                                      label="Reps máx."
                                      value={set.repRangeMax}
                                      max={100}
                                      disabled={!!busy}
                                      onChange={(value) => updateSet({ repRangeMax: value })}
                                    />
                                  </>
                                }
                              </div>
                              <FailureField
                                value={set.toFailure}
                                disabled={!!busy}
                                onChange={(value) => updateSet({ toFailure: value })}
                              />
                              <label className="block">
                                <span className="label">Indicación de la serie {s + 1}</span>
                                <input
                                  className="input text-sm"
                                  value={set.notes}
                                  maxLength={1000}
                                  disabled={!!busy}
                                  onChange={(event) => updateSet({ notes: event.target.value })}
                                />
                              </label>
                              <button
                                className="text-xs font-medium text-ink-muted underline"
                                disabled={!!busy || exercise.prescribedSets!.length <= 1}
                                onClick={() =>
                                  updateExercise(
                                    r,
                                    e,
                                    editRoutineDocumentSets(exercise, { type: 'remove', index: s }),
                                  )
                                }
                              >
                                Quitar serie {s + 1}
                              </button>
                            </div>
                          );
                        })}
                        <button
                          className="btn-secondary w-full text-sm"
                          disabled={!!busy || exercise.prescribedSets.length >= 20}
                          onClick={() =>
                            updateExercise(r, e, editRoutineDocumentSets(exercise, { type: 'add' }))
                          }
                        >
                          Añadir serie
                        </button>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block">
                        <span className="label">Equipo</span>
                        <select
                          className="input text-sm"
                          value={exercise.equipment ?? ''}
                          disabled={!!busy}
                          onChange={(event) =>
                            updateExercise(r, e, {
                              equipment:
                                (event.target.value as RoutineDocumentExercise['equipment']) ||
                                null,
                            })
                          }
                        >
                          <option value="">Sin indicar · elegí uno</option>
                          {Object.entries(EQUIPMENT_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="label">Músculo</span>
                        <select
                          className="input text-sm"
                          value={exercise.primaryMuscle ?? ''}
                          disabled={!!busy}
                          onChange={(event) =>
                            updateExercise(r, e, {
                              primaryMuscle:
                                (event.target.value as RoutineDocumentExercise['primaryMuscle']) ||
                                null,
                            })
                          }
                        >
                          <option value="">Sin indicar</option>
                          {Object.entries(MUSCLE_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <label className="block">
                      <span className="label">Técnica, esfuerzo y notas</span>
                      <textarea
                        className="input min-h-20 text-sm"
                        value={exercise.notes}
                        maxLength={4000}
                        disabled={!!busy}
                        onChange={(event) => updateExercise(r, e, { notes: event.target.value })}
                      />
                    </label>
                    <div className="flex flex-wrap gap-3 text-xs font-medium text-ink-muted">
                      <button
                        disabled={!!busy || e === 0}
                        onClick={() => {
                          const next = [...routine.exercises];
                          [next[e - 1], next[e]] = [next[e]!, next[e - 1]!];
                          updateRoutine(r, { exercises: next });
                        }}
                      >
                        Subir
                      </button>
                      <button
                        disabled={!!busy || e === routine.exercises.length - 1}
                        onClick={() => {
                          const next = [...routine.exercises];
                          [next[e + 1], next[e]] = [next[e]!, next[e + 1]!];
                          updateRoutine(r, { exercises: next });
                        }}
                      >
                        Bajar
                      </button>
                      <button
                        disabled={!!busy}
                        onClick={() =>
                          updateRoutine(r, {
                            exercises: routine.exercises.filter((_, i) => i !== e),
                          })
                        }
                      >
                        Quitar ejercicio
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  disabled={!!busy}
                  className="text-xs font-medium text-ink-muted underline"
                  onClick={() => {
                    setDocument({
                      ...document,
                      routines: document.routines.filter((_, i) => i !== r),
                    });
                    setReviewed(false);
                  }}
                >
                  Quitar rutina
                </button>
              </details>
            ))}
            {issues.length > 0 && (
              <div role="status" className="rounded-xl border border-line bg-inset p-3 text-sm">
                <p className="font-semibold">Faltan {issues.length} detalles por revisar</p>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  {issues.slice(0, 5).map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
                {issues.length > 5 && (
                  <p className="mt-2 text-xs">Y {issues.length - 5} más en los campos de arriba.</p>
                )}
              </div>
            )}
            <label className="flex items-start gap-3 text-sm">
              <input
                className="mt-1 accent-ink"
                type="checkbox"
                checked={reviewed}
                disabled={!!busy || issues.length > 0}
                onChange={(event) => setReviewed(event.target.checked)}
              />
              <span>Revisé días, ejercicios, series y notas contra mi documento.</span>
            </label>
          </>
        )}
      </div>
    </Modal>
  );
}

function NumberField({
  label,
  value,
  max,
  min = 1,
  disabled,
  onChange,
}: {
  label: string;
  value: number | null;
  max: number;
  min?: number;
  disabled: boolean;
  onChange: (value: number | null) => void;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input
        className="input nums"
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={1}
        placeholder="Sin indicar"
        value={value ?? ''}
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.value === '' ? null : Number(event.target.value))
        }
      />
    </label>
  );
}

function FailureField({
  value,
  disabled,
  onChange,
}: {
  value: boolean | null;
  disabled: boolean;
  onChange: (value: boolean | null) => void;
}) {
  return (
    <label className="block">
      <span className="label">Fallo / reserva</span>
      <select
        className="input text-sm"
        value={value === null ? '' : String(value)}
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.value === '' ? null : event.target.value === 'true')
        }
      >
        <option value="">No indicado</option>
        <option value="true">Al fallo (según las notas)</option>
        <option value="false">Con reserva</option>
      </select>
    </label>
  );
}
