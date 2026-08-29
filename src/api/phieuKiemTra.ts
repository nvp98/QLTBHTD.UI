import { api } from './client';
import type {
  PhieuKiemTra, PhieuKiemTraDetailDto,
  CreatePhieuKiemTraDto, UpdatePhieuKiemTraDto,
  ChiTietKiemTra, ChiTietInputValueDto, LichSuChiTieu, PagedResult,
} from '../types/entities';

const BASE = '/api/phieukiemtra';

type PhieuKiemTraRaw = Partial<PhieuKiemTra> & {
  iD_Phieu?: number;
  iD_ThietBi?: number;
  tenThietBi?: string;
  iD_Tram?: number;
  tenTram?: string;
  iD_LoaiTB?: number;
  tenLoaiTB?: string;
  iD_NganLo?: number | null;
  tenNganLo?: string | null;
  iD_NhomChiTieu?: number;
  tenNhom?: string;
  ngayKiemTra?: string;
  nguoiKiemTra?: string;
  tongDiem_Soqt?: number;
  capDoCanhBao?: string;
  ghiChuChung?: string;
};

type ChiTietInputValueRaw = Partial<ChiTietInputValueDto> & {
  maInput?: string;
  tenInput?: string;
  giaTriSo?: number;
};

const toInputValue = (raw: ChiTietInputValueRaw): ChiTietInputValueDto => ({
  MaInput:  raw.MaInput  ?? raw.maInput  ?? '',
  TenInput: raw.TenInput ?? raw.tenInput,
  GiaTriSo: Number(raw.GiaTriSo ?? raw.giaTriSo ?? 0),
});

type ChiTietKiemTraRaw = Partial<ChiTietKiemTra> & {
  iD_ChiTiet?: number;
  idPhieu?: number;
  iD_ChiTieu?: number;
  tenChiTieu?: string;
  iD_NhomChiTieu?: number;
  tenNhom?: string;
  giaTriNhap_So?: number;
  giaTriNhap_Chu?: string;
  diem_Si_DatDuoc?: number;
  hanhDongKhuyenCao?: string | null;
  ghiChu?: string;
  danhSachInput?: ChiTietInputValueRaw[];
};

type LichSuChiTieuRaw = Partial<LichSuChiTieu> & {
  iD_Phieu?: number;
  ngayKiemTra?: string;
  giaTriNhap_So?: number;
  giaTriNhap_Chu?: string;
  diem_Si_DatDuoc?: number;
  hanhDongKhuyenCao?: string | null;
  danhSachInput?: ChiTietInputValueRaw[];
};

const toChiTietKiemTra = (raw: ChiTietKiemTraRaw): ChiTietKiemTra => ({
  ID_ChiTiet:      Number(raw.ID_ChiTiet ?? raw.iD_ChiTiet ?? 0),
  IDPhieu:         Number(raw.IDPhieu    ?? raw.idPhieu    ?? 0),
  ID_ChiTieu:      Number(raw.ID_ChiTieu ?? raw.iD_ChiTieu ?? 0),
  TenChiTieu:      raw.TenChiTieu      ?? raw.tenChiTieu,
  ID_NhomChiTieu:  raw.ID_NhomChiTieu  ?? raw.iD_NhomChiTieu,
  TenNhom:         raw.TenNhom         ?? raw.tenNhom,
  GiaTriNhap_So:   raw.GiaTriNhap_So   ?? raw.giaTriNhap_So,
  GiaTriNhap_Chu:  raw.GiaTriNhap_Chu  ?? raw.giaTriNhap_Chu,
  Diem_Si_DatDuoc: raw.Diem_Si_DatDuoc ?? raw.diem_Si_DatDuoc,
  HanhDongKhuyenCao: raw.HanhDongKhuyenCao ?? raw.hanhDongKhuyenCao ?? null,
  GhiChu:          raw.GhiChu          ?? raw.ghiChu,
  DanhSachInput:   (raw.DanhSachInput ?? raw.danhSachInput)?.map(toInputValue),
});

