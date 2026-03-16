import { Typography } from 'antd';

const { Title, Text } = Typography;

export default function DashboardPage() {
  return (
    <div style={{ color: '#f9fafb' }}>
      <Title level={3} style={{ color: '#f9fafb', marginBottom: 4 }}>
        Dashboard Tổng quan
      </Title>
      <Text style={{ color: '#6b7280' }}>
        Chào mừng đến hệ thống PMQLTBHTD
      </Text>
    </div>
  );
}
