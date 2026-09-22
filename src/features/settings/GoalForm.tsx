import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Field, fieldInputClass } from '@/components/ui/Field';
import { volumeToDisplay, volumeToMl } from '@/lib/units';
import { parseDecimalInput } from '@/lib/numberInput';
import {
  guidedMacroPlan,
  inspectMacroPlan,
  MACRO_GUIDANCE_URL,
  MACRO_RANGES,
  macroGramsRange,
  type MacroKey,
} from '@/lib/domain/macroPlan';
import type { VolumeUnit } from '@/lib/schema';

const schema = z.object({
  calories: z.preprocess(parseDecimalInput, z.number().gt(0, 'Mayor que cero').max(20000)),
  protein: z.preprocess(parseDecimalInput, z.number().min(0).max(2000)),
  carbs: z.preprocess(parseDecimalInput, z.number().min(0).max(4000)),
  fat: z.preprocess(parseDecimalInput, z.number().min(0).max(2000)),
  water: z.preprocess(parseDecimalInput, z.number().min(0).max(20000)),
});

type GoalFormValues = z.infer<typeof schema>;

export interface GoalValues {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  waterMl: number;
}

interface GoalFormProps {
  volumeUnit: VolumeUnit;
  initial: GoalValues;
  initialMode?: 'guided' | 'custom';
  submitLabel: string;
  onSubmit: (values: GoalValues) => Promise<void> | void;
}

export function GoalForm({
  volumeUnit,
  initial,
  initialMode = 'guided',
  submitLabel,
  onSubmit,
}: GoalFormProps) {
  const [mode, setMode] = useState<'guided' | 'custom'>(initialMode);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<GoalFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      calories: initial.calories,
      protein: initial.protein,
      carbs: initial.carbs,
      fat: initial.fat,
      water: volumeToDisplay(initial.waterMl, volumeUnit),
    },
  });
  const values = watch();
  const calories = parseDecimalInput(values.calories);
  const protein = parseDecimalInput(values.protein);
  const guided = guidedMacroPlan(calories, protein);
  const plan =
    mode === 'guided' && guided.ok
      ? guided.plan
      : {
          calories,
          protein,
          carbs: parseDecimalInput(values.carbs),
          fat: parseDecimalInput(values.fat),
        };
  const check = inspectMacroPlan(plan);
  const planError =
    mode === 'guided'
      ? guided.ok
        ? null
        : guided.error
      : check.consistent
        ? null
        : 'Los gramos deben sumar tu meta de calorías (±10 kcal por redondeo).';

  const submit = handleSubmit(async (v) => {
    if (planError) return;
    await onSubmit({ ...plan, waterMl: volumeToMl(v.water, volumeUnit) });
  });

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <p className="eyebrow">Tu reparto diario</p>
        <p className="mt-1.5 text-sm text-ink-muted">
          {mode === 'guided'
            ? 'Define calorías y proteína. Ascend distribuye el resto entre carbohidratos y grasas.'
            : 'Ajusta tu plan o elige el reparto guiado para calcular carbohidratos y grasas.'}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2" aria-label="Modo de planificación">
        {(
          [
            ['guided', 'Reparto guiado'],
            ['custom', 'Personalizado'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={mode === value ? 'btn-primary' : 'btn-secondary'}
            aria-pressed={mode === value}
            onClick={() => {
              if (value !== mode && guided.ok) {
                setValue('carbs', guided.plan.carbs);
                setValue('fat', guided.plan.fat);
              }
              setMode(value);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <Field label="Calorías diarias (kcal)" htmlFor="calories" error={errors.calories?.message}>
        <input
          id="calories"
          type="text"
          inputMode="numeric"
          className={fieldInputClass(!!errors.calories)}
          {...register('calories')}
        />
      </Field>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Proteína (g)" htmlFor="protein" error={errors.protein?.message}>
          <input
            id="protein"
            type="text"
            inputMode="decimal"
            className={fieldInputClass(!!errors.protein)}
            {...register('protein')}
          />
        </Field>
        {(['carbs', 'fat'] as const).map((key) => (
          <Field
            key={key}
            label={key === 'carbs' ? 'Carbos (g)' : 'Grasas (g)'}
            htmlFor={key}
            error={errors[key]?.message}
          >
            {mode === 'guided' ? (
              <input
                key={`guided-${key}`}
                id={key}
                className="input bg-canvas"
                readOnly
                value={guided.ok ? guided.plan[key] : ''}
                placeholder="—"
              />
            ) : (
              <input
                key={`custom-${key}`}
                id={key}
                type="text"
                inputMode="decimal"
                className={fieldInputClass(!!errors[key])}
                {...register(key)}
              />
            )}
          </Field>
        ))}
      </div>

      <div className="rounded-2xl border border-line bg-canvas p-4" aria-live="polite">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-ink">Distribución de energía</p>
          <p className="nums text-xs text-ink-muted">
            {Math.round(check.energy)} / {Number.isFinite(calories) ? calories : '—'} kcal
          </p>
        </div>
        <div className="flex h-2 overflow-hidden rounded-full bg-line" aria-hidden>
          {(['protein', 'carbs', 'fat'] as const).map((key) => (
            <div
              key={key}
              className={
                { protein: 'bg-macro-protein', carbs: 'bg-macro-carbs', fat: 'bg-macro-fat' }[key]
              }
              style={{ width: `${Math.min(100, check.percentages[key])}%` }}
            />
          ))}
        </div>
        <div className="mt-3 space-y-2">
          {(Object.keys(MACRO_RANGES) as MacroKey[]).map((key) => {
            const range = MACRO_RANGES[key];
            const grams = macroGramsRange(
              Number.isFinite(calories) && calories > 0 ? calories : 0,
              key,
            );
            return (
              <div key={key} className="flex justify-between gap-2 text-xs">
                <span className="text-ink-soft">
                  {range.label} ·{' '}
                  <span className="nums">{Math.round(check.percentages[key])}%</span>
                </span>
                <span className="nums text-right text-ink-muted">
                  {range.min}–{range.max}% · {grams.min}–{grams.max} g
                </span>
              </div>
            );
          })}
        </div>
        {planError && (
          <p className="mt-3 text-sm font-medium text-danger-600" role="alert">
            {planError}
          </p>
        )}
        {mode === 'custom' && check.outsideGuidance.length > 0 && (
          <p className="mt-3 text-xs text-ink-muted">
            Tu reparto se sale de la guía general. El modo personalizado permite seguir un plan
            individual; estos rangos no son límites médicos.
          </p>
        )}
      </div>

      <Field
        label={`Agua diaria (${volumeUnit === 'l' ? 'L' : 'ml'})`}
        htmlFor="water"
        error={errors.water?.message}
      >
        <input
          id="water"
          type="text"
          inputMode="decimal"
          className={fieldInputClass(!!errors.water)}
          {...register('water')}
        />
      </Field>

      <p className="text-xs leading-relaxed text-ink-muted">
        Guía general para adultos, no una meta calórica personalizada. El reparto usa 4 kcal/g para
        proteína y carbohidratos y 9 para grasas.{' '}
        <a
          href={MACRO_GUIDANCE_URL}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          Ver rangos de referencia
        </a>
        .
      </p>
      <button type="submit" className="btn-primary w-full" disabled={isSubmitting || !!planError}>
        {submitLabel}
      </button>
    </form>
  );
}
