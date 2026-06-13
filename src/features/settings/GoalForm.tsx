import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Field, fieldInputClass } from '@/components/ui/Field';
import { volumeToDisplay, volumeToMl } from '@/lib/units';
import { parseDecimalInput } from '@/lib/numberInput';
import type { VolumeUnit } from '@/lib/schema';

const schema = z.object({
  calories: z.preprocess(parseDecimalInput, z.number().min(0, 'No puede ser negativo').max(20000)),
  protein: z.preprocess(parseDecimalInput, z.number().min(0).max(2000)),
  carbs: z.preprocess(parseDecimalInput, z.number().min(0).max(2000)),
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
  submitLabel: string;
  onSubmit: (values: GoalValues) => Promise<void> | void;
}

export function GoalForm({ volumeUnit, initial, submitLabel, onSubmit }: GoalFormProps) {
  const {
    register,
    handleSubmit,
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

  const submit = handleSubmit(async (v) => {
    await onSubmit({
      calories: v.calories,
      protein: v.protein,
      carbs: v.carbs,
      fat: v.fat,
      waterMl: volumeToMl(v.water, volumeUnit),
    });
  });

  return (
    <form onSubmit={submit} className="space-y-4">
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
        <Field label="Carbos (g)" htmlFor="carbs" error={errors.carbs?.message}>
          <input
            id="carbs"
            type="text"
            inputMode="decimal"
            className={fieldInputClass(!!errors.carbs)}
            {...register('carbs')}
          />
        </Field>
        <Field label="Grasas (g)" htmlFor="fat" error={errors.fat?.message}>
          <input
            id="fat"
            type="text"
            inputMode="decimal"
            className={fieldInputClass(!!errors.fat)}
            {...register('fat')}
          />
        </Field>
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

      <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
        {submitLabel}
      </button>
    </form>
  );
}
