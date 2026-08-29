import { api } from './client';
import type { KhuVuc, CreateKhuVucDto, UpdateKhuVucDto, PagedResult } from '../types/entities';

const BASE = '/api/khuvuc';

type KhuVucApiRaw = Partial<KhuVuc> & {
  iD_KhuVuc?: number;
  tenKhuVuc?: string;
  trangThai?: number;
};

const toKhuVuc = (raw: KhuVucApiRaw): KhuVuc => ({
  ID_KhuVuc: Number(raw.ID_KhuVuc ?? raw.iD_KhuVuc ?? 0),
  TenKhuVuc: raw.TenKhuVuc ?? raw.tenKhuVuc ?? '',
  TrangThai: Number(raw.TrangThai ?? raw.trangThai ?? 0),
});

type PagedRaw = PagedResult<KhuVucApiRaw>;

function buildQuery(params?: { search?: string; page?: number; pageSize?: number }): string {
  if (!params) return '';
  const p = new URLSearchParams();
  if (params.search   !== undefined) p.set('search',   params.search);
  if (params.page     !== undefined) p.set('page',     String(params.page));
  if (params.pageSize !== undefined) p.set('pageSize', String(params.pageSize));
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const khuVucApi = {
  getAll: async (params?: { search?: string; page?: number; pageSize?: number }) => {
    const res = await api.get<KhuVucApiRaw[] | PagedRaw>(`${BASE}${buildQuery(params)}`);
    const items = Array.isArray(res) ? res : res.items;
    return items.map(toKhuVuc);
  },
  getPaged: async (params?: { search?: string; page?: number; pageSize?: number }): Promise<PagedResult<KhuVuc>> => {
    const res = await api.get<PagedRaw>(`${BASE}${buildQuery(params)}`);
    return { ...res, items: res.items.map(toKhuVuc) };
  },
  getActive: async ()           => (await api.get<KhuVucApiRaw[]>(`${BASE}/active`)).map(toKhuVuc),
  getById:   async (id: number) => toKhuVuc(await api.get<KhuVucApiRaw>(`${BASE}/${id}`)),
  create:    async (dto: CreateKhuVucDto) => toKhuVuc(await api.post<KhuVucApiRaw>(BASE, dto)),
  update:    async (id: number, dto: UpdateKhuVucDto) => toKhuVuc(await api.put<KhuVucApiRaw>(`${BASE}/${id}`, dto)),
  delete:    (id: number) => api.delete(`${BASE}/${id}`),
};
