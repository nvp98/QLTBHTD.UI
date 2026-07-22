import { useCallback, useEffect, useState } from 'react';
import { Card, Typography, Flex, Table, Button, message, Progress, Segmented } from 'antd';
import { ReloadOutlined, DownloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { phieuKiemTraApi } from '../../api/phieuKiemTra';
import type { PhieuKiemTra } from '../../types/entities';
import { useThemeMode } from '../../theme/ThemeModeContext';
import { getCapDoSucKhoe } from '../../theme/capDoSucKhoe';

const { Title, Text } = Typography;

/** Hiển thị ngày theo giờ địa phương, tránh lệch UTC */
const fmtDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default function KetQuaPage() {
  const navigate = useNavigate();
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  const [phieus, setPhieus] = useState<PhieuKiemTra[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'latest' | 'all'>('latest');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await phieuKiemTraApi.getPaged({ page: 1, pageSize: 1000 });
      setPhieus(result.items);
    } catch {
      message.error('Không thể tải kết quả kiểm tra');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Phiếu mới nhất của mỗi thiết bị
  const latestPhieus = Object.values(
    phieus.reduce<Record<number, PhieuKiemTra>>((acc, p) => {
      if (!acc[p.ID_ThietBi] || p.ID_Phieu > acc[p.ID_ThietBi].ID_Phieu) acc[p.ID_ThietBi] = p;
      return acc;
    }, {})
  ).sort((a, b) => (a.TongDiem_Soqt ?? 10) - (b.TongDiem_Soqt ?? 10));

  // Tất cả phiếu (mọi lần kiểm tra, mọi thiết bị) — mới nhất lên trước
  const allPhieusSorted = [...phieus].sort(
    (a, b) => new Date(b.NgayKiemTra).getTime() - new Date(a.NgayKiemTra).getTime()
  );

  const displayedPhieus = viewMode === 'all' ? allPhieusSorted : latestPhieus;

  const columns = [
    {
      title: '#', key: 'idx', width: 50, align: 'center' as const,
      render: (_: unknown, __: unknown, i: number) =>
        <Text style={{ color: '#6b7280' }}>{i + 1}</Text>,
    },
    {
      title: 'Thiết bị', dataIndex: 'ID_ThietBi', key: 'tb',
      render: (v: number, r: PhieuKiemTra) => (
        <div>
          <Text strong style={{ color: '#93c5fd', display: 'block', cursor: 'pointer' }}
            onClick={() => navigate(`/ket-qua/${r.ID_Phieu}`)}>
            {r.TenThietBi ?? `TB #${v}`}
          </Text>
          <Text style={{ color: '#6b7280', fontSize: 11 }}>
            Kiểm tra: {fmtDate(r.NgayKiemTra)} · KTV: {r.NguoiKiemTra ?? '—'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Nhóm chỉ tiêu', dataIndex: 'TenNhom', key: 'nhom', width: 180,
      render: (v?: string) =>
        <Text style={{ color: isDark ? '#9ca3af' : '#4b5563', fontSize: 12 }}>{v ?? 'Toàn diện'}</Text>,
    },
    {
      title: 'CSSK', dataIndex: 'TongDiem_Soqt', key: 'hi', width: 180,
      sorter: (a: PhieuKiemTra, b: PhieuKiemTra) => (a.TongDiem_Soqt ?? 0) - (b.TongDiem_Soqt ?? 0),
      render: (v?: number | null) => v != null ? (
        <Flex align="center" gap={8}>
          <Progress
            percent={v * 10}
            size="small"
            showInfo={false}
            strokeColor={getCapDoSucKhoe(v, isDark).color}
            trailColor={isDark ? '#1e4a72' : '#e5e7eb'}
            style={{ width: 80 }}
          />
          <Text style={{ color: isDark ? '#e5e7eb' : '#111827', fontFamily: 'monospace', fontSize: 13 }}>
            {v.toFixed(1)}
          </Text>
        </Flex>
      ) : <Text style={{ color: isDark ? '#6b7280' : '#9ca3af' }}>Chưa tính</Text>,
    },
  ];

  return (
    <div style={{ color: isDark ? '#f9fafb' : '#111827' }}>
      <Flex align="center" justify="space-between" style={{ marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ color: isDark ? '#f9fafb' : '#111827', margin: 0 }}>Kết quả kiểm tra CBM</Title>
          <Text style={{ color: '#6b7280', fontSize: 13 }}>
            Chỉ số sức khỏe thiết bị theo phương pháp CBM · EVN
          </Text>
        </div>
        <Flex gap={8}>
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Làm mới</Button>
          <Button icon={<DownloadOutlined />} onClick={() => navigate('/bao-cao')}>Xuất báo cáo</Button>
          <Button type="primary" onClick={() => navigate('/nhap-lieu/phieu-kiem-tra')}>+ Tạo phiếu mới</Button>
        </Flex>
      </Flex>

      <Card
        style={{ background: isDark ? '#0e2c4a' : '#ffffff', border: `1px solid ${isDark ? '#1e4a72' : '#e5e7eb'}` }}
        styles={{ body: { padding: '16px 20px' } }}
        title={
          <Flex align="center" gap={12} wrap>
            <span>
              {viewMode === 'all'
                ? `Danh sách kết quả — ${phieus.length} phiếu`
                : `Danh sách kết quả — ${latestPhieus.length} thiết bị`}
            </span>
            <Segmented
              size="small"
              value={viewMode}
              onChange={v => setViewMode(v as 'latest' | 'all')}
              options={[
                { label: 'Mới nhất mỗi thiết bị', value: 'latest' },
                { label: 'Tất cả phiếu', value: 'all' },
              ]}
            />
          </Flex>
        }
      >
        {phieus.length === 0 && !loading ? (
          <Flex vertical align="center" gap={12} style={{ padding: '40px 0' }}>
            <Text style={{ color: isDark ? '#6b7280' : '#9ca3af', fontSize: 15 }}>Chưa có phiếu kiểm tra nào</Text>
            <Button type="primary" onClick={() => navigate('/nhap-lieu/phieu-kiem-tra')}>
              Tạo phiếu kiểm tra đầu tiên →
            </Button>
          </Flex>
        ) : (
          <Table
            dataSource={displayedPhieus}
            columns={columns}
            rowKey="ID_Phieu"
            loading={loading}
            size="small"
            pagination={{ pageSize: 15, showTotal: t => `Tổng ${t} ${viewMode === 'all' ? 'phiếu' : 'thiết bị'}`, showSizeChanger: true }}
          />
        )}
      </Card>
    </div>
  );
}
