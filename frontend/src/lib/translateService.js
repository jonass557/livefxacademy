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

// Traduction directe via l'API publique Google Translate (CORS autorisé côté client, 0 dépendance backend)
async function fetchGoogleDirect(text, targetLang) {
  if (!text || !text.trim()) return text;
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text.trim())}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const translated = data[0].map((item) => item[0]).join('');
        if (translated && translated.trim()) {
          return translated;
        }
      }
    }
  } catch (_) {}

  // Fallback MyMemory
  try {
    const langPair = targetLang === 'fr' ? 'en|fr' : 'fr|en';
    const mmUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.trim().slice(0, 500))}&langpair=${langPair}`;
    const mmRes = await fetch(mmUrl);
    if (mmRes.ok) {
      const mmData = await mmRes.json();
      if (mmData?.responseData?.translatedText) {
        return mmData.responseData.translatedText;
      }
    }
  } catch (_) {}

  return text;
}

/**
 * Traduit une liste de textes vers la langue cible ('en' ou 'fr').
 * Multi-niveaux :
 * 1. Cache mémoire + localStorage instantané (0 ms)
 * 2. Backend /api/translate (avec cache persistant MongoDB)
 * 3. Fallback direct client Google Translate (fonctionne même si le backend n'est pas encore redémarré)
 */
export async function translateTexts(texts, targetLang = 'en') {
  if (!texts || !Array.isArray(texts) || texts.length === 0) return {};
  if (!['en', 'fr'].includes(targetLang)) targetLang = 'en';

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

  const uniqueMissing = Array.from(new Set(missing));
  const toStore = {};

  // 1. Tenter l'endpoint backend /api/translate
  let stillMissing = [...uniqueMissing];
  try {
    const res = await api.post('/translate', { texts: uniqueMissing, target: targetLang });
    const fetched = res.data?.translations || {};

    Object.entries(fetched).forEach(([orig, trans]) => {
      if (trans && trans !== orig) {
        result[orig] = trans;
        memCache.set(`${targetLang}|${orig}`, trans);
        toStore[orig] = trans;
      }
    });

    stillMissing = uniqueMissing.filter((orig) => !result[orig]);
  } catch (backendErr) {
    // Si le backend n'a pas encore redémarré ou renvoie une erreur, on bascule en direct
    stillMissing = uniqueMissing;
  }

  // 2. Si des textes manquent, traduire directement via le client (Google Translate)
  if (stillMissing.length > 0) {
    const directResults = await Promise.all(
      stillMissing.map(async (orig) => {
        const trans = await fetchGoogleDirect(orig, targetLang);
        return { orig, trans };
      })
    );

    directResults.forEach(({ orig, trans }) => {
      result[orig] = trans;
      memCache.set(`${targetLang}|${orig}`, trans);
      toStore[orig] = trans;
    });
  }

  saveLocalCache(targetLang, toStore);
  return result;
}
