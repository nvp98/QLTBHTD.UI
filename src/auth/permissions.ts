import type { MaVaiTro } from '../types/entities';

export type ModuleKey =
  | 'tong-quan' | 'thiet-bi' | 'cau-hinh' | 'nhap-lieu'
  | 'ket-qua' | 'bao-cao' | 'bao-tri' | 'thong-ke' | 'quan-tri';

/** Module hiển thị được theo từng vai trò — khớp ma trận phân quyền đã chốt.
 * Đây là kiểm soát Ở MỨC MODULE (không lọc dữ liệu theo trạm phụ trách — để dành phase sau). */
const VISIBLE_MODULES: Record<MaVaiTro, ModuleKey[]> = {
  Admin:        ['tong-quan', 'thiet-bi', 'cau-hinh', 'nhap-lieu', 'ket-qua', 'bao-cao', 'bao-tri', 'thong-ke', 'quan-tri'],
  KySuCauHinh:  ['tong-quan', 'thiet-bi', 'cau-hinh', 'nhap-lieu', 'ket-qua', 'bao-cao', 'thong-ke'],
  KyThuatVien:  ['tong-quan', 'thiet-bi', 'nhap-lieu', 'ket-qua', 'bao-tri', 'thong-ke'],
  TruongTram:   ['tong-quan', 'thiet-bi', 'nhap-lieu', 'ket-qua', 'bao-cao', 'bao-tri', 'thong-ke'],
  GiamDoc:      ['tong-quan', 'thiet-bi', 'cau-hinh', 'nhap-lieu', 'ket-qua', 'bao-cao', 'bao-tri', 'thong-ke'],
};

/** Ánh xạ path (đầy đủ, bắt đầu bằng '/') sang module — khớp prefix dài nhất trước. */
const PATH_MODULE_PREFIXES: [string, ModuleKey][] = [
  ['/dashboard', 'tong-quan'],
  ['/quan-tri', 'quan-tri'],
  ['/quan-ly', 'thiet-bi'],
  ['/cau-hinh', 'cau-hinh'],
  ['/nhap-lieu', 'nhap-lieu'],
  ['/ket-qua', 'ket-qua'],
  ['/bao-cao', 'bao-cao'],
  ['/bao-tri', 'bao-tri'],
  ['/thong-ke', 'thong-ke'],
];

export function moduleOfPath(path: string): ModuleKey | null {
  const match = PATH_MODULE_PREFIXES.find(([prefix]) => path.startsWith(prefix));
  return match ? match[1] : null;
}

export function canViewModule(role: MaVaiTro | undefined, mod: ModuleKey): boolean {
  if (!role) return false;
  return VISIBLE_MODULES[role]?.includes(mod) ?? false;
}

export function canViewPath(role: MaVaiTro | undefined, path: string): boolean {
  const mod = moduleOfPath(path);
  if (!mod) return true; // path không thuộc module nào biết trước — không chặn
  return canViewModule(role, mod);
}
