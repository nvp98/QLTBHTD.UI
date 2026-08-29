import { api } from './client';
import type { ChiTieuRule, CreateChiTieuRuleDto, UpdateChiTieuRuleDto } from '../types/entities';

const BASE = '/api/chitieu-rule';

type RawRule = Partial<ChiTieuRule> & {
  iD_Rule?: number;
  iD_ChiTieu?: number;
  tenMuc?: string;
  diem_Si?: number;
  bieuThuc?: string;
  loaiRule?: string;
  hanhDongKhuyenCao?: string | null;
};

const toRule = (r: RawRule): ChiTieuRule => ({
  ID_Rule:    Number(r.ID_Rule    ?? r.iD_Rule    ?? 0),
  ID_ChiTieu: Number(r.ID_ChiTieu ?? r.iD_ChiTieu ?? 0),
  TenMuc:     r.TenMuc   ?? r.tenMuc   ?? '',
  Diem_Si:    Number(r.Diem_Si   ?? r.diem_Si   ?? 0),
  BieuThuc:   r.BieuThuc ?? r.bieuThuc ?? '',
  LoaiRule:   r.LoaiRule ?? r.loaiRule ?? 'BANG_MUC',
  HanhDongKhuyenCao: r.HanhDongKhuyenCao ?? r.hanhDongKhuyenCao ?? null,
});

export const chiTieuRuleApi = {
  getByChiTieu: async (id: number) =>
    (await api.get<RawRule[]>(`${BASE}/by-chitieu/${id}`)).map(toRule),

  getById: async (id: number) =>
    toRule(await api.get<RawRule>(`${BASE}/${id}`)),

  create: async (dto: CreateChiTieuRuleDto) =>
    toRule(await api.post<RawRule>(`${BASE}/create-chitieurule`, dto)),

  update: async (id: number, dto: UpdateChiTieuRuleDto) =>
    toRule(await api.put<RawRule>(`${BASE}/${id}`, dto)),

  delete: (id: number) => api.delete(`${BASE}/${id}`),
};
