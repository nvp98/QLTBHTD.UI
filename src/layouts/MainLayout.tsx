import { useState } from 'react';
import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Topbar from '../components/layout/Topbar';

const { Content } = Layout;

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
      <Layout style={{ background: '#060c14', overflow: 'auto' }}>
        <Topbar collapsed={collapsed} onCollapse={setCollapsed} />
        <Content style={{ padding: '20px 24px' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}