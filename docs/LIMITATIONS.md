# Límites operativos

Ascend es una PWA local: no sincroniza dispositivos y no sustituye una herramienta clínica.

| Área | Límite actual | Mitigación |
| :-- | :-- | :-- |
| Persistencia | Los datos pertenecen al navegador y dispositivo actuales. | Exportar respaldos JSON con regularidad. |
| iOS | Safari puede desalojar almacenamiento tras inactividad o limpieza del sitio. | Instalar la PWA, usarla periódicamente y conservar respaldos externos. |
| Sincronización | No existe réplica entre dispositivos. | La capa de repositorios permite una futura estrategia local-first. |
| Primera carga | Los recursos básicos necesitan conexión antes de quedar disponibles sin conexión. | Completar una primera apertura con red. |
| IA | El análisis de etiquetas y documentos de rutinas requiere conexión y una clave serverless. | Registro manual, reintento de la misma imagen/documento e importación JSON de revisión sin IA. |
| Voz | El reconocimiento depende del navegador, sus permisos y, en algunos casos, de conexión. | Texto editable, revisión antes de guardar y micrófono del teclado como alternativa. |
| Notificaciones | No se envían avisos push. | Los recordatorios actuales viven dentro de la interfaz. |

## Precisión

La lectura de una etiqueta puede fallar ante desenfoque, iluminación deficiente o columnas ambiguas. La respuesta se valida, muestra advertencias y exige confirmación antes de persistir.

La comparación de series refleja los datos registrados y no evalúa cambios en técnica, rango de movimiento o equipo. RIR es una apreciación personal; sin datos comparables, la señal usa solo peso y reps. Ascend no interpreta variaciones de peso como composición corporal, no ajusta suplementos y no produce recomendaciones médicas.

## Alcance técnico

Las vistas pesadas y Recharts se cargan por ruta. Los endpoints `/api/analyze-label` y `/api/analyze-routine` se montan durante `npm run dev` mediante middleware de Vite y se publican como funciones serverless en Vercel. Sin proveedor configurado responden como no disponibles sin degradar el resto del producto. El dictado usa el servicio de reconocimiento del navegador y no consume la cuota de Gemini.

[Volver al README](../README.md) · [Consultar evolución](./ROADMAP.md)
