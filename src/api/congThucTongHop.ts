import { api } from './client';
import type {
  CongThucTongHop, CreateCongThucTongHopDto, UpdateCongThucTongHopDto,
  CongThucBien, CreateCongThucBienDto, UpdateCongThucBienDto,
} from '../types/entities';

const BASE_CT = '/api/cong-thuc-tong-hop';
const BASE_CB = '/api/cong-thuc-bien';

type CongThucBienRaw = Partial<CongThucBien> & {
  iD_Bien?: number;
  iD_CongThuc?: number;
  maBien?: string;
  nguonBien?: string;
  iD_ChiTieuNguon?: number | null;
  tenChiTieu?: string | null;
  iD_NhomCon?: number | null;
  tenNhomCon?: string | null;
  giaTriHangSo?: number | null;
  moTa?: string | null;
};

const toCongThucBien = (r: CongThucBienRaw): CongThucBien => ({
  ID_Bien:         Number(r.ID_Bien ?? r.iD_Bien ?? 0),
  ID_CongThuc:     Number(r.ID_CongThuc ?? r.iD_CongThuc ?? 0),
  MaBien:          r.MaBien ?? r.maBien ?? '',
  NguonBien:       (r.NguonBien ?? r.nguonBien ?? 'HANGSO') as CongThucBien['NguonBien'],
  ID_ChiTieuNguon: r.ID_ChiTieuNguon ?? r.iD_ChiTieuNguon ?? null,
  TenChiTieu:      r.TenChiTieu ?? r.tenChiTieu ?? null,
  ID_NhomCon:      r.ID_NhomCon ?? r.iD_NhomCon ?? null,
  TenNhomCon:      r.TenNhomCon ?? r.tenNhomCon ?? null,
  GiaTriHangSo:    r.GiaTriHangSo ?? r.giaTriHangSo ?? null,
  MoTa:            r.MoTa ?? r.moTa ?? null,
});

type CongThucTongHopRaw = Partial<Omit<CongThucTongHop, 'DanhSachBien'>> & {
  iD_CongThuc?: number;
  iD_NhomChiTieu?: number;
  tenNhom?: string;
  bieuThuc?: string;
  loaiCongThuc?: string;
  phienBan?: number;
  trangThai?: number;
  thangDiem_Min?: number | null;
  thangDiem_Max?: number | null;
  moTa?: string | null;
  DanhSachBien?: CongThucBienRaw[];
  danhSachBien?: CongThucBienRaw[];
};

const toCongThucTongHop = (r: CongThucTongHopRaw): CongThucTongHop => ({
  ID_CongThuc:     Number(r.ID_CongThuc ?? r.iD_CongThuc ?? 0),
  ID_NhomChiTieu:  Number(r.ID_NhomChiTieu ?? r.iD_NhomChiTieu ?? 0),
  TenNhom:         r.TenNhom ?? r.tenNhom ?? '',
  BieuThuc:        r.BieuThuc ?? r.bieuThuc ?? '',
  LoaiCongThuc:    r.LoaiCongThuc ?? r.loaiCongThuc ?? '',
  PhienBan:        Number(r.PhienBan ?? r.phienBan ?? 1),
  TrangThai:       Number(r.TrangThai ?? r.trangThai ?? 0),
  ThangDiem_Min:   r.ThangDiem_Min ?? r.thangDiem_Min ?? null,
  ThangDiem_Max:   r.ThangDiem_Max ?? r.thangDiem_Max ?? null,
  MoTa:            r.MoTa ?? r.moTa ?? null,
  DanhSachBien:    (r.DanhSachBien ?? r.danhSachBien ?? []).map(toCongThucBien),
});

export const congThucTongHopApi = {
  getByNhom: async (idNhom: number) =>
    (await api.get<CongThucTongHopRaw[]>(`${BASE_CT}/by-nhom/${idNhom}`)).map(toCongThucTongHop),

  getActive: async (idNhom: number) =>
    toCongThucTongHop(await api.get<CongThucTongHopRaw>(`${BASE_CT}/by-nhom/${idNhom}/active`)),

  getById: async (id: number) =>
    toCongThucTongHop(await api.get<CongThucTongHopRaw>(`${BASE_CT}/${id}`)),

  create: async (dto: CreateCongThucTongHopDto) =>
    toCongThucTongHop(await api.post<CongThucTongHopRaw>(BASE_CT, dto)),

  update: async (id: number, dto: UpdateCongThucTongHopDto) =>
    toCongThucTongHop(await api.put<CongThucTongHopRaw>(`${BASE_CT}/${id}`, dto)),

  delete: (id: number) => api.delete(`${BASE_CT}/${id}`),
};

export const congThucBienApi = {
  getByCongThuc: async (idCongThuc: number) =>
    (await api.get<CongThucBienRaw[]>(`${BASE_CB}/by-congthuc/${idCongThuc}`)).map(toCongThucBien),

  getById: async (id: number) =>
    toCongThucBien(await api.get<CongThucBienRaw>(`${BASE_CB}/${id}`)),

  create: async (dto: CreateCongThucBienDto) =>
    toCongThucBien(await api.post<CongThucBienRaw>(BASE_CB, dto)),

  update: async (id: number, dto: UpdateCongThucBienDto) =>
    toCongThucBien(await api.put<CongThucBienRaw>(`${BASE_CB}/${id}`, dto)),

  delete: (id: number) => api.delete(`${BASE_CB}/${id}`),
};
