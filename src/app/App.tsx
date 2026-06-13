import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { SettingsProvider, useSettings } from './providers/settings';
import { ToastProvider } from './providers/toast';
import { ConfirmProvider } from './providers/confirm';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';

/** Decide entre la bienvenida (primer uso) y la app completa. */
function Gate() {
  const { settings } = useSettings();
  if (!settings.onboarded) return <OnboardingScreen />;
  return <RouterProvider router={router} />;
}

export function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <SettingsProvider>
          <Gate />
        </SettingsProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}
