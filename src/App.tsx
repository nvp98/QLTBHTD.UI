import { ConfigProvider, theme } from 'antd';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import DashboardPage from './pages/DashboardPage';
export default function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorBgContainer: '#0d1117',
          colorBgElevated: '#111827',
          colorBorder: '#1f2937',
          colorText: '#f9fafb',
          colorTextSecondary: '#9ca3af',
          colorPrimary: '#3b82f6',
          borderRadius: 8,
          fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif",
        },
        components: {
          Menu: {
            darkItemBg: 'transparent',
            darkSubMenuItemBg: 'transparent',
            itemBg: 'transparent',
            subMenuItemBg: 'transparent',
            itemSelectedBg: '#1e3a5f',
            itemSelectedColor: '#93c5fd',
            itemColor: '#9ca3af',
            groupTitleColor: '#4b5563',
            groupTitleFontSize: 10,
          },
          Card: {
            headerBg: 'transparent',
            headerFontSize: 15,
          },
          Select: {
            selectorBg: '#111827',
          },
          Segmented: {
            itemSelectedBg: '#1d4ed8',
            itemSelectedColor: '#fff',
            trackBg: 'transparent',
          },
        },
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route element={<MainLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}