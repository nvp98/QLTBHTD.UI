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
  nguonDiem: 'CSSK' | 'CHI_TIEU' | 'CHI_TIEU_RIENG';
  /** Tên chỉ tiêu có Sᵢ thấp nhất — chỉ có giá trị khi nguonDiem='CHI_TIEU'. */
  tenChiTieuThapNhat: string | null;
  /** Khuyến cáo hành động (snapshot) của chỉ tiêu có Sᵢ thấp nhất trong phiếu — biết ngay cần làm gì. */
  khuyenCaoHanhDong: string | null;
}

export interface TongHopTheoLoaiDto {
  iD_LoaiTB: number;
  tenLoaiTB: string;
  kyHieu: string | null;
  tongThietBi: number;
  daKiemTra: number;
  diemTrungBinh: number | null;
  totCount: number;
  binhThuongCount: number;
  chuYCount: number;
  canhBaoCount: number;
  nguHiemCount: number;
}

export interface XuHuongThangDto {
  /** Định dạng "yyyy-MM". */
  thang: string;
  diemTrungBinh: number | null;
  soPhieu: number;
}

const BASE = '/api/thongke';

export const thongKeApi = {
  getTongHop: () => api.get<ThongKeTongHopDto>(`${BASE}/tong-hop`),
  getLichSuThietBi: (idThietBi: number) =>
    api.get<LichSuCSSKDto[]>(`${BASE}/lich-su-thiet-bi/${idThietBi}`),
  getBaoCaoTram: () => api.get<BaoCaoTramItemDto[]>(`${BASE}/bao-cao-tram`),
  getTongHopTheoLoai: () => api.get<TongHopTheoLoaiDto[]>(`${BASE}/tong-hop-theo-loai`),
  getCanhBao: () => api.get<CanhBaoThietBiDto[]>(`${BASE}/canh-bao`),
  getXuHuongThang: (
    soThang = 6, idTram?: number | null, idLoaiTB?: number | null, idThietBi?: number | null,
  ) => {
    const params = new URLSearchParams({ soThang: String(soThang) });
    if (idTram)    params.set('idTram',    String(idTram));
    if (idLoaiTB)  params.set('idLoaiTB',  String(idLoaiTB));
    if (idThietBi) params.set('idThietBi', String(idThietBi));
    return api.get<XuHuongThangDto[]>(`${BASE}/xu-huong-thang?${params.toString()}`);
  },
};
