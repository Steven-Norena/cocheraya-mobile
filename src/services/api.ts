import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import tokenStorage from './secureStore';

let logoutCallback: (() => void) | null = null;

export const setLogoutCallback = (callback: () => void) => {
  logoutCallback = callback;
};

const getBaseUrl = () => {
  return 'http://parkshare-alb-1924523576.us-east-2.elb.amazonaws.com/api/v1';
};

export const API_BASE_URL = getBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de Solicitud: Adjunta el JWT guardado de forma segura
api.interceptors.request.use(
  async (config) => {
    const token = await tokenStorage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de Respuesta: Maneja de forma centralizada la renovación del JWT ante errores 401 y 403
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = await tokenStorage.getRefreshToken();
      
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
            refreshToken,
          });
          
          const { token, refreshToken: newRefreshToken } = res.data;
          
          await tokenStorage.saveToken(token);
          if (newRefreshToken) {
            await tokenStorage.saveRefreshToken(newRefreshToken);
          }
          
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Si falla la renovación, se borran las credenciales (deslogueo forzado)
          await tokenStorage.clear();
          if (logoutCallback) {
            logoutCallback();
          }
          return Promise.reject(refreshError);
        }
      } else {
        // Si no hay refresh token, se borran las credenciales
        await tokenStorage.clear();
        if (logoutCallback) {
          logoutCallback();
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
