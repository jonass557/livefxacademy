// Stockage résilient pour Safari iOS : en navigation privée, avec « Bloquer tous les
// cookies » ou en mode Isolement, tout accès à localStorage peut lever une exception
// (SecurityError / QuotaExceededError). On retombe alors sur une mémoire volatile
// afin que l'application ne plante jamais (page blanche) à cause du stockage.
const memory = new Map();

export const safeStorage = {
  getItem(name) {
    try {
      const v = window.localStorage.getItem(name);
      return v === null && memory.has(name) ? memory.get(name) : v;
    } catch (_) {
      return memory.has(name) ? memory.get(name) : null;
    }
  },
  setItem(name, value) {
    memory.set(name, value);
    try { window.localStorage.setItem(name, value); } catch (_) { /* mémoire seule */ }
  },
  removeItem(name) {
    memory.delete(name);
    try { window.localStorage.removeItem(name); } catch (_) { /* noop */ }
  },
};
