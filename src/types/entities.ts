// ─── Pagination ───────────────────────────────────────────────────────────────
export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Khu Vực ──────────────────────────────────────────────────────────────
export interface KhuVuc {
  ID_KhuVuc: number;
  TenKhuVuc: string;
  TrangThai: number;
}
export interface CreateKhuVucDto   { TenKhuVuc: string; TrangThai: number }
export interface UpdateKhuVucDto   { TenKhuVuc: string; TrangThai: number }

// ─── Loại Thiết Bị ────────────────────────────────────────────────────────
export interface LoaiThietBi {
  ID_LoaiThietBi: number;
  TenLoaiTB: string;
  KyHieu: string;
  TrangThai: number;
}
export interface CreateLoaiThietBiDto { TenLoaiTB: string; KyHieu: string; TrangThai: number }
export interface UpdateLoaiThietBiDto { TenLoaiTB: string; KyHieu: string; TrangThai: number }

// ─── Trạm Điện ────────────────────────────────────────────────────────────
export interface TramDien {
  IDTram: number;
  IDKhuVuc: number;
  TenKhuVuc?: string;
  TenTram: string;
  DiaDiem?: string;
  TrangThai: number;
}
export interface CreateTramDienDto { IDKhuVuc: number; TenTram: string; DiaDiem?: string; TrangThai: number }
export interface UpdateTramDienDto { IDKhuVuc: number; TenTram: string; DiaDiem?: string; TrangThai: number }

// ─── Thiết Bị ─────────────────────────────────────────────────────────────
export interface ThietBi {
  ID_ThietBi: number;
  ID_Tram: number;
  TenTram?: string;
  ID_LoaiTB: number;
  TenLoaiTB?: string;
  KyHieu?: string;
  TenThietBi: string;
  SoHieu?: string;
  NhanHieu?: string;
  NamSanXuat?: number;
  TrangThai: number;
  GhiChu?: string;
}
export interface CreateThietBiDto {
  ID_Tram: number; ID_LoaiTB: number; TenThietBi: string;
  SoHieu?: string; NhanHieu?: string; NamSanXuat?: number; TrangThai: number; GhiChu?: string;
}
export interface UpdateThietBiDto extends CreateThietBiDto {}

// ─── Nhóm Chỉ Tiêu ────────────────────────────────────────────────────────
export interface NhomChiTieu {
  ID_NhomChiTieu: number;
  TenNhom: string;
  ID_LoaiThietBi: number;
  TenLoaiThietBi?: string;
  PhienBan: number;
  TrangThai: number;
}
export interface CreateNhomChiTieuDto { TenNhom: string; ID_LoaiThietBi: number; PhienBan: number; TrangThai: number }
export interface UpdateNhomChiTieuDto extends CreateNhomChiTieuDto {}

// ─── Chỉ Tiêu ─────────────────────────────────────────────────────────────
export interface ChiTieu {
  ID_ChiTieu: number;
  ID_NhomChiTieu: number;
  TenNhom?: string;
  ID_LoaiThietBi?: number;
  TenChiTieu: string;
  TrongSo_Wi: number;
  TrangThai: number;
  /** 'Nguong' | 'Rule' — null/undefined = 'Nguong' */
  LoaiTinhDiem?: string | null;
}
export interface CreateChiTieuDto { ID_NhomChiTieu: number; TenChiTieu: string; TrongSo_Wi: number; TrangThai: number; LoaiTinhDiem?: string | null }
export interface UpdateChiTieuDto extends CreateChiTieuDto {}

// ─── Chỉ Tiêu Input (biến đầu vào) ───────────────────────────────────────
export interface ChiTieuInput {
  ID_Input:    number;
  ID_ChiTieu:  number;
  MaInput:     string;
  TenInput:    string;
  MaOutput?:   string | null;
}
export interface CreateChiTieuInputDto { ID_ChiTieu: number; MaInput: string; TenInput: string }
export interface UpdateChiTieuInputDto extends CreateChiTieuInputDto {}

