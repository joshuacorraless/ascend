import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDb } from '@/lib/db/database';
import { newEntity } from '@/lib/factories';
import type { ExerciseLog, SetLog, WorkoutSession } from '@/lib/schema';
import { SessionScreen } from './SessionScreen';

vi.mock('@/app/providers/settings', () => ({
  useSettings: () => ({ settings: { weightUnit: 'kg' } }),
}));
vi.mock('@/app/providers/toast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));
vi.mock('@/app/providers/confirm', () => ({ useConfirm: () => vi.fn() }));

let set: SetLog;
beforeEach(async () => {
  const db = getDb();
  await Promise.all([db.sessions.clear(), db.exerciseLogs.clear(), db.setLogs.clear()]);
  const session = newEntity<WorkoutSession>({
    name: 'Lunes',
    localDate: '2026-09-22',
    startedAt: new Date().toISOString(),
    status: 'active',
  });
  const log = newEntity<ExerciseLog>({
    sessionId: session.id,
    exerciseId: 'pec-deck',
    exerciseName: 'Pec deck',
    trackingType: 'weight_reps',
    order: 0,
  });
  set = newEntity<SetLog>({
    sessionId: session.id,
    exerciseLogId: log.id,
    exerciseId: log.exerciseId,
    setNumber: 1,
    weightKg: 70,
    reps: 8,
    setType: 'efectiva',
    completed: false,
    notes: 'Mantener el control',
    rpe: 8,
  });
  await db.sessions.put(session);
  await db.exerciseLogs.put(log);
  await db.setLogs.put(set);
});

async function renderSession() {
  render(
    <MemoryRouter
      initialEntries={[`/entrenamiento/sesion/${set.sessionId}`]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/entrenamiento/sesion/:sessionId" element={<SessionScreen />} />
        <Route path="/entrenamiento" element={<p>Entrenamiento</p>} />
      </Routes>
    </MemoryRouter>,
  );
  return screen.findByLabelText('RIR de la serie 1 (opcional)');
}

describe('RIR manual de cada serie', () => {
  it('mantiene vacío como ausente y permite guardar cero explícito y volver a borrarlo', async () => {
    const input = await renderSession();
    expect(input).toHaveValue('');
    fireEvent.blur(input);
    await waitFor(async () => expect((await getDb().setLogs.get(set.id))?.rir).toBeUndefined());
    fireEvent.change(input, { target: { value: '0' } });
    fireEvent.blur(input);
    await waitFor(async () => expect((await getDb().setLogs.get(set.id))?.rir).toBe(0));
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    await waitFor(async () => expect((await getDb().setLogs.get(set.id))?.rir).toBeUndefined());
    expect(screen.getByText('RPE 8 · esfuerzo percibido')).toBeInTheDocument();
  });

  it('rechaza RIR inválido sin convertirlo en cero ni alterar lo guardado', async () => {
    await getDb().setLogs.update(set.id, { rir: 2 });
    const input = await renderSession();
    for (const value of ['11', '-1', 'no sé']) {
      fireEvent.change(input, { target: { value } });
      fireEvent.blur(input);
      expect(screen.getByRole('alert')).toHaveTextContent('RIR debe estar entre 0 y 10');
      await act(async () => {
        expect(await getDb().setLogs.get(set.id)).toMatchObject({ rir: 2, rpe: 8 });
      });
    }
  });

  it('conserva peso, reps y RIR al editar y marcar completada antes de refrescar la fila', async () => {
    const rir = await renderSession();
    fireEvent.change(rir, { target: { value: '1' } });
    fireEvent.blur(rir);
    const weight = screen.getByLabelText('Peso de la serie 1 en kg');
    fireEvent.change(weight, { target: { value: '85' } });
    fireEvent.blur(weight);
    const reps = screen.getByLabelText('Repeticiones de la serie 1');
    fireEvent.change(reps, { target: { value: '6' } });
    fireEvent.blur(reps);
    fireEvent.click(screen.getByRole('button', { name: 'Completada' }));
    await waitFor(async () =>
      expect(await getDb().setLogs.get(set.id)).toMatchObject({
        rir: 1,
        rpe: 8,
        weightKg: 85,
        reps: 6,
        completed: true,
        notes: 'Mantener el control',
      }),
    );
  });

  it('espera el último RIR y la marca de completada antes de finalizar la sesión', async () => {
    const input = await renderSession();
    fireEvent.change(input, { target: { value: '0' } });
    fireEvent.blur(input);
    fireEvent.click(screen.getByRole('button', { name: 'Completada' }));
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar' }));
    await screen.findByText('Entrenamiento');
    expect(await getDb().setLogs.get(set.id)).toMatchObject({
      rir: 0,
      completed: true,
      weightKg: 70,
      reps: 8,
    });
    expect((await getDb().sessions.get(set.sessionId))?.status).toBe('completed');
  });

  it('muestra el RIR de una sesión completada sin permitir su edición', async () => {
    await getDb().setLogs.update(set.id, { rir: 0, completed: true });
    await getDb().sessions.update(set.sessionId, { status: 'completed' });
    const input = await renderSession();
    expect(input).toHaveValue('0');
    expect(input).toBeDisabled();
  });
});
