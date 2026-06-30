import { useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Ancho máximo del panel en escritorio. */
  size?: 'md' | 'lg';
}

/**
 * Hoja inferior en móvil / diálogo centrado en escritorio.
 * Cierra con Escape o tocando el fondo. Bloquea el scroll del body.
 */
export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="absolute inset-0 animate-fade-in bg-ink/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        className={cn(
          'relative flex max-h-[92dvh] w-full animate-sheet-up flex-col rounded-t-3xl bg-paper shadow-lift',
          'sm:rounded-3xl',
          size === 'md' ? 'sm:max-w-md' : 'sm:max-w-2xl',
        )}
      >
        {/* Asidero de hoja (móvil): forma geométrica, no icono. */}
        <div className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-line sm:hidden" aria-hidden />
        <div className="flex items-center justify-between gap-4 px-5 pb-3 pt-3.5 sm:pt-5">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <button
            onClick={onClose}
            className="-mr-1.5 rounded-lg px-2 py-1 text-sm font-medium text-ink-muted transition hover:text-ink"
          >
            Cerrar
          </button>
        </div>
        <div className="divider" />
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && (
          <div className="border-t border-line px-5 py-4 pb-safe">{footer}</div>
        )}
      </div>
    </div>
  );
}
