import { api } from './client';
import type { TramDien, CreateTramDienDto, UpdateTramDienDto, PagedResult } from '../types/entities';

const BASE = '/api/tramdien';

type TramDienApiRaw = Partial<TramDien> & {
  iDTram?: number;
  /** legacy snake-case variant */
  iD_Tram?: number;
  iDKhuVuc?: number;
  tenKhuVuc?: string;
  tenTram?: string;
  diaDiem?: string;
  trangThai?: number;
};

const toTramDien = (raw: any): TramDien => ({
  IDTram:    Number(raw.IDTram    ?? raw.iDTram    ?? raw.iD_Tram ?? raw.idTram ?? raw.id_Tram ?? 0),
  IDKhuVuc:  Number(raw.IDKhuVuc  ?? raw.iDKhuVuc  ?? raw.idKhuVuc ?? raw.id_KhuVuc ?? raw.iD_KhuVuc ?? 0),
  TenKhuVuc: raw.TenKhuVuc ?? raw.tenKhuVuc,
  TenTram:   raw.TenTram   ?? raw.tenTram   ?? '',
  DiaDiem:   raw.DiaDiem   ?? raw.diaDiem,
  TrangThai: Number(raw.TrangThai ?? raw.trangThai ?? 0),
});

type PagedRaw = PagedResult<TramDienApiRaw>;

function buildQuery(params?: { search?: string; page?: number; pageSize?: number }): string {
  if (!params) return '';
  const p = new URLSearchParams();
  if (params.search   !== undefined) p.set('search',   params.search);
  if (params.page     !== undefined) p.set('page',     String(params.page));
  if (params.pageSize !== undefined) p.set('pageSize', String(params.pageSize));
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const tramDienApi = {
  getAll: async (params?: { search?: string; page?: number; pageSize?: number }) => {
    const res = await api.get<TramDienApiRaw[] | PagedRaw>(`${BASE}/get-all-tramdien${buildQuery(params)}`);
    const items = Array.isArray(res) ? res : res.items;
    return items.map(toTramDien);
  },
  getPaged: async (params?: { search?: string; page?: number; pageSize?: number }): Promise<PagedResult<TramDien>> => {
    const res = await api.get<PagedRaw>(`${BASE}/get-all-tramdien${buildQuery(params)}`);
    return { ...res, items: res.items.map(toTramDien) };
  },
  getActive:   async ()           => (await api.get<TramDienApiRaw[]>(`${BASE}/active`)).map(toTramDien),
  getByKhuVuc: async (id: number) => (await api.get<TramDienApiRaw[]>(`${BASE}/by-khuvuc/${id}`)).map(toTramDien),
  getById:     async (id: number) => toTramDien(await api.get<TramDienApiRaw>(`${BASE}/${id}`)),
  create:      async (dto: CreateTramDienDto) => toTramDien(await api.post<TramDienApiRaw>(`${BASE}/create-tramdien`, dto)),
  update:      async (id: number, dto: UpdateTramDienDto) => toTramDien(await api.put<TramDienApiRaw>(`${BASE}/${id}`, dto)),
  delete:      (id: number) => api.delete(`${BASE}/${id}`),
};
