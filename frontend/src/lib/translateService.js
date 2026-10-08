import api from './api';

const STORAGE_KEY_PREFIX = 'livefx_trans_cache_';
const memCache = new Map();

// Charger le cache local au démarrage
function getLocalCache(targetLang) {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${targetLang}`);
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

function saveLocalCache(targetLang, newEntries) {
  try {
    const current = getLocalCache(targetLang);
    const updated = { ...current, ...newEntries };
    // Limiter la taille du cache localStorage à 1000 entrées max
    const keys = Object.keys(updated);
    if (keys.length > 1000) {
      const trimmed = {};
      keys.slice(-800).forEach((k) => { trimmed[k] = updated[k]; });
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${targetLang}`, JSON.stringify(trimmed));
    } else {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${targetLang}`, JSON.stringify(updated));
    }
  } catch (_) {}
}

export async function translateTexts(texts, targetLang = 'en') {
  if (!texts || !Array.isArray(texts) || texts.length === 0) return {};
  if (targetLang !== 'en') {
    const ident = {};
    texts.forEach((t) => { if (t) ident[t] = t; });
    return ident;
  }

  const localStored = getLocalCache(targetLang);
  const result = {};
  const missing = [];

  texts.forEach((t) => {
    if (!t || typeof t !== 'string' || !t.trim()) return;
    const trimmed = t.trim();
    const memKey = `${targetLang}|${trimmed}`;
    if (memCache.has(memKey)) {
      result[trimmed] = memCache.get(memKey);
    } else if (localStored[trimmed]) {
      result[trimmed] = localStored[trimmed];
      memCache.set(memKey, localStored[trimmed]);
    } else {
      missing.push(trimmed);
    }
  });

  if (missing.length === 0) {
    return result;
  }

  try {
    const uniqueMissing = Array.from(new Set(missing));
    const res = await api.post('/translate', { texts: uniqueMissing, target: targetLang });
    const fetched = res.data?.translations || {};

    const toStore = {};
    Object.entries(fetched).forEach(([orig, trans]) => {
      result[orig] = trans;
      memCache.set(`${targetLang}|${orig}`, trans);
      toStore[orig] = trans;
    });

    saveLocalCache(targetLang, toStore);
  } catch (err) {
    console.warn('translateTexts API failed:', err.message);
    // En cas d'erreur réseau, on renvoie le texte d'origine
    missing.forEach((m) => {
      if (!result[m]) result[m] = m;
    });
  }

  return result;
}
