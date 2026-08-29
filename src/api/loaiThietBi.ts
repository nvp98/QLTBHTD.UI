import { api } from './client';
import type { LoaiThietBi, CreateLoaiThietBiDto, UpdateLoaiThietBiDto, PagedResult } from '../types/entities';

const BASE = '/api/loaithietbi';

type LoaiThietBiApiRaw = Partial<LoaiThietBi> & {
  iD_LoaiThietBi?: number;
  tenLoaiTB?: string;
  kyHieu?: string;
  trangThai?: number;
};

const toLoaiThietBi = (raw: LoaiThietBiApiRaw): LoaiThietBi => ({
  ID_LoaiThietBi: Number(raw.ID_LoaiThietBi ?? raw.iD_LoaiThietBi ?? 0),
  TenLoaiTB: raw.TenLoaiTB ?? raw.tenLoaiTB ?? '',
  KyHieu:    raw.KyHieu    ?? raw.kyHieu    ?? '',
  TrangThai: Number(raw.TrangThai ?? raw.trangThai ?? 0),
});

type PagedRaw = PagedResult<LoaiThietBiApiRaw>;

function buildQuery(params?: { search?: string; page?: number; pageSize?: number }): string {
  if (!params) return '';
  const p = new URLSearchParams();
  if (params.search   !== undefined) p.set('search',   params.search);
  if (params.page     !== undefined) p.set('page',     String(params.page));
  if (params.pageSize !== undefined) p.set('pageSize', String(params.pageSize));
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const loaiThietBiApi = {
  getAll: async (params?: { search?: string; page?: number; pageSize?: number }) => {
    const res = await api.get<LoaiThietBiApiRaw[] | PagedRaw>(`${BASE}/get-all-loaithietbi${buildQuery(params)}`);
    const items = Array.isArray(res) ? res : res.items;
    return items.map(toLoaiThietBi);
  },
  getPaged: async (params?: { search?: string; page?: number; pageSize?: number }): Promise<PagedResult<LoaiThietBi>> => {
    const res = await api.get<PagedRaw>(`${BASE}/get-all-loaithietbi${buildQuery(params)}`);
    return { ...res, items: res.items.map(toLoaiThietBi) };
  },
  getActive: async ()           => (await api.get<LoaiThietBiApiRaw[]>(`${BASE}/active`)).map(toLoaiThietBi),
  getById:   async (id: number) => toLoaiThietBi(await api.get<LoaiThietBiApiRaw>(`${BASE}/${id}`)),
  create:    async (dto: CreateLoaiThietBiDto) => toLoaiThietBi(await api.post<LoaiThietBiApiRaw>(`${BASE}/create-loaithietbi`, dto)),
  update:    async (id: number, dto: UpdateLoaiThietBiDto) => toLoaiThietBi(await api.put<LoaiThietBiApiRaw>(`${BASE}/${id}`, dto)),
  delete:    (id: number) => api.delete(`${BASE}/${id}`),
};
