import { useEffect, useState } from 'react';
import { Layout, Space, Badge, Typography, Flex, Button, Avatar, Dropdown, Grid } from 'antd';
import type { MenuProps } from 'antd';
import {
  MenuFoldOutlined, MenuUnfoldOutlined, MenuOutlined, MoonOutlined, SunOutlined,
  KeyOutlined, LogoutOutlined,
} from '@ant-design/icons';
import { useLocation } from 'react-router-dom';
import { useThemeMode } from '../../theme/ThemeModeContext';
import { useAuth } from '../../auth/AuthContext';
import DoiMatKhauModal from '../auth/DoiMatKhauModal';

const { Header } = Layout;
const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

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
  isMobile?: boolean;
  onOpenMobileMenu?: () => void;
}

export default function Topbar({ collapsed, onCollapse, isMobile, onOpenMobileMenu }: TopbarProps) {
  const { pathname } = useLocation();
  const { mode, toggleMode } = useThemeMode();
  const { user, logout } = useAuth();
  const [doiMatKhauOpen, setDoiMatKhauOpen] = useState(false);
  const screens = useBreakpoint();
  const showStatus = screens.lg;
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

  const userMenuItems: MenuProps['items'] = [
    { key: 'doi-mat-khau', label: 'Đổi mật khẩu', icon: <KeyOutlined /> },
    { key: 'dang-xuat', label: 'Đăng xuất', icon: <LogoutOutlined />, danger: true },
  ];
  const handleUserMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'doi-mat-khau') setDoiMatKhauOpen(true);
    else if (key === 'dang-xuat') logout();
  };

  return (
    <Header style={{
      background: isDark ? '#0a2540' : '#ffffff',
      borderBottom: `1px solid ${isDark ? '#1e4a72' : '#e5e7eb'}`,
      paddingLeft: isMobile ? 12 : 24,
      paddingRight: isMobile ? 12 : 24,
      paddingTop: 12,
      paddingBottom: 12,
      height: 'auto',
      lineHeight: 'normal',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    }}>
      {/* Toggle + Page Title */}
      <Flex align="center" gap={isMobile ? 8 : 12} style={{ minWidth: 0 }}>
        <Button
          type="text"
          icon={isMobile ? <MenuOutlined /> : (collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />)}
          onClick={() => isMobile ? onOpenMobileMenu?.() : onCollapse(!collapsed)}
          style={{ color: isDark ? '#9ca3af' : '#4b5563', fontSize: 16, flexShrink: 0 }}
        />
        <Flex vertical gap={2} style={{ minWidth: 0 }}>
          <Title
            level={4}
            ellipsis
            style={{ margin: 0, color: isDark ? '#f9fafb' : '#111827', fontSize: isMobile ? 16 : undefined }}
          >
            {pageInfo.title}
          </Title>
          {pageInfo.sub && !isMobile && (
            <Text style={{ color: isDark ? '#6b7280' : '#6b7280', fontSize: 12 }} ellipsis>{pageInfo.sub}</Text>
          )}
        </Flex>
      </Flex>

      {/* Status + Time */}
      <Space size={isMobile ? 6 : 12} style={{ flexShrink: 0 }}>
        <Button
          size="small"
          type="default"
          onClick={toggleMode}
          icon={isDark ? <SunOutlined /> : <MoonOutlined />}
          aria-label={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
          title={isDark ? 'Giao diện sáng' : 'Giao diện tối'}
        />
        {showStatus && (
          <>
            <Space size={6} style={{
              background: isDark ? '#052e16' : '#ecfdf5',
              border: `1px solid ${isDark ? '#166534' : '#86efac'}`,
              borderRadius: 20, padding: '4px 14px',
            }}>
              <Badge status="success" />
              <Text style={{ color: '#4ade80', fontSize: 13, fontWeight: 600 }}>ONLINE</Text>
            </Space>
            <Text style={{ color: isDark ? '#9ca3af' : '#4b5563', fontSize: 13, fontFamily: 'monospace' }}>{time}</Text>
          </>
        )}

        <Dropdown
          menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
          placement="bottomRight"
          trigger={['click']}
        >
          <Flex align="center" gap={8} style={{
            cursor: 'pointer', padding: isMobile ? 2 : '4px 10px 4px 4px', borderRadius: 20,
            border: isMobile ? 'none' : `1px solid ${isDark ? '#1e4a72' : '#e5e7eb'}`,
          }}>
            <Avatar size={28} style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', flexShrink: 0 }}>
              {(user?.HoTen ?? '?').trim().charAt(0).toUpperCase()}
            </Avatar>
            {!isMobile && (
              <Flex vertical gap={0} style={{ lineHeight: 1.1 }}>
                <Text strong style={{ color: isDark ? '#f9fafb' : '#111827', fontSize: 12.5 }}>
                  {user?.HoTen ?? 'Chưa đăng nhập'}
                </Text>
                <Text style={{ color: '#6b7280', fontSize: 11 }}>{user?.TenVaiTro ?? ''}</Text>
              </Flex>
            )}
          </Flex>
        </Dropdown>
      </Space>

      <DoiMatKhauModal open={doiMatKhauOpen} onClose={() => setDoiMatKhauOpen(false)} />
    </Header>
  );
}
