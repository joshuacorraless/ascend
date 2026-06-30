/** @type {import('tailwindcss').Config} */
export default {
  // Tema único: gris carbón con datos en colores vivos (rojo/amarillo/azul/verde).
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // — Superficies (gris carbón) —
        canvas: '#3C3C3C', // fondo de la app
        paper: '#474747', // tarjetas / superficies elevadas
        inset: '#343434', // rieles / cajas hundidas
        line: '#565656', // bordes / separadores

        // — Texto: blanco + gris #b5b5b5 —
        ink: {
          DEFAULT: '#F5F5F5', // principal (blanco)
          soft: '#D2D2D2',
          muted: '#B5B5B5', // secundario (gris pedido)
          faint: '#8C8C8C', // terciario / metadatos
        },

        // — Acento de marca / interacción: verde vivo (reemplaza al índigo). —
        brand: {
          50: '#e9fbf0',
          100: '#cdf5dd',
          200: '#a3ecc1',
          300: '#72e0a0',
          400: '#4dd488',
          500: '#37c97e',
          600: '#46d488', // texto de enlaces / fondo de botón (brillante sobre gris)
          700: '#33c178',
          800: '#28a566',
          900: '#218a55',
          950: '#0f4d2e',
        },

        // — Paleta de datos viva (macros, gráficos, categorías) —
        macro: {
          cal: '#51CF66', // verde
          protein: '#FF8787', // rojo
          carbs: '#FFD43B', // amarillo
          fat: '#4DABF7', // azul
        },

        // — Color funcional (destructivo) —
        danger: {
          50: '#fff5f5',
          200: '#ffc9c9',
          400: '#ff8787',
          500: '#fa5252',
          600: '#f03e3e',
          700: '#e03131',
        },
      },

      fontFamily: {
        // Plus Jakarta Sans Variable autohospedada (offline). Cálida y geométrica.
        sans: [
          '"Plus Jakarta Sans Variable"',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'sans-serif',
        ],
      },

      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.06em' }],
        xs: ['0.75rem', { lineHeight: '1.1rem' }],
        sm: ['0.875rem', { lineHeight: '1.35rem' }],
        base: ['1rem', { lineHeight: '1.55rem' }],
        lg: ['1.125rem', { lineHeight: '1.6rem', letterSpacing: '-0.01em' }],
        xl: ['1.375rem', { lineHeight: '1.7rem', letterSpacing: '-0.015em' }],
        '2xl': ['1.75rem', { lineHeight: '2rem', letterSpacing: '-0.02em' }],
        '3xl': ['2.125rem', { lineHeight: '2.35rem', letterSpacing: '-0.022em' }],
        '4xl': ['2.75rem', { lineHeight: '2.9rem', letterSpacing: '-0.025em' }],
      },

      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
      },

      boxShadow: {
        // Elevación visible sobre fondo oscuro.
        card: '0 1px 0 0 rgb(255 255 255 / 0.03) inset, 0 10px 24px -16px rgb(0 0 0 / 0.55)',
        lift: '0 24px 60px -24px rgb(0 0 0 / 0.7)',
      },

      letterSpacing: {
        tightest: '-0.03em',
      },

      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },

      transitionTimingFunction: {
        ascend: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },

      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'sheet-up': {
          from: { transform: 'translateY(8%)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        rise: {
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
