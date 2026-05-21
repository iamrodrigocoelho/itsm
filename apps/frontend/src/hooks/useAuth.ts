import { createContext, useContext, useState, useCallback, useEffect, type ReactNode, createElement } from 'react';
import { authApi } from '@/lib/api';
import type { UserSummaryDto } from '@itsm/shared-types';

interface AuthContextValue {
  user: UserSummaryDto | null;
  login: (email: string, password: string) => Promise<UserSummaryDto>;
  logout: () => Promise<void>;
  setUser: (updated: UserSummaryDto) => void;
  isAuthenticated: boolean;
}

function clearSession() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<UserSummaryDto | null>(() => {
    const stored = localStorage.getItem('user');
    return stored ? (JSON.parse(stored) as UserSummaryDto) : null;
  });

  // Verify session on mount — refreshes stale localStorage data
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    authApi.me().then(({ data }) => {
      localStorage.setItem('user', JSON.stringify(data));
      setUserState(data);
    }).catch(() => {
      clearSession();
      setUserState(null);
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await authApi.login({ email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUserState(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // Ignore errors on logout
      }
    }
    clearSession();
    setUserState(null);
  }, []);

  const updateUser = useCallback((updated: UserSummaryDto) => {
    localStorage.setItem('user', JSON.stringify(updated));
    setUserState(updated);
  }, []);

  return createElement(AuthContext.Provider, {
    value: { user, login, logout, setUser: updateUser, isAuthenticated: !!user },
    children,
  });
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
