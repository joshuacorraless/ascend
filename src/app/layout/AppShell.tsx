import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { PWAUpdatePrompt } from '@/app/PWAUpdatePrompt';

function RouteFallback() {
  return (
    <div className="grid place-items-center py-28">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-ink" />
    </div>
  );
}

export function AppShell() {
  return (
    <div className="app-canvas min-h-dvh">
      <main className="mx-auto w-full max-w-2xl px-5 pb-28 pt-safe">
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <PWAUpdatePrompt />
      <BottomNav />
    </div>
  );
}
