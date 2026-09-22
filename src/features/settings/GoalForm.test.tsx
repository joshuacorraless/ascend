import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { inspectMacroPlan } from '@/lib/domain/macroPlan';
import { GoalForm } from './GoalForm';

afterEach(cleanup);
const initial = { calories: 2200, protein: 160, carbs: 220, fat: 70, waterMl: 3000 };

describe('GoalForm', () => {
  it('conserva los gramos del plan existente al abrir en modo personalizado', async () => {
    const onSubmit = vi.fn();
    const current = { calories: 2000, protein: 150, carbs: 200, fat: 66.7, waterMl: 2500 };
    const user = userEvent.setup();
    render(
      <GoalForm
        volumeUnit="ml"
        initial={current}
        initialMode="custom"
        submitLabel="Guardar"
        onSubmit={onSubmit}
      />,
    );
    expect(screen.getByLabelText('Carbos (g)')).toHaveValue('200');
    expect(screen.getByLabelText('Grasas (g)')).toHaveValue('66.7');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(current));
  });

  it('recalcula y guarda los gramos calculados al cambiar calorías y proteína', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <GoalForm volumeUnit="ml" initial={initial} submitLabel="Guardar" onSubmit={onSubmit} />,
    );
    await user.clear(screen.getByLabelText('Calorías diarias (kcal)'));
    await user.type(screen.getByLabelText('Calorías diarias (kcal)'), '3000');
    await user.clear(screen.getByLabelText('Proteína (g)'));
    await user.type(screen.getByLabelText('Proteína (g)'), '250');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const saved = onSubmit.mock.calls[0]![0];
    expect(saved.protein).toBe(250);
    expect(saved.waterMl).toBe(3000);
    expect(inspectMacroPlan(saved).consistent).toBe(true);
    expect(inspectMacroPlan(saved).outsideGuidance).toEqual([]);
  });

  it('impide guardar un reparto guiado incompatible', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <GoalForm
        volumeUnit="ml"
        initial={{ ...initial, calories: 2000 }}
        submitLabel="Guardar"
        onSubmit={onSubmit}
      />,
    );
    await user.clear(screen.getByLabelText('Proteína (g)'));
    await user.type(screen.getByLabelText('Proteína (g)'), '250');
    expect(screen.getByRole('alert')).toHaveTextContent('50–175 g');
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('no envía al cambiar de modo y exige coherencia en modo personalizado', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <GoalForm volumeUnit="ml" initial={initial} submitLabel="Guardar" onSubmit={onSubmit} />,
    );
    await user.click(screen.getByRole('button', { name: 'Personalizado' }));
    expect(onSubmit).not.toHaveBeenCalled();
    await user.clear(screen.getByLabelText('Carbos (g)'));
    await user.type(screen.getByLabelText('Carbos (g)'), '900');
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('deben sumar');
    await user.clear(screen.getByLabelText('Carbos (g)'));
    await user.click(screen.getByRole('button', { name: 'Reparto guiado' }));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(inspectMacroPlan(onSubmit.mock.calls[0]![0]).consistent).toBe(true);
  });
});
