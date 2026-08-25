import { api } from './client';

export interface ThongKeTongHopDto {
  tongThietBi: number;
  thietBiTot: number;
  thietBiBinhThuong: number;
  thietBiChuY: number;
  thietBiCanhBao: number;
  thietBiNguyHiem: number;
  thietBiChuaKiemTra: number;
  tongPhieuThangNay: number;
  diemTrungBinh: number | null;
}

export interface LichSuCSSKDto {
  iD_Phieu: number;
  ngayKiemTra: string;
  tongDiem_Soqt: number | null;
  capDoCanhBao: string | null;
  nguoiKiemTra: string | null;
}

export interface BaoCaoTramItemDto {
  iDTram: number;
  tenTram: string;
  diaDiem: string | null;
  tongThietBi: number;
  daKiemTra: number;
  diemTrungBinh: number | null;
  totCount: number;
  binhThuongCount: number;
  chuYCount: number;
  canhBaoCount: number;
  nguHiemCount: number;
}

export interface CanhBaoThietBiDto {
  iD_ThietBi: number;
  tenThietBi: string;
  tenTram: string;
  kyHieu: string | null;
  iD_Phieu: number;
  ngayKiemTra: string;
  tongDiem_Soqt: number | null;
  capDoCanhBao: string;
  /** Điểm dùng để phân loại/sắp xếp/tô màu — luôn có giá trị, dùng thay tongDiem_Soqt khi cần
   * hiển thị màu/mức cho CẢ thiết bị không có CSSK tổng (nguonDiem='CHI_TIEU'). */
  diemHienThi: number;
  /** 'CSSK' = diemHienThi lấy từ tongDiem_Soqt; 'CHI_TIEU' = lấy từ Sᵢ thấp nhất 1 chỉ tiêu
   * (thiết bị theo quy trình không tính CHI cấp 1/2/3, vd DCL/TU/TI/CS). */
  nguonDiem: 'CSSK' | 'CHI_TIEU';
  /** Tên chỉ tiêu có Sᵢ thấp nhất — chỉ có giá trị khi nguonDiem='CHI_TIEU'. */
  tenChiTieuThapNhat: string | null;
}

const BASE = '/api/thongke';

export const thongKeApi = {
  getTongHop: () => api.get<ThongKeTongHopDto>(`${BASE}/tong-hop`),
  getLichSuThietBi: (idThietBi: number) =>
    api.get<LichSuCSSKDto[]>(`${BASE}/lich-su-thiet-bi/${idThietBi}`),
  getBaoCaoTram: () => api.get<BaoCaoTramItemDto[]>(`${BASE}/bao-cao-tram`),
  getCanhBao: () => api.get<CanhBaoThietBiDto[]>(`${BASE}/canh-bao`),
};
