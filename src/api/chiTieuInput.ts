import { api } from './client';
import type { ChiTieuInput, CreateChiTieuInputDto, UpdateChiTieuInputDto } from '../types/entities';

const BASE = '/api/chitieu-input';

type RawInput = Partial<ChiTieuInput> & {
  iD_Input?: number;
  iD_ChiTieu?: number;
  maInput?: string;
  tenInput?: string;
};

const toInput = (r: RawInput): ChiTieuInput => ({
  ID_Input:   Number(r.ID_Input   ?? r.iD_Input   ?? 0),
  ID_ChiTieu: Number(r.ID_ChiTieu ?? r.iD_ChiTieu ?? 0),
  MaInput:    r.MaInput  ?? r.maInput  ?? '',
  TenInput:   r.TenInput ?? r.tenInput ?? '',
});

export const chiTieuInputApi = {
  getByChiTieu: async (id: number) =>
    (await api.get<RawInput[]>(`${BASE}/by-chitieu/${id}`)).map(toInput),

  getById: async (id: number) =>
    toInput(await api.get<RawInput>(`${BASE}/${id}`)),

  create: async (dto: CreateChiTieuInputDto) =>
    toInput(await api.post<RawInput>(BASE, dto)),

  update: async (id: number, dto: UpdateChiTieuInputDto) =>
    toInput(await api.put<RawInput>(`${BASE}/${id}`, dto)),

  delete: (id: number) => api.delete(`${BASE}/${id}`),
};
