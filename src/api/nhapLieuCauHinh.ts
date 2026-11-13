import { api } from './client';
import type { NhomChiTieu, ChiTieu, Nguong, ChiTieuInput, ChiTieuRule } from '../types/entities';
import { toNhomChiTieu } from './nhomChiTieu';
import { toChiTieu } from './chiTieu';
import { toNguong } from './nguong';
import { toInput } from './chiTieuInput';
import { toRule } from './chiTieuRule';

export interface NhapLieuChiTieu extends ChiTieu {
  nguongs: Nguong[];
  inputs: ChiTieuInput[];
  rules: ChiTieuRule[];
}

export interface NhapLieuNhom extends NhomChiTieu {
  chiTieus: NhapLieuChiTieu[];
}

export interface NhapLieuCauHinh {
  nhoms: NhapLieuNhom[];
  nhomKhaDung: NhomChiTieu[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export const nhapLieuCauHinhApi = {
  /** Toàn bộ cấu hình nhập liệu của 1 loại thiết bị trong 1 request (BE đã lọc nhóm/chỉ tiêu đang hoạt động). */
  get: async (idLoaiThietBi: number): Promise<NhapLieuCauHinh> => {
    const raw = await api.get<any>(`/api/nhap-lieu-cau-hinh/${idLoaiThietBi}`);
    return {
      nhomKhaDung: (raw.nhomKhaDung ?? []).map(toNhomChiTieu),
      nhoms: (raw.nhoms ?? []).map((n: any) => ({
        ...toNhomChiTieu(n),
        chiTieus: (n.chiTieus ?? []).map((c: any) => ({
          ...toChiTieu(c),
          nguongs: (c.nguongs ?? []).map(toNguong),
          inputs: (c.inputs ?? []).map(toInput),
          rules: (c.rules ?? []).map(toRule),
        })),
      })),
    };
  },
};
