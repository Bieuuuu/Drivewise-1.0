// Safe storage utility resilient to sandboxed iframes and third-party storage restrictions

const memoryStore = new Map<string, string>();

export const safeStorage = {
  getItem(key: string, defaultValue: string | null = null): string | null {
    try {
      if (typeof window !== 'undefined' && 'localStorage' in window && window.localStorage) {
        const value = window.localStorage.getItem(key);
        return value !== null ? value : (memoryStore.get(key) ?? defaultValue);
      }
    } catch {
      // Storage access blocked or restricted
    }
    return memoryStore.get(key) ?? defaultValue;
  },

  setItem(key: string, value: string): void {
    memoryStore.set(key, value);
    try {
      if (typeof window !== 'undefined' && 'localStorage' in window && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Storage access blocked or quota exceeded
    }
  },

  removeItem(key: string): void {
    memoryStore.delete(key);
    try {
      if (typeof window !== 'undefined' && 'localStorage' in window && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // ignore
    }
  },

  clear(): void {
    memoryStore.clear();
    try {
      if (typeof window !== 'undefined' && 'localStorage' in window && window.localStorage) {
        window.localStorage.clear();
      }
    } catch {
      // ignore
    }
  },
};
