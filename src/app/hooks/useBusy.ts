import { useCallback, useRef, useState } from 'react';

/**
 * Ejecuta una acción asíncrona evitando dobles invocaciones (anti-dedazos).
 * Devuelve `busy` para deshabilitar el botón mientras corre el proceso.
 */
export function useBusy() {
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  const run = useCallback(async (fn: () => Promise<void> | void) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await fn();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }, []);

  return { busy, run };
}
