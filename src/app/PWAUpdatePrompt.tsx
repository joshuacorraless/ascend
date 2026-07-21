import { useRegisterSW } from 'virtual:pwa-register/react';

// El service worker se registra con `registerType: 'prompt'`: la actualización
// no se aplica sola, se ofrece con este aviso.
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
    <div className="fixed inset-x-0 bottom-24 z-50 flex justify-center px-5">
      <div className="flex items-center gap-3 rounded-xl border border-line bg-paper px-4 py-3 shadow-lift">
        <span className="text-sm text-ink">Hay una nueva versión disponible.</span>
        <button
          className="btn-primary !min-h-0 px-3.5 py-2 text-xs"
          onClick={() => updateServiceWorker(true)}
        >
          Actualizar
        </button>
        <button
          className="text-sm font-medium text-ink-muted transition hover:text-ink"
          onClick={() => setNeedRefresh(false)}
        >
          Después
        </button>
      </div>
    </div>
  );
}
