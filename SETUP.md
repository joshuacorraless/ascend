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

| Variable | Para qué | ¿Cliente? |
|---|---|---|
| `ANTHROPIC_API_KEY` | Análisis de etiquetas por IA (Claude). Solo en el servidor. | **No** |
| `ANTHROPIC_MODEL` | Modelo de visión a usar (tiene valor por defecto). | No |
| `AI_PROVIDER` | Proveedor activo (`anthropic`). | No |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Futuro (Supabase). | Sí (anon key es pública por diseño) |

> ⚠️ La clave de IA **nunca** se expone al frontend: solo la usa la función serverless
> `api/analyze-label`. No la pongas en variables `VITE_*`.

### Probar el endpoint de IA en local
`vite dev` sirve solo el frontend. Para ejecutar también `/api`:
```bash
npm i -g vercel        # una vez
vercel dev             # levanta frontend + funciones /api con tus env de .env.local
```

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
