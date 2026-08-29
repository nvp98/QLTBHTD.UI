import { api } from './client';
import type { LichSuNhom, LichSuChiTieuCol, LichSuHang, LichSuGiaTri } from '../types/entities';

const BASE = '/api/lich-su';

type GiaTriRaw = Partial<LichSuGiaTri> & { giaTri?: number | null; si?: number | null };
type ColRaw = Partial<LichSuChiTieuCol> & { iD_ChiTieu?: number; tenChiTieu?: string };
type HangRaw = Partial<Omit<LichSuHang, 'GiaTriTheoChiTieu'>> & {
  iD_Phieu?: number;
  ngayKiemTra?: string;
  soPhieu?: string | null;
  diemNhom?: number | null;
  GiaTriTheoChiTieu?: Record<string, GiaTriRaw>;
  giaTriTheoChiTieu?: Record<string, GiaTriRaw>;
};
type LichSuRaw = Partial<Omit<LichSuNhom, 'ChiTieus' | 'Hang'>> & {
  iD_ThietBi?: number;
  tenThietBi?: string;
  iD_NhomChiTieu?: number;
  tenNhom?: string;
  ChiTieus?: ColRaw[];
  chiTieus?: ColRaw[];
  Hang?: HangRaw[];
  hang?: HangRaw[];
};

const toGiaTri = (r: GiaTriRaw): LichSuGiaTri => ({
  GiaTri: r.GiaTri ?? r.giaTri ?? null,
  Si: r.Si ?? r.si ?? null,
});

const toCol = (r: ColRaw): LichSuChiTieuCol => ({
  ID_ChiTieu: Number(r.ID_ChiTieu ?? r.iD_ChiTieu ?? 0),
  TenChiTieu: r.TenChiTieu ?? r.tenChiTieu ?? '',
});

const toHang = (r: HangRaw): LichSuHang => {
  const rawMap = r.GiaTriTheoChiTieu ?? r.giaTriTheoChiTieu ?? {};
  const map: Record<string, LichSuGiaTri> = {};
  for (const k of Object.keys(rawMap)) map[k] = toGiaTri(rawMap[k]);
  return {
    ID_Phieu:    Number(r.ID_Phieu ?? r.iD_Phieu ?? 0),
    NgayKiemTra: r.NgayKiemTra ?? r.ngayKiemTra ?? '',
    SoPhieu:     r.SoPhieu ?? r.soPhieu ?? null,
    DiemNhom:    r.DiemNhom ?? r.diemNhom ?? null,
    GiaTriTheoChiTieu: map,
  };
};

const toLichSu = (r: LichSuRaw): LichSuNhom => ({
  ID_ThietBi:     Number(r.ID_ThietBi ?? r.iD_ThietBi ?? 0),
  TenThietBi:     r.TenThietBi ?? r.tenThietBi ?? '',
  ID_NhomChiTieu: Number(r.ID_NhomChiTieu ?? r.iD_NhomChiTieu ?? 0),
  TenNhom:        r.TenNhom ?? r.tenNhom ?? '',
  ChiTieus: (r.ChiTieus ?? r.chiTieus ?? []).map(toCol),
  Hang:     (r.Hang ?? r.hang ?? []).map(toHang),
});

export const lichSuApi = {
  get: async (idThietBi: number, idNhomChiTieu: number) =>
    toLichSu(await api.get<LichSuRaw>(`${BASE}/${idThietBi}/${idNhomChiTieu}`)),
};
