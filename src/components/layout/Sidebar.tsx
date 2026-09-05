import { useState } from 'react';
import { Layout, Menu, Avatar, Typography, Flex, Tooltip, Dropdown } from 'antd';
import {
  AppstoreOutlined, EnvironmentOutlined, ThunderboltOutlined,
  SettingOutlined, UnorderedListOutlined, EditOutlined,
  FileTextOutlined, BarChartOutlined, ApartmentOutlined,
  BulbOutlined, FundOutlined, HistoryOutlined, CalendarOutlined,
  ClusterOutlined, TeamOutlined, KeyOutlined, LogoutOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import type { MenuProps } from 'antd';
import logoSmall from '../../assets/img/1.png';
import logoFull from '../../assets/img/logoHP.png';
import { useThemeMode } from '../../theme/ThemeModeContext';
import { useAuth } from '../../auth/AuthContext';
import { canViewPath } from '../../auth/permissions';
import type { MaVaiTro } from '../../types/entities';
import DoiMatKhauModal from '../auth/DoiMatKhauModal';

const { Sider } = Layout;
const { Text } = Typography;

type NavItem = { key: string; label: string; icon: React.ReactNode };
type NavGroup = { title: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'TỔNG QUAN',
    items: [
      { key: '/dashboard', label: 'Dashboard', icon: <AppstoreOutlined /> },
    ],
  },
  {
    title: 'QUẢN LÝ THIẾT BỊ',
    items: [
      { key: '/quan-ly/khu-vuc', label: 'Khu vực', icon: <EnvironmentOutlined /> },
      { key: '/quan-ly/tram-dien', label: 'Trạm điện', icon: <ThunderboltOutlined /> },
      { key: '/quan-ly/ngan-lo', label: 'Ngăn lộ', icon: <ClusterOutlined /> },
      { key: '/quan-ly/thiet-bi', label: 'Thiết bị', icon: <ApartmentOutlined /> },
      { key: '/quan-ly/cay-thiet-bi', label: 'Cây thiết bị', icon: <FundOutlined /> },
      {key: '/quan-ly/loai-thiet-bi',label: 'Loại thiết bị',icon: <UnorderedListOutlined />
      },
    ],
  },
  // {
  //   title: 'CẤU HÌNH CBM',
  //   items: [
  //     { key: '/cau-hinh/loai-thiet-bi', label: 'Loại thiết bị',       icon: <UnorderedListOutlined /> },
  //     { key: '/cau-hinh/nhom-chi-tieu', label: 'Nhóm chỉ tiêu',       icon: <BulbOutlined /> },
  //     { key: '/cau-hinh/chi-tieu',      label: 'Chỉ tiêu & Ngưỡng',   icon: <SettingOutlined /> },
  //   ],
  // },
  {
    title: 'CẤU HÌNH CBM',
    items: [

      {
        key: '/cau-hinh/cay-chi-tieu',
        label: 'Cây chỉ tiêu',
        icon: <ApartmentOutlined />
      },
      {
        key: '/cau-hinh/nhom-chi-tieu',
        label: 'Nhóm chỉ tiêu',
        icon: <BulbOutlined />
      },
      {
        key: '/cau-hinh/chi-tieu',
        label: 'Chỉ tiêu & Ngưỡng',
        icon: <SettingOutlined />
      },
      {
        key: '/cau-hinh/cong-thuc',
        label: 'Công thức tổng hợp',
        icon: <FundOutlined />
      }
    ]
  },
  {
    title: 'NHẬP LIỆU',
    items: [
      { key: '/nhap-lieu', label: 'Nhập liệu kiểm tra', icon: <EditOutlined /> },
    ],
  },
  {
    title: 'KẾT QUẢ & BÁO CÁO',
    items: [
      { key: '/ket-qua', label: 'Kết quả phân hạng', icon: <FundOutlined /> },
      { key: '/ket-qua/lich-su', label: 'Lịch sử đo & tính toán', icon: <HistoryOutlined /> },
      { key: '/bao-cao', label: 'Báo cáo', icon: <FileTextOutlined /> },
    ],
  },
  {
    title: 'BẢO TRÌ',
    items: [
      { key: '/bao-tri/lich', label: 'Lịch bảo trì', icon: <CalendarOutlined /> },
    ],
  },
  {
    title: 'HỆ THỐNG',
    items: [
      { key: '/thong-ke', label: 'Thống kê', icon: <BarChartOutlined /> },
    ],
  },
  {
    title: 'QUẢN TRỊ',
    items: [
      { key: '/quan-tri/nguoi-dung', label: 'Quản lý người dùng', icon: <TeamOutlined /> },
    ],
  },
];

interface SidebarContentProps {
  collapsed: boolean;
  onNavigate?: () => void;
}

