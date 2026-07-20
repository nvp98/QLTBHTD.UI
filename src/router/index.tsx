import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';

// Tổng quan
import DashboardPage from '../pages/DashboardPage';

// Quản lý thiết bị
import KhuVucPage    from '../pages/QuanLy/KhuVucPage';
import TramDienPage  from '../pages/QuanLy/TramDienPage';
import ThietBiPage   from '../pages/QuanLy/ThietBiPage';
import CayThietBiPage from '../pages/QuanLy/CayThietBiPage';
import LoaiThietBiPage from '../pages/CauHinh/LoaiThietBiPage';

// Cấu hình CBM
import NhomChiTieuPage    from '../pages/CauHinh/NhomChiTieuPage';
import ChiTieuPage        from '../pages/CauHinh/ChiTieuPage';
import CayChiTieuPage     from '../pages/CauHinh/CayChiTieuPage';
import CongThucTongHopPage from '../pages/CauHinh/CongThucTongHopPage';

// Nhập liệu
import NhapLieuPage        from '../pages/NhapLieu/NhapLieuPage';
import TaoPhieuKiemTraPage from '../pages/NhapLieu/TaoPhieuKiemTraPage';
import MayBienApForm       from '../pages/NhapLieu/forms/MayBienApForm';
import MayCatForm          from '../pages/NhapLieu/forms/MayCatForm';
import NhapLieuDongPage    from '../pages/NhapLieu/NhapLieuDongPage';

// Kết quả & Báo cáo
import KetQuaPage      from '../pages/KetQua/KetQuaPage';
import PhieuDetailPage from '../pages/KetQua/PhieuDetailPage';
import BaoCaoPage      from '../pages/BaoCao/BaoCaoPage';

// Thống kê
import ThongKePage from '../pages/ThongKe/ThongKePage';

const router = createBrowserRouter([
  {
    element: <MainLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },

      // ── Tổng quan ─────────────────────────────────────────────────────────
      { path: 'dashboard', element: <DashboardPage /> },

      // ── Quản lý thiết bị ──────────────────────────────────────────────────
      { path: 'quan-ly/khu-vuc',  element: <KhuVucPage /> },
      { path: 'quan-ly/tram-dien', element: <TramDienPage /> },
      { path: 'quan-ly/thiet-bi', element: <ThietBiPage /> },
      { path: 'quan-ly/cay-thiet-bi', element: <CayThietBiPage /> },
      { path: 'quan-ly/loai-thiet-bi', element: <LoaiThietBiPage /> },

      // ── Cấu hình CBM ──────────────────────────────────────────────────────
      { path: 'cau-hinh/nhom-chi-tieu',    element: <NhomChiTieuPage /> },
      { path: 'cau-hinh/chi-tieu',         element: <ChiTieuPage /> },
      { path: 'cau-hinh/cay-chi-tieu',     element: <CayChiTieuPage /> },
      { path: 'cau-hinh/cong-thuc',        element: <CongThucTongHopPage /> },

      // ── Nhập liệu ─────────────────────────────────────────────────────────
      { path: 'nhap-lieu',                  element: <NhapLieuPage /> },
      { path: 'nhap-lieu/phieu-kiem-tra',   element: <TaoPhieuKiemTraPage /> },
      { path: 'nhap-lieu/may-bien-ap',      element: <MayBienApForm /> },
      { path: 'nhap-lieu/may-cat',          element: <MayCatForm /> },
      { path: 'nhap-lieu/dong',             element: <NhapLieuDongPage /> },

      // ── Kết quả & Báo cáo ─────────────────────────────────────────────────
      { path: 'ket-qua',      element: <KetQuaPage /> },
      { path: 'ket-qua/:id',  element: <PhieuDetailPage /> },
      { path: 'bao-cao',      element: <BaoCaoPage /> },
      { path: 'thong-ke',     element: <ThongKePage /> },
    ],
  },
]);

export default router;
