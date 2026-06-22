import { api } from './client';
import type { KetQuaNhom, TinhDiemCayResult, NhapPhieuRequest, NhapPhieuResponse } from '../types/entities';

const BASE = '/api/phieu-kiem-tra';
const BASE_CT = '/api/chi-tiet-kiem-tra';

export const tinhDiemApi = {
  tinhDiemNhom: (idPhieu: number, idNhom: number) =>
    api.get<{ IDPhieu: number; ID_NhomChiTieu: number; Diem: number }>(
      `${BASE}/${idPhieu}/tinh-diem-nhom/${idNhom}`
    ),

  tinhChiSoSucKhoe: (idPhieu: number, idLoaiThietBi: number) =>
    api.get<TinhDiemCayResult>(
      `${BASE}/${idPhieu}/tinh-chi-so-suc-khoe?idLoaiThietBi=${idLoaiThietBi}`
    ),

  nhapLieu: (idPhieu: number, request: NhapPhieuRequest) =>
    api.post<NhapPhieuResponse>(`${BASE_CT}/phieu/${idPhieu}`, request),
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
