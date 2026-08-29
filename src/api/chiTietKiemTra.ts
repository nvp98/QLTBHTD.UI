import { api } from './client';
import type { ChiTietKiemTra, CreateChiTietKiemTraDto, UpdateChiTietKiemTraDto } from '../types/entities';

const BASE = '/api/chi-tiet-kiem-tra';

type ChiTietKiemTraRaw = Partial<ChiTietKiemTra> & {
  iD_ChiTiet?: number;
  iDPhieu?: number;
  iD_ChiTieu?: number;
  tenChiTieu?: string;
  giaTriNhap_So?: number;
  giaTriNhap_Chu?: string;
  diem_Si_DatDuoc?: number;
  ghiChu?: string;
};

const toChiTiet = (raw: ChiTietKiemTraRaw): ChiTietKiemTra => ({
  ID_ChiTiet:       Number(raw.ID_ChiTiet      ?? raw.iD_ChiTiet      ?? 0),
  IDPhieu:          Number(raw.IDPhieu          ?? raw.iDPhieu          ?? 0),
  ID_ChiTieu:       Number(raw.ID_ChiTieu       ?? raw.iD_ChiTieu       ?? 0),
  TenChiTieu:       raw.TenChiTieu      ?? raw.tenChiTieu,
  GiaTriNhap_So:    raw.GiaTriNhap_So   ?? raw.giaTriNhap_So,
  GiaTriNhap_Chu:   raw.GiaTriNhap_Chu  ?? raw.giaTriNhap_Chu,
  Diem_Si_DatDuoc:  raw.Diem_Si_DatDuoc ?? raw.diem_Si_DatDuoc,
  GhiChu:           raw.GhiChu          ?? raw.ghiChu,
});

export const chiTietKiemTraApi = {
  getByPhieu: async (idPhieu: number) =>
    (await api.get<ChiTietKiemTraRaw[]>(`${BASE}/by-phieu/${idPhieu}`)).map(toChiTiet),
  getById:    async (id: number) => toChiTiet(await api.get<ChiTietKiemTraRaw>(`${BASE}/${id}`)),
  create:     async (idPhieu: number, dto: CreateChiTietKiemTraDto) =>
    toChiTiet(await api.post<ChiTietKiemTraRaw>(`${BASE}/phieu/${idPhieu}`, dto)),
  update:     async (id: number, dto: UpdateChiTietKiemTraDto) =>
    toChiTiet(await api.put<ChiTietKiemTraRaw>(`${BASE}/${id}`, dto)),
  delete:     (id: number) => api.delete(`${BASE}/${id}`),
};
