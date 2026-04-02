import { useCallback, useEffect, useState } from 'react';
import { Card, Row, Col, Typography, Flex, Table, Tag, Select, Button, message, Progress } from 'antd';
import { ReloadOutlined, DownloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { thietBiApi } from '../../api/thietBi';
import type { ThietBi, PhieuKiemTra } from '../../types/entities';

const { Title, Text } = Typography;

function rankFromHI(hi: number) {
  if (hi >= 85) return { rank: 'A', color: '#4ade80', label: 'Rất tốt',   bg: '#052e16', border: '#166534' };
  if (hi >= 70) return { rank: 'B', color: '#60a5fa', label: 'Tốt',       bg: '#0c1a3a', border: '#1d4ed8' };
  if (hi >= 55) return { rank: 'C', color: '#fbbf24', label: 'Trung bình', bg: '#1c1400', border: '#b45309' };
  if (hi >= 40) return { rank: 'D', color: '#f97316', label: 'Kém',       bg: '#1a0a00', border: '#9a3412' };
  return            { rank: 'E', color: '#f87171', label: 'Rất kém',   bg: '#1f0000', border: '#7f1d1d' };
}

export default function KetQuaPage() {
  const navigate = useNavigate();
  const [phieus, setPhieus]   = useState<PhieuKiemTra[]>([]);
  const [thietBis, setThietBis] = useState<ThietBi[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterRank, setFilterRank] = useState<string>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ps, tbs] = await Promise.all([
        api.get<PhieuKiemTra[]>('/api/PhieuKiemTra'),
        thietBiApi.getAll(),
      ]);
      setPhieus(ps);
      setThietBis(tbs);
    } catch {
      message.error('Không thể tải kết quả kiểm tra');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const tbName = (id: number) => thietBis.find(t => t.ID_ThietBi === id)?.TenThietBi ?? `TB #${id}`;

  // Latest phieu per thietbi (max ID)
  const latestPhieus = Object.values(
    phieus.reduce<Record<number, PhieuKiemTra>>((acc, p) => {
      if (!acc[p.ID_ThietBi] || p.ID_Phieu > acc[p.ID_ThietBi].ID_Phieu) acc[p.ID_ThietBi] = p;
      return acc;
    }, {})
  ).sort((a, b) => (a.TongDiem_Soqt ?? 100) - (b.TongDiem_Soqt ?? 100)); // worst first

  const filtered = filterRank === 'all'
    ? latestPhieus
    : latestPhieus.filter(p => p.TongDiem_Soqt !== undefined && rankFromHI(p.TongDiem_Soqt).rank === filterRank);

  const columns = [
    {
      title: '#', key: 'idx', width: 50, align: 'center' as const,
      render: (_: unknown, __: unknown, i: number) => <Text style={{ color: '#6b7280' }}>{i + 1}</Text>,
    },
    {
      title: 'Thiết bị', dataIndex: 'ID_ThietBi', key: 'tb',
      render: (v: number, r: PhieuKiemTra) => (
        <div>
          <Text strong style={{ color: '#e5e7eb', display: 'block', cursor: 'pointer' }}
            onClick={() => navigate(`/quan-ly/thiet-bi`)}>
            {r.TenThietBi ?? tbName(v)}
          </Text>
          <Text style={{ color: '#6b7280', fontSize: 11 }}>
            Kiểm tra: {r.NgayKiemTra?.slice(0, 10)} · KTV: {r.NguoiKiemTra ?? '—'}
          </Text>
        </div>
      ),
    },
    {
      title: 'CSSK', dataIndex: 'TongDiem_Soqt', key: 'hi', width: 160,
      sorter: (a: PhieuKiemTra, b: PhieuKiemTra) => (a.TongDiem_Soqt ?? 0) - (b.TongDiem_Soqt ?? 0),
      render: (v?: number) => v !== undefined ? (
        <Flex align="center" gap={8}>
          <Progress percent={v} size="small" showInfo={false}
            strokeColor={v >= 85 ? '#4ade80' : v >= 70 ? '#60a5fa' : v >= 55 ? '#fbbf24' : v >= 40 ? '#f97316' : '#f87171'}
            trailColor="#1f2937" style={{ width: 70 }} />
          <Text style={{ color: '#e5e7eb', fontFamily: 'monospace', fontSize: 13 }}>{v.toFixed(1)}</Text>
        </Flex>
      ) : <Text style={{ color: '#4b5563' }}>Chưa tính</Text>,
    },
    {
      title: 'Hạng', dataIndex: 'CapDoCanhBao', key: 'rank', width: 130,
      render: (v: string | undefined, r: PhieuKiemTra) => {
        const hi = r.TongDiem_Soqt;
        if (hi === undefined && !v) return <Text style={{ color: '#4b5563' }}>—</Text>;
        const rank = hi !== undefined ? rankFromHI(hi) : null;
        return rank ? (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 4,
            background: rank.bg, color: rank.color, border: `1px solid ${rank.border}`,
            fontSize: 12, fontWeight: 700,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: rank.color }} />
            {rank.rank} · {rank.label}
          </span>
        ) : <Tag>{v}</Tag>;
      },
    },
    {
      title: 'Khuyến nghị', dataIndex: 'TongDiem_Soqt', key: 'rec', width: 220,
      render: (v?: number) => {
        if (v === undefined) return <Text style={{ color: '#4b5563' }}>—</Text>;
        const r = rankFromHI(v);
        const actions: Record<string, string> = {
          A: 'Giám sát định kỳ',
          B: 'Tăng tần suất giám sát',
          C: 'Lập kế hoạch bảo trì 6 tháng',
          D: 'Bảo trì khẩn cấp 1–3 tháng',
          E: 'Ngừng vận hành, kiểm tra toàn diện',
        };
        return <Text style={{ color: r.color, fontSize: 12 }}>{actions[r.rank]}</Text>;
      },
    },
  ];

  const stats = {
    total: latestPhieus.length,
    A: latestPhieus.filter(p => p.TongDiem_Soqt !== undefined && p.TongDiem_Soqt >= 85).length,
    B: latestPhieus.filter(p => p.TongDiem_Soqt !== undefined && p.TongDiem_Soqt >= 70 && p.TongDiem_Soqt < 85).length,
    C: latestPhieus.filter(p => p.TongDiem_Soqt !== undefined && p.TongDiem_Soqt >= 55 && p.TongDiem_Soqt < 70).length,
    D: latestPhieus.filter(p => p.TongDiem_Soqt !== undefined && p.TongDiem_Soqt >= 40 && p.TongDiem_Soqt < 55).length,
    E: latestPhieus.filter(p => p.TongDiem_Soqt !== undefined && p.TongDiem_Soqt < 40).length,
  };

  return (
    <div style={{ color: '#f9fafb' }}>
      <Flex align="center" justify="space-between" style={{ marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ color: '#f9fafb', margin: 0 }}>Kết quả phân hạng CBM</Title>
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

      {/* Stats */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        {[
          { label: 'Hạng A (≥85)', val: stats.A, color: '#4ade80' },
          { label: 'Hạng B (70-84)', val: stats.B, color: '#60a5fa' },
          { label: 'Hạng C (55-69)', val: stats.C, color: '#fbbf24' },
          { label: 'Hạng D (40-54)', val: stats.D, color: '#f97316' },
          { label: 'Hạng E (<40)',   val: stats.E, color: '#f87171' },
        ].map(s => (
          <Col xs={12} sm={6} md={4} key={s.label}>
            <Card style={{ background: '#0d1117', border: '1px solid #1f2937', textAlign: 'center' }}
              styles={{ body: { padding: '12px 8px' } }}>
              <Text style={{ color: s.color, fontSize: 24, fontWeight: 700, fontFamily: 'monospace', display: 'block' }}>
                {s.val}
              </Text>
              <Text style={{ color: '#6b7280', fontSize: 11 }}>{s.label}</Text>
            </Card>
          </Col>
        ))}
        <Col xs={12} sm={6} md={4}>
          <Card style={{ background: '#0d1117', border: '1px solid #1f2937', textAlign: 'center' }}
            styles={{ body: { padding: '12px 8px' } }}>
            <Text style={{ color: '#9ca3af', fontSize: 24, fontWeight: 700, fontFamily: 'monospace', display: 'block' }}>
              {stats.total}
            </Text>
            <Text style={{ color: '#6b7280', fontSize: 11 }}>Tổng thiết bị có dữ liệu</Text>
          </Card>
        </Col>
      </Row>

      <Card style={{ background: '#0d1117', border: '1px solid #1f2937' }}
        styles={{ body: { padding: '16px 20px' } }}
        extra={
          <Select value={filterRank} onChange={setFilterRank} style={{ width: 170 }}
            options={[
              { label: 'Tất cả hạng', value: 'all' },
              { label: 'A — Rất tốt (≥85)', value: 'A' },
              { label: 'B — Tốt (70-84)', value: 'B' },
              { label: 'C — Trung bình', value: 'C' },
              { label: 'D — Kém', value: 'D' },
              { label: 'E — Rất kém', value: 'E' },
            ]}
          />
        }
        title={`Bảng phân hạng thiết bị — ${filtered.length} thiết bị`}
      >
        {phieus.length === 0 && !loading ? (
          <Flex vertical align="center" gap={12} style={{ padding: '40px 0' }}>
            <Text style={{ color: '#4b5563', fontSize: 15 }}>Chưa có phiếu kiểm tra nào</Text>
            <Button type="primary" onClick={() => navigate('/nhap-lieu/phieu-kiem-tra')}>
              Tạo phiếu kiểm tra đầu tiên →
            </Button>
          </Flex>
        ) : (
          <Table
            dataSource={filtered}
            columns={columns}
            rowKey="ID_Phieu"
            loading={loading}
            size="small"
            pagination={{ pageSize: 15, showTotal: t => `Tổng ${t} thiết bị`, showSizeChanger: true }}
          />
        )}
      </Card>
    </div>
  );
}
