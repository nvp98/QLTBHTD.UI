import { api } from './client';

export type LoaiBaoTri = 'DinhKy' | 'DotXuat';
export type TrangThaiLichBaoTri = 'ChoThucHien' | 'HoanThanh' | 'DaHuy';
export type TrangThaiHienThi = 'ChoThucHien' | 'QuaHan' | 'SapToiHan' | 'HoanThanh' | 'DaHuy';

export interface LichBaoTri {
  iD_LichBaoTri: number;
  iD_ThietBi: number;
  tenThietBi: string;
  iD_Tram: number;
  tenTram: string;
  iD_LichBaoTriGoc: number | null;
  loaiBaoTri: LoaiBaoTri;
  chuKyThang: number | null;
  ngayKeHoach: string;
  ngayThucHien: string | null;
  trangThai: TrangThaiLichBaoTri;
  trangThaiHienThi: TrangThaiHienThi;
  nguoiPhuTrach: string | null;
  noiDungCongViec: string | null;
  ghiChu: string | null;
  iD_PhieuKetQua: number | null;
  ngayTao: string;
}

export interface CreateLichBaoTriDto {
  iD_ThietBi: number;
  loaiBaoTri: LoaiBaoTri;
  chuKyThang?: number | null;
  ngayKeHoach: string;
  nguoiPhuTrach?: string | null;
  noiDungCongViec?: string | null;
  ghiChu?: string | null;
}

export type UpdateLichBaoTriDto = Omit<CreateLichBaoTriDto, 'iD_ThietBi'>;

export interface HoanThanhLichBaoTriDto {
  ngayThucHien: string;
  ghiChu?: string | null;
}

export interface ThongKeLichBaoTriDto {
  tongDangCho: number;
  soQuaHan: number;
  soSapToiHan7Ngay: number;
  soHoanThanhThangNay: number;
  danhSachCanChuY: LichBaoTri[];
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const BASE = '/api/lich-bao-tri';

function buildQuery(params?: {
  search?: string; trangThai?: string; idTram?: number;
  tuNgay?: string; denNgay?: string; page?: number; pageSize?: number;
}): string {
  if (!params) return '';
  const p = new URLSearchParams();
  if (params.search   !== undefined) p.set('search',   params.search);
  if (params.trangThai !== undefined) p.set('trangThai', params.trangThai);
  if (params.idTram   !== undefined) p.set('idTram',   String(params.idTram));
  if (params.tuNgay   !== undefined) p.set('tuNgay',   params.tuNgay);
  if (params.denNgay  !== undefined) p.set('denNgay',  params.denNgay);
  if (params.page     !== undefined) p.set('page',     String(params.page));
  if (params.pageSize !== undefined) p.set('pageSize', String(params.pageSize));
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const lichBaoTriApi = {
  getPaged: (params?: {
    search?: string; trangThai?: string; idTram?: number;
    tuNgay?: string; denNgay?: string; page?: number; pageSize?: number;
  }) => api.get<PagedResult<LichBaoTri>>(`${BASE}${buildQuery(params)}`),

  getById:       (id: number)         => api.get<LichBaoTri>(`${BASE}/${id}`),
  getByThietBi:  (idThietBi: number)  => api.get<LichBaoTri[]>(`${BASE}/thiet-bi/${idThietBi}`),
  getThongKe:    ()                   => api.get<ThongKeLichBaoTriDto>(`${BASE}/thong-ke`),
  create:        (dto: CreateLichBaoTriDto) => api.post<LichBaoTri>(BASE, dto),
  update:        (id: number, dto: UpdateLichBaoTriDto) => api.put<LichBaoTri>(`${BASE}/${id}`, dto),
  delete:        (id: number)         => api.delete(`${BASE}/${id}`),
  hoanThanh:     (id: number, dto: HoanThanhLichBaoTriDto) => api.post<LichBaoTri>(`${BASE}/${id}/hoan-thanh`, dto),
  huy:           (id: number)         => api.post<LichBaoTri>(`${BASE}/${id}/huy`, {}),
};
