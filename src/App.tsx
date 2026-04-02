import { ConfigProvider, theme } from 'antd';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import viVN from 'antd/locale/vi_VN';
import MainLayout from './layouts/MainLayout';

// Pages
import DashboardPage        from './pages/DashboardPage';
import KhuVucPage           from './pages/QuanLy/KhuVucPage';
import TramDienPage         from './pages/QuanLy/TramDienPage';
import ThietBiPage          from './pages/QuanLy/ThietBiPage';
import LoaiThietBiPage      from './pages/CauHinh/LoaiThietBiPage';
import NhomChiTieuPage      from './pages/CauHinh/NhomChiTieuPage';
import ChiTieuPage          from './pages/CauHinh/ChiTieuPage';
import NhapLieuPage         from './pages/NhapLieu/NhapLieuPage';
import TaoPhieuKiemTraPage  from './pages/NhapLieu/TaoPhieuKiemTraPage';
import MayBienApForm        from './pages/NhapLieu/forms/MayBienApForm';
import MayCatForm           from './pages/NhapLieu/forms/MayCatForm';
import KetQuaPage           from './pages/KetQua/KetQuaPage';
import BaoCaoPage           from './pages/BaoCao/BaoCaoPage';

export default function App() {
  return (
    <ConfigProvider
      locale={viVN}
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorBgContainer:       '#0d1117',
          colorBgElevated:        '#111827',
          colorBgLayout:          '#060c14',
          colorBorder:            '#1f2937',
          colorBorderSecondary:   '#374151',
          colorText:              '#f9fafb',
          colorTextSecondary:     '#9ca3af',
          colorTextPlaceholder:   '#4b5563',
          colorPrimary:           '#3b82f6',
          borderRadius:           6,
          fontFamily:             "'IBM Plex Sans', 'Segoe UI', sans-serif",
          fontSize:               13,
        },
        components: {
          Menu: {
            darkItemBg:           'transparent',
            itemBg:               'transparent',
            itemSelectedBg:       '#1e3a5f',
            itemSelectedColor:    '#93c5fd',
            itemColor:            '#9ca3af',
            itemHoverColor:       '#e5e7eb',
            itemHoverBg:          '#111827',
            groupTitleColor:      '#374151',
            groupTitleFontSize:   10,
          },
          Card: {
            headerBg:             'transparent',
            headerFontSize:       14,
          },
          Table: {
            headerBg:             '#111827',
            headerColor:          '#9ca3af',
            rowHoverBg:           '#111827',
            borderColor:          '#1f2937',
            bodySortBg:           '#0d1117',
          },
          Modal: {
            contentBg:            '#111827',
            headerBg:             '#111827',
            footerBg:             '#111827',
          },
          Select: {
            selectorBg:           '#111827',
            optionSelectedBg:     '#1e3a5f',
          },
          Input: {
            activeBg:             '#111827',
            hoverBg:              '#111827',
          },
          InputNumber: {
            activeBg:             '#111827',
          },
          Segmented: {
            itemSelectedBg:       '#1d4ed8',
            itemSelectedColor:    '#fff',
            trackBg:              'transparent',
          },
          Tag: {
            defaultBg:            '#1f2937',
            defaultColor:         '#9ca3af',
          },
        },
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route element={<MainLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />

            {/* Tổng quan */}
            <Route path="/dashboard"                  element={<DashboardPage />} />

            {/* Quản lý thiết bị */}
            <Route path="/quan-ly/khu-vuc"            element={<KhuVucPage />} />
            <Route path="/quan-ly/tram-dien"          element={<TramDienPage />} />
            <Route path="/quan-ly/thiet-bi"           element={<ThietBiPage />} />

            {/* Cấu hình CBM */}
            <Route path="/cau-hinh/loai-thiet-bi"     element={<LoaiThietBiPage />} />
            <Route path="/cau-hinh/nhom-chi-tieu"     element={<NhomChiTieuPage />} />
            <Route path="/cau-hinh/chi-tieu"          element={<ChiTieuPage />} />

            {/* Nhập liệu */}
            <Route path="/nhap-lieu"                    element={<NhapLieuPage />} />
            <Route path="/nhap-lieu/phieu-kiem-tra"   element={<TaoPhieuKiemTraPage />} />
            <Route path="/nhap-lieu/may-bien-ap"      element={<MayBienApForm />} />
            <Route path="/nhap-lieu/may-cat"          element={<MayCatForm />} />

            {/* Kết quả & Báo cáo */}
            <Route path="/ket-qua"                    element={<KetQuaPage />} />
            <Route path="/bao-cao"                    element={<BaoCaoPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}
