import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'parkshare_jwt_token';
const REFRESH_TOKEN_KEY = 'parkshare_refresh_token';
const USER_INFO_KEY = 'parkshare_user_info';

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
      return localStorage.getItem(TOKEN_KEY);
    } else {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    }
  },
  async removeToken() {
    if (isWeb) {
      localStorage.removeItem(TOKEN_KEY);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
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
      return localStorage.getItem(REFRESH_TOKEN_KEY);
    } else {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    }
  },
  async removeRefreshToken() {
    if (isWeb) {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } else {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
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
      const userStr = localStorage.getItem(USER_INFO_KEY);
      return userStr ? JSON.parse(userStr) : null;
    } else {
      const userStr = await SecureStore.getItemAsync(USER_INFO_KEY);
      return userStr ? JSON.parse(userStr) : null;
    }
  },
  async removeUserInfo() {
    if (isWeb) {
      localStorage.removeItem(USER_INFO_KEY);
    } else {
      await SecureStore.deleteItemAsync(USER_INFO_KEY);
    }
  },
  async clear() {
    if (isWeb) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_INFO_KEY);
    } else {
      await Promise.all([
        SecureStore.deleteItemAsync(TOKEN_KEY),
        SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
        SecureStore.deleteItemAsync(USER_INFO_KEY)
      ]);
    }
  }
};

export default tokenStorage;

