import { useEffect, useState } from 'react';
import { todayKey, weekdayOfKey, type DateKey } from '@/lib/datetime';
import { useSettings } from '@/app/providers/settings';

/**
 * Clave del día actual según la zona horaria configurada. Se recalcula al
 * volver a la pestaña (por si cruzó la medianoche con la app abierta).
 */
export function useToday(): { dateKey: DateKey; weekday: number } {
  const { settings } = useSettings();
  const [key, setKey] = useState(() => todayKey(settings.timeZone));

  useEffect(() => {
    const refresh = () => setKey(todayKey(settings.timeZone));
    refresh();
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    const interval = window.setInterval(refresh, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(interval);
    };
  }, [settings.timeZone]);

  return { dateKey: key, weekday: weekdayOfKey(key) };
}
