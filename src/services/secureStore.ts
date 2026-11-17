import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'cocheraya_jwt_token';
const REFRESH_TOKEN_KEY = 'cocheraya_refresh_token';
const USER_INFO_KEY = 'cocheraya_user_info';

// Backward compatibility keys
const LEGACY_TOKEN_KEY = 'parkshare_jwt_token';
const LEGACY_REFRESH_TOKEN_KEY = 'parkshare_refresh_token';
const LEGACY_USER_INFO_KEY = 'parkshare_user_info';

// Web fallback to localStorage since SecureStore requires native device storage
const isWeb = Platform.OS === 'web';

export const tokenStorage = {
  async saveToken(token: string) {
    if (isWeb) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    }
  },
  async getToken() {
    if (isWeb) {
      return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
    } else {
      const val = await SecureStore.getItemAsync(TOKEN_KEY);
      return val || await SecureStore.getItemAsync(LEGACY_TOKEN_KEY);
    }
  },
  async removeToken() {
    if (isWeb) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(LEGACY_TOKEN_KEY);
    } else {
      await Promise.all([
        SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {}),
        SecureStore.deleteItemAsync(LEGACY_TOKEN_KEY).catch(() => {})
      ]);
    }
  },
  async saveRefreshToken(token: string) {
    if (isWeb) {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
    } else {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
    }
  },
  async getRefreshToken() {
    if (isWeb) {
      return localStorage.getItem(REFRESH_TOKEN_KEY) || localStorage.getItem(LEGACY_REFRESH_TOKEN_KEY);
    } else {
      const val = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      return val || await SecureStore.getItemAsync(LEGACY_REFRESH_TOKEN_KEY);
    }
  },
  async removeRefreshToken() {
    if (isWeb) {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
    } else {
      await Promise.all([
        SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => {}),
        SecureStore.deleteItemAsync(LEGACY_REFRESH_TOKEN_KEY).catch(() => {})
      ]);
    }
  },
  async saveUserInfo(user: any) {
    if (isWeb) {
      localStorage.setItem(USER_INFO_KEY, JSON.stringify(user));
    } else {
      await SecureStore.setItemAsync(USER_INFO_KEY, JSON.stringify(user));
    }
  },
  async getUserInfo() {
    if (isWeb) {
      const userStr = localStorage.getItem(USER_INFO_KEY) || localStorage.getItem(LEGACY_USER_INFO_KEY);
      return userStr ? JSON.parse(userStr) : null;
    } else {
      const userStr = (await SecureStore.getItemAsync(USER_INFO_KEY)) || (await SecureStore.getItemAsync(LEGACY_USER_INFO_KEY));
      return userStr ? JSON.parse(userStr) : null;
    }
  },
  async removeUserInfo() {
    if (isWeb) {
      localStorage.removeItem(USER_INFO_KEY);
      localStorage.removeItem(LEGACY_USER_INFO_KEY);
    } else {
      await Promise.all([
        SecureStore.deleteItemAsync(USER_INFO_KEY).catch(() => {}),
        SecureStore.deleteItemAsync(LEGACY_USER_INFO_KEY).catch(() => {})
      ]);
    }
  },
  async clear() {
    if (isWeb) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_INFO_KEY);
      localStorage.removeItem(LEGACY_TOKEN_KEY);
      localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
      localStorage.removeItem(LEGACY_USER_INFO_KEY);
    } else {
      await Promise.all([
        SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {}),
        SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => {}),
        SecureStore.deleteItemAsync(USER_INFO_KEY).catch(() => {}),
        SecureStore.deleteItemAsync(LEGACY_TOKEN_KEY).catch(() => {}),
        SecureStore.deleteItemAsync(LEGACY_REFRESH_TOKEN_KEY).catch(() => {}),
        SecureStore.deleteItemAsync(LEGACY_USER_INFO_KEY).catch(() => {})
      ]);
    }
  }
};

export default tokenStorage;

