import { Card, Typography, Flex } from 'antd';
import type { ReactNode } from 'react';

const { Text } = Typography;

interface Props {
  title: string;
  value: string | number;
  suffix?: string;
  icon?: ReactNode;
  color?: string;
  onClick?: () => void;
}

export default function StatCard({ title, value, suffix, icon, color = '#3b82f6', onClick }: Props) {
  return (
    <Card
      onClick={onClick}
      style={{ background: '#0d1117', border: '1px solid #1f2937', cursor: onClick ? 'pointer' : 'default' }}
      styles={{ body: { padding: '16px 20px' } }}
      hoverable={!!onClick}
    >
      <Flex justify="space-between" align="flex-start">
        <Flex vertical gap={4} style={{ flex: 1 }}>
          <Text style={{ color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {title}
          </Text>
          <Flex align="baseline" gap={4}>
            <Text style={{ color, fontSize: 26, fontWeight: 700, lineHeight: 1.2, fontFamily: 'monospace' }}>
              {value}
            </Text>
            {suffix && <Text style={{ color: '#6b7280', fontSize: 12 }}>{suffix}</Text>}
          </Flex>
        </Flex>
        {icon && (
          <div style={{
            width: 38, height: 38, borderRadius: 8, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `${color}22`, color, fontSize: 16,
          }}>
            {icon}
          </div>
        )}
      </Flex>
    </Card>
  );
}
