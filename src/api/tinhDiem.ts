import { api } from './client';
import type { KetQuaNhom, TinhDiemCayResult, NhapPhieuRequest, NhapPhieuResponse, ChiTietKiemTra } from '../types/entities';

const BASE = '/api/phieu-kiem-tra';
const BASE_CT = '/api/chi-tiet-kiem-tra';

type TinhDiemNhomRaw = { IDPhieu?: number; iDPhieu?: number; ID_NhomChiTieu?: number; iD_NhomChiTieu?: number; Diem?: number; diem?: number };
const toTinhDiemNhom = (r: TinhDiemNhomRaw) => ({
  IDPhieu:        Number(r.IDPhieu ?? r.iDPhieu ?? 0),
  ID_NhomChiTieu: Number(r.ID_NhomChiTieu ?? r.iD_NhomChiTieu ?? 0),
  Diem:           Number(r.Diem ?? r.diem ?? 0),
});

type KetQuaNhomRaw = Partial<KetQuaNhom> & {
  iD_NhomChiTieu?: number; tenNhom?: string; loaiNhom?: string; capDo?: number;
  diem?: number; bienDaBind?: string | null; thoiGianTinh?: string; nhomCon?: KetQuaNhomRaw[];
};
const toKetQuaNhom = (r: KetQuaNhomRaw): KetQuaNhom => ({
  ID_NhomChiTieu: Number(r.ID_NhomChiTieu ?? r.iD_NhomChiTieu ?? 0),
  TenNhom:        r.TenNhom ?? r.tenNhom ?? '',
  LoaiNhom:       r.LoaiNhom ?? r.loaiNhom ?? '',
  CapDo:          Number(r.CapDo ?? r.capDo ?? 0),
  Diem:           Number(r.Diem ?? r.diem ?? 0),
  BienDaBind:     r.BienDaBind ?? r.bienDaBind ?? null,
  ThoiGianTinh:   r.ThoiGianTinh ?? r.thoiGianTinh ?? '',
  NhomCon:        (r.NhomCon ?? r.nhomCon ?? []).map(toKetQuaNhom),
});

type TinhDiemCayResultRaw = { IDPhieu?: number; iDPhieu?: number; KetQuaCay?: KetQuaNhomRaw[]; ketQuaCay?: KetQuaNhomRaw[] };
const toTinhDiemCayResult = (r: TinhDiemCayResultRaw): TinhDiemCayResult => ({
  IDPhieu:   Number(r.IDPhieu ?? r.iDPhieu ?? 0),
  KetQuaCay: (r.KetQuaCay ?? r.ketQuaCay ?? []).map(toKetQuaNhom),
});

type ChiTietKiemTraRaw = Partial<ChiTietKiemTra> & {
  iD_ChiTiet?: number; iDPhieu?: number; iD_ChiTieu?: number; tenChiTieu?: string;
  giaTriNhap_So?: number; giaTriNhap_Chu?: string; diem_Si_DatDuoc?: number; ghiChu?: string;
};
const toChiTietKiemTra = (r: ChiTietKiemTraRaw): ChiTietKiemTra => ({
  ID_ChiTiet:      Number(r.ID_ChiTiet ?? r.iD_ChiTiet ?? 0),
  IDPhieu:         Number(r.IDPhieu ?? r.iDPhieu ?? 0),
  ID_ChiTieu:      Number(r.ID_ChiTieu ?? r.iD_ChiTieu ?? 0),
  TenChiTieu:      r.TenChiTieu ?? r.tenChiTieu,
  GiaTriNhap_So:   r.GiaTriNhap_So ?? r.giaTriNhap_So,
  GiaTriNhap_Chu:  r.GiaTriNhap_Chu ?? r.giaTriNhap_Chu,
  Diem_Si_DatDuoc: r.Diem_Si_DatDuoc ?? r.diem_Si_DatDuoc,
  GhiChu:          r.GhiChu ?? r.ghiChu,
});

type NhapPhieuResponseRaw = {
  KetQuaNhap?: ChiTietKiemTraRaw[]; ketQuaNhap?: ChiTietKiemTraRaw[];
  KetQuaTinhDiem?: KetQuaNhomRaw | null; ketQuaTinhDiem?: KetQuaNhomRaw | null;
  TongDiem_Soqt?: number | null; tongDiem_Soqt?: number | null;
  CanhBaoTongDiem?: string | null; canhBaoTongDiem?: string | null;
};
const toNhapPhieuResponse = (r: NhapPhieuResponseRaw): NhapPhieuResponse => ({
  KetQuaNhap:      (r.KetQuaNhap ?? r.ketQuaNhap ?? []).map(toChiTietKiemTra),
  KetQuaTinhDiem:  (r.KetQuaTinhDiem ?? r.ketQuaTinhDiem) ? toKetQuaNhom((r.KetQuaTinhDiem ?? r.ketQuaTinhDiem)!) : null,
  TongDiem_Soqt:   r.TongDiem_Soqt ?? r.tongDiem_Soqt ?? null,
  CanhBaoTongDiem: r.CanhBaoTongDiem ?? r.canhBaoTongDiem ?? null,
});

export const tinhDiemApi = {
  tinhDiemNhom: async (idPhieu: number, idNhom: number) =>
    toTinhDiemNhom(await api.get<TinhDiemNhomRaw>(`${BASE}/tinh-diem-nhom/${idNhom}/${idPhieu}`)),

  tinhChiSoSucKhoe: async (idPhieu: number, idLoaiThietBi: number) =>
    toTinhDiemCayResult(await api.get<TinhDiemCayResultRaw>(
      `${BASE}/tinh-chi-so-suc-khoe/${idPhieu}?idLoaiThietBi=${idLoaiThietBi}`
    )),

  /** Tính lại CSSK đại diện cho phiếu và ghi vào PhieuKiemTra.TongDiem_Soqt. */
  tinhTongDiem: async (idPhieu: number) => {
    const r = await api.post<{ IDPhieu?: number; iDPhieu?: number; TongDiem_Soqt?: number | null; tongDiem_Soqt?: number | null }>(
      `${BASE}/tinh-tong-diem/${idPhieu}`, {}
    );
    return {
      IDPhieu: Number(r.IDPhieu ?? r.iDPhieu ?? 0),
      TongDiem_Soqt: r.TongDiem_Soqt ?? r.tongDiem_Soqt ?? null,
    };
  },

  nhapLieu: async (idPhieu: number, request: NhapPhieuRequest) =>
    toNhapPhieuResponse(await api.post<NhapPhieuResponseRaw>(`${BASE_CT}/phieu/${idPhieu}`, request)),
};

// Helper: tính điểm một nhóm và trả về cây con
export const tinhDiemNhomAsync = async (
  idPhieu: number,
  idNhom: number
): Promise<KetQuaNhom> => {
  const res = await tinhDiemApi.tinhDiemNhom(idPhieu, idNhom);
  return {
    ID_NhomChiTieu: res.ID_NhomChiTieu,
    TenNhom: '',
    LoaiNhom: 'COMPOSITE',
    CapDo: 0,
    Diem: res.Diem,
    ThoiGianTinh: new Date().toISOString(),
    NhomCon: [],
  };
};