const toLichSuChiTieu = (raw: LichSuChiTieuRaw): LichSuChiTieu => ({
  ID_Phieu:        Number(raw.ID_Phieu ?? raw.iD_Phieu ?? 0),
  NgayKiemTra:     raw.NgayKiemTra     ?? raw.ngayKiemTra     ?? '',
  GiaTriNhap_So:   raw.GiaTriNhap_So   ?? raw.giaTriNhap_So,
  GiaTriNhap_Chu:  raw.GiaTriNhap_Chu  ?? raw.giaTriNhap_Chu,
  Diem_Si_DatDuoc: raw.Diem_Si_DatDuoc ?? raw.diem_Si_DatDuoc,
  HanhDongKhuyenCao: raw.HanhDongKhuyenCao ?? raw.hanhDongKhuyenCao ?? null,
  DanhSachInput:   (raw.DanhSachInput ?? raw.danhSachInput)?.map(toInputValue),
});

const toPhieu = (raw: PhieuKiemTraRaw): PhieuKiemTra => ({
  ID_Phieu:        Number(raw.ID_Phieu        ?? raw.iD_Phieu        ?? 0),
  ID_ThietBi:      Number(raw.ID_ThietBi      ?? raw.iD_ThietBi      ?? 0),
  TenThietBi:      raw.TenThietBi      ?? raw.tenThietBi,
  ID_Tram:         raw.ID_Tram         != null ? Number(raw.ID_Tram)
                 : raw.iD_Tram         != null ? Number(raw.iD_Tram)
                 : undefined,
  TenTram:         raw.TenTram         ?? raw.tenTram,
  ID_LoaiTB:       raw.ID_LoaiTB       != null ? Number(raw.ID_LoaiTB)
                 : raw.iD_LoaiTB       != null ? Number(raw.iD_LoaiTB)
                 : undefined,
  TenLoaiTB:       raw.TenLoaiTB       ?? raw.tenLoaiTB,
  ID_NganLo:       raw.ID_NganLo       != null ? Number(raw.ID_NganLo)
                 : raw.iD_NganLo       != null ? Number(raw.iD_NganLo)
                 : null,
  TenNganLo:       raw.TenNganLo       ?? raw.tenNganLo ?? null,
  ID_NhomChiTieu:  raw.ID_NhomChiTieu  != null ? Number(raw.ID_NhomChiTieu)
                 : raw.iD_NhomChiTieu  != null ? Number(raw.iD_NhomChiTieu)
                 : undefined,
  TenNhom:         raw.TenNhom         ?? raw.tenNhom,
  NgayKiemTra:     raw.NgayKiemTra     ?? raw.ngayKiemTra     ?? '',
  NguoiKiemTra:    raw.NguoiKiemTra    ?? raw.nguoiKiemTra,
  TongDiem_Soqt:   raw.TongDiem_Soqt   ?? raw.tongDiem_Soqt,
  CapDoCanhBao:    raw.CapDoCanhBao    ?? raw.capDoCanhBao,
  GhiChuChung:     raw.GhiChuChung     ?? raw.ghiChuChung,
});

type PhieuKiemTraDetailRaw = PhieuKiemTraRaw & { chiTiets?: ChiTietKiemTraRaw[] };

const toPhieuDetail = (raw: PhieuKiemTraDetailRaw): PhieuKiemTraDetailDto => ({
  ...toPhieu(raw),
  ChiTiets: (raw.chiTiets ?? []).map(toChiTietKiemTra),
});

type PagedRaw = PagedResult<PhieuKiemTraRaw>;

/** Bộ lọc dùng chung cho danh sách kết quả kiểm tra (trang Kết quả) — đẩy xuống BE thay vì tự lọc
 * trên toàn bộ dữ liệu đã tải về. tuNgay/denNgay: chuỗi ngày (vd 'YYYY-MM-DD'), BE tự so theo NGÀY
 * LỊCH (không cần tính start/end-of-day phía FE). */
