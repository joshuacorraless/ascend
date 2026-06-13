# Ascend

PWA personal **local-first** para registrar de forma rápida tu **nutrición, hidratación,
suplementos, peso corporal y entrenamiento**. Pensada para usarse a una mano desde el iPhone,
instalable en la pantalla de inicio y funcional sin conexión. Sin cuentas, sin anuncios, sin
rastreadores: tus datos viven en tu dispositivo.

> Estado: **MVP completo** (Fases 1–7). Todas las áreas funcionan de extremo a extremo con
> `typecheck`, `lint`, pruebas y `build` en verde. Ver "Estado por criterio".

## ✨ Características
- **Inicio**: macros consumidos / objetivo / restante / excedente, agua, suplementos del día,
  entreno planeado, peso reciente y acciones rápidas.
- **Objetivos** con fecha de vigencia (no alteran el histórico).
- **Local-first** con IndexedDB (Dexie) tras una capa de repositorios intercambiable.
- **Exportar / importar** todo en JSON validado; borrar todo con confirmación.
- **PWA** instalable, offline, modo claro/oscuro.
- **IA opcional** para leer la tabla nutricional de una foto (con confirmación humana; la app
  funciona igual sin clave).

## 🧱 Stack
React 19 · TypeScript · Vite 6 · Tailwind CSS · React Router · Dexie (IndexedDB) ·
dexie-react-hooks · Zod · React Hook Form · Recharts · lucide-react · vite-plugin-pwa ·
Vitest · ESLint + Prettier. Despliegue en Vercel (frontend + función serverless para la IA).

## 🚀 Inicio rápido
```bash
npm install
npm run dev        # http://localhost:5173
npm run check      # typecheck + lint + test + build
```
Detalles de entorno, despliegue e instalación en iPhone → **[SETUP.md](./SETUP.md)**.

## 📁 Estructura
```
api/                         Función serverless de IA (Fase 6)
public/                      Íconos PWA, favicon, offline.html
scripts/generate-icons.mjs   Generador de íconos (npm run icons)
src/
  app/                       Providers (settings/tema, toast, confirm), router, layout, App
  components/ui/             Componentes reutilizables (Modal, ProgressRing, Field, …)
  features/                  Pantallas por dominio (dashboard, settings, nutrition, …)
  lib/
    schema/                  Esquemas Zod + tipos (fuente de verdad del modelo)
    db/                      Base Dexie (versionado de almacenes)
    repositories/            Interfaces + implementación Dexie (intercambiable por Supabase)
    domain/                  Lógica pura testeada (macros, 1RM, volumen, peso, agua)
    backup/                  Export/import JSON con validación y migración
```
Documentación: [REQUIREMENTS](./REQUIREMENTS.md) · [DECISIONS](./DECISIONS.md) ·
[DATA_MODEL](./DATA_MODEL.md) · [ROADMAP](./ROADMAP.md) · [LIMITATIONS](./LIMITATIONS.md) ·
[SETUP](./SETUP.md).

## 🔐 Privacidad
Local-first. Lo único que sale del dispositivo es la imagen de una etiqueta **si** usas la IA,
enviada a tu proveedor configurado a través del endpoint seguro. No se guardan esas fotos de
forma permanente. Sin analytics.

## ✅ Estado por criterio (sección 28 del encargo)
| # | Criterio | Estado |
|---|---|---|
| 1 | Instalar en pantalla de inicio del iPhone | ✅ |
| 2 | Configurar metas diarias | ✅ |
| 3 | Crear alimentos manualmente | ✅ |
| 4 | Registrar consumo | ✅ |
| 5 | Ver macros consumidos y restantes | ✅ |
| 6 | Registrar agua | ✅ |
| 7 | Marcar suplementos | ✅ |
| 8 | Crear ejercicios y rutinas | ✅ |
| 9 | Ejecutar rutina y registrar series | ✅ |
| 10 | Cerrar la app sin perder la sesión | ✅ (autoguardado) |
| 11 | Historial de un ejercicio | ✅ |
| 12 | Gráfico de progresión | ✅ |
| 13 | Registrar peso corporal | ✅ |
| 14 | Exportar datos JSON | ✅ |
| 15 | Restaurar desde respaldo | ✅ |
| 16 | Usar sin crear cuenta | ✅ |
| 17 | Funciones principales sin conexión | ✅ |
| 18 | Configurar IA con clave segura | ✅ (endpoint serverless) |
| 19 | Revisar/corregir datos de etiqueta antes de guardar | ✅ |
| 20 | Ejecutar el proyecto con el README | ✅ |

> Datos de demostración disponibles en **Ajustes → Datos de demostración** (cargar/eliminar sin
> afectar tus datos reales).
