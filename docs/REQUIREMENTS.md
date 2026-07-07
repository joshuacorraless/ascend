# REQUIREMENTS.md — Requisitos

## Funcionales (MVP)

1. **Onboarding sin cuenta:** definir unidades y objetivos diarios al primer uso.
2. **Objetivos:** calorías, proteína, carbohidratos, grasas y agua, con **fecha de vigencia**
   para no alterar el histórico.
3. **Dashboard diario:** consumido / objetivo / restante / excedente de macros y agua;
   suplementos del día; entrenamiento planeado; peso más reciente; acciones rápidas.
4. **Alimentación:** biblioteca de alimentos (CRUD, favoritos, archivar), recetas compuestas,
   registro por tipo de comida con cálculo de macros por porciones/gramos (decimales), editar,
   eliminar, copiar comida de otro día, repetir última, totales por comida y por día, búsqueda.
5. **Hidratación:** objetivo, botones rápidos, cantidad personalizada, deshacer, historial,
   porcentaje y promedios.
6. **Suplementos:** definiciones (nombre, dosis, momento, días) y checklist diario con registro
   independiente.
7. **Entrenamiento:** biblioteca de ejercicios (semilla editable), rutinas/plantillas
   (reordenar, duplicar, activar, archivar), sesiones con series (peso, reps, RPE, tipo),
   datos de la sesión anterior, autoguardado, continuar sesión interrumpida, resumen.
8. **Progreso:** gráficos por ejercicio (peso máx, reps, volumen, mejor serie, series
   efectivas, frecuencia, 1RM estimado), récords personales, tendencias de peso corporal.
9. **Peso corporal:** registro, peso actual, cambio total, media móvil 7 días, gráfico,
   tendencia.
10. **Datos:** exportar/importar JSON validado, borrar todo con confirmación, versionado y
    migraciones del esquema.
11. **IA (opcional):** crear alimentos desde foto de la etiqueta mediante endpoint seguro, con
    extracción validada y **confirmación humana** antes de guardar.
12. **PWA instalable** en iPhone, funcional offline para lo principal.

## No funcionales

- **Rendimiento/UX:** mobile-first, objetivos táctiles ≥ 44 px, formularios cortos, estados
  vacíos útiles, skeletons/cargas, errores accionables, modo claro/oscuro.
- **Accesibilidad:** etiquetas, roles ARIA, navegación por teclado, buen contraste.
- **Calidad:** TypeScript estricto, validación Zod, ESLint + Prettier, pruebas de la lógica
  crítica, `typecheck`/`lint`/`test`/`build` verdes.
- **Privacidad:** local-first, sin analytics ni rastreadores; solo se envía a la red la imagen
  de etiqueta si el usuario usa la IA.
- **Mantenibilidad:** componentes reutilizables, capa de datos desacoplada (repositorios),
  arquitectura preparada para Supabase.
- **Compatibilidad:** Safari/iPhone como objetivo principal; responsive en escritorio.

## Criterios de aceptación

Los 20 criterios de la sección 28 del encargo. Estado actual en README → "Estado por criterio".
