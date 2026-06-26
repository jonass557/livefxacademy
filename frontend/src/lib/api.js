import axios from 'axios';
import * as authNs from '../store/authStore';
// En production, définir VITE_API_URL (ex: https://livefx-backend.onrender.com)
// En local, on retombe sur http://localhost:5000
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  // Timeout généreux pour supporter le "cold start" de Render (serveur gratuit
  // qui se réveille) et les connexions lentes. Combiné au retry ci-dessous,
  // cela évite les "erreurs de connexion" sur faible débit.
  timeout: 60000,
});

// Nombre de tentatives et délai de base (ms) pour le retry automatique.
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY = 1500;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Détermine si une erreur est "réessayable" : pas de réponse (réseau/cold start),
// timeout, ou erreur serveur transitoire (502/503/504).
const isRetryableError = (error) => {
  if (error.code === 'ECONNABORTED') return true; // timeout
  if (!error.response) return true; // erreur réseau / serveur endormi
  const status = error.response.status;
  return status === 502 || status === 503 || status === 504;
};

// Request interceptor - add token
api.interceptors.request.use((config) => {
  const token = authNs.useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - retry automatique + gestion 401/403
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // Retry uniquement pour les requêtes GET et l'authentification (login/register),
    // qui sont idempotentes ou rejouables sans effet de bord néfaste.
    const method = (config?.method || 'get').toLowerCase();
    const url = config?.url || '';
    const isAuthRequest = url.includes('/auth/login') || url.includes('/auth/register');
    const isRetryableRequest = method === 'get' || isAuthRequest;

    if (config && isRetryableRequest && isRetryableError(error)) {
      config.__retryCount = config.__retryCount || 0;
      if (config.__retryCount < MAX_RETRIES) {
        config.__retryCount += 1;
        // Backoff exponentiel : 1.5s, 3s, 6s — laisse le temps au serveur de se réveiller.
        const delay = RETRY_BASE_DELAY * Math.pow(2, config.__retryCount - 1);
        await wait(delay);
        return api(config);
      }
    }

    if (error.response?.status === 401 || error.response?.status === 403) {
      // Token expired or invalid - logout user
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/') {
        authNs.useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
