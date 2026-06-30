import { cn } from '@/lib/cn';

/**
 * Emblema de Ascend: barras en ascenso sobre el gris de la app. Cada barra en
 * un color de la paleta (rojo → amarillo → azul → verde), subiendo a la meta.
 */
export function AscendMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-line bg-canvas shadow-[0_18px_40px_-22px_rgba(0,0,0,0.8)]',
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 48 48" className="h-full w-full" fill="none">
        <rect x="7.2" y="27" width="6" height="12" rx="2.4" fill="#FF8787" />
        <rect x="16.4" y="20" width="6" height="19" rx="2.4" fill="#FFD43B" />
        <rect x="25.6" y="13" width="6" height="26" rx="2.4" fill="#4DABF7" />
        <rect x="34.8" y="6" width="6" height="33" rx="2.4" fill="#51CF66" />
      </svg>
    </div>
  );
}
