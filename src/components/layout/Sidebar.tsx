import { useState } from 'react';
import { Layout, Menu, Avatar, Typography, Badge, Flex, Tooltip } from 'antd';
import {
  AppstoreOutlined, ThunderboltOutlined, BellOutlined, WifiOutlined,
  CalendarOutlined, UnorderedListOutlined, EditOutlined,
  RobotOutlined, FileTextOutlined, DatabaseOutlined, SettingOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

interface NavItem {
  label: string;
  icon: string;
  badge?: number;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'TỔNG QUAN',
    items: [
      { label: 'Dashboard', icon: '⊞' },
      { label: 'Cảnh báo', icon: '🔔', badge: 5 },
      { label: 'Trạng thái thiết bị', icon: '📡' },
    ],
  },
  {
    title: 'GIÁM SÁT',
    items: [
      { label: 'Lịch sử sự kiện', icon: '📅' },
      { label: 'Danh sách thiết bị', icon: '📋' },
      { label: 'Báo cáo', icon: '📄' },
    ],
  },
  {
    title: 'VẬN HÀNH',
    items: [
      { label: 'Lập lịch bảo trì', icon: '✏️' },
      { label: 'AI phân tích', icon: '🤖', badge: 2 },
    ],
  },
  {
    title: 'HỆ THỐNG',
    items: [
      { label: 'Dữ liệu lịch sử', icon: '🗂️' },
      { label: 'Cài đặt', icon: '⚙️' },
      { label: 'Nguồn điện', icon: '⚡' },
    ],
  },
];

const { Sider } = Layout;
const { Text } = Typography;

const ICON_MAP: Record<string, React.ReactNode> = {
  '⊞': <AppstoreOutlined />,
  '⚡': <ThunderboltOutlined />,
  '🔔': <BellOutlined />,
  '📡': <WifiOutlined />,
  '📅': <CalendarOutlined />,
  '📋': <UnorderedListOutlined />,
  '✏️': <EditOutlined />,
  '🤖': <RobotOutlined />,
  '📄': <FileTextOutlined />,
  '🗂️': <DatabaseOutlined />,
  '⚙️': <SettingOutlined />,
};

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}

export default function Sidebar({ collapsed, onCollapse: _onCollapse }: SidebarProps) {
  const menuItems: MenuProps['items'] = NAV_GROUPS.map(({ title, items }: NavGroup) => ({
    type: 'group' as const,
    label: collapsed ? null : title,
    children: items.map((item: NavItem) => ({
      key: item.label,
      icon: item.badge ? (
        <Badge count={item.badge} size="small" offset={[4, -2]}
          styles={{ indicator: { background: item.badge === 5 ? '#0096D6' : '#005EB8' } }}
        >
          {ICON_MAP[item.icon]}
        </Badge>
      ) : ICON_MAP[item.icon],
      label: collapsed ? null : (
        <Flex align="center" justify="space-between">
          <span>{item.label}</span>
          {item.badge && (
            <Badge
              count={item.badge}
              style={{
                background: item.badge === 5 ? '#0096D6' : '#005EB8',
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
              }}
            />
          )}
        </Flex>
      ),
    })),
  }));

  return (
    <Sider
      collapsed={collapsed}
      collapsedWidth={64}
      width={220}
      style={{
        background: '#0a0f1a',
        borderRight: '1px solid #1f2937',
        height: '100vh',
        position: 'sticky',
        top: 0,
        overflow: 'hidden',
        transition: 'width 0.25s ease',
      }}
    >
      <Flex vertical style={{ height: '100%' }}>

        {/* ── Logo ── */}
        <Flex
          align="center"
          justify="center"
          style={{
            padding: collapsed ? '18px 0' : '14px 20px',
            borderBottom: '1px solid #1f2937',
            flexShrink: 0,
            minHeight: 80,
            transition: 'padding 0.25s ease',
          }}
        >
          {collapsed ? (
            <Tooltip title="CBM Platform" placement="right">
              <img
                src="/src/assets/img/logoHP.png"
                alt="CBM Platform"
                style={{
                  width: 52, height: 52,
                  objectFit: 'contain',
                  cursor: 'default', flexShrink: 0,
                }}
              />
            </Tooltip>
          ) : (
            <img
              src="/src/assets/img/logoHP.png"
              alt="CBM Platform"
              style={{
                width: 200, height: 50,
                objectFit: 'contain',
                flexShrink: 0,
              }}
            />
          )}
        </Flex>

        {/* ── Nav menu ── */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <Menu
            mode="inline"
            defaultSelectedKeys={['Dashboard']}
            items={menuItems}
            inlineCollapsed={collapsed}
            style={{ background: 'transparent', border: 'none' }}
          />
        </div>

        {/* ── User ── */}
        <Flex
          align="center"
          justify={collapsed ? 'center' : 'flex-start'}
          gap={collapsed ? 0 : 10}
          style={{
            padding: collapsed ? '14px 0' : '12px 16px',
            borderTop: '1px solid #1f2937',
            flexShrink: 0,
            transition: 'padding 0.25s ease',
          }}
        >
          <Tooltip title={collapsed ? 'Nguyễn Văn A · engineer' : ''} placement="right">
            <Avatar style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', flexShrink: 0, cursor: 'default' }}>
              KS
            </Avatar>
          </Tooltip>
          {!collapsed && (
            <Flex vertical gap={0} style={{ overflow: 'hidden' }}>
              <Text strong style={{ color: '#e5e7eb', fontSize: 13, lineHeight: '20px', whiteSpace: 'nowrap' }}>
                Nguyễn Văn A
              </Text>
              <Text style={{ color: '#6b7280', fontSize: 11, lineHeight: '16px' }}>engineer</Text>
            </Flex>
          )}
        </Flex>

      </Flex>
    </Sider>
  );
}