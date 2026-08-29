import { api } from './client';
import type { NganLo, CreateNganLoDto, UpdateNganLoDto, PagedResult } from '../types/entities';

const BASE = '/api/nganlo';

type RawNganLo = Partial<NganLo> & {
  iD_NganLo?: number;
  iD_Tram?: number;
  tenTram?: string;
  tenNganLo?: string;
  maNganLo?: string;
  trangThai?: number;
  soThietBi?: number;
};

const toNganLo = (raw: any): NganLo => ({
  ID_NganLo:  Number(raw.ID_NganLo  ?? raw.iD_NganLo  ?? raw.idNganLo ?? 0),
  ID_Tram:    Number(raw.ID_Tram    ?? raw.iD_Tram    ?? raw.idTram   ?? 0),
  TenTram:    raw.TenTram    ?? raw.tenTram,
  TenNganLo:  raw.TenNganLo  ?? raw.tenNganLo ?? '',
  MaNganLo:   raw.MaNganLo   ?? raw.maNganLo,
  TrangThai:  Number(raw.TrangThai ?? raw.trangThai ?? 0),
  SoThietBi:  Number(raw.SoThietBi ?? raw.soThietBi ?? 0),
});

type PagedRaw = PagedResult<RawNganLo>;

function buildQuery(params?: { search?: string; page?: number; pageSize?: number }): string {
  if (!params) return '';
  const p = new URLSearchParams();
  if (params.search   !== undefined) p.set('search',   params.search);
  if (params.page     !== undefined) p.set('page',     String(params.page));
  if (params.pageSize !== undefined) p.set('pageSize', String(params.pageSize));
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const nganLoApi = {
  getAll: async (params?: { search?: string; page?: number; pageSize?: number }) => {
    const res = await api.get<RawNganLo[] | PagedRaw>(`${BASE}/get-all-nganlo${buildQuery(params)}`);
    const items = Array.isArray(res) ? res : res.items;
    return items.map(toNganLo);
  },
  getPaged: async (params?: { search?: string; page?: number; pageSize?: number }): Promise<PagedResult<NganLo>> => {
    const res = await api.get<PagedRaw>(`${BASE}/get-all-nganlo${buildQuery(params)}`);
    return { ...res, items: res.items.map(toNganLo) };
  },
  getActive:  async ()           => (await api.get<RawNganLo[]>(`${BASE}/active`)).map(toNganLo),
  getByTram:  async (id: number) => (await api.get<RawNganLo[]>(`${BASE}/by-tram/${id}`)).map(toNganLo),
  getById:    async (id: number) => toNganLo(await api.get<RawNganLo>(`${BASE}/${id}`)),
  create:     async (dto: CreateNganLoDto) => toNganLo(await api.post<RawNganLo>(`${BASE}/create-nganlo`, dto)),
  update:     async (id: number, dto: UpdateNganLoDto) => toNganLo(await api.put<RawNganLo>(`${BASE}/${id}`, dto)),
  delete:     (id: number) => api.delete(`${BASE}/${id}`),
};
