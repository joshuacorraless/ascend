# ROADMAP.md — Funcionalidades futuras (fuera del MVP)

Estas funciones **no** se implementan en el MVP. Se registran aquí con sus dependencias. No
están simuladas en la app.

## Sincronización y nube (Supabase)
- Respaldo en la nube, sincronización multi-dispositivo, auth por magic link.
- **Dependencia:** capa de repositorios ya preparada (D2/D9). Implementar
  `createSupabaseRepositories` + estrategia de sync/conflictos. Ver SETUP.md.

## Notificaciones / recordatorios del sistema
- Recordatorios de agua, suplementos o entreno vía notificaciones push.
- **Dependencia / límite real:** las notificaciones push en iOS solo funcionan para PWAs
  **instaladas** (iOS 16.4+) y son poco fiables. El MVP usa recordatorios internos (lo que se
  ve en pantalla). Requiere Web Push + permiso del usuario + (idealmente) backend.

## Entrenamiento avanzado
- **Superseries / circuitos**, cronómetro de descanso con avisos, plantillas de progresión.
- **Dependencia:** modelo de `ExerciseLog` admite agrupar; falta UI y lógica de circuito.

## Composición corporal
- Medidas corporales (cintura, brazo…) y fotos de progreso.
- **Dependencia:** nuevas entidades + almacenamiento de imágenes (cuidado con la cuota de
  IndexedDB y la privacidad).

## Código de barras
- Escaneo para autocompletar alimentos.
- **Dependencia:** API de cámara + base de datos de productos (externa). Solo si no retrasa lo
  principal.

## Objetivos por tipo de día
- Metas distintas en día de entrenamiento vs descanso.
- **Dependencia:** extender `NutritionGoal` con `dayType` y resolver por tipo + fecha.

## Otras ideas
- Exportar CSV; gráficos de adherencia; plantillas de comidas por horario; modo "cut/bulk".

> Explícitamente **fuera de alcance** (sección 27 del encargo): red social, seguidores, chat,
> suscripciones, pagos, marketplace, entrenadores externos, generación automática de dietas,
> recomendaciones médicas, integración con wearables, conteo de pasos, microservicios.
