import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Modal } from '@/components/ui/Modal';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    setOpts(options);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const close = (result: boolean) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setOpts(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={opts !== null}
        onClose={() => close(false)}
        title={opts?.title ?? ''}
        footer={
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-secondary flex-1" onClick={() => close(false)}>
              {opts?.cancelLabel ?? 'Cancelar'}
            </button>
            <button
              className={opts?.danger ? 'btn-danger flex-1' : 'btn-primary flex-1'}
              onClick={() => close(true)}
            >
              {opts?.confirmLabel ?? 'Confirmar'}
            </button>
          </div>
        }
      >
        {opts?.message && (
          <p className="text-sm leading-relaxed text-ink-soft">{opts.message}</p>
        )}
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>');
  return ctx;
}