// ─── Chỉ Tiêu Rule (quy tắc biểu thức) ──────────────────────────────────
export interface ChiTieuRule {
  ID_Rule:    number;
  ID_ChiTieu: number;
  TenMuc:     string;
  Diem_Si:    number;
  BieuThuc:   string;
}
export interface CreateChiTieuRuleDto { ID_ChiTieu: number; TenMuc: string; Diem_Si: number; BieuThuc: string }
export interface UpdateChiTieuRuleDto extends CreateChiTieuRuleDto {}

// ─── Ngưỡng ───────────────────────────────────────────────────────────────
export interface Nguong {
  ID_Nguong: number;
  ID_ChiTieu: number;
  TenChiTieu?: string;
  CanTren: number | null;
  CanDuoi: number | null;
  Diem_Si: number;
  CanDuoi_BaoGom: boolean;
  CanTren_BaoGom: boolean;
  /** Biểu thức NCalc (AND/OR). Nếu có, ưu tiên hơn CanDuoi/CanTren. */
  BieuThuc_Logic?: string | null;
}
export interface CreateNguongDto {
  ID_ChiTieu: number;
  CanTren: number | null;
  CanDuoi: number | null;
  Diem_Si: number;
  CanDuoi_BaoGom: boolean;
  CanTren_BaoGom: boolean;
  BieuThuc_Logic?: string | null;
}
export interface UpdateNguongDto extends CreateNguongDto {}

// ─── Phiếu Kiểm Tra ───────────────────────────────────────────────────────
export interface PhieuKiemTra {
  ID_Phieu: number;
  ID_ThietBi: number;
  TenThietBi?: string;
  ID_NhomChiTieu?: number;
  TenNhom?: string;
  NgayKiemTra: string;
  NguoiKiemTra?: string;
  TongDiem_Soqt?: number;
  CapDoCanhBao?: string;
  GhiChuChung?: string;
}

export interface PhieuKiemTraDetailDto extends PhieuKiemTra {
  ChiTiets: ChiTietKiemTra[];
}

export interface CreatePhieuKiemTraDto {
  ID_ThietBi: number;
  /** Nhóm chỉ tiêu cần đo. undefined/null = kiểm tra toàn diện. */
  ID_NhomChiTieu?: number;
  NgayKiemTra: string;
  NguoiKiemTra?: string;
  GhiChuChung?: string;
  ChiTiets: CreateChiTietKiemTraDto[];
}

export interface UpdatePhieuKiemTraDto {
  ID_ThietBi: number;
  ID_NhomChiTieu?: number;
  NgayKiemTra: string;
  NguoiKiemTra?: string;
  GhiChuChung?: string;
}

// ─── Chi Tiết Kiểm Tra ────────────────────────────────────────────────────
export interface ChiTietKiemTra {
  ID_ChiTiet: number;
  IDPhieu: number;
  ID_ChiTieu: number;
  TenChiTieu?: string;
  GiaTriNhap_So?: number;
  GiaTriNhap_Chu?: string;
  Diem_Si_DatDuoc?: number;
  GhiChu?: string;
}

export interface CreateChiTietKiemTraDto {
  ID_ChiTieu: number;
  GiaTriNhap_So?: number;
  GiaTriNhap_Chu?: string;
  GhiChu?: string;
}

export interface UpdateChiTietKiemTraDto extends CreateChiTietKiemTraDto {}

// ─── Nhóm Chỉ Tiêu (mở rộng với cây phân cấp) ───────────────────────────────
export interface NhomChiTieuV2 extends NhomChiTieu {
  ID_NhomCha?: number | null;
  CapDo: number;
  LoaiNhom: 'LEAF' | 'COMPOSITE';
  CoCongThuc: boolean;
}

export interface NhomChiTieuCay extends NhomChiTieuV2 {
  NhomCon: NhomChiTieuCay[];
}

