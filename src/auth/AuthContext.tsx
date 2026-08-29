import { createContext, useContext } from 'react';
import type { NguoiDung } from '../types/entities';

export interface AuthContextValue {
  user: NguoiDung | null;
  loading: boolean;
  login: (tenDangNhap: string, matKhau: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthContext.Provider');
  }
  return ctx;
}
