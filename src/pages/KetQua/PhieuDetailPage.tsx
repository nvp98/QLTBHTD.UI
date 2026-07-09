import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Row, Col, Typography, Flex, Tag, Button, Spin, Progress,
  Table, Divider, message,
} from 'antd';
import { ArrowLeftOutlined, FileTextOutlined } from '@ant-design/icons';
import { phieuKiemTraApi } from '../../api/phieuKiemTra';
import type { PhieuKiemTraDetailDto, ChiTietKiemTra } from '../../types/entities';
import { useThemeMode } from '../../theme/ThemeModeContext';

const { Title, Text } = Typography;

/** Hiển thị ngày theo giờ địa phương, tránh lệch UTC */
const fmtDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

function rankInfo(hi: number) {
  if (hi >= 8) return { rank: 'A', color: '#4ade80', label: 'Rất tốt',    bg: '#052e16', border: '#166534' };
  if (hi >= 6) return { rank: 'B', color: '#60a5fa', label: 'Tốt',        bg: '#0c1a3a', border: '#1d4ed8' };
  if (hi >= 4) return { rank: 'C', color: '#fbbf24', label: 'Trung bình', bg: '#1c1400', border: '#b45309' };
  if (hi >= 2) return { rank: 'D', color: '#f97316', label: 'Kém',        bg: '#1a0a00', border: '#9a3412' };
  return            { rank: 'E', color: '#f87171', label: 'Rất kém',   bg: '#1f0000', border: '#7f1d1d' };
}

function scoreColor(s: number): string {
  if (s >= 8) return '#4ade80';
  if (s >= 6) return '#60a5fa';
  if (s >= 4) return '#fbbf24';
  return '#f87171';
}

