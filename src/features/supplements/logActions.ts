import { getRepositories } from '@/lib/repositories';
import { newEntity, touch } from '@/lib/factories';
import { nowIso } from '@/lib/ids';
import type { DateKey } from '@/lib/datetime';
import type { Supplement, SupplementLog } from '@/lib/schema';

/**
 * Marca/desmarca un suplemento para un día. Crea un registro diario
 * independiente (snapshot) sin tocar la definición del suplemento.
 */
export async function setSupplementCompleted(
  supplement: Supplement,
  dateKey: DateKey,
  completed: boolean,
): Promise<void> {
  const repos = getRepositories();
  const existing = await repos.supplementLogs.getFor(supplement.id, dateKey);

  if (existing) {
    await repos.supplementLogs.put(
      touch({ ...existing, completed, completedAt: completed ? nowIso() : undefined }),
    );
    return;
  }

  await repos.supplementLogs.put(
    newEntity<SupplementLog>({
      supplementId: supplement.id,
      localDate: dateKey,
      completed,
      ...(completed ? { completedAt: nowIso() } : {}),
      name: supplement.name,
      ...(supplement.dose ? { dose: supplement.dose } : {}),
    }),
  );
}
