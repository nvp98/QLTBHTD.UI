import { api } from './client';
import type {
  NhomChiTieu, NhomChiTieuCay,
  CreateNhomChiTieuDto, UpdateNhomChiTieuDto, PagedResult
} from '../types/entities';

const BASE = '/api/nhom-chi-tieu';

type NhomChiTieuApiRaw = Partial<NhomChiTieu> & {
  iD_NhomChiTieu?: number;
  tenNhom?: string;
  iD_LoaiThietBi?: number;
  tenLoaiThietBi?: string;
  iD_NhomCha?: number | null;
  capDo?: number;
  loaiNhom?: string;
  phienBan?: number;
  trangThai?: number;
  coCongThuc?: boolean;
  nhomCon?: NhomChiTieuApiRaw[];
};

const toNhomChiTieu = (raw: NhomChiTieuApiRaw): NhomChiTieu => ({
  ID_NhomChiTieu: Number(raw.ID_NhomChiTieu ?? raw.iD_NhomChiTieu ?? 0),
  TenNhom: raw.TenNhom ?? raw.tenNhom ?? '',
  ID_LoaiThietBi: Number(raw.ID_LoaiThietBi ?? raw.iD_LoaiThietBi ?? 0),
  TenLoaiThietBi: raw.TenLoaiThietBi ?? raw.tenLoaiThietBi,
  PhienBan: Number(raw.PhienBan ?? raw.phienBan ?? 1),
  TrangThai: Number(raw.TrangThai ?? raw.trangThai ?? 0),
});

const toNhomCay = (raw: NhomChiTieuApiRaw): NhomChiTieuCay => ({
  ...toNhomChiTieu(raw),
  ID_NhomCha: raw.iD_NhomCha ?? raw.ID_NhomCha ?? null,
  CapDo: raw.capDo ?? raw.CapDo ?? 1,
  LoaiNhom: (raw.loaiNhom ?? raw.LoaiNhom ?? 'LEAF') as 'LEAF' | 'COMPOSITE',
  CoCongThuc: raw.coCongThuc ?? false,
  NhomCon: (raw.nhomCon ?? []).map(toNhomCay),
} as NhomChiTieuCay);

type PagedRaw = PagedResult<NhomChiTieuApiRaw>;

function buildQuery(params?: { search?: string; page?: number; pageSize?: number }): string {
  if (!params) return '';
  const p = new URLSearchParams();
  if (params.search   !== undefined) p.set('search',   params.search);
  if (params.page     !== undefined) p.set('page',     String(params.page));
  if (params.pageSize !== undefined) p.set('pageSize', String(params.pageSize));
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const nhomChiTieuApi = {
  getAll: async (params?: { search?: string; page?: number; pageSize?: number }) => {
    const res = await api.get<NhomChiTieuApiRaw[] | PagedRaw>(`${BASE}${buildQuery(params)}`);
    const items = Array.isArray(res) ? res : res.items;
    return items.map(toNhomChiTieu);
  },
  getPaged: async (params?: { search?: string; page?: number; pageSize?: number }): Promise<PagedResult<NhomChiTieu>> => {
    const res = await api.get<PagedRaw>(`${BASE}${buildQuery(params)}`);
    return { ...res, items: res.items.map(toNhomChiTieu) };
  },
  getActive:  async ()           => (await api.get<NhomChiTieuApiRaw[]>(`${BASE}/active`)).map(toNhomChiTieu),
  getByLoai:  async (id: number) => (await api.get<NhomChiTieuApiRaw[]>(`${BASE}/by-loaithietbi/${id}`)).map(toNhomChiTieu),
  getCay:     async (idLoai: number) => (await api.get<NhomChiTieuApiRaw[]>(`${BASE}/cay/${idLoai}`)).map(toNhomCay),
  getById:    async (id: number) => toNhomChiTieu(await api.get<NhomChiTieuApiRaw>(`${BASE}/${id}`)),
  create:     async (dto: CreateNhomChiTieuDto) => toNhomChiTieu(await api.post<NhomChiTieuApiRaw>(BASE, dto)),
  update:     async (id: number, dto: UpdateNhomChiTieuDto) => toNhomChiTieu(await api.put<NhomChiTieuApiRaw>(`${BASE}/${id}`, dto)),
  delete:     (id: number) => api.delete(`${BASE}/${id}`),
};
