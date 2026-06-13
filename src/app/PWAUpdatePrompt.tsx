import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw } from 'lucide-react';

/**
 * Actualización controlada del service worker (registerType: 'prompt').
 * Cuando hay una nueva versión, mostramos un aviso para actualizar a voluntad.
 */
export function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl) {
       
      console.info('Service worker listo:', swUrl);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed inset-x-0 bottom-20 z-50 flex justify-center px-4">
      <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
        <RefreshCw className="h-5 w-5 text-brand-600" />
        <span className="text-sm">Hay una nueva versión disponible.</span>
        <button className="btn-primary !min-h-0 !px-3 !py-1.5 text-xs" onClick={() => updateServiceWorker(true)}>
          Actualizar
        </button>
        <button
          className="text-sm text-zinc-500 hover:text-zinc-700"
          onClick={() => setNeedRefresh(false)}
          aria-label="Descartar"
        >
          Después
        </button>
      </div>
    </div>
  );
}
