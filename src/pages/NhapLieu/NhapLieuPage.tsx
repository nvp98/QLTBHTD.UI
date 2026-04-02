import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Typography, Flex, Tag, Button } from 'antd';
import { ArrowRightOutlined, FormOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const WORKFLOW = [
  { step: '01', label: 'Chọn thiết bị cần kiểm tra', color: '#6366f1' },
  { step: '02', label: 'Hệ thống tải danh sách nhóm chỉ tiêu & chỉ tiêu', color: '#3b82f6' },
  { step: '03', label: 'Nhập giá trị đo được cho từng chỉ tiêu', color: '#0ea5e9' },
  { step: '04', label: 'Hệ thống tự động chấm điểm theo ngưỡng', color: '#10b981' },
  { step: '05', label: 'Tính CSSK = Σ (Điểm_nhóm × W_nhóm) × 10', color: '#f59e0b' },
  { step: '06', label: 'Lưu phiếu kiểm tra và xem kết quả phân hạng', color: '#f97316' },
];

export default function NhapLieuPage() {
  const navigate = useNavigate();

  return (
    <div style={{ color: '#f9fafb' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ color: '#f9fafb', margin: 0 }}>Nhập liệu kiểm tra CBM</Title>
        <Text style={{ color: '#6b7280' }}>
          Tạo phiếu kiểm tra thiết bị và tính toán chỉ số sức khỏe
        </Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          {/* Main action */}
          <Card style={{ background: '#0d1117', border: '1px solid #3b82f644', marginBottom: 16 }}
            styles={{ body: { padding: 24 } }}>
            <Flex gap={16} align="flex-start">
              <div style={{
                width: 56, height: 56, borderRadius: 12, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#3b82f622', color: '#3b82f6', fontSize: 24,
              }}>
                <FormOutlined />
              </div>
              <div style={{ flex: 1 }}>
                <Title level={4} style={{ color: '#f9fafb', margin: 0, marginBottom: 8 }}>
                  Tạo phiếu kiểm tra mới
                </Title>
                <Text style={{ color: '#9ca3af', display: 'block', marginBottom: 16 }}>
                  Chọn thiết bị → hệ thống tự động tải cấu hình nhóm chỉ tiêu & ngưỡng điểm theo loại thiết bị → nhập giá trị → hệ thống tính điểm CBM tự động.
                </Text>
                <Flex gap={8} wrap="wrap" style={{ marginBottom: 16 }}>
                  {['Chọn thiết bị', 'Nhập giá trị', 'Xem điểm CBM', 'Lưu phiếu'].map((s, i) => (
                    <Tag key={s} color={['blue', 'cyan', 'green', 'orange'][i]} style={{ fontSize: 12 }}>
                      {i + 1}. {s}
                    </Tag>
                  ))}
                </Flex>
                <Button type="primary" size="large" icon={<ArrowRightOutlined />}
                  onClick={() => navigate('/nhap-lieu/phieu-kiem-tra')}>
                  Tạo phiếu kiểm tra
                </Button>
              </div>
            </Flex>
          </Card>

          {/* Workflow steps */}
          <Card title="Quy trình nhập liệu CBM" style={{ background: '#0d1117', border: '1px solid #1f2937' }}
            styles={{ header: { color: '#f9fafb', borderBottom: '1px solid #1f2937' }, body: { padding: 20 } }}>
            {WORKFLOW.map((item, i) => (
              <Flex key={item.step} align="flex-start" gap={12} style={{ marginBottom: i < WORKFLOW.length - 1 ? 16 : 0 }}>
                <Flex vertical align="center" gap={0} style={{ flexShrink: 0 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `${item.color}22`, border: `2px solid ${item.color}44`,
                  }}>
                    <Text style={{ color: item.color, fontFamily: 'monospace', fontSize: 11, fontWeight: 700 }}>
                      {item.step}
                    </Text>
                  </div>
                  {i < WORKFLOW.length - 1 && (
                    <div style={{ width: 1, height: 20, background: '#1f2937', margin: '4px 0' }} />
                  )}
                </Flex>
                <Text style={{ color: '#e5e7eb', fontSize: 13, paddingTop: 6 }}>{item.label}</Text>
              </Flex>
            ))}
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card title="Lưu ý khi nhập liệu" style={{ background: '#0d1117', border: '1px solid #1f2937' }}
            styles={{ header: { color: '#f9fafb', borderBottom: '1px solid #1f2937' }, body: { padding: 20 } }}>
            {[
              { title: 'Đơn vị đo', desc: 'Nhập đúng đơn vị theo từng chỉ tiêu (ppm, kV, %, ms...)' },
              { title: 'Ngưỡng điểm', desc: 'Điểm Sᵢ được tra theo ngưỡng: nếu giá trị ∈ [Cận dưới; Cận trên] → đạt Diem_Si điểm' },
              { title: 'Trọng số', desc: 'Mỗi chỉ tiêu có trọng số Wᵢ. CSSK = Σ(Sᵢ × Wᵢ) × trọng_số_nhóm × 10' },
              { title: 'Phân hạng', desc: 'A≥85 · B70-84 · C55-69 · D40-54 · E<40' },
            ].map(item => (
              <div key={item.title} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid #1f2937' }}>
                <Text strong style={{ color: '#93c5fd', fontSize: 13, display: 'block', marginBottom: 4 }}>
                  {item.title}
                </Text>
                <Text style={{ color: '#9ca3af', fontSize: 12 }}>{item.desc}</Text>
              </div>
            ))}
            <Button block onClick={() => navigate('/ket-qua')} style={{ marginTop: 4 }}>
              Xem kết quả phân hạng →
            </Button>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