export default function PhieuDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  const [phieu, setPhieu] = useState<PhieuKiemTraDetailDto | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await phieuKiemTraApi.getDetail(Number(id));
      setPhieu(data);
    } catch {
      message.error('Không thể tải chi tiết phiếu kiểm tra');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const columns = [
    {
      title: 'Chỉ tiêu',
      dataIndex: 'TenChiTieu',
      key: 'ten',
      render: (v: string) => <Text style={{ color: isDark ? '#e5e7eb' : '#111827' }}>{v}</Text>,
    },
    {
      title: 'Giá trị đo',
      dataIndex: 'GiaTriNhap_So',
      key: 'gtso',
      width: 120,
      render: (v?: number) => (
        <Text style={{ color: '#9ca3af', fontFamily: 'monospace' }}>
          {v !== undefined && v !== null ? v : <span style={{ color: '#4b5563' }}>—</span>}
        </Text>
      ),
    },
    {
      title: 'Giá trị chữ',
      dataIndex: 'GiaTriNhap_Chu',
      key: 'gtchu',
      width: 140,
      render: (v?: string) => (
        <Text style={{ color: '#9ca3af' }}>{v || <span style={{ color: '#4b5563' }}>—</span>}</Text>
      ),
    },
    {
      title: 'Điểm Sᵢ',
      dataIndex: 'Diem_Si_DatDuoc',
      key: 'diem',
      width: 160,
      render: (v?: number) => {
        if (v === undefined || v === null)
          return <Text style={{ color: '#4b5563' }}>Chưa chấm</Text>;
        return (
          <Flex align="center" gap={8}>
            <Progress
              percent={v * 10}
              size="small"
              showInfo={false}
              strokeColor={scoreColor(v)}
              trailColor={isDark ? '#1f2937' : '#e5e7eb'}
              style={{ width: 70 }}
            />
            <Text style={{ color: scoreColor(v), fontFamily: 'monospace', fontSize: 12 }}>
              {v}/10
            </Text>
          </Flex>
        );
      },
    },
    {
      title: 'Ghi chú',
      dataIndex: 'GhiChu',
      key: 'ghichu',
      render: (v?: string) => (
        <Text style={{ color: '#6b7280', fontSize: 12 }}>{v || '—'}</Text>
      ),
    },
  ];

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ height: 300 }}>
        <Spin size="large" />
      </Flex>
    );
  }

  if (!phieu) {
    return (
      <Flex vertical align="center" gap={12} style={{ padding: '60px 0' }}>
        <FileTextOutlined style={{ fontSize: 48, color: '#374151' }} />
        <Text style={{ color: '#6b7280' }}>Không tìm thấy phiếu kiểm tra</Text>
        <Button onClick={() => navigate('/ket-qua')}>← Quay lại</Button>
      </Flex>
    );
  }

  const ri = phieu.TongDiem_Soqt !== undefined && phieu.TongDiem_Soqt !== null
    ? rankInfo(phieu.TongDiem_Soqt)
    : null;

  return (
    <div style={{ color: isDark ? '#f9fafb' : '#111827' }}>
      {/* Breadcrumb */}
      <Flex align="center" gap={12} style={{ marginBottom: 20 }}>
        <Button icon={<ArrowLeftOutlined />} type="text" style={{ color: isDark ? '#9ca3af' : '#4b5563' }}
          onClick={() => navigate('/ket-qua')}>
          Kết quả
        </Button>
        <Text style={{ color: '#4b5563' }}>/</Text>
        <Text style={{ color: isDark ? '#f9fafb' : '#111827' }}>Chi tiết phiếu #{phieu.ID_Phieu}</Text>
      </Flex>

      <Row gutter={[16, 16]}>
        {/* Thông tin phiếu */}
        <Col xs={24} lg={8}>
          <Card style={{ background: isDark ? '#0d1117' : '#ffffff', border: `1px solid ${isDark ? '#1f2937' : '#e5e7eb'}` }}
            styles={{ body: { padding: 20 } }}>
            <Title level={5} style={{ color: isDark ? '#f9fafb' : '#111827', marginTop: 0, marginBottom: 16 }}>
              Thông tin phiếu
            </Title>

            {[
              { label: 'Thiết bị',    value: phieu.TenThietBi },
              { label: 'Ngày kiểm tra', value: fmtDate(phieu.NgayKiemTra) },
              { label: 'Kỹ thuật viên', value: phieu.NguoiKiemTra ?? '—' },
              { label: 'Ghi chú',    value: phieu.GhiChuChung ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ marginBottom: 12 }}>
                <Text style={{ color: '#6b7280', fontSize: 11, display: 'block' }}>{label}</Text>
                <Text style={{ color: isDark ? '#e5e7eb' : '#111827' }}>{value}</Text>
              </div>
            ))}

            <Divider style={{ borderColor: isDark ? '#1f2937' : '#e5e7eb', margin: '16px 0' }} />

            {/* CSSK */}
            {ri && phieu.TongDiem_Soqt !== undefined && phieu.TongDiem_Soqt !== null ? (
              <div style={{
                padding: 16, borderRadius: 8, textAlign: 'center',
                background: ri.bg, border: `1px solid ${ri.border}`,
              }}>
                <Text style={{ color: ri.color, fontSize: 40, fontWeight: 700,
                  fontFamily: 'monospace', lineHeight: 1, display: 'block' }}>
                  {Number(phieu.TongDiem_Soqt).toFixed(1)}
                </Text>
                <Text style={{ color: '#6b7280', fontSize: 12, display: 'block', marginTop: 4 }}>
                  / 10 — CSSK
                </Text>
                <Tag style={{
                  marginTop: 10, fontSize: 13, padding: '2px 12px',
                  background: `${ri.color}22`, border: `1px solid ${ri.border}`, color: ri.color,
                }}>
                  Hạng {ri.rank} · {ri.label}
                </Tag>
              </div>
            ) : (
              <Text style={{ color: '#4b5563' }}>Chưa tính điểm</Text>
            )}
          </Card>
        </Col>

        {/* Bảng chi tiết chỉ tiêu */}
        <Col xs={24} lg={16}>
          <Card
            title={
              <Flex align="center" gap={8}>
                <FileTextOutlined style={{ color: '#3b82f6' }} />
                <span>Chi tiết từng chỉ tiêu</span>
                <Tag style={{ marginLeft: 4 }}>{phieu.ChiTiets?.length ?? 0} chỉ tiêu</Tag>
              </Flex>
            }
            style={{ background: isDark ? '#0d1117' : '#ffffff', border: `1px solid ${isDark ? '#1f2937' : '#e5e7eb'}` }}
            styles={{ header: { color: isDark ? '#f9fafb' : '#111827', borderBottom: `1px solid ${isDark ? '#1f2937' : '#e5e7eb'}` }, body: { padding: 0 } }}
          >
            <Table<ChiTietKiemTra>
              dataSource={phieu.ChiTiets ?? []}
              columns={columns}
              rowKey="ID_ChiTiet"
              size="small"
              pagination={false}
              style={{ background: 'transparent' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
