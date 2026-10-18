import axios from 'axios';
import * as authNs from '../store/authStore';

export function getApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && !envUrl.includes('localhost')) {
    return envUrl.replace(/\/+$/, '');
  }
  if (
    typeof window !== 'undefined' &&
    window.location.hostname &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    return 'https://api.livefx-trading.com';
  }
  return (envUrl || 'http://localhost:5000').replace(/\/+$/, '');
}

export const API_URL = getApiBaseUrl();

// Liste des points d'entrée API candidats pour le basculement automatique (failover)
function getCandidateBaseUrls() {
  const primary = `${API_URL}/api`;
  const candidates = [primary];
  if (
    typeof window !== 'undefined' &&
    window.location.origin &&
    !window.location.hostname.includes('localhost') &&
    !window.location.hostname.includes('127.0.0.1')
  ) {
    const sameOriginApi = `${window.location.origin}/api`;
    if (!candidates.includes(sameOriginApi)) {
      candidates.push(sameOriginApi);
    }
  }
  return candidates;
}

const api = axios.create({
  baseURL: `${API_URL}/api`,
  // Désactivé car l'authentification passe à 100% par le header Authorization: Bearer <token>.
  // Évite les blocages CORS stricts sur Safari iOS, Brave, WebViews mobiles et proxys opérateurs.
  withCredentials: false,
  // Timeout très généreux (90s) pour supporter les connexions très faible débit (2G/3G/Edge/Satellite)
  timeout: 90000,
  headers: {
    Accept: 'application/json, text/plain, */*',
  },
});

const MAX_RETRIES = 5;
const RETRY_DELAYS = [800, 1500, 2500, 4000, 6000];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Si l'appareil signale une micro-coupure réseau (navigator.onLine === false),
// attend jusqu'à 10 secondes le retour du signal avant de relancer la requête.
const waitForOnline = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined' || navigator.onLine !== false) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      window.removeEventListener('online', done);
      resolve();
    };
    window.addEventListener('online', done);
    setTimeout(done, 10000);
  });
};

// Détermine si une erreur est liée au réseau, au débit ou à une indisponibilité temporaire
const isRetryableError = (error) => {
  if (!error) return false;
  if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || error.code === 'ETIMEDOUT') return true;
  if (!error.response) return true; // Pas de réponse HTTP reçue (coupure réseau / DNS / cold start)
  const status = error.response.status;
  return status === 408 || status === 429 || status === 502 || status === 503 || status === 504;
};

// Secours ultime via window.fetch natif si XMLHttpRequest (Axios) est bloqué par le navigateur/réseau
async function fallbackNativeFetch(config) {
  const candidates = getCandidateBaseUrls();
  const relUrl = (config.url || '').replace(/^https?:\/\/[^/]+\/api/, '');
  const cleanRel = relUrl.startsWith('/') ? relUrl : `/${relUrl}`;

  let queryString = '';
  if (config.params && typeof config.params === 'object') {
    const usp = new URLSearchParams();
    Object.entries(config.params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) usp.append(k, String(v));
    });
    const s = usp.toString();
    if (s) queryString = (cleanRel.includes('?') ? '&' : '?') + s;
  }

  const token = authNs.useAuthStore.getState()?.token;
  const headers = {
    Accept: 'application/json, text/plain, */*',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let body = undefined;
  const method = (config.method || 'get').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD' && config.data !== undefined) {
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      body = config.data;
    } else if (typeof config.data === 'string') {
      body = config.data;
      headers['Content-Type'] = 'application/json';
    } else {
      body = JSON.stringify(config.data);
      headers['Content-Type'] = 'application/json';
    }
  }

  let lastErr = null;
  for (const base of candidates) {
    try {
      const fullUrl = `${base.replace(/\/+$/, '')}${cleanRel}${queryString}`;
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), 60000) : null;
      const res = await fetch(fullUrl, {
        method,
        headers,
        body,
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-store',
        signal: controller ? controller.signal : undefined,
      });
      if (timer) clearTimeout(timer);

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/html') && base !== candidates[0]) {
        // Si le fallback same-origin renvoie index.html (mod_proxy inactif), ignorer ce candidat
        continue;
      }

      const data = contentType.includes('application/json') ? await res.json() : await res.text();
      if (res.ok) {
        return {
          data,
          status: res.status,
          statusText: res.statusText,
          headers: {},
          config,
        };
      }
      // Si le serveur a répondu avec un code d'erreur métier (400, 401, 404...), le transmettre proprement
      if (res.status >= 400 && res.status < 500) {
        const httpErr = new Error(data?.message || `Request failed with status code ${res.status}`);
        httpErr.config = config;
        httpErr.response = {
          data,
          status: res.status,
          statusText: res.statusText,
          headers: {},
          config,
        };
        throw httpErr;
      }
    } catch (err) {
      if (err.response) throw err;
      lastErr = err;
    }
  }
  throw lastErr || new Error('Network Error');
}

// Request interceptor - add token
api.interceptors.request.use((config) => {
  try {
    const token = authNs.useAuthStore.getState()?.token;
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (_) {}
  return config;
});

// Response interceptor - retry automatique multi-niveaux + secours fetch natif + gestion 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config;

    if (config && isRetryableError(error)) {
      const method = (config.method || 'get').toLowerCase();
      // Si aucune réponse n'a été reçue (!error.response), la requête n'a jamais atteint le serveur :
      // on peut donc réessayer en toute sécurité quelle que soit la méthode HTTP (POST, PATCH, GET...).
      const canSafelyRetry = !error.response || method === 'get' || (config.url || '').includes('/auth/');

      if (canSafelyRetry) {
        config.__retryCount = config.__retryCount || 0;
        if (config.__retryCount < MAX_RETRIES) {
          config.__retryCount += 1;
          await waitForOnline();
          const delay = RETRY_DELAYS[config.__retryCount - 1] || 3000;
          await wait(delay);
          return api(config);
        }

        // Après épuisement des tentatives Axios classiques, tenter le secours via window.fetch natif
        if (!config.__triedNativeFetch) {
          config.__triedNativeFetch = true;
          try {
            return await fallbackNativeFetch(config);
          } catch (fetchErr) {
            if (fetchErr?.response) {
              error = fetchErr;
            }
          }
        }
      }
    }

    const url = config?.url || '';
    const status = error?.response?.status;
    const isBackgroundCall = /\/(demo|backtest|market|alerts|economic|announcements|branding|health|translate)/.test(url);
    if (status === 401 && !isBackgroundCall) {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      if (currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/') {
        try {
          authNs.useAuthStore.getState().logout();
        } catch (_) {}
      }
    }
    return Promise.reject(error);
  }
);

// Maintien de la connexion chaude (keep-alive) en arrière-plan pour éviter tout délai de réveil serveur
if (typeof window !== 'undefined') {
  const pingServer = () => {
    fetch(`${API_URL}/api/health`, { method: 'GET', mode: 'cors', credentials: 'omit', cache: 'no-store' }).catch(() => {});
  };
  setTimeout(pingServer, 500);
  setInterval(pingServer, 45000);
}

export default api;
