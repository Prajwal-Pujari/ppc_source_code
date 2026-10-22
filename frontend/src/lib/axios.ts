import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach auth token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface FailedQueueItem {
  resolve: (token: string | null) => void;
  reject: (error: unknown) => void;
}

let isRefreshing = false;
let failedQueue: FailedQueueItem[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const redirectToLogin = () => {
  useAuthStore.getState().clearAuth();
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

// Response interceptor — handle 401 and refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    // If request failed without config, or error is not 401, reject immediately
    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // Do not attempt refresh on auth endpoints (login, refresh, logout)
    const requestUrl = originalRequest.url || '';
    if (
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/refresh') ||
      requestUrl.includes('/auth/logout')
    ) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      redirectToLogin();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    // If a refresh is already in flight, queue this request
    if (isRefreshing) {
      return new Promise<string | null>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          if (token) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    isRefreshing = true;
    const refreshToken = useAuthStore.getState().refreshToken;

    if (!refreshToken) {
      isRefreshing = false;
      redirectToLogin();
      return Promise.reject(error);
    }

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/auth/refresh`,
        { refreshToken }
      );
      const newToken = res.data?.data?.accessToken;
      if (!newToken) {
        throw new Error('No access token returned from refresh');
      }

      useAuthStore.getState().updateAccessToken(newToken);
      processQueue(null, newToken);

      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      redirectToLogin();
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
