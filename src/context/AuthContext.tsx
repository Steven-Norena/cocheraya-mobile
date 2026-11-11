import React, { createContext, useContext, useState, useEffect } from 'react';
import authService, { AuthResponseData, LoginRequest, RegisterRequest } from '../services/authService';
import walletService from '../services/walletService';
import tokenStorage from '../services/secureStore';
import { setLogoutCallback } from '../services/api';

interface AuthContextType {
  user: AuthResponseData | null;
  balance: number | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<AuthResponseData>;
  register: (data: RegisterRequest) => Promise<AuthResponseData>;
  logout: () => Promise<void>;
  refreshBalance: () => Promise<number>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthResponseData | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Set up the forced logout handler from Axios interceptor
  useEffect(() => {
    setLogoutCallback(() => {
      setUser(null);
      setBalance(null);
    });
    return () => {
      setLogoutCallback(() => {});
    };
  }, []);

  // Load user from SecureStore on mount
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const storedUser = await tokenStorage.getUserInfo();
        const storedToken = await tokenStorage.getToken();
        if (storedUser && storedToken) {
          const authData: AuthResponseData = {
            ...storedUser,
            token: storedToken
          };
          setUser(authData);
          
          // Fetch balance immediately if logged in
          try {
            const res = await walletService.getBalance();
            setBalance(res.balance);
          } catch {
            setBalance(0);
          }
        }
      } catch (e) {
        console.error('Error loading stored auth state', e);
      } finally {
        setIsLoading(false);
      }
    };
    bootstrapAsync();
  }, []);

  const login = async (data: LoginRequest) => {
    setIsLoading(true);
    try {
      const response = await authService.login(data);
      
      // Save tokens securely in SecureStore (Rúbrica 2.1 compliant)
      await tokenStorage.saveToken(response.token);
      if (response.refreshToken) {
        await tokenStorage.saveRefreshToken(response.refreshToken);
      }
      
      // Save basic user info separately
      const userInfo = {
        userId: response.userId,
        name: response.name,
        email: response.email,
        role: response.role
      };
      await tokenStorage.saveUserInfo(userInfo);
      
      setUser(response);
      
      // Fetch balance
      try {
        const balRes = await walletService.getBalance();
        setBalance(balRes.balance);
      } catch {
        setBalance(0);
      }
      
      return response;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterRequest) => {
    setIsLoading(true);
    try {
      const response = await authService.register(data);
      
      // Save tokens securely in SecureStore
      await tokenStorage.saveToken(response.token);
      if (response.refreshToken) {
        await tokenStorage.saveRefreshToken(response.refreshToken);
      }
      
      // Save user info
      const userInfo = {
        userId: response.userId,
        name: response.name,
        email: response.email,
        role: response.role
      };
      await tokenStorage.saveUserInfo(userInfo);
      
      setUser(response);
      setBalance(0); // Brand new user starts with 0.00
      
      return response;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await tokenStorage.clear();
      setUser(null);
      setBalance(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshBalance = async (): Promise<number> => {
    if (!user) return 0;
    try {
      const res = await walletService.getBalance();
      setBalance(res.balance);
      return res.balance;
    } catch {
      return balance || 0;
    }
  };

  const value: AuthContextType = {
    user,
    balance,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refreshBalance,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
