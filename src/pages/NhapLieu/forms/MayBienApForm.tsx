import { useNavigate } from 'react-router-dom';
import { Button, Typography, Flex } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useThemeMode } from '../../../theme/ThemeModeContext';

const { Title, Text } = Typography;

// Redirect to the unified form page
export default function MayBienApForm() {
  const navigate = useNavigate();
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  return (
    <Flex vertical align="center" justify="center" style={{ padding: '60px 24px', color: isDark ? '#f9fafb' : '#111827' }}>
      <Title level={4} style={{ color: isDark ? '#f9fafb' : '#111827' }}>Nhập liệu kiểm tra</Title>
      <Text style={{ color: '#6b7280', marginBottom: 24, textAlign: 'center' }}>
        Sử dụng trang tạo phiếu kiểm tra thống nhất cho tất cả loại thiết bị.
      </Text>
      <Flex gap={12}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/nhap-lieu')}>Quay lại</Button>
        <Button type="primary" onClick={() => navigate('/nhap-lieu/phieu-kiem-tra')}>
          Mở phiếu kiểm tra →
        </Button>
      </Flex>
    </Flex>
  );
}