export interface CreateNhomChiTieuV2Dto extends CreateNhomChiTieuDto {
  ID_NhomCha?: number | null;
  CapDo?: number;
  LoaiNhom?: string;
}

export interface UpdateNhomChiTieuV2Dto extends UpdateNhomChiTieuDto {
  ID_NhomCha?: number | null;
  CapDo?: number;
  LoaiNhom?: string;
}

// ─── Ngưỡng (mở rộng với ThuTu) ─────────────────────────────────────────────
export interface NguongV2 extends Nguong {
  ThuTu: number;
}

export interface CreateNguongV2Dto extends CreateNguongDto {
  ThuTu?: number;
}

// ─── Công Thức Tổng Hợp ──────────────────────────────────────────────────────
export interface CongThucBien {
  ID_Bien: number;
  ID_CongThuc: number;
  MaBien: string;
  NguonBien: 'CHITIEU' | 'NHOM_CON' | 'HANGSO';
  ID_ChiTieuNguon?: number | null;
  TenChiTieu?: string | null;
  ID_NhomCon?: number | null;
  TenNhomCon?: string | null;
  GiaTriHangSo?: number | null;
  MoTa?: string | null;
}

export interface CongThucTongHop {
  ID_CongThuc: number;
  ID_NhomChiTieu: number;
  TenNhom: string;
  BieuThuc: string;
  LoaiCongThuc: string;
  PhienBan: number;
  TrangThai: number;
  ThangDiem_Min?: number | null;
  ThangDiem_Max?: number | null;
  MoTa?: string | null;
  DanhSachBien: CongThucBien[];
}

export interface CreateCongThucTongHopDto {
  ID_NhomChiTieu: number;
  BieuThuc: string;
  LoaiCongThuc?: string;
  PhienBan?: number;
  ThangDiem_Min?: number | null;
  ThangDiem_Max?: number | null;
  MoTa?: string | null;
}

export interface UpdateCongThucTongHopDto {
  BieuThuc: string;
  LoaiCongThuc?: string;
  TrangThai: number;
  ThangDiem_Min?: number | null;
  ThangDiem_Max?: number | null;
  MoTa?: string | null;
}

export interface CreateCongThucBienDto {
  ID_CongThuc: number;
  MaBien: string;
  NguonBien: 'CHITIEU' | 'NHOM_CON' | 'HANGSO';
  ID_ChiTieuNguon?: number | null;
  ID_NhomCon?: number | null;
  GiaTriHangSo?: number | null;
  MoTa?: string | null;
}

export interface UpdateCongThucBienDto {
  MaBien: string;
  NguonBien: 'CHITIEU' | 'NHOM_CON' | 'HANGSO';
  ID_ChiTieuNguon?: number | null;
  ID_NhomCon?: number | null;
  GiaTriHangSo?: number | null;
  MoTa?: string | null;
}

// ─── Kết quả tính điểm nhóm ──────────────────────────────────────────────────
export interface KetQuaNhom {
  ID_NhomChiTieu: number;
  TenNhom: string;
  LoaiNhom: string;
  CapDo: number;
  Diem: number;
  BienDaBind?: string | null;
  ThoiGianTinh: string;
  NhomCon: KetQuaNhom[];
}

export interface TinhDiemCayResult {
  IDPhieu: number;
  KetQuaCay: KetQuaNhom[];
}

// ─── Nhập liệu batch ─────────────────────────────────────────────────────────
export interface NhapChiTietDto {
  ID_ChiTieu: number;
  GiaTriNhap_So?: number | null;
  GiaTriNhap_Chu?: string | null;
  DanhSachInput?: Record<string, number>;
  GhiChu?: string | null;
}

export interface NhapPhieuRequest {
  DanhSachChiTieu: NhapChiTietDto[];
  TuDongTinhDiem?: boolean;
  ID_NhomChiTieuTinhDiem?: number | null;
}

export interface NhapPhieuResponse {
  KetQuaNhap: ChiTietKiemTra[];
  KetQuaTinhDiem?: KetQuaNhom | null;
}
