import { api } from './client';
import type { Nguong, CreateNguongDto, UpdateNguongDto, PagedResult } from '../types/entities';

const BASE = '/api/nguong';

type NguongApiRaw = Partial<Nguong> & {
  iD_Nguong?: number;
  iD_ChiTieu?: number;
  tenChiTieu?: string;
  canTren?: number | null;
  canDuoi?: number | null;
  diem_Si?: number;
  canDuoi_BaoGom?: boolean;
  canTren_BaoGom?: boolean;
  bieuThuc_Logic?: string | null;
};

const toNguong = (raw: NguongApiRaw): Nguong => ({
  ID_Nguong:      Number(raw.ID_Nguong  ?? raw.iD_Nguong  ?? 0),
  ID_ChiTieu:     Number(raw.ID_ChiTieu ?? raw.iD_ChiTieu ?? 0),
  TenChiTieu:     raw.TenChiTieu ?? raw.tenChiTieu,
  CanTren:        raw.CanTren  ?? raw.canTren  ?? null,
  CanDuoi:        raw.CanDuoi  ?? raw.canDuoi  ?? null,
  Diem_Si:        Number(raw.Diem_Si  ?? raw.diem_Si  ?? 0),
  CanDuoi_BaoGom: raw.CanDuoi_BaoGom ?? raw.canDuoi_BaoGom ?? true,
  CanTren_BaoGom: raw.CanTren_BaoGom ?? raw.canTren_BaoGom ?? false,
  BieuThuc_Logic: raw.BieuThuc_Logic ?? raw.bieuThuc_Logic ?? null,
});

type PagedRaw = PagedResult<NguongApiRaw>;

function buildQuery(params?: { search?: string; page?: number; pageSize?: number }): string {
  if (!params) return '';
  const p = new URLSearchParams();
  if (params.search   !== undefined) p.set('search',   params.search);
  if (params.page     !== undefined) p.set('page',     String(params.page));
  if (params.pageSize !== undefined) p.set('pageSize', String(params.pageSize));
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const nguongApi = {
  getAll: async (params?: { search?: string; page?: number; pageSize?: number }) => {
    const res = await api.get<NguongApiRaw[] | PagedRaw>(`${BASE}${buildQuery(params)}`);
    const items = Array.isArray(res) ? res : res.items;
    return items.map(toNguong);
  },
  getPaged: async (params?: { search?: string; page?: number; pageSize?: number }): Promise<PagedResult<Nguong>> => {
    const res = await api.get<PagedRaw>(`${BASE}${buildQuery(params)}`);
    return { ...res, items: res.items.map(toNguong) };
  },
  getByChiTieu: async (id: number) => (await api.get<NguongApiRaw[]>(`${BASE}/by-chitieu/${id}`)).map(toNguong),
  getById:      async (id: number) => toNguong(await api.get<NguongApiRaw>(`${BASE}/${id}`)),
  create:       async (dto: CreateNguongDto) => toNguong(await api.post<NguongApiRaw>(BASE, dto)),
  update:       async (id: number, dto: UpdateNguongDto) => toNguong(await api.put<NguongApiRaw>(`${BASE}/${id}`, dto)),
  delete:       (id: number) => api.delete(`${BASE}/${id}`),
};
