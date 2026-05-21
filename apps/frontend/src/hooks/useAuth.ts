import { useState, useCallback } from 'react';
import { authApi } from '@/lib/api';
import type { UserSummaryDto } from '@itsm/shared-types';

export function useAuth() {
  const [user, setUser] = useState<UserSummaryDto | null>(() => {
    const stored = localStorage.getItem('user');
    return stored ? (JSON.parse(stored) as UserSummaryDto) : null;
  });

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await authApi.login({ email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
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
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  const updateUser = (updated: UserSummaryDto) => {
    localStorage.setItem('user', JSON.stringify(updated));
    setUser(updated);
  };

  return { user, login, logout, setUser: updateUser, isAuthenticated: !!user };
}