/** Nội dung sidebar dùng chung — hiển thị bên trong <Sider> (desktop) hoặc <Drawer> (mobile). */
export function SidebarContent({ collapsed, onNavigate }: SidebarContentProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { mode } = useThemeMode();
  const { user, logout } = useAuth();
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const [doiMatKhauOpen, setDoiMatKhauOpen] = useState(false);
  const isDark = mode === 'dark';
  const role = user?.MaVaiTro as MaVaiTro | undefined;

  const visibleGroups = NAV_GROUPS
    .map(g => ({ ...g, items: g.items.filter(item => canViewPath(role, item.key)) }))
    .filter(g => g.items.length > 0);

  const handleNavigate = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  const menuItems: MenuProps['items'] = visibleGroups.map(({ title, items }) => ({
    type: 'group' as const,
    label: collapsed ? null : (
      <Text style={{ color: isDark ? '#374151' : '#6b7280', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}>
        {title}
      </Text>
    ),
    children: items.map(item => ({
      key: item.key,
      icon: <span style={{ fontSize: 15 }}>{item.icon}</span>,
      label: collapsed ? null : item.label,
      onClick: () => handleNavigate(item.key),
    })),
  }));

  const userMenuItems: MenuProps['items'] = [
    { key: 'doi-mat-khau', label: 'Đổi mật khẩu', icon: <KeyOutlined /> },
    { key: 'dang-xuat', label: 'Đăng xuất', icon: <LogoutOutlined />, danger: true },
  ];
  const handleUserMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'doi-mat-khau') setDoiMatKhauOpen(true);
    else if (key === 'dang-xuat') logout();
  };

  return (
    <Flex vertical style={{ height: '100%' }}>

      {/* ── Logo ── */}
      <Flex align="center" justify="center" style={{
        padding: collapsed ? '18px 0' : '14px 20px',
        borderBottom: `1px solid ${isDark ? '#1e4a72' : '#e5e7eb'}`,
        flexShrink: 0, minHeight: 80,
        transition: 'padding 0.25s ease',
      }}>
        {collapsed ? (
          <Tooltip title="CBM Platform" placement="right">
            <img src={logoSmall} alt="CBM" onClick={() => handleNavigate('/dashboard')}
              style={{ width: 52, height: 52, objectFit: 'contain', cursor: 'pointer' }} />
          </Tooltip>
        ) : (
          <img src={logoFull} alt="CBM Platform" onClick={() => handleNavigate('/dashboard')}
            style={{ width: 200, height: 50, objectFit: 'contain', cursor: 'pointer' }} />
        )}
      </Flex>

      {/* ── Nav menu ── */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <Menu
          mode="inline"
          selectedKeys={[pathname]}
          openKeys={openKeys}
          onOpenChange={setOpenKeys}
          items={menuItems}
          inlineCollapsed={collapsed}
          style={{ background: 'transparent', border: 'none', padding: '8px 0' }}
        />
      </div>

      {/* ── User ── */}
      <Dropdown
        menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
        placement="topRight"
        trigger={['click']}
      >
        <Flex
          align="center"
          justify={collapsed ? 'center' : 'flex-start'}
          gap={collapsed ? 0 : 10}
          style={{
            padding: collapsed ? '14px 0' : '12px 16px',
            borderTop: `1px solid ${isDark ? '#1e4a72' : '#e5e7eb'}`,
            flexShrink: 0,
            transition: 'padding 0.25s ease',
            cursor: 'pointer',
          }}
        >
          <Tooltip title={collapsed ? (user?.HoTen ?? '') : ''} placement="right">
            <Avatar style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', flexShrink: 0, cursor: 'default' }}>
              {(user?.HoTen ?? '?').trim().charAt(0).toUpperCase()}
            </Avatar>
          </Tooltip>
          {!collapsed && (
            <Flex vertical gap={0} style={{ overflow: 'hidden' }}>
              <Text strong style={{ color: isDark ? '#e5e7eb' : '#111827', fontSize: 13, whiteSpace: 'nowrap' }}>
                {user?.HoTen ?? 'Chưa đăng nhập'}
              </Text>
              <Text style={{ color: '#6b7280', fontSize: 11 }}>{user?.TenVaiTro ?? ''}</Text>
            </Flex>
          )}
        </Flex>
      </Dropdown>

      <DoiMatKhauModal open={doiMatKhauOpen} onClose={() => setDoiMatKhauOpen(false)} />
    </Flex>
  );
}

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (c: boolean) => void;
}

export default function Sidebar({ collapsed }: SidebarProps) {
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';

  return (
    <Sider
      collapsed={collapsed}
      collapsedWidth={64}
      width={220}
      style={{
        background: isDark ? '#0a2540' : '#ffffff',
        borderRight: `1px solid ${isDark ? '#1e4a72' : '#e5e7eb'}`,
        height: '100vh',
        position: 'sticky',
        top: 0,
        overflow: 'hidden',
        transition: 'width 0.25s ease',
      }}
    >
      <SidebarContent collapsed={collapsed} />
    </Sider>
  );
}
