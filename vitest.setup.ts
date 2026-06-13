import '@testing-library/jest-dom/vitest';
// IndexedDB simulado para probar la capa de datos (Dexie) en Node/jsdom.
import 'fake-indexeddb/auto';

// jsdom no implementa matchMedia; lo usamos para el tema claro/oscuro.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
