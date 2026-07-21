# Registro de decisiones

Este registro explica por qué se eligió cada pieza y qué costaría cambiarla. La reversibilidad indica el impacto técnico del cambio, no su prioridad.

| Eje | Elección |
| :-- | :-- |
| Ejecución | SPA local-first con una única función serverless opcional. |
| Persistencia | IndexedDB detrás de contratos de repositorio. |
| Integridad | Zod en entradas críticas y snapshots en el histórico. |
| Evolución | Sustituciones incrementales, sin dependencia prematura de nube. |

## D1 · Framework: Vite + React + TypeScript (no Next.js)

- **Decisión:** SPA con Vite 6, React 19 y TypeScript. Despliegue en Vercel; el único
  endpoint de servidor (análisis de etiquetas IA) es una función serverless en `/api`.
- **Motivo:** La app es local-first y casi 100% cliente (todo vive en IndexedDB). Vite +
  `vite-plugin-pwa` ofrece la PWA offline/instalable más simple y fiable. Next.js añadiría
  SSR/RSC que esta app no necesita.
- **Alternativas:** Next.js (App Router); Vite + Netlify Functions.
- **Consecuencias:** El endpoint de IA se despliega como función serverless aparte (Vercel
  detecta `/api/*.ts` automáticamente). Sin SSR/SEO (irrelevante para una app personal).
- **Reversible:** Media. Migrar a Next.js exigiría reubicar rutas y el endpoint, pero la
  lógica de dominio y datos es agnóstica al framework.

## D2 · Persistencia: IndexedDB vía Dexie detrás de repositorios

- **Decisión:** Dexie como base local; toda la UI accede mediante interfaces `Repositories`
  (`SettingsRepository`, `FoodRepository`, `WorkoutRepository`, `StorageRepository`, …). La
  implementación concreta (`createDexieRepositories`) es intercambiable.
- **Motivo:** Una app desplegada no puede escribir un JSON estático. IndexedDB es la base
  local del navegador con capacidad real; Dexie aporta tipado, índices y transacciones.
- **Alternativas:** `localStorage` (muy limitado), SQLite vía WASM (excesivo para el MVP).
- **Consecuencias:** Reactividad mediante `dexie-react-hooks` (`useLiveQuery`). La interfaz no
  accede directamente a tablas ni a la instancia de Dexie; las operaciones pasan por `getRepositories()`.
- **Reversible:** Alta. Otra fábrica puede cumplir `Repositories`, aunque una sincronización
  real también exige autenticación, políticas de acceso, cola de cambios y resolución de conflictos.

## D3 · Validación con Zod en entradas críticas

- **Decisión:** Esquemas Zod como fuente de verdad; los tipos TypeScript se derivan con
  `z.infer`. Se validan los respaldos, las respuestas de IA y los formularios críticos.
- **Motivo:** Evitar datos corruptos; un único lugar para forma + validación.
- **Reversible:** Alta, pero no hay razón para cambiarlo.

## D4 · Historial inmutable mediante snapshots

- **Decisión:** Cada registro histórico guarda copia de los valores usados en su momento:
  `MealEntry` guarda macros calculados; `SetLog` guarda peso/reps; `SupplementLog` guarda
  nombre/dosis; los objetivos (`NutritionGoal`) se versionan por `effectiveDate`.
- **Motivo:** Editar un alimento, ejercicio u objetivo no debe alterar el pasado.
- **Consecuencias:** Algo de duplicación de datos a cambio de integridad histórica.
- **Reversible:** Baja (cambiarlo rompería la garantía histórica). Es intencional.

## D5 · Archivar en lugar de borrar (entidades con historial)

- **Decisión:** Alimentos, ejercicios y rutinas con historial se marcan `archived` en vez de
  eliminarse. El borrado físico se reserva a elementos sin uso o al "borrar todo".
- **Motivo:** No romper referencias ni el historial.
- **Reversible:** Alta.

## D6 · Días locales como clave `YYYY-MM-DD`

- **Decisión:** Cada registro diario lleva `localDate` calculado con la zona horaria del
  usuario (por defecto `America/Costa_Rica`). La aritmética de fechas trata la clave como
  fecha pura (UTC) para evitar desfases por horario de verano.
- **Motivo:** "El día de hoy" debe ser consistente y configurable.
- **Reversible:** Media.

## D7 · 1RM estimado con fórmula de Epley

- **Decisión:** `1RM ≈ peso × (1 + reps/30)`. Es una **estimación**, no una medición. Las
  series de calentamiento se excluyen de récords y estimaciones.
- **Motivo:** Fórmula estándar, simple y transparente. Documentada en LIMITATIONS.md.
- **Reversible:** Alta (la función acepta otras fórmulas a futuro).

## D8 · IA opcional y desacoplada

- **Decisión:** Interfaz `NutritionLabelAnalyzer`; Google y Anthropic son proveedores
  intercambiables. Sin selección explícita se prioriza Google cuando su clave existe. La clave vive **solo** en el endpoint serverless, nunca en el frontend.
  Confirmación humana obligatoria antes de guardar un alimento extraído de una imagen.
- **Motivo:** Seguridad (sin secretos en el cliente) y degradación funcional: el registro
  manual funciona siempre.
- **Reversible:** Alta (cambiar de proveedor = otra implementación de la interfaz).

## D9 · Supabase solo preparado (no en el MVP)

- **Decisión:** No se integra Supabase en el MVP; la arquitectura de repositorios lo permite
  después. Guía en SETUP.md.
- **Motivo:** Mantener el MVP simple y sin cuentas.
- **Reversible:** Alta (es justamente el punto de la capa de repositorios).

---

## Convenciones y valores por defecto

| Tema | Valor |
|---|---|
| Idioma | Español |
| Usuario | Único, sin autenticación |
| Zona horaria por defecto | `America/Costa_Rica` (configurable) |
| Peso (gimnasio y corporal) | kg interno, visualización en kg/lb |
| Agua | ml interno, visualización en ml/L |
| Tema | Único (gris carbón); el campo `theme` se conserva en el esquema por compatibilidad |
| Nombre de la app | **Ascend** |
| Paleta | Datos en rojo/amarillo/azul/verde sobre gris carbón; verde para acciones primarias |
| Notificaciones del sistema | No en el MVP (solo recordatorios internos) — ver ROADMAP |
| Superseries / medidas / fotos progreso | Fuera del MVP — ver ROADMAP |
| Datos de demostración | Disponibles, desactivados por defecto |
| Una sola sesión de entrenamiento activa a la vez | Guiado por la interfaz |
| Autoguardado de sesiones | Sí |

[Volver al README](../README.md) · [Consultar modelo de datos](./DATA_MODEL.md)
