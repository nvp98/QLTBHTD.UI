import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { authApi } from '../api/auth';
import type { NguoiDung } from '../types/entities';
import { AuthContext } from './AuthContext';
import { startNotificationConnection, stopNotificationConnection } from '../services/signalr';

const TOKEN_KEY = 'cbm_auth_token';
const USER_KEY = 'cbm_auth_user';

function getInitialUser(): NguoiDung | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as NguoiDung; } catch { return null; }
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<NguoiDung | null>(getInitialUser);
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (tenDangNhap: string, matKhau: string) => {
    setLoading(true);
    try {
      const res = await authApi.login({ TenDangNhap: tenDangNhap, MatKhau: matKhau });
      localStorage.setItem(TOKEN_KEY, res.Token);
      localStorage.setItem(USER_KEY, JSON.stringify(res.NguoiDung));
      setUser(res.NguoiDung);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    window.location.assign('/login');
  }, []);

  // Kết nối SignalR khi đã đăng nhập (kể cả khi F5 lại trang, vẫn còn user từ localStorage) —
  // ngắt kết nối khi đăng xuất.
  useEffect(() => {
    if (user) {
      startNotificationConnection();
    } else {
      stopNotificationConnection();
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
