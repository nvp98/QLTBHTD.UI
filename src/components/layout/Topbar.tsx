import { useEffect, useState } from 'react';
import { Layout, Space, Badge, Typography, Flex, Button } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons';
import { useLocation } from 'react-router-dom';
import { useThemeMode } from '../../theme/ThemeModeContext';

const { Header } = Layout;
const { Title, Text } = Typography;

const PAGE_TITLES: Record<string, { title: string; sub?: string }> = {
  '/dashboard':                  { title: 'Dashboard Tổng quan',        sub: 'Chỉ số sức khỏe thiết bị điện' },
  '/quan-ly/khu-vuc':            { title: 'Quản lý khu vực',            sub: 'Danh sách khu vực quản lý' },
  '/quan-ly/tram-dien':          { title: 'Quản lý trạm điện',          sub: 'Danh sách trạm biến áp' },
  '/quan-ly/thiet-bi':           { title: 'Quản lý thiết bị',           sub: 'Danh sách thiết bị điện' },
  '/quan-ly/cay-thiet-bi':       { title: 'Cây thiết bị',               sub: 'Khu vực → Trạm điện → Thiết bị' },
  '/quan-ly/loai-thiet-bi':      { title: 'Loại thiết bị',              sub: 'Phân loại MBA, MC, DCL, CSV...' },
  '/cau-hinh/nhom-chi-tieu':     { title: 'Nhóm chỉ tiêu CBM',         sub: 'Nhóm các chỉ tiêu đánh giá' },
  '/cau-hinh/chi-tieu':          { title: 'Chỉ tiêu & Ngưỡng điểm',    sub: 'Cấu hình trọng số và ngưỡng chấm điểm CBM' },
  '/nhap-lieu':                  { title: 'Nhập liệu kiểm tra',         sub: 'Tạo phiếu kiểm tra thiết bị' },
  '/nhap-lieu/phieu-kiem-tra':   { title: 'Tạo phiếu kiểm tra',         sub: 'Nhập giá trị chỉ tiêu và lưu phiếu' },
  '/ket-qua':                    { title: 'Kết quả phân hạng CBM',      sub: 'Chỉ số sức khỏe theo phương pháp EVN' },
  '/bao-cao':                    { title: 'Báo cáo',                    sub: 'Xuất báo cáo CBM định kỳ' },
};

interface TopbarProps {
  collapsed: boolean;
  onCollapse: (c: boolean) => void;
}

export default function Topbar({ collapsed, onCollapse }: TopbarProps) {
  const { pathname } = useLocation();
  const { mode, toggleMode } = useThemeMode();
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString('vi-VN', { hour12: false })
  );

  useEffect(() => {
    const id = setInterval(() =>
      setTime(new Date().toLocaleTimeString('vi-VN', { hour12: false })), 1000
    );
    return () => clearInterval(id);
  }, []);

  const pageInfo = PAGE_TITLES[pathname] ?? { title: 'CBM Platform', sub: 'Hệ thống quản lý sức khỏe thiết bị' };
  const isDark = mode === 'dark';

  return (
    <Header style={{
      background: isDark ? '#0d1117' : '#ffffff',
      borderBottom: `1px solid ${isDark ? '#1f2937' : '#e5e7eb'}`,
      padding: '0 24px',
      height: 'auto',
      lineHeight: 'normal',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 14,
      paddingBottom: 14,
    }}>
      {/* Toggle + Page Title */}
      <Flex align="center" gap={12}>
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={() => onCollapse(!collapsed)}
          style={{ color: isDark ? '#9ca3af' : '#4b5563', fontSize: 16 }}
        />
        <Flex vertical gap={2}>
          <Title level={4} style={{ margin: 0, color: isDark ? '#f9fafb' : '#111827' }}>{pageInfo.title}</Title>
          {pageInfo.sub && (
            <Text style={{ color: isDark ? '#6b7280' : '#6b7280', fontSize: 12 }}>{pageInfo.sub}</Text>
          )}
        </Flex>
      </Flex>

      {/* Status + Time */}
      <Space size={12}>
        <Button
          size="small"
          type="default"
          onClick={toggleMode}
          icon={isDark ? <SunOutlined /> : <MoonOutlined />}
          aria-label={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
          title={isDark ? 'Giao diện sáng' : 'Giao diện tối'}
        />
        <Space size={6} style={{
          background: isDark ? '#052e16' : '#ecfdf5',
          border: `1px solid ${isDark ? '#166534' : '#86efac'}`,
          borderRadius: 20, padding: '4px 14px',
        }}>
          <Badge status="success" />
          <Text style={{ color: '#4ade80', fontSize: 13, fontWeight: 600 }}>ONLINE</Text>
        </Space>
        <Text style={{ color: isDark ? '#9ca3af' : '#4b5563', fontSize: 13, fontFamily: 'monospace' }}>{time}</Text>
      </Space>
    </Header>
  );
}
