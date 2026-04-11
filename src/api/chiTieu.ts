import { api } from './client';
import type { ChiTieu, CreateChiTieuDto, UpdateChiTieuDto, PagedResult } from '../types/entities';

const BASE = '/api/chitieu';

type ChiTieuApiRaw = Partial<ChiTieu> & {
  iD_ChiTieu?: number;
  iD_NhomChiTieu?: number;
  tenNhom?: string;
  iD_LoaiThietBi?: number;
  tenChiTieu?: string;
  trongSo_Wi?: number;
  trangThai?: number;
};

const toChiTieu = (raw: ChiTieuApiRaw): ChiTieu => ({
  ID_ChiTieu:      Number(raw.ID_ChiTieu      ?? raw.iD_ChiTieu      ?? 0),
  ID_NhomChiTieu:  Number(raw.ID_NhomChiTieu  ?? raw.iD_NhomChiTieu  ?? 0),
  TenNhom:         raw.TenNhom    ?? raw.tenNhom,
  ID_LoaiThietBi:  Number(raw.ID_LoaiThietBi  ?? raw.iD_LoaiThietBi  ?? 0),
  TenChiTieu:      raw.TenChiTieu ?? raw.tenChiTieu ?? '',
  TrongSo_Wi:      Number(raw.TrongSo_Wi ?? raw.trongSo_Wi ?? 0),
  TrangThai:       Number(raw.TrangThai  ?? raw.trangThai  ?? 0),
});

type PagedRaw = PagedResult<ChiTieuApiRaw>;

type QueryParams = { search?: string; idNhom?: number; idLoai?: number; page?: number; pageSize?: number };

function buildQuery(params?: QueryParams): string {
  if (!params) return '';
  const p = new URLSearchParams();
  if (params.search   !== undefined) p.set('search',   params.search);
  if (params.idNhom   !== undefined) p.set('idNhom',   String(params.idNhom));
  if (params.idLoai   !== undefined) p.set('idLoai',   String(params.idLoai));
  if (params.page     !== undefined) p.set('page',     String(params.page));
  if (params.pageSize !== undefined) p.set('pageSize', String(params.pageSize));
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const chiTieuApi = {
  getAll: async (params?: QueryParams) => {
    const res = await api.get<ChiTieuApiRaw[] | PagedRaw>(`${BASE}${buildQuery(params)}`);
    const items = Array.isArray(res) ? res : res.items;
    return items.map(toChiTieu);
  },
  getPaged: async (params?: QueryParams): Promise<PagedResult<ChiTieu>> => {
    const res = await api.get<PagedRaw>(`${BASE}${buildQuery(params)}`);
    return { ...res, items: res.items.map(toChiTieu) };
  },
  getActive:  async ()           => (await api.get<ChiTieuApiRaw[]>(`${BASE}/active`)).map(toChiTieu),
  getByNhom:  async (id: number) => (await api.get<ChiTieuApiRaw[]>(`${BASE}/by-nhom/${id}`)).map(toChiTieu),
  getById:    async (id: number) => toChiTieu(await api.get<ChiTieuApiRaw>(`${BASE}/${id}`)),
  create:     async (dto: CreateChiTieuDto) => toChiTieu(await api.post<ChiTieuApiRaw>(BASE, dto)),
  update:     async (id: number, dto: UpdateChiTieuDto) => toChiTieu(await api.put<ChiTieuApiRaw>(`${BASE}/${id}`, dto)),
  delete:     (id: number) => api.delete(`${BASE}/${id}`),
};
