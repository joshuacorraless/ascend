import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { PWAUpdatePrompt } from '@/app/PWAUpdatePrompt';

function RouteFallback() {
  return (
    <div className="grid place-items-center py-24">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
    </div>
  );
}

export function AppShell() {
  return (
    <div className="min-h-dvh bg-zinc-50 dark:bg-zinc-950">
      <main className="mx-auto w-full max-w-2xl px-4 pb-28 pt-safe">
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <PWAUpdatePrompt />
      <BottomNav />
    </div>
  );
}
