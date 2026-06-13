import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Field, fieldInputClass } from '@/components/ui/Field';
import { useToast } from '@/app/providers/toast';
import { getRepositories } from '@/lib/repositories';
import { newEntity, touch } from '@/lib/factories';
import { parseDecimalInput, parseOptionalDecimalInput } from '@/lib/numberInput';
import { portionUnitSchema, type Food, type FoodSource } from '@/lib/schema';

const schema = z.object({
  name: z.string().min(1, 'Requerido'),
  brand: z.string().optional(),
  portionSize: z.number({ invalid_type_error: 'Número' }).gt(0, 'Mayor que 0'),
  portionUnit: portionUnitSchema,
  calories: z.number({ invalid_type_error: 'Número' }).min(0).max(1_000_000),
  protein: z.number({ invalid_type_error: 'Número' }).min(0).max(100_000),
  carbs: z.number({ invalid_type_error: 'Número' }).min(0).max(100_000),
  fat: z.number({ invalid_type_error: 'Número' }).min(0).max(100_000),
  fiber: z.number().min(0).max(100_000).optional(),
  sugar: z.number().min(0).max(100_000).optional(),
  sodium: z.number().min(0).max(100_000).optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// Convierte el string del input a número (o NaN/undefined para casos vacíos).
const numReq = { setValueAs: parseDecimalInput };
const numOpt = { setValueAs: parseOptionalDecimalInput };

export function FoodFormModal({
  open,
  onClose,
  initial,
  onSaved,
  prefill,
  banner,
  source = 'manual',
}: {
  open: boolean;
  onClose: () => void;
  initial?: Food;
  onSaved?: (food: Food) => void;
  /** Valores precargados (p. ej. extraídos por IA) al crear un alimento nuevo. */
  prefill?: Partial<FormValues>;
  /** Aviso mostrado arriba del formulario (advertencias de IA, etc.). */
  banner?: ReactNode;
  /** Origen del alimento al crearlo (manual | ai | …). */
  source?: FoodSource;
}) {
  const { success } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial
      ? {
          name: initial.name,
          brand: initial.brand ?? '',
          portionSize: initial.portionSize,
          portionUnit: initial.portionUnit,
          calories: initial.calories,
          protein: initial.protein,
          carbs: initial.carbs,
          fat: initial.fat,
          fiber: initial.fiber,
          sugar: initial.sugar,
          sodium: initial.sodium,
          notes: initial.notes ?? '',
        }
      : { portionUnit: 'g', portionSize: 100, ...prefill },
  });

  const submit = handleSubmit(async (v) => {
    const repos = getRepositories();
    const base = {
      name: v.name.trim(),
      ...(v.brand?.trim() ? { brand: v.brand.trim() } : {}),
      portionSize: v.portionSize,
      portionUnit: v.portionUnit,
      calories: v.calories,
      protein: v.protein,
      carbs: v.carbs,
      fat: v.fat,
      ...(v.fiber !== undefined ? { fiber: v.fiber } : {}),
      ...(v.sugar !== undefined ? { sugar: v.sugar } : {}),
      ...(v.sodium !== undefined ? { sodium: v.sodium } : {}),
      ...(v.notes?.trim() ? { notes: v.notes.trim() } : {}),
    };

    const saved: Food = initial
      ? touch({ ...initial, ...base })
      : newEntity<Food>({ ...base, source, favorite: false, archived: false });
    await repos.foods.put(saved);
    success(initial ? 'Alimento actualizado.' : 'Alimento creado.');
    onSaved?.(saved);
    onClose();
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Editar alimento' : 'Nuevo alimento'}
      footer={
        <button form="food-form" type="submit" className="btn-primary w-full" disabled={isSubmitting}>
          {initial ? 'Guardar cambios' : 'Crear alimento'}
        </button>
      }
    >
      <form id="food-form" onSubmit={submit} className="space-y-4">
        {banner}
        <Field label="Nombre" htmlFor="f-name" error={errors.name?.message}>
          <input id="f-name" className={fieldInputClass(!!errors.name)} {...register('name')} autoFocus />
        </Field>
        <Field label="Marca (opcional)" htmlFor="f-brand">
          <input id="f-brand" className="input" {...register('brand')} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Tamaño de porción" htmlFor="f-psize" error={errors.portionSize?.message}>
            <input
              id="f-psize"
              type="text"
              inputMode="decimal"
              className={fieldInputClass(!!errors.portionSize)}
              {...register('portionSize', numReq)}
            />
          </Field>
          <Field label="Unidad" htmlFor="f-punit">
            <select id="f-punit" className="input" {...register('portionUnit')}>
              <option value="g">gramos (g)</option>
              <option value="ml">mililitros (ml)</option>
              <option value="unidad">unidad</option>
              <option value="porcion">porción</option>
            </select>
          </Field>
        </div>

        <p className="text-xs text-zinc-400">Valores nutricionales por la porción indicada arriba.</p>

        <Field label="Calorías (kcal)" htmlFor="f-cal" error={errors.calories?.message}>
          <input id="f-cal" type="text" inputMode="decimal" className={fieldInputClass(!!errors.calories)} {...register('calories', numReq)} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Proteína (g)" htmlFor="f-prot" error={errors.protein?.message}>
            <input id="f-prot" type="text" inputMode="decimal" className={fieldInputClass(!!errors.protein)} {...register('protein', numReq)} />
          </Field>
          <Field label="Carbos (g)" htmlFor="f-carb" error={errors.carbs?.message}>
            <input id="f-carb" type="text" inputMode="decimal" className={fieldInputClass(!!errors.carbs)} {...register('carbs', numReq)} />
          </Field>
          <Field label="Grasas (g)" htmlFor="f-fat" error={errors.fat?.message}>
            <input id="f-fat" type="text" inputMode="decimal" className={fieldInputClass(!!errors.fat)} {...register('fat', numReq)} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Fibra (g)" htmlFor="f-fib">
            <input id="f-fib" type="text" inputMode="decimal" className="input" {...register('fiber', numOpt)} />
          </Field>
          <Field label="Azúcar (g)" htmlFor="f-sug">
            <input id="f-sug" type="text" inputMode="decimal" className="input" {...register('sugar', numOpt)} />
          </Field>
          <Field label="Sodio (mg)" htmlFor="f-sod">
            <input id="f-sod" type="text" inputMode="decimal" className="input" {...register('sodium', numOpt)} />
          </Field>
        </div>

        <Field label="Notas (opcional)" htmlFor="f-notes">
          <input id="f-notes" className="input" {...register('notes')} />
        </Field>
      </form>
    </Modal>
  );
}
