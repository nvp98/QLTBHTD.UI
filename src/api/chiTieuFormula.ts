import { api } from './client';
import type {
  ChiTieuFormula, CreateChiTieuFormulaDto, UpdateChiTieuFormulaDto,
  ChiTieuFormulaThamSo, CreateChiTieuFormulaThamSoDto, UpdateChiTieuFormulaThamSoDto,
} from '../types/entities';

const BASE = '/api/chitieu-formula';
const BASE_THAMSO = '/api/chitieu-formula-thamso';

type RawFormula = Partial<ChiTieuFormula> & {
  iD_Formula?: number; iD_ChiTieu?: number; maKetQua?: string; thuTu?: number;
  loaiFormula?: string; bieuThuc?: string | null; tenFunction?: string | null;
  trangThai?: number; moTa?: string | null;
};

const toFormula = (r: RawFormula): ChiTieuFormula => ({
  ID_Formula:  Number(r.ID_Formula  ?? r.iD_Formula  ?? 0),
  ID_ChiTieu:  Number(r.ID_ChiTieu  ?? r.iD_ChiTieu  ?? 0),
  MaKetQua:    r.MaKetQua    ?? r.maKetQua    ?? '',
  ThuTu:       Number(r.ThuTu ?? r.thuTu ?? 0),
  LoaiFormula: r.LoaiFormula ?? r.loaiFormula ?? 'NCALC',
  BieuThuc:    r.BieuThuc    ?? r.bieuThuc    ?? null,
  TenFunction: r.TenFunction ?? r.tenFunction ?? null,
  TrangThai:   Number(r.TrangThai ?? r.trangThai ?? 1),
  MoTa:        r.MoTa ?? r.moTa ?? null,
});

type RawThamSo = Partial<ChiTieuFormulaThamSo> & {
  iD_ThamSo?: number; iD_Formula?: number; maThamSo?: string; nguonGiaTri?: string;
  maInput?: string | null; iD_FormulaNguon?: number | null; iD_ChiTieuNguon?: number | null;
  tenThuocTinhTB?: string | null; giaTriHangSo?: number | null;
};

const toThamSo = (r: RawThamSo): ChiTieuFormulaThamSo => ({
  ID_ThamSo:       Number(r.ID_ThamSo  ?? r.iD_ThamSo  ?? 0),
  ID_Formula:      Number(r.ID_Formula ?? r.iD_Formula ?? 0),
  MaThamSo:        r.MaThamSo    ?? r.maThamSo    ?? '',
  NguonGiaTri:     r.NguonGiaTri ?? r.nguonGiaTri ?? 'HANGSO',
  MaInput:         r.MaInput ?? r.maInput ?? null,
  ID_FormulaNguon: r.ID_FormulaNguon ?? r.iD_FormulaNguon ?? null,
  ID_ChiTieuNguon: r.ID_ChiTieuNguon ?? r.iD_ChiTieuNguon ?? null,
  TenThuocTinhTB:  r.TenThuocTinhTB ?? r.tenThuocTinhTB ?? null,
  GiaTriHangSo:    r.GiaTriHangSo ?? r.giaTriHangSo ?? null,
});

export const chiTieuFormulaApi = {
  getByChiTieu: async (id: number) =>
    (await api.get<RawFormula[]>(`${BASE}/by-chitieu/${id}`)).map(toFormula),
  getById: async (id: number) => toFormula(await api.get<RawFormula>(`${BASE}/${id}`)),
  create: async (dto: CreateChiTieuFormulaDto) => toFormula(await api.post<RawFormula>(BASE, dto)),
  update: async (id: number, dto: UpdateChiTieuFormulaDto) => toFormula(await api.put<RawFormula>(`${BASE}/${id}`, dto)),
  delete: (id: number) => api.delete(`${BASE}/${id}`),
};

export const chiTieuFormulaThamSoApi = {
  getByFormula: async (id: number) =>
    (await api.get<RawThamSo[]>(`${BASE_THAMSO}/by-formula/${id}`)).map(toThamSo),
  getById: async (id: number) => toThamSo(await api.get<RawThamSo>(`${BASE_THAMSO}/${id}`)),
  create: async (dto: CreateChiTieuFormulaThamSoDto) => toThamSo(await api.post<RawThamSo>(BASE_THAMSO, dto)),
  update: async (id: number, dto: UpdateChiTieuFormulaThamSoDto) => toThamSo(await api.put<RawThamSo>(`${BASE_THAMSO}/${id}`, dto)),
  delete: (id: number) => api.delete(`${BASE_THAMSO}/${id}`),
};
