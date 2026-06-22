import { api } from './client';
import type {
  CongThucTongHop, CreateCongThucTongHopDto, UpdateCongThucTongHopDto,
  CongThucBien, CreateCongThucBienDto, UpdateCongThucBienDto,
} from '../types/entities';

const BASE_CT = '/api/cong-thuc-tong-hop';
const BASE_CB = '/api/cong-thuc-bien';

export const congThucTongHopApi = {
  getByNhom:    (idNhom: number) => api.get<CongThucTongHop[]>(`${BASE_CT}/by-nhom/${idNhom}`),
  getActive:    (idNhom: number) => api.get<CongThucTongHop>(`${BASE_CT}/by-nhom/${idNhom}/active`),
  getById:      (id: number)     => api.get<CongThucTongHop>(`${BASE_CT}/${id}`),
  create:       (dto: CreateCongThucTongHopDto) => api.post<CongThucTongHop>(BASE_CT, dto),
  update:       (id: number, dto: UpdateCongThucTongHopDto) => api.put<CongThucTongHop>(`${BASE_CT}/${id}`, dto),
  delete:       (id: number) => api.delete(`${BASE_CT}/${id}`),
};

export const congThucBienApi = {
  getByCongThuc: (idCongThuc: number) => api.get<CongThucBien[]>(`${BASE_CB}/by-congthuc/${idCongThuc}`),
  getById:       (id: number)          => api.get<CongThucBien>(`${BASE_CB}/${id}`),
  create:        (dto: CreateCongThucBienDto) => api.post<CongThucBien>(BASE_CB, dto),
  update:        (id: number, dto: UpdateCongThucBienDto) => api.put<CongThucBien>(`${BASE_CB}/${id}`, dto),
  delete:        (id: number) => api.delete(`${BASE_CB}/${id}`),
};