export interface PhieuKiemTraFilterParams {
  search?: string;
  idTram?: number;
  idLoaiTB?: number;
  idThietBi?: number;
  tuNgay?: string;
  denNgay?: string;
}

function buildQuery(params?: PhieuKiemTraFilterParams & { page?: number; pageSize?: number }): string {
  if (!params) return '';
  const p = new URLSearchParams();
  if (params.search   !== undefined) p.set('search',   params.search);
  if (params.idTram    !== undefined) p.set('idTram',    String(params.idTram));
  if (params.idLoaiTB  !== undefined) p.set('idLoaiTB',  String(params.idLoaiTB));
  if (params.idThietBi !== undefined) p.set('idThietBi', String(params.idThietBi));
  if (params.tuNgay    !== undefined) p.set('tuNgay',    params.tuNgay);
  if (params.denNgay   !== undefined) p.set('denNgay',   params.denNgay);
  if (params.page     !== undefined) p.set('page',     String(params.page));
  if (params.pageSize !== undefined) p.set('pageSize', String(params.pageSize));
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const phieuKiemTraApi = {
  getAll: async (params?: PhieuKiemTraFilterParams & { page?: number; pageSize?: number }) => {
    const res = await api.get<PhieuKiemTraRaw[] | PagedRaw>(`${BASE}/get-all-phieukiemtra${buildQuery(params)}`);
    const items = Array.isArray(res) ? res : res.items;
    return items.map(toPhieu);
  },
  getPaged: async (params?: PhieuKiemTraFilterParams & { page?: number; pageSize?: number }): Promise<PagedResult<PhieuKiemTra>> => {
    const res = await api.get<PagedRaw>(`${BASE}/get-all-phieukiemtra${buildQuery(params)}`);
    return { ...res, items: res.items.map(toPhieu) };
  },
  /** Phiếu mới nhất của mỗi thiết bị, trong tập đã lọc — tính sẵn ở BE (GROUP BY + MAX(ID_Phieu)). */
  getLatestPerThietBi: async (params?: PhieuKiemTraFilterParams): Promise<PhieuKiemTra[]> =>
    (await api.get<PhieuKiemTraRaw[]>(`${BASE}/latest-per-thietbi${buildQuery(params)}`)).map(toPhieu),
  getByThietBi: async (id: number) =>
    (await api.get<PhieuKiemTraRaw[]>(`${BASE}/by-thietbi/${id}`)).map(toPhieu),
  getByNganLo: async (id: number) =>
    (await api.get<PhieuKiemTraRaw[]>(`${BASE}/by-nganlo/${id}`)).map(toPhieu),
  getByNgay: async (tuNgay: string, denNgay: string) =>
    (await api.get<PhieuKiemTraRaw[]>(`${BASE}/by-ngay?tuNgay=${tuNgay}&denNgay=${denNgay}`)).map(toPhieu),
  getById:   async (id: number) => toPhieu(await api.get<PhieuKiemTraRaw>(`${BASE}/${id}`)),
  getDetail: async (id: number) => toPhieuDetail(await api.get<PhieuKiemTraDetailRaw>(`${BASE}/${id}/detail`)),
  getLichSuChiTieu: async (idThietBi: number, idChiTieu: number) =>
    (await api.get<LichSuChiTieuRaw[]>(`${BASE}/lich-su-chi-tieu/${idThietBi}/${idChiTieu}`)).map(toLichSuChiTieu),
  create:    async (dto: CreatePhieuKiemTraDto) => toPhieu(await api.post<PhieuKiemTraRaw>(`${BASE}/create-phieukiemtra`, dto)),
  update:    async (id: number, dto: UpdatePhieuKiemTraDto) => toPhieu(await api.put<PhieuKiemTraRaw>(`${BASE}/${id}`, dto)),
  delete:    (id: number) => api.delete(`${BASE}/${id}`),
};
