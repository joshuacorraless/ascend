# Ascend

PWA local-first para registrar nutrición, hidratación, suplementos, peso corporal y
entrenamiento. Diseñada para uso diario a una mano desde el teléfono: instalable en la
pantalla de inicio, funcional sin conexión y sin cuentas ni rastreadores — los datos viven
en el dispositivo.

## Características

- **Dashboard diario**: macros consumidos / objetivo / restante, agua, checklist de
  suplementos, entrenamiento planeado, peso reciente y acciones rápidas.
- **Nutrición**: biblioteca de alimentos y recetas, registro por comida con cálculo de
  macros por porciones o gramos, copiar días, totales por comida y por día.
- **Entrenamiento**: rutinas por día, sesiones con series (peso, reps, RPE), datos de la
  sesión anterior, autoguardado y recuperación de sesiones interrumpidas.
- **Progreso**: gráficos por ejercicio (1RM estimado, volumen, mejor serie), récords
  personales, calendario de hábitos y tendencias de peso corporal.
- **Objetivos con vigencia**: cambiar metas no reescribe el histórico; cada día conserva
  el objetivo que le aplicaba.
- **Datos portables**: exportar e importar todo en JSON validado con versionado de esquema.
- **Análisis de etiquetas (opcional)**: crear un alimento desde la foto de su tabla
  nutricional vía un endpoint serverless, siempre con revisión manual antes de guardar.
  La app funciona completa sin configurar ninguna clave.

## Stack

React 19 · TypeScript · Vite · Tailwind CSS · React Router · Dexie (IndexedDB) · Zod ·
React Hook Form · Recharts · vite-plugin-pwa · Vitest · ESLint · Prettier.
Desplegada en Vercel; el análisis de etiquetas corre en una función serverless (`/api`).

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:5173
npm run check      # typecheck + lint + tests + build
```

Variables de entorno, despliegue e instalación en iPhone: [docs/SETUP.md](./docs/SETUP.md).

## Arquitectura

```
api/                Función serverless para el análisis de etiquetas
src/
  app/              Router, layout, providers (settings, toast, confirm)
  components/       UI reutilizable (Modal, Field, ProgressRing, …)
  features/         Pantallas por dominio (nutrition, training, progress, …)
  lib/
    schema/         Esquemas Zod: fuente de verdad del modelo de datos
    db/             Base Dexie con versionado de almacenes
    repositories/   Interfaces de acceso a datos + implementación Dexie
    domain/         Lógica pura con tests (macros, 1RM, volumen, hábitos)
    backup/         Export/import JSON con validación y migración
```

Decisiones de diseño relevantes:

- **Local-first real**: toda la UI lee de IndexedDB con `useLiveQuery`; no hay estado
  servidor. La capa de repositorios aísla Dexie, por lo que un backend futuro (p. ej.
  Supabase) solo requiere otra implementación de las mismas interfaces.
- **Snapshots inmutables**: los registros diarios (comidas, series, suplementos) guardan
  copia de los valores en el momento del registro; editar una definición no altera el
  histórico.
- **Dominio puro y testeado**: los cálculos (macros, 1RM, medias móviles, hábitos) son
  funciones puras separadas de React y cubiertas por Vitest.
- **Claves fuera del cliente**: las claves de IA solo existen en el endpoint serverless;
  el frontend nunca las recibe.

Más detalle en [docs/DECISIONS.md](./docs/DECISIONS.md),
[docs/DATA_MODEL.md](./docs/DATA_MODEL.md) y [docs/LIMITATIONS.md](./docs/LIMITATIONS.md).

## Privacidad

Sin analytics ni cuentas. Lo único que puede salir del dispositivo es la foto de una
etiqueta si se usa el análisis con IA, y no se almacena de forma permanente.
