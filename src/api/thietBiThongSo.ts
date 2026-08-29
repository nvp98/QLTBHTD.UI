import { api } from './client';
import type { ThietBiThongSo, CreateThietBiThongSoDto, UpdateThietBiThongSoDto, ThietBiThongSoUsage } from '../types/entities';

const BASE = '/api/thietbi-thongso';

type Raw = Partial<ThietBiThongSo> & {
  iD_ThietBi_ThongSo?: number;
  iD_ThietBi?: number;
  iD_ThongSo?: number;
  maThongSo?: string;
  tenThongSo?: string;
  giaTri?: number;
  donVi?: string | null;
  ghiChu?: string | null;
};

const toThongSo = (r: Raw): ThietBiThongSo => ({
  ID_ThietBi_ThongSo: Number(r.ID_ThietBi_ThongSo ?? r.iD_ThietBi_ThongSo ?? 0),
  ID_ThietBi: Number(r.ID_ThietBi ?? r.iD_ThietBi ?? 0),
  ID_ThongSo: Number(r.ID_ThongSo ?? r.iD_ThongSo ?? 0),
  MaThongSo:  r.MaThongSo ?? r.maThongSo ?? '',
  TenThongSo: r.TenThongSo ?? r.tenThongSo ?? '',
  DonVi:      r.DonVi ?? r.donVi ?? null,
  GiaTri:     Number(r.GiaTri ?? r.giaTri ?? 0),
  GhiChu:     r.GhiChu ?? r.ghiChu ?? null,
});

type RawUsage = Partial<ThietBiThongSoUsage> & {
  iD_ThietBi_ThongSo?: number;
  iD_ThietBi?: number;
  tenThietBi?: string;
  giaTri?: number;
  ghiChu?: string | null;
};

const toUsage = (r: RawUsage): ThietBiThongSoUsage => ({
  ID_ThietBi_ThongSo: Number(r.ID_ThietBi_ThongSo ?? r.iD_ThietBi_ThongSo ?? 0),
  ID_ThietBi: Number(r.ID_ThietBi ?? r.iD_ThietBi ?? 0),
  TenThietBi: r.TenThietBi ?? r.tenThietBi ?? '',
  GiaTri:     Number(r.GiaTri ?? r.giaTri ?? 0),
  GhiChu:     r.GhiChu ?? r.ghiChu ?? null,
});

export const thietBiThongSoApi = {
  getByThietBi: async (idThietBi: number) =>
    (await api.get<Raw[]>(`${BASE}/by-thietbi/${idThietBi}`)).map(toThongSo),

  getByThongSo: async (idThongSo: number) =>
    (await api.get<RawUsage[]>(`${BASE}/by-thongso/${idThongSo}`)).map(toUsage),

  create: async (dto: CreateThietBiThongSoDto) =>
    toThongSo(await api.post<Raw>(`${BASE}/create-thietbithongso`, dto)),

  update: async (id: number, dto: UpdateThietBiThongSoDto) =>
    toThongSo(await api.put<Raw>(`${BASE}/${id}`, dto)),

  delete: (id: number) => api.delete(`${BASE}/${id}`),
};
