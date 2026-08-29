import { api } from './client';
import type {
  NguoiDung, CreateNguoiDungDto, UpdateNguoiDungDto, DatLaiMatKhauDto,
} from '../types/entities';

const BASE = '/api/nguoidung';

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

export const nguoiDungApi = {
  getAll: async () => (await api.get<NguoiDungRaw[]>(`${BASE}/get-all-nguoidung`)).map(toNguoiDung),
  getById: async (id: number) => toNguoiDung(await api.get<NguoiDungRaw>(`${BASE}/${id}`)),
  create: async (dto: CreateNguoiDungDto) => toNguoiDung(await api.post<NguoiDungRaw>(`${BASE}/create-nguoidung`, dto)),
  update: async (id: number, dto: UpdateNguoiDungDto) => toNguoiDung(await api.put<NguoiDungRaw>(`${BASE}/${id}`, dto)),
  datLaiMatKhau: (id: number, dto: DatLaiMatKhauDto) => api.put<void>(`${BASE}/${id}/dat-lai-mat-khau`, dto),
  delete: (id: number) => api.delete(`${BASE}/${id}`),
};
