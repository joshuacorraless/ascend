import { useRef, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/app/providers/toast';
import type { ExerciseLog, SetLog, WeightUnit } from '@/lib/schema';
import {
  canFillSpokenSet,
  nextSpokenSetNumber,
  saveSpokenSets,
} from '@/lib/repositories/voiceSetRepository';
import {
  findOtherExerciseMentions,
  parseSpokenSets,
  spokenSetSchema,
  type ParsedSpokenSet,
  type SpokenSet,
} from '@/lib/training/voiceSets';
import { weightToKg } from '@/lib/units';
import { parseDecimalInput } from '@/lib/numberInput';
import { useWorkoutDictation } from './useWorkoutDictation';

interface DraftSet {
  id: string;
  setNumber: string;
  weight: string;
  unit: WeightUnit;
  reps: string;
  effortKind: 'none' | 'rir' | 'rpe';
  effort: string;
}

export function VoiceWorkoutModal({
  logs,
  sets,
  initialLogId,
  defaultUnit,
  onClose,
}: {
  logs: ExerciseLog[];
  sets: SetLog[];
  initialLogId: string;
  defaultUnit: WeightUnit;
  onClose: () => void;
}) {
  const [logId, setLogId] = useState(initialLogId);
  const [text, setText] = useState('');
  const [rows, setRows] = useState<DraftSet[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const { success } = useToast();
  const dictation = useWorkoutDictation((transcript) => {
    setText(transcript);
    setRows([]);
  });
  const log = logs.find((item) => item.id === logId);
  const unit = log?.weightUnit ?? defaultUnit;
  const existing = sets.filter((set) => set.exerciseLogId === logId);
  const recording = dictation.status !== 'idle';

  const toDraft = (parsed: ParsedSpokenSet, used: number[]): DraftSet => {
    const number =
      parsed.setNumber ??
      nextSpokenSetNumber(
        existing,
        used,
        parsed.weight === undefined ? undefined : weightToKg(parsed.weight, parsed.unit),
      );
    used.push(number);
    return {
      id: crypto.randomUUID(),
      setNumber: String(number),
      weight: parsed.weight === undefined ? '' : String(parsed.weight),
      unit: parsed.unit,
      reps: parsed.reps === undefined ? '' : String(parsed.reps),
      effortKind: parsed.rir !== undefined ? 'rir' : parsed.rpe !== undefined ? 'rpe' : 'none',
      effort: String(parsed.rir ?? parsed.rpe ?? ''),
    };
  };

  const review = () => {
    const otherExercises = findOtherExerciseMentions(
      text,
      log?.exerciseName ?? '',
      logs.map((item) => item.exerciseName),
    );
    if (otherExercises.length) {
      setError(
        `El dictado menciona ${otherExercises.join(', ')}. Registra un ejercicio por vez: selecciona ese ejercicio o corrige el texto antes de continuar.`,
      );
      return;
    }
    const parsed = parseSpokenSets(text, unit);
    const used: number[] = [];
    setRows((parsed.sets.length ? parsed.sets : [{ unit }]).map((set) => toDraft(set, used)));
    setWarnings(parsed.warnings);
    setError('');
  };

  const updateRow = (id: string, patch: Partial<DraftSet>) =>
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const save = async () => {
    if (savingRef.current || !log) return;
    const converted: SpokenSet[] = [];
    for (const row of rows) {
      const parsed = spokenSetSchema.safeParse({
        setNumber: Number(row.setNumber),
        weight: row.weight.trim() ? parseDecimalInput(row.weight) : NaN,
        unit: row.unit,
        reps: Number(row.reps),
        ...(row.effortKind !== 'none'
          ? { [row.effortKind]: row.effort.trim() ? parseDecimalInput(row.effort) : NaN }
          : {}),
      });
      if (!parsed.success) {
        setError(
          'Revisa las series: peso desde 0, repeticiones enteras mayores a 0 y RIR/RPE de 0 a 10.',
        );
        return;
      }
      converted.push(parsed.data);
    }
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      await saveSpokenSets(log, converted);
      success(
        `${converted.length} ${converted.length === 1 ? 'serie registrada' : 'series registradas'} en ${log.exerciseName}.`,
      );
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'No se pudieron guardar las series. Inténtalo otra vez.',
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={() => {
        if (!savingRef.current) onClose();
      }}
      title="Registrar con voz"
      size="lg"
    >
      <div className="space-y-5">
        <label className="block space-y-1.5 text-xs font-medium text-ink-muted">
          <span>Ejercicio</span>
          <select
            className="input text-sm"
            value={logId}
            disabled={recording || saving}
            onChange={(event) => {
              setLogId(event.target.value);
              setText('');
              setRows([]);
              setWarnings([]);
              setError('');
            }}
          >
            {logs
              .filter(
                (item) =>
                  item.trackingType === 'weight_reps' || item.trackingType === 'bodyweight_reps',
              )
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.exerciseName}
                </option>
              ))}
          </select>
        </label>
        <p className="-mt-2 text-xs text-ink-muted">
          Dicta solo las series de {log?.exerciseName}. Para otro ejercicio, cambia la selección.
        </p>
        <div className="rounded-2xl border border-line bg-canvas p-4">
          <p className="text-sm leading-relaxed text-ink-soft">
            «170 libras, 8 reps, RIR cero. En la segunda, 7 reps con el mismo peso y RIR cero».
          </p>
          <button
            type="button"
            className="btn-primary mt-3 w-full gap-2"
            disabled={saving || dictation.status === 'stopping'}
            onClick={() => {
              if (recording) dictation.stop();
              else {
                setError('');
                dictation.start(text);
              }
            }}
          >
            <MicrophoneIcon />
            {dictation.status === 'starting'
              ? 'Conectando… toca para detener'
              : dictation.status === 'listening'
                ? 'Detener dictado'
                : dictation.status === 'stopping'
                  ? 'Terminando…'
                  : text
                    ? 'Seguir dictando'
                    : 'Empezar a dictar'}
          </button>
          <p className="mt-2 text-center text-xs text-ink-muted" aria-live="polite">
            {recording
              ? 'Escuchando · máximo un minuto'
              : dictation.supported
                ? 'El navegador procesa tu voz y puede necesitar internet.'
                : 'Usa el micrófono del teclado o escribe en el campo de abajo.'}
          </p>
        </div>
        {dictation.error && (
          <p role="alert" className="text-sm text-danger-600">
            {dictation.error}
          </p>
        )}
        <label className="block space-y-1.5 text-xs font-medium text-ink-muted">
          <span>Lo que hiciste · puedes corregirlo</span>
          <textarea
            className="input min-h-28 text-sm"
            value={text}
            disabled={recording || saving}
            maxLength={4000}
            placeholder="Dicta o escribe las series, el peso y las repeticiones…"
            onChange={(event) => {
              setText(event.target.value);
              setRows([]);
              setWarnings([]);
            }}
          />
        </label>
        {!rows.length && (
          <button
            className="btn-secondary w-full"
            disabled={recording || saving || !log}
            onClick={review}
          >
            {text.trim() ? 'Revisar series' : 'Completar una serie manualmente'}
          </button>
        )}
        {!!rows.length && (
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-ink">Revisa antes de guardar</h3>
              <p className="mt-1 text-xs text-ink-muted">
                Se marcarán como completadas en {log?.exerciseName}. RIR = reps en reserva; RPE =
                esfuerzo percibido.
              </p>
            </div>
            {!!warnings.length && (
              <ul className="space-y-1 rounded-xl bg-canvas p-3 text-xs leading-relaxed text-ink-muted">
                {warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}
            {rows.map((row) => {
              const current = existing.find((set) => set.setNumber === Number(row.setNumber));
              const conflict =
                current &&
                !canFillSpokenSet(current, weightToKg(parseDecimalInput(row.weight), row.unit));
              return (
                <div key={row.id} className="space-y-2 rounded-xl border border-line p-3">
                  <div className="grid grid-cols-[3rem_1fr_4rem_1fr] gap-2">
                    <label className="space-y-1 text-xs text-ink-muted">
                      Serie
                      <input
                        aria-label="Número de serie"
                        className="input nums !px-2"
                        inputMode="numeric"
                        type="number"
                        min={1}
                        max={100}
                        disabled={saving}
                        value={row.setNumber}
                        onChange={(e) => updateRow(row.id, { setNumber: e.target.value })}
                      />
                    </label>
                    <label className="space-y-1 text-xs text-ink-muted">
                      Peso
                      <input
                        aria-label="Peso de la serie"
                        className="input nums !px-2"
                        inputMode="decimal"
                        disabled={saving}
                        value={row.weight}
                        onChange={(e) => updateRow(row.id, { weight: e.target.value })}
                      />
                    </label>
                    <label className="space-y-1 text-xs text-ink-muted">
                      Unidad
                      <select
                        aria-label="Unidad de peso"
                        className="input !px-1"
                        value={row.unit}
                        disabled={saving}
                        onChange={(e) => updateRow(row.id, { unit: e.target.value as WeightUnit })}
                      >
                        <option>kg</option>
                        <option>lb</option>
                      </select>
                    </label>
                    <label className="space-y-1 text-xs text-ink-muted">
                      Reps
                      <input
                        aria-label="Repeticiones de la serie"
                        className="input nums !px-2"
                        inputMode="numeric"
                        type="number"
                        min={1}
                        max={1000}
                        disabled={saving}
                        value={row.reps}
                        onChange={(e) => updateRow(row.id, { reps: e.target.value })}
                      />
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      aria-label="Tipo de esfuerzo"
                      className="input min-w-0 flex-1 text-xs"
                      disabled={saving}
                      value={row.effortKind}
                      onChange={(e) =>
                        updateRow(row.id, {
                          effortKind: e.target.value as DraftSet['effortKind'],
                          effort: '',
                        })
                      }
                    >
                      <option value="none">Sin esfuerzo registrado</option>
                      <option value="rir">RIR · reps en reserva</option>
                      <option value="rpe">RPE · esfuerzo percibido</option>
                    </select>
                    {row.effortKind !== 'none' && (
                      <input
                        aria-label={`Valor de ${row.effortKind.toUpperCase()}`}
                        className="input nums !w-16 !px-2"
                        inputMode="decimal"
                        disabled={saving}
                        value={row.effort}
                        onChange={(e) => updateRow(row.id, { effort: e.target.value })}
                      />
                    )}
                    <button
                      className="px-1 text-xs text-ink-muted"
                      disabled={saving}
                      aria-label={`Quitar serie ${row.setNumber}`}
                      onClick={() =>
                        setRows((currentRows) => currentRows.filter((item) => item.id !== row.id))
                      }
                    >
                      Quitar
                    </button>
                  </div>
                  {conflict && (
                    <p className="text-xs text-danger-600">
                      Esta serie ya tiene datos. Cambia su número para conservarlos.
                    </p>
                  )}
                </div>
              );
            })}
            <button
              className="btn-secondary w-full"
              disabled={saving || rows.length >= 20}
              onClick={() =>
                setRows((current) => [
                  ...current,
                  toDraft(
                    { unit },
                    current.map((row) => Number(row.setNumber)),
                  ),
                ])
              }
            >
              Agregar otra serie
            </button>
            <button
              className="btn-primary w-full"
              disabled={saving || recording || !rows.length || !log}
              onClick={save}
            >
              {saving
                ? 'Guardando…'
                : `Guardar ${rows.length} ${rows.length === 1 ? 'serie' : 'series'}`}
            </button>
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm text-danger-600">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}

export function MicrophoneIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8" />
    </svg>
  );
}
