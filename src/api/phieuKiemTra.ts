import { api } from './client';
import type {
  PhieuKiemTra, PhieuKiemTraDetailDto,
  CreatePhieuKiemTraDto, UpdatePhieuKiemTraDto,
  ChiTietKiemTra, PagedResult,
} from '../types/entities';

const BASE = '/api/phieukiemtra';

type PhieuKiemTraRaw = Partial<PhieuKiemTra> & {
  iD_Phieu?: number;
  iD_ThietBi?: number;
  tenThietBi?: string;
  ngayKiemTra?: string;
  nguoiKiemTra?: string;
  tongDiem_Soqt?: number;
  capDoCanhBao?: string;
  ghiChuChung?: string;
};

type PhieuKiemTraDetailRaw = PhieuKiemTraRaw & { chiTiets?: ChiTietKiemTra[] };

const toPhieu = (raw: PhieuKiemTraRaw): PhieuKiemTra => ({
  ID_Phieu:      Number(raw.ID_Phieu     ?? raw.iD_Phieu     ?? 0),
  ID_ThietBi:    Number(raw.ID_ThietBi   ?? raw.iD_ThietBi   ?? 0),
  TenThietBi:    raw.TenThietBi   ?? raw.tenThietBi,
  NgayKiemTra:   raw.NgayKiemTra  ?? raw.ngayKiemTra  ?? '',
  NguoiKiemTra:  raw.NguoiKiemTra ?? raw.nguoiKiemTra,
  TongDiem_Soqt: raw.TongDiem_Soqt ?? raw.tongDiem_Soqt,
  CapDoCanhBao:  raw.CapDoCanhBao ?? raw.capDoCanhBao,
  GhiChuChung:   raw.GhiChuChung  ?? raw.ghiChuChung,
});

const toPhieuDetail = (raw: PhieuKiemTraDetailRaw): PhieuKiemTraDetailDto => ({
  ...toPhieu(raw),
  ChiTiets: raw.chiTiets ?? [],
});

type PagedRaw = PagedResult<PhieuKiemTraRaw>;

function buildQuery(params?: { search?: string; page?: number; pageSize?: number }): string {
  if (!params) return '';
  const p = new URLSearchParams();
  if (params.search   !== undefined) p.set('search',   params.search);
  if (params.page     !== undefined) p.set('page',     String(params.page));
  if (params.pageSize !== undefined) p.set('pageSize', String(params.pageSize));
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const phieuKiemTraApi = {
  getAll: async (params?: { search?: string; page?: number; pageSize?: number }) => {
    const res = await api.get<PhieuKiemTraRaw[] | PagedRaw>(`${BASE}${buildQuery(params)}`);
    const items = Array.isArray(res) ? res : res.items;
    return items.map(toPhieu);
  },
  getPaged: async (params?: { search?: string; page?: number; pageSize?: number }): Promise<PagedResult<PhieuKiemTra>> => {
    const res = await api.get<PagedRaw>(`${BASE}${buildQuery(params)}`);
    return { ...res, items: res.items.map(toPhieu) };
  },
  getByThietBi: async (id: number) =>
    (await api.get<PhieuKiemTraRaw[]>(`${BASE}/by-thietbi/${id}`)).map(toPhieu),
  getByNgay: async (tuNgay: string, denNgay: string) =>
    (await api.get<PhieuKiemTraRaw[]>(`${BASE}/by-ngay?tuNgay=${tuNgay}&denNgay=${denNgay}`)).map(toPhieu),
  getById:   async (id: number) => toPhieu(await api.get<PhieuKiemTraRaw>(`${BASE}/${id}`)),
  getDetail: async (id: number) => toPhieuDetail(await api.get<PhieuKiemTraDetailRaw>(`${BASE}/${id}/detail`)),
  create:    async (dto: CreatePhieuKiemTraDto) => toPhieu(await api.post<PhieuKiemTraRaw>(BASE, dto)),
  update:    async (id: number, dto: UpdatePhieuKiemTraDto) => toPhieu(await api.put<PhieuKiemTraRaw>(`${BASE}/${id}`, dto)),
  delete:    (id: number) => api.delete(`${BASE}/${id}`),
};
