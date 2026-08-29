import { api } from './client';
import type { LoginRequest, LoginResponse, NguoiDung, DoiMatKhauDto } from '../types/entities';

const BASE = '/api/auth';

type NguoiDungRaw = Partial<NguoiDung> & {
  iD_NguoiDung?: number;
  tenDangNhap?: string;
  hoTen?: string;
  email?: string | null;
  iD_VaiTro?: number;
  maVaiTro?: string;
  tenVaiTro?: string;
  iD_Tram?: number | null;
  tenTram?: string | null;
  trangThai?: number;
  ngayTao?: string;
};

const toNguoiDung = (raw: NguoiDungRaw): NguoiDung => ({
  ID_NguoiDung: Number(raw.ID_NguoiDung ?? raw.iD_NguoiDung ?? 0),
  TenDangNhap: raw.TenDangNhap ?? raw.tenDangNhap ?? '',
  HoTen: raw.HoTen ?? raw.hoTen ?? '',
  Email: raw.Email ?? raw.email ?? null,
  ID_VaiTro: Number(raw.ID_VaiTro ?? raw.iD_VaiTro ?? 0),
  MaVaiTro: raw.MaVaiTro ?? raw.maVaiTro ?? '',
  TenVaiTro: raw.TenVaiTro ?? raw.tenVaiTro ?? '',
  ID_Tram: raw.ID_Tram ?? raw.iD_Tram ?? null,
  TenTram: raw.TenTram ?? raw.tenTram ?? null,
  TrangThai: Number(raw.TrangThai ?? raw.trangThai ?? 0),
  NgayTao: raw.NgayTao ?? raw.ngayTao ?? '',
});

type LoginResponseRaw = { token?: string; Token?: string; nguoiDung?: NguoiDungRaw; NguoiDung?: NguoiDungRaw };

const toLoginResponse = (raw: LoginResponseRaw): LoginResponse => ({
  Token: raw.Token ?? raw.token ?? '',
  NguoiDung: toNguoiDung(raw.NguoiDung ?? raw.nguoiDung ?? {}),
});

export const authApi = {
  login: async (dto: LoginRequest) => toLoginResponse(await api.post<LoginResponseRaw>(`${BASE}/login`, dto)),
  me: async () => toNguoiDung(await api.get<NguoiDungRaw>(`${BASE}/by-me`)),
  doiMatKhau: (dto: DoiMatKhauDto) => api.post<void>(`${BASE}/doi-mat-khau`, dto),
};
