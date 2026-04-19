import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const raw = localStorage.getItem('collab-auth');
  if (raw) {
    try {
      const { state } = JSON.parse(raw);
      if (state?.token) {
        config.headers.Authorization = `Bearer ${state.token}`;
      }
    } catch { /* ignore */ }
  }
  return config;
});

// Global error normalizer
api.interceptors.response.use(
  (r) => r,
  (err) => {
    let message = err.response?.data?.message ?? err.message ?? 'Unknown error';

    // Extract Zod validation error details if present
    const details = err.response?.data?.details;
    if (err.response?.status === 422 && Array.isArray(details)) {
      message = details.map((d: any) => d.message).join(', ');
    }

    return Promise.reject(new Error(message));
  }
);

export default api;
