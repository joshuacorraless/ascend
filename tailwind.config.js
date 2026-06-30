/** @type {import('tailwindcss').Config} */
export default {
  // Tema único (claro). El modo oscuro se eliminó a propósito para pulir una
  // sola colorimetría: "tinta sobre lino" con índigo como acento de intención.
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // — Superficies —
        canvas: '#F7F6F2', // lino cálido (fondo de la app)
        paper: '#FFFFFF', // tarjetas / superficies elevadas
        line: '#E8E5DD', // hairline cálida (bordes, separadores)

        // — Tinta (texto y trazos): neutro cálido casi negro —
        ink: {
          DEFAULT: '#1A1916', // texto principal
          soft: '#57534E', // texto secundario
          muted: '#8A857C', // texto terciario / metadatos
          faint: '#B7B2A8', // deshabilitado / marca de agua
        },

        // — Acento único: índigo. Solo intención interactiva, nunca decorativo. —
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },

        // — Color funcional (solo acciones destructivas / exceso). No decorativo. —
        danger: {
          50: '#fdf3f2',
          200: '#f3c7c1',
          500: '#c0473a',
          600: '#a8392d',
          700: '#8a2e24',
        },
      },

      fontFamily: {
        // Inter Variable autohospedada (offline). Numerales tabulares de serie.
        sans: [
          '"Inter Variable"',
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'sans-serif',
        ],
      },

      fontSize: {
        // Escala editorial medida (con interlineado y tracking afinados).
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.04em' }],
        xs: ['0.75rem', { lineHeight: '1.1rem' }],
        sm: ['0.875rem', { lineHeight: '1.35rem' }],
        base: ['1rem', { lineHeight: '1.55rem' }],
        lg: ['1.125rem', { lineHeight: '1.6rem', letterSpacing: '-0.01em' }],
        xl: ['1.375rem', { lineHeight: '1.7rem', letterSpacing: '-0.018em' }],
        '2xl': ['1.75rem', { lineHeight: '2rem', letterSpacing: '-0.022em' }],
        '3xl': ['2.25rem', { lineHeight: '2.4rem', letterSpacing: '-0.026em' }],
        '4xl': ['3rem', { lineHeight: '3.1rem', letterSpacing: '-0.03em' }],
      },

      borderRadius: {
        xl: '0.875rem', // 14px — inputs, botones
        '2xl': '1.125rem', // 18px — tarjetas
        '3xl': '1.5rem', // 24px — hojas / modales
      },

      boxShadow: {
        // Elevación por tinte, no por nubes difusas. Sobria.
        card: '0 1px 2px 0 rgb(26 25 22 / 0.04), 0 1px 3px -1px rgb(26 25 22 / 0.05)',
        lift: '0 18px 48px -24px rgb(26 25 22 / 0.30)',
        sheet: '0 -10px 40px -24px rgb(26 25 22 / 0.28)',
      },

      letterSpacing: {
        tightest: '-0.03em',
      },

      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },

      transitionTimingFunction: {
        // Curva única para toda la app: salida suave, entrada decidida.
        ascend: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },

      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'sheet-up': {
          from: { transform: 'translateY(8%)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'rise': {
          from: { transform: 'translateY(6px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
      },

      animation: {
        'fade-in': 'fade-in 0.25s ease-ascend both',
        'sheet-up': 'sheet-up 0.32s ease-ascend both',
        rise: 'rise 0.4s ease-ascend both',
      },
    },
  },
  plugins: [],
};
