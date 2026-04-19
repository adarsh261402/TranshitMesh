// Global API client with axios interceptors for auth + error handling
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000',
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor: attach JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tm_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor: global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;
      if (status === 401) {
        localStorage.removeItem('tm_token');
        localStorage.removeItem('tm_user');
        window.dispatchEvent(new CustomEvent('tm-notification', { detail: { type: 'error', message: 'Session expired. Please log in again.' } }));
        setTimeout(() => { window.location.href = '/login'; }, 1500);
      } else if (status >= 500) {
        window.dispatchEvent(new CustomEvent('tm-notification', { detail: { type: 'error', message: 'Something went wrong. Please try again.' } }));
      }
    } else if (error.code === 'ECONNABORTED') {
      window.dispatchEvent(new CustomEvent('tm-notification', { detail: { type: 'warning', message: 'Server unreachable. Switching to offline mode.' } }));
    }
    return Promise.reject(error);
  }
);

export default api;
