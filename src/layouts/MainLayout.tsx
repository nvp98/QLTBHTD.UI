import { useState } from 'react';
import { Layout, Drawer, Grid } from 'antd';
import { Outlet } from 'react-router-dom';
import Sidebar, { SidebarContent } from '../components/layout/Sidebar';
import Topbar from '../components/layout/Topbar';
import { useThemeMode } from '../theme/ThemeModeContext';

const { Content } = Layout;
const { useBreakpoint } = Grid;

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const contentBg = isDark
    ? 'linear-gradient(to bottom, #0b2c4d, #123e6b)'
    : '#f3f4f6';

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      {!isMobile && <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />}

      {isMobile && (
        <Drawer
          placement="left"
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          closable={false}
          size={240}
          styles={{
            body: { padding: 0, background: isDark ? '#0a2540' : '#ffffff' },
            section: { background: isDark ? '#0a2540' : '#ffffff' },
          }}
        >
          <SidebarContent collapsed={false} onNavigate={() => setMobileMenuOpen(false)} />
        </Drawer>
      )}

      <Layout style={{ background: contentBg, overflow: 'auto' }}>
        <Topbar
          collapsed={collapsed}
          onCollapse={setCollapsed}
          isMobile={isMobile}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />
        <Content style={{ padding: isMobile ? '14px 12px' : '20px 24px' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
