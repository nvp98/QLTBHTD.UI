import { ReferenceArea } from 'recharts';
import { getCapDoByKey, type CapDoKey } from '../../theme/capDoSucKhoe';

/** Các dải cấp CSSK (thang 0–10) — nền mờ phía sau line chart để nhìn ngay điểm đang rơi vào vùng nào. */
const BANDS: { key: CapDoKey; y1: number; y2: number }[] = [
  { key: 'nguyHiem',  y1: 0, y2: 2 },
  { key: 'canhBao',   y1: 2, y2: 4 },
  { key: 'trungBinh', y1: 4, y2: 6 },
  { key: 'kha',       y1: 6, y2: 8 },
  { key: 'tot',       y1: 8, y2: 10 },
];

/** Gọi như hàm (không dùng như component) để recharts nhận ra các ReferenceArea là con của chart. */
export function csskBands(isDark: boolean) {
  return BANDS.map(b => (
    <ReferenceArea
      key={b.key}
      y1={b.y1}
      y2={b.y2}
      fill={getCapDoByKey(b.key, isDark).color}
      fillOpacity={isDark ? 0.1 : 0.08}
      stroke="none"
      ifOverflow="hidden"
    />
  ));
}

/** Tình trạng chỉ tiêu (Tốt/Khá/Trung bình/Xấu) → key màu CSSK, khớp cách BE map ở khung "Cần chú ý". */
export function keyOfTinhTrang(tinhTrang?: string | null): CapDoKey | null {
  switch ((tinhTrang ?? '').trim().toLowerCase()) {
    case 'tốt': return 'tot';
    case 'khá': return 'kha';
    case 'trung bình': return 'canhBao';
    case 'xấu': return 'nguyHiem';
    default: return null;
  }
}

/** Màu theo điểm Sᵢ (thang 0–3) — chỉ dùng khi chỉ tiêu chưa cấu hình Tình trạng. */
export function keyOfSi(si: number): CapDoKey {
  if (si >= 3) return 'tot';
  if (si >= 2) return 'kha';
  if (si >= 1) return 'trungBinh';
  return 'nguyHiem';
}
