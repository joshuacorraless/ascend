# Evolución del producto

Ascend prioriza profundidad local antes que amplitud conectada. Cada iniciativa futura debe conservar tres garantías: operación offline, control del usuario y estabilidad del historial.

## Horizonte

| Prioridad | Capacidad | Condición de entrada |
| :-- | :-- | :-- |
| **Siguiente** | Sincronización y respaldo en nube | Autenticación, RLS, cola local y estrategia explícita de conflictos. |
| **Siguiente** | Objetivos por tipo de día | Extender vigencia sin romper registros históricos. |
| **Después** | Superseries, circuitos y descansos | Modelo de agrupación y experiencia de sesión validados. |
| **Después** | Medidas y fotografías | Política de privacidad, cuotas y almacenamiento de objetos. |
| **Explorar** | Código de barras | Fuente de productos confiable y captura compatible. |
| **Explorar** | Exportación CSV y adherencia | Contratos de exportación y métricas comprensibles. |

## Sincronización

La capa de repositorios admite una implementación remota, pero sincronizar no consiste en sustituir Dexie. La evolución prevista mantiene IndexedDB como fuente operativa local, añade una cola de cambios y coordina `push/pull` con resolución de conflictos por entidad.

Supabase es la opción de referencia, no una dependencia comprometida. Antes de implementarlo deben definirse identidad, recuperación, borrado, políticas RLS, idempotencia y comportamiento offline.

## Recordatorios del sistema

Los avisos push requieren permiso, backend Web Push y una PWA instalada en iOS 16.4 o superior. Hasta que esa ruta sea confiable, Ascend conserva recordatorios dentro de la aplicación.

## Fuera de alcance

Ascend no proyecta red social, seguidores, chat, marketplace, pagos, entrenadores externos, recomendaciones médicas, planes automáticos, wearables ni conteo de pasos. Esa frontera protege el propósito del producto: seguimiento personal privado y comprensible.

[Volver al README](../README.md) · [Consultar limitaciones](./LIMITATIONS.md)
