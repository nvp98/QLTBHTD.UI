import { api } from './client';

/** Cây thiết bị do BE dựng sẵn: Khu vực → Trạm → Ngăn lộ → Loại → Thiết bị. */
export interface CayNode {
  key: string;
  /** kv | tram | nganlo | loai | tb */
  loai: 'kv' | 'tram' | 'nganlo' | 'loai' | 'tb';
  id: number;
  ten: string;
  trangThai?: number | null;
  soTram?: number | null;
  soThietBi: number;
  csskTrungBinh?: number | null;
  diem?: number | null;
  tenNganLo?: string | null;
  /** Cấp CSSK + nhãn do BE phân (chỉ node thiết bị). */
  capDo?: string | null;
  capDoLabel?: string | null;
  children: CayNode[];
}

export interface CayThietBiCssk {
  idThietBi: number;
  diem: number | null;
  capDo: 'tot' | 'kha' | 'trungBinh' | 'canhBao' | 'nguyHiem' | 'chuaDo';
  capDoLabel: string;
  idPhieu: number | null;
}

export interface CayThietBiResult {
  tongKhuVuc: number;
  tongTram: number;
  tongThietBi: number;
  csskCounts: Record<string, number>;
  thietBiCssk: CayThietBiCssk[];
  nodes: CayNode[];
}

export interface CayThietBiQuery {
  idKhuVuc?: number;
  idLoaiTB?: number;
  trangThai?: number;
  cssk?: string;
  search?: string;
  groupBy?: 'nganlo' | 'loai';
}

export const cayThietBiApi = {
  get: (q: CayThietBiQuery) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(q)) {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
    }
    const str = qs.toString();
    return api.get<CayThietBiResult>(`/api/cay-thiet-bi${str ? `?${str}` : ''}`);
  },
};
