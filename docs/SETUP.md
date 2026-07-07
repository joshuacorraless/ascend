# SETUP.md — Instalación, variables de entorno y despliegue

## Requisitos
- Node.js **20+** (probado con 22) y npm.

## Desarrollo local
```bash
npm install
npm run dev          # http://localhost:5173
```

Scripts útiles:
```bash
npm run typecheck    # TypeScript (app + tooling)
npm run lint         # ESLint
npm run test         # Vitest (una pasada)
npm run test:watch   # Vitest en watch
npm run build        # typecheck + build de producción (genera PWA)
npm run preview      # sirve el build de producción
npm run icons        # regenera los íconos PWA (public/icons)
npm run check        # typecheck + lint + test + build (todo junto)
```

## Variables de entorno
Copia `.env.example` a `.env.local` (ignorado por git). **Todo es opcional**: la app funciona
para registro manual sin ninguna clave.

El análisis de etiquetas admite dos proveedores; elige uno con `AI_PROVIDER` (o deja vacío y se
usa el que tenga clave). **Recomendado: Google Gemini, que tiene nivel gratuito.**

| Variable | Para qué | ¿Cliente? |
|---|---|---|
| `AI_PROVIDER` | `google` (gratis) o `anthropic` (de pago). | **No** |
| `GEMINI_API_KEY` | Clave **gratis** de Google AI Studio. | **No** |
| `GEMINI_MODEL` | Modelo de visión (por defecto `gemini-2.5-flash`). | No |
| `ANTHROPIC_API_KEY` | Alternativa de pago (Claude). | **No** |
| `ANTHROPIC_MODEL` | Modelo (por defecto `claude-opus-4-8`). | No |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Futuro (Supabase). | Sí (anon key es pública por diseño) |

> ⚠️ La clave de IA **nunca** se expone al frontend: solo la usa la función serverless
> `api/analyze-label`. No la pongas en variables `VITE_*`.

### Conseguir una clave GRATIS de Gemini
1. Entra a **https://aistudio.google.com/app/apikey** e inicia sesión con tu cuenta de Google.
2. **Create API key** → cópiala (no requiere tarjeta para el nivel gratuito).
3. Pégala en `.env.local` como `GEMINI_API_KEY=...` (deja `AI_PROVIDER=google`).

### Probar el endpoint de IA en local
`npm run dev` ya monta el endpoint `/api/analyze-label` mediante un middleware de desarrollo y
lee las variables de `.env.local`. Basta con:
1. Copiar `.env.example` a `.env.local` y poner tu `GEMINI_API_KEY` (o `ANTHROPIC_API_KEY`).
2. Ejecutar `npm run dev` (reinícialo si ya estaba corriendo).
3. En la app: **Alimentación → Biblioteca → Escanear** (o al agregar una comida → **Escanear**).

Comprobación rápida: `GET http://localhost:5173/api/analyze-label` debe devolver
`{"available":true}` cuando la clave está configurada.

Alternativa con el runtime real de Vercel: `npm i -g vercel` y `vercel dev`.

## Despliegue en Vercel
1. Sube el repo a GitHub.
2. En Vercel: **New Project → Import** el repositorio. Framework detectado: **Vite**.
   - Build command: `npm run build` · Output dir: `dist` (por defecto).
3. (Opcional) En **Settings → Environment Variables** añade `ANTHROPIC_API_KEY`,
   `ANTHROPIC_MODEL`, `AI_PROVIDER` para habilitar la IA.
4. **Deploy**. Vercel detecta `api/*.ts` como funciones serverless automáticamente.
5. `vercel.json` ya incluye el *rewrite* SPA para que el enrutado del cliente funcione.

## Instalar en iPhone (PWA)
1. Abre la URL desplegada en **Safari** (no Chrome) en el iPhone.
2. Toca **Compartir** (cuadro con flecha) → **Agregar a pantalla de inicio**.
3. Confirma el nombre (**Ascend**) → **Agregar**.
4. Ábrela desde el ícono: se ejecuta en modo standalone (sin barras del navegador).
5. Las funciones principales (comida, agua, suplementos, peso, entreno) funcionan **sin
   conexión**. Exporta respaldos periódicamente (Ajustes → Datos).

---

## Cómo añadir Supabase después (no necesario para el MVP)
La capa de datos está desacoplada tras la interfaz `Repositories` (`src/lib/repositories/`).
Pasos sugeridos:

1. **Proyecto Supabase** y tablas equivalentes a las entidades de `DATA_MODEL.md` (con RLS por
   usuario). Mantén los mismos campos/snapshots.
2. **Auth** con magic link (`supabase.auth.signInWithOtp`). Guarda la sesión.
3. Implementa `createSupabaseRepositories(client): Repositories` cumpliendo la misma interfaz
   que `createDexieRepositories`. Cambia **una línea** en `src/lib/repositories/index.ts`.
4. **Estrategia de sincronización:** local-first con Dexie como caché + cola de cambios y
   *push/pull* a Supabase, resolviendo conflictos por `updatedAt`. (Diseño pendiente; ver
   ROADMAP.)
5. Variables `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (la anon key es pública; la
   seguridad real la dan las políticas RLS).
6. El frontend sigue en Vercel; Supabase aporta base de datos, auth y almacenamiento.

> Verifica siempre la documentación oficial vigente de Supabase antes de implementar; aquí solo
> se describe la arquitectura, no una API concreta.
