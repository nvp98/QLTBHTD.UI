import { api } from './client';
import type { ThongSo, CreateThongSoDto, UpdateThongSoDto } from '../types/entities';

const BASE = '/api/thongso';

type Raw = Partial<ThongSo> & {
  iD_ThongSo?: number;
  maThongSo?: string;
  tenThongSo?: string;
  donVi?: string | null;
  loaiDuLieu?: string;
  trangThai?: number;
  ghiChu?: string | null;
};

const toThongSo = (r: Raw): ThongSo => ({
  ID_ThongSo: Number(r.ID_ThongSo ?? r.iD_ThongSo ?? 0),
  MaThongSo:  r.MaThongSo  ?? r.maThongSo  ?? '',
  TenThongSo: r.TenThongSo ?? r.tenThongSo ?? '',
  DonVi:      r.DonVi      ?? r.donVi      ?? null,
  LoaiDuLieu: r.LoaiDuLieu ?? r.loaiDuLieu ?? 'DECIMAL',
  TrangThai:  Number(r.TrangThai ?? r.trangThai ?? 1),
  GhiChu:     r.GhiChu     ?? r.ghiChu     ?? null,
});

export const thongSoApi = {
  getAll: async () => (await api.get<Raw[]>(`${BASE}/get-all-thongso`)).map(toThongSo),

  create: async (dto: CreateThongSoDto) =>
    toThongSo(await api.post<Raw>(`${BASE}/create-thongso`, dto)),

  update: async (id: number, dto: UpdateThongSoDto) =>
    toThongSo(await api.put<Raw>(`${BASE}/${id}`, dto)),

  delete: (id: number) => api.delete(`${BASE}/${id}`),
};
