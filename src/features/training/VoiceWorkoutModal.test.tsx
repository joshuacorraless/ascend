import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newEntity } from '@/lib/factories';
import type { ExerciseLog, SetLog } from '@/lib/schema';
import { saveSpokenSets } from '@/lib/repositories/voiceSetRepository';
import type * as VoiceSetRepository from '@/lib/repositories/voiceSetRepository';
import { VoiceWorkoutModal } from './VoiceWorkoutModal';

vi.mock('@/app/providers/toast', () => ({ useToast: () => ({ success: vi.fn() }) }));
vi.mock('@/lib/repositories/voiceSetRepository', async (importOriginal) => ({
  ...(await importOriginal<typeof VoiceSetRepository>()),
  saveSpokenSets: vi.fn(),
}));

const log = newEntity<ExerciseLog>({
  sessionId: 'session',
  exerciseId: 'pec-deck',
  exerciseName: 'Pec deck',
  trackingType: 'weight_reps',
  order: 0,
});
const other = { ...log, id: 'other-log', exerciseId: 'row', exerciseName: 'Remo' };
beforeEach(() => {
  vi.mocked(saveSpokenSets).mockReset();
});

describe('revisión del registro por voz', () => {
  it('permite corregir varias series y solo las guarda después de revisar', async () => {
    const onClose = vi.fn();
    render(
      <VoiceWorkoutModal
        logs={[log, other]}
        sets={[]}
        initialLogId={log.id}
        defaultUnit="kg"
        onClose={onClose}
      />,
    );
    fireEvent.change(screen.getByLabelText('Lo que hiciste · puedes corregirlo'), {
      target: { value: '170 libras, 8 reps RIR cero; otra de 7 reps RIR cero' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Revisar series' }));
    expect(saveSpokenSets).not.toHaveBeenCalled();
    expect(
      screen
        .getAllByLabelText('Peso de la serie')
        .map((input) => (input as HTMLInputElement).value),
    ).toEqual(['170', '170']);
    fireEvent.change(screen.getAllByLabelText('Repeticiones de la serie')[1]!, {
      target: { value: '6' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar 2 series' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(saveSpokenSets).toHaveBeenCalledWith(log, [
      { setNumber: 1, weight: 170, unit: 'lb', reps: 8, rir: 0 },
      { setNumber: 2, weight: 170, unit: 'lb', reps: 6, rir: 0 },
    ]);
  });

  it('asigna nuevas series después de las completadas y limpia la revisión al cambiar de ejercicio', () => {
    const completed = newEntity<SetLog>({
      sessionId: log.sessionId,
      exerciseLogId: log.id,
      exerciseId: log.exerciseId,
      setNumber: 1,
      weightKg: 70,
      reps: 8,
      setType: 'efectiva',
      completed: true,
    });
    render(
      <VoiceWorkoutModal
        logs={[log, other]}
        sets={[completed]}
        initialLogId={log.id}
        defaultUnit="kg"
        onClose={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText('Lo que hiciste · puedes corregirlo'), {
      target: { value: '70 kg, 8 reps' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Revisar series' }));
    expect(screen.getByLabelText('Número de serie')).toHaveValue(2);
    fireEvent.change(screen.getByLabelText('Ejercicio'), { target: { value: other.id } });
    expect(screen.queryByLabelText('Número de serie')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Lo que hiciste · puedes corregirlo')).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: 'Completar una serie manualmente' }));
    expect(screen.getByLabelText('Número de serie')).toHaveValue(1);
  });

  it('bloquea un dictado que menciona otro ejercicio de la sesión', () => {
    render(
      <VoiceWorkoutModal
        logs={[log, other]}
        sets={[]}
        initialLogId={log.id}
        defaultUnit="kg"
        onClose={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText('Lo que hiciste · puedes corregirlo'), {
      target: { value: 'Pec deck 170 libras 8 reps; remo 100 libras 10 reps' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Revisar series' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Registra un ejercicio por vez');
    expect(screen.queryByLabelText('Número de serie')).not.toBeInTheDocument();
    expect(saveSpokenSets).not.toHaveBeenCalled();
  });

  it('mantiene los datos editables cuando falla el guardado y permite corregirlos', async () => {
    vi.mocked(saveSpokenSets).mockRejectedValueOnce(new Error('La serie 1 ya tiene datos.'));
    render(
      <VoiceWorkoutModal
        logs={[log]}
        sets={[]}
        initialLogId={log.id}
        defaultUnit="kg"
        onClose={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText('Lo que hiciste · puedes corregirlo'), {
      target: { value: '30 kg, 8 reps' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Revisar series' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar 1 serie' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('ya tiene datos'));
    expect(screen.getByLabelText('Peso de la serie')).toHaveValue('30');
    expect(screen.getByLabelText('Número de serie')).toBeEnabled();
  });
});
