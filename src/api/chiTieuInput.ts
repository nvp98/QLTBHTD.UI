import { api } from './client';
import type { ChiTieuInput, CreateChiTieuInputDto, UpdateChiTieuInputDto } from '../types/entities';

const BASE = '/api/chitieu-input';

type RawInput = Partial<ChiTieuInput> & {
  iD_Input?: number;
  iD_ChiTieu?: number;
  maInput?: string;
  tenInput?: string;
  nguonGiaTri?: string;
  iD_ChiTieuNguon?: number | null;
  tenChiTieuNguon?: string | null;
  maThongSoThietBi?: string | null;
};

const toInput = (r: RawInput): ChiTieuInput => ({
  ID_Input:   Number(r.ID_Input   ?? r.iD_Input   ?? 0),
  ID_ChiTieu: Number(r.ID_ChiTieu ?? r.iD_ChiTieu ?? 0),
  MaInput:    r.MaInput  ?? r.maInput  ?? '',
  TenInput:   r.TenInput ?? r.tenInput ?? '',
  NguonGiaTri:     r.NguonGiaTri ?? r.nguonGiaTri ?? 'MANUAL',
  ID_ChiTieuNguon: r.ID_ChiTieuNguon ?? r.iD_ChiTieuNguon ?? null,
  TenChiTieuNguon: r.TenChiTieuNguon ?? r.tenChiTieuNguon ?? null,
  MaThongSoThietBi: r.MaThongSoThietBi ?? r.maThongSoThietBi ?? null,
});

export const chiTieuInputApi = {
  getByChiTieu: async (id: number) =>
    (await api.get<RawInput[]>(`${BASE}/by-chitieu/${id}`)).map(toInput),

  getById: async (id: number) =>
    toInput(await api.get<RawInput>(`${BASE}/${id}`)),

  create: async (dto: CreateChiTieuInputDto) =>
    toInput(await api.post<RawInput>(`${BASE}/create-chitieuinput`, dto)),

  update: async (id: number, dto: UpdateChiTieuInputDto) =>
    toInput(await api.put<RawInput>(`${BASE}/${id}`, dto)),

  delete: (id: number) => api.delete(`${BASE}/${id}`),
};
