# LIMITATIONS.md — Limitaciones reales del MVP

Se documentan con honestidad las limitaciones conocidas. Nada aquí está "simulado" como
terminado.

## Almacenamiento local (IndexedDB)
- Los datos viven en **este navegador/dispositivo**. Borrar los datos del sitio, desinstalar
  la PWA o (en iOS) un periodo largo sin abrir la app pueden provocar que Safari **desaloje**
  el almacenamiento. **Mitigación:** exporta respaldos JSON con regularidad (Ajustes → Datos).
- No hay sincronización entre dispositivos en el MVP (ver ROADMAP/SETUP para Supabase).

## PWA en iOS / Safari
- La instalación es manual: **Compartir → Agregar a pantalla de inicio** (Safari no muestra un
  botón automático de instalación como Chrome en Android).
- **Notificaciones push:** no se usan en el MVP. En iOS solo funcionarían con la PWA instalada
  (iOS 16.4+) y de forma poco fiable. Los recordatorios son internos (en pantalla).
- El service worker cachea el "app shell" para uso offline; la primera carga necesita conexión.

## Funciones que requieren conexión
- Análisis de etiquetas por **IA** (envía la imagen al endpoint). Sin clave configurada, la
  función se desactiva con un mensaje claro y el **registro manual sigue funcionando**.
- Cualquier futura sincronización (Supabase).

## IA de etiquetas (cuando se configure)
- El modelo puede equivocarse con etiquetas borrosas, con varias columnas (por porción vs por
  100 g) o mal iluminadas. Por eso **siempre** hay pantalla de revisión y confirmación humana
  antes de guardar, con advertencias y un campo de confianza. No se guarda nada automáticamente.
- No se almacena la fotografía de la etiqueta de forma permanente.

## Cálculos
- El **1RM es estimado** (fórmula de Epley), no una medición real.
- Los gráficos son **por ejercicio**; no se comparan ejercicios o variantes distintas.
- La app **no** interpreta cambios de peso como grasa/músculo, ni emite recomendaciones
  médicas, ni ajusta dosis de suplementos.

## Alcance
- Sin cuentas, sin funciones sociales, sin pagos, sin wearables ni conteo de pasos (ver
  ROADMAP). Sin escaneo de códigos de barras en el MVP.

## Técnicas menores
- Las pantallas pesadas y los gráficos (Recharts) se cargan **bajo demanda** (code-splitting por
  ruta), así que el arranque inicial es ligero.
- El endpoint `/api` no corre con `vite dev` por defecto en producción, pero esta app incluye un
  middleware de desarrollo que lo monta en `npm run dev` (requiere `ANTHROPIC_API_KEY` en
  `.env.local`). En producción lo sirve Vercel. `vercel dev` también funciona.
