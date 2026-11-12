import api from './api';

export interface AuthResponseData {
  token: string;
  refreshToken?: string;
  userId: number;
  name: string;
  email: string;
  role: 'DRIVER' | 'HOST' | 'ADMIN';
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: 'DRIVER' | 'HOST';
}

export interface LoginRequest {
  email: string;
  password: string;
  fcmToken?: string;
}

export const authService = {
  async register(data: RegisterRequest): Promise<AuthResponseData> {
    const response = await api.post<AuthResponseData>('/auth/register', data);
    return response.data;
  },

  async login(data: LoginRequest): Promise<AuthResponseData> {
    const requestData = {
      ...data,
      fcmToken: data.fcmToken || 'mock-mobile-fcm-token-456',
    };
    const response = await api.post<AuthResponseData>('/auth/login', requestData);
    return response.data;
  }
};

export default authService;
