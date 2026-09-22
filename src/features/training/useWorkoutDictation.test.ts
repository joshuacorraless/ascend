import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorkoutDictation } from './useWorkoutDictation';

class MockRecognition {
  static latest: MockRecognition | undefined;
  lang = '';
  continuous = false;
  interimResults = false;
  onstart: (() => void) | null = null;
  onresult:
    | ((event: { results: { 0: { transcript: string }; isFinal: boolean }[] }) => void)
    | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();
  constructor() {
    MockRecognition.latest = this;
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  MockRecognition.latest = undefined;
  Object.defineProperty(window, 'SpeechRecognition', {
    configurable: true,
    value: MockRecognition,
  });
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
});
afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: undefined });
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
});

describe('ciclo de vida del dictado', () => {
  it('transcribe en español, conserva texto previo y libera el micrófono al cerrar', () => {
    const onTranscript = vi.fn();
    const { result, unmount } = renderHook(() => useWorkoutDictation(onTranscript));
    act(() => result.current.start('Primera serie 170 libras.'));
    const recognition = MockRecognition.latest!;
    expect(recognition.lang).toBe('es-CR');
    act(() => recognition.onstart?.());
    expect(result.current.status).toBe('listening');
    act(() =>
      recognition.onresult?.({
        results: [{ 0: { transcript: '8 reps RIR cero' }, isFinal: true }],
      }),
    );
    expect(onTranscript).toHaveBeenLastCalledWith('Primera serie 170 libras. 8 reps RIR cero');
    unmount();
    expect(recognition.abort).toHaveBeenCalledOnce();
    expect(recognition.onresult).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('explica permisos denegados y permite volver a intentar', () => {
    const { result } = renderHook(() => useWorkoutDictation(vi.fn()));
    act(() => result.current.start(''));
    const recognition = MockRecognition.latest!;
    act(() => recognition.onerror?.({ error: 'not-allowed' }));
    expect(result.current.status).toBe('idle');
    expect(result.current.error).toContain('permisos del navegador');
    expect(recognition.abort).toHaveBeenCalledOnce();
    act(() => result.current.start(''));
    expect(result.current.error).toBe('');
    expect(MockRecognition.latest).not.toBe(recognition);
  });

  it('ofrece texto manual cuando no hay soporte o conexión', () => {
    Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: undefined });
    const { result } = renderHook(() => useWorkoutDictation(vi.fn()));
    act(() => result.current.start(''));
    expect(result.current.supported).toBe(false);
    expect(result.current.error).toContain('micrófono de tu teclado');
    Object.defineProperty(window, 'SpeechRecognition', {
      configurable: true,
      value: MockRecognition,
    });
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    act(() => result.current.start(''));
    expect(result.current.error).toContain('necesita conexión');
    expect(MockRecognition.latest).toBeUndefined();
  });

  it('detiene automáticamente después de un minuto y libera un servicio que no responde', () => {
    const { result } = renderHook(() => useWorkoutDictation(vi.fn()));
    act(() => result.current.start(''));
    const recognition = MockRecognition.latest!;
    act(() => vi.advanceTimersByTime(60_000));
    expect(recognition.stop).toHaveBeenCalledOnce();
    expect(result.current.status).toBe('stopping');
    act(() => vi.advanceTimersByTime(4000));
    expect(recognition.abort).toHaveBeenCalledOnce();
    expect(result.current.status).toBe('idle');
  });
});
