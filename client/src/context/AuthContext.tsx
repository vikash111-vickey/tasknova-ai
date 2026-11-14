import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, User } from '../lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (data: { email: string; password: string; fullName: string }) => Promise<void>;
  logout: () => Promise<void>;
  useDemoAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getStoredItem = (key: string): string | null => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // Ignore storage errors
  }
  return null;
};

const setStoredItem = (key: string, value: string): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Ignore storage errors
  }
};

const removeStoredItem = (key: string): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage errors
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = getStoredItem('tasknova_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return getStoredItem('tasknova_token');
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Validate session on mount, or initialize pre-seeded demo operator
  useEffect(() => {
    const verifySession = async () => {
      const isManualLoggedOut = getStoredItem('tasknova_logged_out') === 'true';

      if (!token) {
        // In demo mode: auto-initialize with demo operator unless manually logged out
        if (!isManualLoggedOut) {
          try {
            const demo = await api.getDemoCredentials();
            const res = await api.login({
              email: demo.data.email,
              password: demo.data.password,
            });
            if (res.data.user) {
              setUser(res.data.user);
              setToken(res.data.token);
              setStoredItem('tasknova_token', res.data.token);
              setStoredItem('tasknova_user', JSON.stringify(res.data.user));
            }
          } catch {
            // Leave unauthenticated if server offline
          }
        }
        setIsLoading(false);
        return;
      }

      try {
        const res = await api.getMe();
        if (res.data.user) {
          setUser(res.data.user);
          setStoredItem('tasknova_user', JSON.stringify(res.data.user));
        }
      } catch {
        // Token expired or invalid
        setUser(null);
        setToken(null);
        removeStoredItem('tasknova_token');
        removeStoredItem('tasknova_user');
      } finally {
        setIsLoading(false);
      }
    };

    verifySession();
  }, [token]);

  const login = useCallback(async (credentials: { email: string; password: string }) => {
    removeStoredItem('tasknova_logged_out');
    const res = await api.login(credentials);
    const { user: authedUser, token: authToken } = res.data;
    setUser(authedUser);
    setToken(authToken);
    setStoredItem('tasknova_token', authToken);
    setStoredItem('tasknova_user', JSON.stringify(authedUser));
  }, []);

  const register = useCallback(async (data: { email: string; password: string; fullName: string }) => {
    removeStoredItem('tasknova_logged_out');
    const res = await api.register(data);
    const { user: authedUser, token: authToken } = res.data;
    setUser(authedUser);
    setToken(authToken);
    setStoredItem('tasknova_token', authToken);
    setStoredItem('tasknova_user', JSON.stringify(authedUser));
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      setToken(null);
      setStoredItem('tasknova_logged_out', 'true');
      removeStoredItem('tasknova_token');
      removeStoredItem('tasknova_user');
    }
  }, []);

  const useDemoAccount = useCallback(async () => {
    const demo = await api.getDemoCredentials();
    await login({
      email: demo.data.email,
      password: demo.data.password,
    });
  }, [login]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user && token),
        isLoading,
        login,
        register,
        logout,
        useDemoAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
