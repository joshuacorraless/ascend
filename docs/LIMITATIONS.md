# Límites operativos

Ascend es una PWA local: no sincroniza dispositivos y no sustituye una herramienta clínica.

| Área | Límite actual | Mitigación |
| :-- | :-- | :-- |
| Persistencia | Los datos pertenecen al navegador y dispositivo actuales. | Exportar respaldos JSON con regularidad. |
| iOS | Safari puede desalojar almacenamiento tras inactividad o limpieza del sitio. | Instalar la PWA, usarla periódicamente y conservar respaldos externos. |
| Sincronización | No existe réplica entre dispositivos. | La capa de repositorios permite una futura estrategia local-first. |
| Primera carga | Los recursos básicos necesitan conexión antes de quedar disponibles sin conexión. | Completar una primera apertura con red. |
| IA | El análisis de etiquetas requiere conexión y una clave serverless. | El registro manual permanece disponible. |
| Notificaciones | No se envían avisos push. | Los recordatorios actuales viven dentro de la interfaz. |

## Precisión

La lectura de una etiqueta puede fallar ante desenfoque, iluminación deficiente o columnas ambiguas. La respuesta se valida, muestra advertencias y exige confirmación antes de persistir.

El 1RM usa la fórmula de Epley y representa una estimación. Ascend no interpreta variaciones de peso como composición corporal, no ajusta suplementos y no produce recomendaciones médicas.

## Alcance técnico

Las vistas pesadas y Recharts se cargan por ruta. El endpoint `/api/analyze-label` se monta durante `npm run dev` mediante middleware de Vite y se publica como función serverless en Vercel. Sin proveedor configurado responde como no disponible sin degradar el resto del producto.

[Volver al README](../README.md) · [Consultar evolución](./ROADMAP.md)
