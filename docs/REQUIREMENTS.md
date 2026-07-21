# Contrato del producto

Este documento define el comportamiento esperado de Ascend. La implementación debe preservar privacidad local, integridad histórica y uso móvil directo.

## Capacidades

| Dominio | Contrato funcional |
| :-- | :-- |
| Inicio | Onboarding sin cuenta, unidades, zona horaria y objetivos iniciales. |
| Objetivos | Calorías, proteína, carbohidratos, grasas y agua con vigencia por fecha. |
| Día | Consumido, objetivo, restante, agua, suplementos, entrenamiento, peso y accesos rápidos. |
| Nutrición | CRUD y archivo de alimentos, favoritos, recetas, porciones, gramos, búsqueda, copia y repetición. |
| Hidratación | Registro rápido o personalizado, historial, deshacer, porcentaje y promedios. |
| Suplementos | Definiciones por horario y día; cumplimiento diario independiente. |
| Entrenamiento | Ejercicios, rutinas ordenables, sesiones, series, RPE, autoguardado y resumen. |
| Progreso | Peso, volumen, repeticiones, frecuencia, series efectivas, 1RM estimado y récords. |
| Datos | Respaldo JSON validado, migraciones de esquema y borrado total confirmado. |
| Captura asistida | Extracción opcional desde una etiqueta, validación y aprobación humana. |
| Distribución | PWA instalable con operación offline para los flujos principales. |

## Atributos de calidad

| Atributo | Criterio |
| :-- | :-- |
| Usabilidad | Diseño mobile-first, controles táctiles de al menos 44 px y errores accionables. |
| Accesibilidad | Etiquetas semánticas, roles ARIA, teclado y contraste suficiente. |
| Integridad | TypeScript estricto y Zod en cada frontera de entrada. |
| Verificación | `typecheck`, lint, pruebas y build deben completar sin errores. |
| Privacidad | Sin cuentas, analytics ni rastreadores; la imagen solo sale al solicitar análisis. |
| Mantenibilidad | Componentes compartidos, lógica pura y persistencia detrás de contratos. |
| Compatibilidad | Safari en iPhone como objetivo primario y experiencia adaptable en escritorio. |

## Invariantes

- Un cambio de objetivo no modifica días anteriores.
- Una edición de catálogo no reescribe registros históricos.
- Solo puede existir una sesión de entrenamiento activa.
- La IA nunca guarda un alimento sin revisión del usuario.
- Una importación inválida no reemplaza datos existentes.
- Ningún secreto de proveedor se compila en el cliente.

[Volver al README](../README.md) · [Consultar decisiones](./DECISIONS.md)
