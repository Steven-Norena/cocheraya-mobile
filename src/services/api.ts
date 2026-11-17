import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import tokenStorage from './secureStore';

let logoutCallback: (() => void) | null = null;

export const setLogoutCallback = (callback: () => void) => {
  logoutCallback = callback;
};

const getBaseUrl = () => {
  // 1. Variable de entorno explícita (e.g. archivo .env / EAS build)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  // 2. Extra config desde app.json si existe
  if ((Constants.expoConfig?.extra as any)?.apiUrl) {
    return (Constants.expoConfig?.extra as any).apiUrl;
  }
  // 3. Resolución dinámica de IP local del host para Expo Go en celular físico
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:8080/api/v1`;
  }
  // 4. Emulador de Android (10.0.2.2 mapea a localhost de la máquina anfitriona)
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8080/api/v1';
  }
  // 5. iOS Simulator / Web
  return 'http://localhost:8080/api/v1';
};

export const API_BASE_URL = getBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
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

// Interceptor de Respuesta: Maneja reintentos de red y renovación de JWT ante errores 401 y 403
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    // Reintento automático ante caídas de red transitorias (Rúbrica 2.4)
    const isNetworkError = !error.response && Boolean(error.code || error.message);
    if (isNetworkError && !originalRequest._networkRetry) {
      originalRequest._networkRetry = true;
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return api(originalRequest);
    }

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
