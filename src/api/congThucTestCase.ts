import { api } from './client';
import type { CongThucTestCase, CreateCongThucTestCaseDto, UpdateCongThucTestCaseDto } from '../types/entities';

const BASE = '/api/cong-thuc-testcase';

type Raw = Partial<CongThucTestCase> & {
  iD_TestCase?: number;
  iD_CongThuc?: number;
  tenTestCase?: string;
  inputJson?: string;
  ketQuaMongDoi?: number;
  ketQuaThucTeLanCuoi?: number | null;
  datLanCuoi?: boolean | null;
  thoiGianChayCuoi?: string | null;
  loiLanCuoi?: string | null;
  moTa?: string | null;
};

const toTestCase = (r: Raw): CongThucTestCase => ({
  ID_TestCase:         Number(r.ID_TestCase ?? r.iD_TestCase ?? 0),
  ID_CongThuc:         Number(r.ID_CongThuc ?? r.iD_CongThuc ?? 0),
  TenTestCase:         r.TenTestCase ?? r.tenTestCase ?? '',
  InputJson:           r.InputJson ?? r.inputJson ?? '{}',
  KetQuaMongDoi:       Number(r.KetQuaMongDoi ?? r.ketQuaMongDoi ?? 0),
  KetQuaThucTeLanCuoi: r.KetQuaThucTeLanCuoi ?? r.ketQuaThucTeLanCuoi ?? null,
  DatLanCuoi:          r.DatLanCuoi ?? r.datLanCuoi ?? null,
  ThoiGianChayCuoi:    r.ThoiGianChayCuoi ?? r.thoiGianChayCuoi ?? null,
  LoiLanCuoi:          r.LoiLanCuoi ?? r.loiLanCuoi ?? null,
  MoTa:                r.MoTa ?? r.moTa ?? null,
});

export const congThucTestCaseApi = {
  getByCongThuc: async (idCongThuc: number) =>
    (await api.get<Raw[]>(`${BASE}/by-congthuc/${idCongThuc}`)).map(toTestCase),

  create: async (dto: CreateCongThucTestCaseDto) =>
    toTestCase(await api.post<Raw>(BASE, dto)),

  update: async (id: number, dto: UpdateCongThucTestCaseDto) =>
    toTestCase(await api.put<Raw>(`${BASE}/${id}`, dto)),

  delete: (id: number) => api.delete(`${BASE}/${id}`),

  run: async (idCongThuc: number) =>
    (await api.post<Raw[]>(`${BASE}/run/${idCongThuc}`, {})).map(toTestCase),
};
