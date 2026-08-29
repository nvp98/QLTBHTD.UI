import { api } from './client';
import type { ThietBi, CreateThietBiDto, UpdateThietBiDto, PagedResult } from '../types/entities';

const BASE = '/api/thietbi';

type RawThietBi = Partial<ThietBi> & {
  iD_ThietBi?: number;
  iD_Tram?: number;
  tenTram?: string;
  iD_LoaiTB?: number;
  tenLoaiTB?: string;
  iD_NganLo?: number | null;
  tenNganLo?: string | null;
  kyHieu?: string;
  tenThietBi?: string;
  soHieu?: string;
  nhanHieu?: string;
  namSanXuat?: number;
  trangThai?: number;
  ghiChu?: string;
  taiDinhMuc?: number | null;
};

const normalizeThietBi = (item: any): ThietBi => ({
  ID_ThietBi: item.ID_ThietBi ?? item.iD_ThietBi ?? item.id_ThietBi ?? item.idThietBi ?? 0,
  ID_Tram:    item.ID_Tram    ?? item.iD_Tram    ?? item.id_Tram    ?? item.idTram ?? item.IDTram ?? 0,
  TenTram:    item.TenTram    ?? item.tenTram,
  ID_LoaiTB:  item.ID_LoaiTB  ?? item.iD_LoaiTB  ?? item.id_LoaiTB  ?? item.idLoaiTB ?? 0,
  TenLoaiTB:  item.TenLoaiTB  ?? item.tenLoaiTB,
  ID_NganLo:  item.ID_NganLo  ?? item.iD_NganLo  ?? null,
  TenNganLo:  item.TenNganLo  ?? item.tenNganLo  ?? null,
  KyHieu:     item.KyHieu     ?? item.kyHieu,
  TenThietBi: item.TenThietBi ?? item.tenThietBi ?? '',
  SoHieu:     item.SoHieu     ?? item.soHieu,
  NhanHieu:   item.NhanHieu   ?? item.nhanHieu,
  NamSanXuat: item.NamSanXuat ?? item.namSanXuat,
  TrangThai:  item.TrangThai  ?? item.trangThai  ?? 0,
  GhiChu:     item.GhiChu     ?? item.ghiChu,
  TaiDinhMuc: item.TaiDinhMuc ?? item.taiDinhMuc,
});

type PagedRaw = PagedResult<RawThietBi>;

function buildQuery(params?: { search?: string; page?: number; pageSize?: number }): string {
  if (!params) return '';
  const p = new URLSearchParams();
  if (params.search   !== undefined) p.set('search',   params.search);
  if (params.page     !== undefined) p.set('page',     String(params.page));
  if (params.pageSize !== undefined) p.set('pageSize', String(params.pageSize));
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const thietBiApi = {
  getAll: async (params?: { search?: string; page?: number; pageSize?: number }) => {
    const res = await api.get<RawThietBi[] | PagedRaw>(`${BASE}${buildQuery(params)}`);
    const items = Array.isArray(res) ? res : res.items;
    return items.map(normalizeThietBi);
  },
  getPaged: async (params?: { search?: string; page?: number; pageSize?: number }): Promise<PagedResult<ThietBi>> => {
    const res = await api.get<PagedRaw>(`${BASE}${buildQuery(params)}`);
    return { ...res, items: res.items.map(normalizeThietBi) };
  },
  getActive:  async ()           => (await api.get<RawThietBi[]>(`${BASE}/active`)).map(normalizeThietBi),
  getByTram:  async (id: number) => (await api.get<RawThietBi[]>(`${BASE}/by-tram/${id}`)).map(normalizeThietBi),
  getByLoai:  async (id: number) => (await api.get<RawThietBi[]>(`${BASE}/by-loai/${id}`)).map(normalizeThietBi),
  getByNganLo: async (id: number) => (await api.get<RawThietBi[]>(`${BASE}/by-nganlo/${id}`)).map(normalizeThietBi),
  getById:    async (id: number) => normalizeThietBi(await api.get<RawThietBi>(`${BASE}/${id}`)),
  create:     async (dto: CreateThietBiDto) => normalizeThietBi(await api.post<RawThietBi>(BASE, dto)),
  update:     async (id: number, dto: UpdateThietBiDto) => normalizeThietBi(await api.put<RawThietBi>(`${BASE}/${id}`, dto)),
  delete:     (id: number) => api.delete(`${BASE}/${id}`),
};
