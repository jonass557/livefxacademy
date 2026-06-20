import axios from 'axios';
import { useAuthStore } from '../store/authStore';

// En production, définir VITE_API_URL (ex: https://livefx-backend.onrender.com)
// En local, on retombe sur http://localhost:5000
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  // Évite un "chargement" infini si le serveur ne répond pas (ex: cold-start).
  // Au-delà de 30s, l'erreur ECONNABORTED est levée et un message clair s'affiche.
  timeout: 30000,
});

// Request interceptor - add token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle 401/403 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Token expired or invalid - logout user
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/') {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
