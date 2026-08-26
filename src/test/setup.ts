import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock localStorage to ensure clean isolation across Node 20+ jsdom environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});
Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// Mock IndexedDB if needed in jsdom
const indexedDBMock = {
  open: () => ({
    onupgradeneeded: null,
    onsuccess: null,
    onerror: null,
    result: {
      createObjectStore: () => ({}),
      transaction: () => ({
        objectStore: () => ({
          put: () => ({ onsuccess: null, onerror: null }),
          getAll: () => ({ onsuccess: null, onerror: null, result: [] }),
          delete: () => ({ onsuccess: null, onerror: null }),
        }),
      }),
    },
  }),
};

if (typeof window !== "undefined" && !window.indexedDB) {
  Object.defineProperty(window, "indexedDB", {
    value: indexedDBMock,
    writable: true,
  });
}

