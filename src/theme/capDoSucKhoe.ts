/**
 * Thang màu trạng thái CSSK dùng chung cho toàn app (thang điểm 0-10: ≥8 Tốt, ≥6 Khá,
 * ≥4 Trung bình, ≥2 Cảnh báo, <2 Nguy hiểm).
 *
 * Tách riêng bảng màu cho theme sáng/tối vì cùng 1 mã màu neon (vd #4ade80) đọc tốt
 * trên nền tối nhưng tương phản rất kém khi đặt trên nền trắng — không thể dùng chung
 * 1 bộ màu cho cả 2 theme.
 */

export type CapDoKey = 'tot' | 'kha' | 'trungBinh' | 'canhBao' | 'nguyHiem';

export interface CapDoInfo {
  key: CapDoKey | 'chuaTinh';
  label: string;
  /** Màu chữ/icon — đủ tương phản để dùng trực tiếp làm color trên nền Card/trang. */
  color: string;
  /** Nền nhạt cho badge/chip. */
  bg: string;
  border: string;
}

const LIGHT: Record<CapDoKey, CapDoInfo> = {
  tot:       { key: 'tot',       label: 'Tốt',        color: '#15803d', bg: '#dcfce7', border: '#86efac' },
  kha:       { key: 'kha',       label: 'Khá',         color: '#1d4ed8', bg: '#dbeafe', border: '#93c5fd' },
  trungBinh: { key: 'trungBinh', label: 'Trung bình',  color: '#a16207', bg: '#fef3c7', border: '#fcd34d' },
  canhBao:   { key: 'canhBao',   label: 'Cảnh báo',    color: '#c2410c', bg: '#ffedd5', border: '#fdba74' },
  nguyHiem:  { key: 'nguyHiem',  label: 'Nguy hiểm',   color: '#b91c1c', bg: '#fee2e2', border: '#fca5a5' },
};

const DARK: Record<CapDoKey, CapDoInfo> = {
  tot:       { key: 'tot',       label: 'Tốt',        color: '#4ade80', bg: '#052e16', border: '#166534' },
  kha:       { key: 'kha',       label: 'Khá',         color: '#60a5fa', bg: '#0c1a3a', border: '#1d4ed8' },
  trungBinh: { key: 'trungBinh', label: 'Trung bình',  color: '#fbbf24', bg: '#1c1400', border: '#b45309' },
  canhBao:   { key: 'canhBao',   label: 'Cảnh báo',    color: '#fb923c', bg: '#1a0a00', border: '#9a3412' },
  nguyHiem:  { key: 'nguyHiem',  label: 'Nguy hiểm',   color: '#f87171', bg: '#1f0000', border: '#7f1d1d' },
};

export function capDoKeyOf(diem: number): CapDoKey {
  if (diem >= 8) return 'tot';
  if (diem >= 6) return 'kha';
  if (diem >= 4) return 'trungBinh';
  if (diem >= 2) return 'canhBao';
  return 'nguyHiem';
}

/** Tra màu + nhãn trạng thái CSSK theo điểm (0-10) và theme hiện tại. `diem=null` → "Chưa tính". */
export function getCapDoSucKhoe(diem: number | null | undefined, isDark: boolean): CapDoInfo {
  if (diem == null) {
    return isDark
      ? { key: 'chuaTinh', label: 'Chưa tính', color: '#6b7280', bg: '#1f2937', border: '#374151' }
      : { key: 'chuaTinh', label: 'Chưa tính', color: '#6b7280', bg: '#f3f4f6', border: '#e5e7eb' };
  }
  const palette = isDark ? DARK : LIGHT;
  return palette[capDoKeyOf(diem)];
}
