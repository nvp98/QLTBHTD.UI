import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, Card, Flex, Form, Input, Typography, message } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { useAuth } from '../../auth/AuthContext';
import { useThemeMode } from '../../theme/ThemeModeContext';
import logoFull from '../../assets/img/logoHP.png';

const { Title, Text } = Typography;

interface LoginFormValues {
  tenDangNhap: string;
  matKhau: string;
}

export default function LoginPage() {
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);

  const onFinish = async (values: LoginFormValues) => {
    setSubmitting(true);
    try {
      await login(values.tenDangNhap, values.matKhau);
      const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';
      navigate(from, { replace: true });
    } catch {
      message.error('Tên đăng nhập hoặc mật khẩu không đúng');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Flex
      align="center"
      justify="center"
      style={{
        minHeight: '100vh',
        background: isDark ? '#0a2540' : '#f3f4f6',
      }}
    >
      <Card
        style={{
          width: 380,
          background: isDark ? '#0e2c4a' : '#ffffff',
          border: `1px solid ${isDark ? '#1e4a72' : '#e5e7eb'}`,
        }}
        styles={{ body: { padding: 32 } }}
      >
        <Flex vertical align="center" style={{ marginBottom: 24 }}>
          <img src={logoFull} alt="CBM Platform" style={{ width: 200, objectFit: 'contain', marginBottom: 12 }} />
          <Title level={4} style={{ color: isDark ? '#f9fafb' : '#111827', margin: 0 }}>Đăng nhập</Title>
          <Text style={{ color: '#6b7280', fontSize: 13 }}>Hệ thống CBM — CSSK thiết bị điện EVN</Text>
        </Flex>

        <Form layout="vertical" onFinish={onFinish} disabled={submitting}>
          <Form.Item
            name="tenDangNhap"
            label="Tên đăng nhập"
            rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Tên đăng nhập" autoFocus />
          </Form.Item>
          <Form.Item
            name="matKhau"
            label="Mật khẩu"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block loading={submitting}>
              Đăng nhập
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </Flex>
  );
}
