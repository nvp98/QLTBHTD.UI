import { Card, Row, Col, Typography, Flex, Button, Select, Tag } from 'antd';
import { DownloadOutlined, PrinterOutlined, FilePdfOutlined, FileExcelOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useThemeMode } from '../../theme/ThemeModeContext';

const { Title, Text } = Typography;

const TEMPLATES = [
  { id: 'summary', label: 'Báo cáo tổng hợp CBM', icon: <FilePdfOutlined />, color: '#3b82f6',
    desc: 'Bảng tổng hợp CSSK tất cả thiết bị, phân hạng A→E và khuyến nghị bảo trì' },
  { id: 'detail', label: 'Báo cáo chi tiết từng thiết bị', icon: <FilePdfOutlined />, color: '#8b5cf6',
    desc: 'Chi tiết điểm từng chỉ tiêu, so sánh với ngưỡng tiêu chuẩn' },
  { id: 'plan', label: 'Kế hoạch bảo trì CBM', icon: <FileExcelOutlined />, color: '#f59e0b',
    desc: 'Danh sách thiết bị cần bảo trì theo thứ tự ưu tiên (CSSK thấp → cao)' },
];

export default function BaoCaoPage() {
  const [selected, setSelected] = useState('summary');
  const tpl = TEMPLATES.find(t => t.id === selected)!;
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';

  const titleColor = isDark ? '#f9fafb' : '#111827';
  const panelBg = isDark ? '#0d1117' : '#ffffff';
  const panelBorder = isDark ? '#1f2937' : '#e5e7eb';
  const itemBg = isDark ? '#111827' : '#f9fafb';

  return (
    <div style={{ color: titleColor }}>
      <Flex align="center" justify="space-between" style={{ marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ color: titleColor, margin: 0 }}>Báo cáo CBM</Title>
          <Text style={{ color: '#6b7280', fontSize: 13 }}>Xuất báo cáo chỉ số sức khỏe thiết bị điện</Text>
        </div>
        <Flex gap={8}>
          <Button icon={<PrinterOutlined />}>In báo cáo</Button>
          <Button type="primary" icon={<DownloadOutlined />}
            style={{ background: tpl.color, borderColor: tpl.color }}>
            Tải xuống
          </Button>
        </Flex>
      </Flex>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <Card title="Chọn mẫu báo cáo" style={{ background: panelBg, border: `1px solid ${panelBorder}`, marginBottom: 16 }}
            styles={{ header: { color: titleColor, borderBottom: `1px solid ${panelBorder}` }, body: { padding: 16 } }}>
            {TEMPLATES.map(t => (
              <div key={t.id} onClick={() => setSelected(t.id)}
                style={{
                  padding: '12px 14px', marginBottom: 8, borderRadius: 8, cursor: 'pointer',
                  background: selected === t.id ? `${t.color}11` : itemBg,
                  border: `1px solid ${selected === t.id ? t.color + '55' : panelBorder}`,
                  transition: 'all 0.2s',
                }}>
                <Flex align="flex-start" gap={10}>
                  <div style={{ color: t.color, fontSize: 16, marginTop: 2, flexShrink: 0 }}>{t.icon}</div>
                  <div>
                    <Text strong style={{ color: selected === t.id ? t.color : titleColor, fontSize: 13 }}>
                      {t.label}
                    </Text>
                    <Text style={{ color: '#6b7280', fontSize: 11, display: 'block', marginTop: 2 }}>{t.desc}</Text>
                  </div>
                </Flex>
              </div>
            ))}
          </Card>

          <Card title="Tùy chọn xuất" style={{ background: panelBg, border: `1px solid ${panelBorder}` }}
            styles={{ header: { color: titleColor, borderBottom: `1px solid ${panelBorder}` }, body: { padding: 16 } }}>
            <Flex vertical gap={12}>
              <div>
                <Text style={{ color: isDark ? '#9ca3af' : '#4b5563', fontSize: 12, display: 'block', marginBottom: 4 }}>Loại thiết bị</Text>
                <Select defaultValue="all" style={{ width: '100%' }}
                  options={[
                    { label: 'Tất cả loại thiết bị', value: 'all' },
                    { label: 'Máy biến áp (MBA)', value: 'MBA' },
                    { label: 'Máy cắt (MC)', value: 'MC' },
                  ]}
                />
              </div>
              <div>
                <Text style={{ color: isDark ? '#9ca3af' : '#4b5563', fontSize: 12, display: 'block', marginBottom: 4 }}>Định dạng</Text>
                <Select defaultValue="pdf" style={{ width: '100%' }}
                  options={[{ label: 'PDF', value: 'pdf' }, { label: 'Excel (.xlsx)', value: 'xlsx' }]}
                />
              </div>
              <Button type="primary" icon={<DownloadOutlined />} block size="large"
                style={{ background: tpl.color, borderColor: tpl.color }}>
                Xuất {tpl.label}
              </Button>
            </Flex>
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          <Card title="Xem trước" style={{ background: panelBg, border: `1px solid ${panelBorder}` }}
            styles={{ header: { color: titleColor, borderBottom: `1px solid ${panelBorder}` }, body: { padding: 20 } }}>
            <div style={{ padding: 20, background: itemBg, borderRadius: 8, marginBottom: 16 }}>
              <Flex justify="space-between" align="flex-start">
                <div>
                  <Text style={{ color: '#4b5563', fontSize: 11 }}>TỔNG CÔNG TY ĐIỆN LỰC MIỀN TRUNG</Text>
                  <Title level={4} style={{ color: titleColor, margin: '4px 0' }}>{tpl.label.toUpperCase()}</Title>
                  <Text style={{ color: '#6b7280', fontSize: 12 }}>Ngày: {new Date().toLocaleDateString('vi-VN')}</Text>
                </div>
                <Tag color="blue">CBM Platform</Tag>
              </Flex>
            </div>
            <Flex vertical align="center" justify="center" style={{ padding: '40px 0' }}>
              <div style={{ fontSize: 48, color: isDark ? '#1f2937' : '#9ca3af', marginBottom: 16 }}>{tpl.icon}</div>
              <Text style={{ color: '#4b5563', fontSize: 15, textAlign: 'center' }}>
                Chức năng xuất báo cáo sẽ được tích hợp với dữ liệu phiếu kiểm tra thực tế.
              </Text>
              <Text style={{ color: '#374151', fontSize: 12, marginTop: 8, textAlign: 'center' }}>
                Tạo phiếu kiểm tra → kết quả sẽ tự động điền vào báo cáo.
              </Text>
            </Flex>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
