import { useEffect, useState } from 'react';
import { Layout, Space, Badge, Typography, Segmented, Flex, Button } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';

const { Header } = Layout;
const { Title, Text } = Typography;

interface TopbarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}

export default function Topbar({ collapsed, onCollapse }: TopbarProps) {
  const [activeFilter, setActiveFilter] = useState('Hôm nay');
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString('vi-VN', { hour12: false })
  );

  useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date().toLocaleTimeString('vi-VN', { hour12: false }));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <Header style={{
      background: '#0d1117',
      borderBottom: '1px solid #1f2937',
      padding: '0 24px',
      height: 'auto',
      lineHeight: 'normal',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 14,
      paddingBottom: 14,
    }}>
      {/* Toggle + Title */}
      <Flex align="center" gap={12}>
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={() => onCollapse(!collapsed)}
          style={{ color: '#9ca3af', fontSize: 16 }}
        />
        <Flex vertical gap={2}>
          <Title level={4} style={{ margin: 0, color: '#f9fafb' }}>Dashboard Tổng quan</Title>
          <Text style={{ color: '#6b7280', fontSize: 12 }}>
            Trạm 110kV Quảng Ngãi · 23 thiết bị giám sát
          </Text>
        </Flex>
      </Flex>

      {/* Controls */}
      <Space size={12}>
        <Segmented
          value={activeFilter}
          onChange={(v) => setActiveFilter(v as string)}
          options={['Hôm nay', '7 ngày', '30 ngày']}
        />

        <Space size={6} style={{
          background: '#052e16', border: '1px solid #166534',
          borderRadius: 20, padding: '4px 14px',
        }}>
          <Badge status="success" />
          <Text style={{ color: '#4ade80', fontSize: 13, fontWeight: 600 }}>ONLINE · SCADA</Text>
        </Space>

        <Text style={{ color: '#9ca3af', fontSize: 13, fontFamily: 'monospace' }}>{time}</Text>
      </Space>
    </Header>
  );
}