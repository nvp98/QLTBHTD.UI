import { api } from './client';
import type {
  ChiTieuPhanLoaiNguong, CreateChiTieuPhanLoaiNguongDto, UpdateChiTieuPhanLoaiNguongDto,
  KetQuaPhanLoaiThang,
} from '../types/entities';

const BASE = '/api/chitieu-phanloai';

type RawPhanLoai = Partial<ChiTieuPhanLoaiNguong> & {
  iD_PhanLoai?: number;
  iD_ChiTieu?: number;
  maMuc?: string;
  giaTriTu?: number | null;
  giaTriDen?: number | null;
  giaTriTu_BaoGom?: boolean;
  giaTriDen_BaoGom?: boolean;
  trongSo?: number;
  thuTu?: number;
};

const toPhanLoai = (r: RawPhanLoai): ChiTieuPhanLoaiNguong => ({
  ID_PhanLoai:      Number(r.ID_PhanLoai      ?? r.iD_PhanLoai      ?? 0),
  ID_ChiTieu:       Number(r.ID_ChiTieu       ?? r.iD_ChiTieu       ?? 0),
  MaMuc:            r.MaMuc            ?? r.maMuc            ?? '',
  GiaTriTu:         r.GiaTriTu         ?? r.giaTriTu         ?? null,
  GiaTriDen:        r.GiaTriDen        ?? r.giaTriDen        ?? null,
  GiaTriTu_BaoGom:  r.GiaTriTu_BaoGom  ?? r.giaTriTu_BaoGom  ?? false,
  GiaTriDen_BaoGom: r.GiaTriDen_BaoGom ?? r.giaTriDen_BaoGom ?? false,
  TrongSo:          Number(r.TrongSo   ?? r.trongSo          ?? 0),
  ThuTu:            Number(r.ThuTu     ?? r.thuTu            ?? 0),
});

type RawKetQuaThang = Partial<KetQuaPhanLoaiThang> & {
  iDPhieu?: number;
  iD_ChiTieu?: number;
  nam?: number;
  thang?: number;
  giaTriDo?: number;
  maMuc?: string;
  trongSo?: number;
};

const toKetQuaThang = (r: RawKetQuaThang): KetQuaPhanLoaiThang => ({
  IDPhieu:    Number(r.IDPhieu    ?? r.iDPhieu    ?? 0),
  ID_ChiTieu: Number(r.ID_ChiTieu ?? r.iD_ChiTieu ?? 0),
  Nam:        Number(r.Nam        ?? r.nam        ?? 0),
  Thang:      Number(r.Thang      ?? r.thang      ?? 0),
  GiaTriDo:   Number(r.GiaTriDo   ?? r.giaTriDo    ?? 0),
  MaMuc:      r.MaMuc  ?? r.maMuc  ?? '',
  TrongSo:    Number(r.TrongSo    ?? r.trongSo     ?? 0),
});

export const chiTieuPhanLoaiApi = {
  getByChiTieu: async (idChiTieu: number) =>
    (await api.get<RawPhanLoai[]>(`${BASE}/by-chitieu/${idChiTieu}`)).map(toPhanLoai),

  getById: async (id: number) =>
    toPhanLoai(await api.get<RawPhanLoai>(`${BASE}/${id}`)),

  create: async (dto: CreateChiTieuPhanLoaiNguongDto) =>
    toPhanLoai(await api.post<RawPhanLoai>(BASE, dto)),

  update: async (id: number, dto: UpdateChiTieuPhanLoaiNguongDto) =>
    toPhanLoai(await api.put<RawPhanLoai>(`${BASE}/${id}`, dto)),

  delete: (id: number) => api.delete(`${BASE}/${id}`),

  getKetQuaThang: async (idPhieu: number, idChiTieu: number) =>
    (await api.get<RawKetQuaThang[]>(`${BASE}/ket-qua-thang/${idPhieu}/${idChiTieu}`)).map(toKetQuaThang),
};
