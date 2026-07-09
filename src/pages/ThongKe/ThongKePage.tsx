import { useCallback, useEffect, useState } from 'react';
import {
  Row, Col, Card, Typography, Flex, Tabs, Spin, Table, Select,
  Tag, Progress, message, Tooltip, Empty,
} from 'antd';
import {
  WarningOutlined, CheckCircleOutlined, ReloadOutlined,
  ApartmentOutlined, BarChartOutlined, LineChartOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useThemeMode } from '../../theme/ThemeModeContext';
import { thongKeApi } from '../../api/thongKe';
import { thietBiApi } from '../../api/thietBi';
import type {
  ThongKeTongHopDto, LichSuCSSKDto, BaoCaoTramItemDto, CanhBaoThietBiDto,
} from '../../api/thongKe';
import type { ThietBi } from '../../types/entities';

const { Title, Text } = Typography;

// ─── Màu & nhãn theo mức CSSK ──────────────────────────────────────────────
function getCapDo(diem?: number | null) {
  if (diem == null) return { color: '#6b7280', label: 'Chưa tính', bg: '#6b728022' };
  if (diem >= 8) return { color: '#4ade80', label: 'Tốt',        bg: '#4ade8022' };
  if (diem >= 6) return { color: '#60a5fa', label: 'Bình thường',bg: '#60a5fa22' };
  if (diem >= 4) return { color: '#fbbf24', label: 'Chú ý',      bg: '#fbbf2422' };
  if (diem >= 2) return { color: '#f97316', label: 'Cảnh báo',   bg: '#f9731622' };
  return           { color: '#f87171', label: 'Nguy hiểm',       bg: '#f8717122' };
}

const fmtDate = (iso?: string) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// ─── SVG Line Chart ─────────────────────────────────────────────────────────
interface LinePoint { label: string; value: number | null; id: number }

function CSSKLineChart({ data, color, isDark }: { data: LinePoint[]; color: string; isDark: boolean }) {
  const W = 680, H = 220;
  const pad = { top: 24, right: 24, bottom: 48, left: 52 };
  const iW = W - pad.left - pad.right;
  const iH = H - pad.top - pad.bottom;

  const validPoints = data.filter(d => d.value !== null);
  if (validPoints.length === 0) return (
    <Flex justify="center" align="center" style={{ height: H }}>
      <Empty description="Chưa có dữ liệu kiểm tra" />
    </Flex>
  );

  const n = data.length;
  const xOf = (i: number) => pad.left + (n === 1 ? iW / 2 : (i / (n - 1)) * iW);
  const yOf = (v: number) => pad.top + (1 - v / 10) * iH;

  // Polyline chỉ nối các điểm có giá trị liên tiếp
  const segments: string[][] = [];
  let cur: string[] = [];
  data.forEach((d, i) => {
    if (d.value !== null) {
      cur.push(`${xOf(i)},${yOf(d.value)}`);
    } else if (cur.length) {
      segments.push(cur);
      cur = [];
    }
  });
  if (cur.length) segments.push(cur);

  const gridVals = [0, 2, 4, 6, 8, 10];
  const axisColor = isDark ? '#374151' : '#e5e7eb';
  const textColor = isDark ? '#6b7280' : '#9ca3af';
  const gradId = `grad-${color.replace('#', '')}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Grid & Y-axis labels */}
      {gridVals.map(v => (
        <g key={v}>
          <line x1={pad.left} y1={yOf(v)} x2={W - pad.right} y2={yOf(v)}
            stroke={axisColor} strokeWidth={v === 0 ? 1.5 : 0.5} strokeDasharray={v === 0 ? '' : '3 3'} />
          <text x={pad.left - 8} y={yOf(v) + 4} textAnchor="end"
            fontSize={10} fill={textColor}>{v}</text>
        </g>
      ))}

      {/* Threshold zones */}
      <rect x={pad.left} y={yOf(8)} width={iW} height={yOf(6) - yOf(8)} fill="#4ade8008" />
      <rect x={pad.left} y={yOf(6)} width={iW} height={yOf(4) - yOf(6)} fill="#60a5fa08" />
      <rect x={pad.left} y={yOf(4)} width={iW} height={yOf(2) - yOf(4)} fill="#fbbf2408" />
      <rect x={pad.left} y={yOf(2)} width={iW} height={yOf(0) - yOf(2)} fill="#f9731608" />

      {/* Area fill for first segment */}
      {segments[0] && segments[0].length > 1 && (
        <polygon
          points={`${xOf(0)},${yOf(0)} ${segments[0].join(' ')} ${xOf(data.length - 1)},${yOf(0)}`}
          fill={`url(#${gradId})`}
        />
      )}

      {/* Lines */}
      {segments.map((seg, si) =>
        seg.length > 1 && (
          <polyline key={si} points={seg.join(' ')}
            fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        )
      )}

      {/* X-axis labels & data points */}
      {data.map((d, i) => {
        const x = xOf(i);
        const showLabel = n <= 10 || i % Math.ceil(n / 10) === 0 || i === n - 1;
        return (
          <g key={d.id}>
            {showLabel && (
              <text x={x} y={H - 6} textAnchor="middle" fontSize={9} fill={textColor}
                transform={n > 6 ? `rotate(-30, ${x}, ${H - 6})` : undefined}>
                {d.label}
              </text>
            )}
            {d.value !== null && (
              <>
                <circle cx={x} cy={yOf(d.value)} r={4} fill={color} stroke={isDark ? '#0d1117' : '#fff'} strokeWidth={2} />
                <title>{`${d.label}: ${d.value.toFixed(1)}`}</title>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Tab 1: Tổng hợp ────────────────────────────────────────────────────────
function TabTongHop({ isDark }: { isDark: boolean }) {
  const [data, setData] = useState<ThongKeTongHopDto | null>(null);
  const [loading, setLoading] = useState(true);
  const panelBg = isDark ? '#0d1117' : '#ffffff';
  const panelBorder = isDark ? '#1f2937' : '#e5e7eb';
  const tc = isDark ? '#f9fafb' : '#111827';

  useEffect(() => {
    thongKeApi.getTongHop()
      .then(setData)
      .catch(() => message.error('Không thể tải thống kê tổng hợp'))
      .finally(() => setLoading(false));
  }, []);

  const LEVELS = [
    { key: 'thietBiTot',        label: 'Tốt (≥8)',          color: '#4ade80' },
    { key: 'thietBiBinhThuong', label: 'Bình thường (6–8)', color: '#60a5fa' },
    { key: 'thietBiChuY',       label: 'Chú ý (4–6)',       color: '#fbbf24' },
    { key: 'thietBiCanhBao',    label: 'Cảnh báo (2–4)',    color: '#f97316' },
    { key: 'thietBiNguyHiem',   label: 'Nguy hiểm (<2)',     color: '#f87171' },
    { key: 'thietBiChuaKiemTra',label: 'Chưa kiểm tra',      color: '#6b7280' },
  ] as const;

  const kiemTraTotal = data ? (data.tongThietBi || 1) : 1;

  return (
    <Spin spinning={loading}>
      {/* Summary metric cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {[
          { label: 'Tổng thiết bị',    value: data?.tongThietBi,       color: '#6366f1', icon: <ApartmentOutlined /> },
          { label: 'Phiếu tháng này',  value: data?.tongPhieuThangNay, color: '#3b82f6', icon: <BarChartOutlined /> },
          { label: 'CSSK trung bình',  value: data?.diemTrungBinh != null ? data.diemTrungBinh.toFixed(1) : '—', color: '#10b981', icon: <LineChartOutlined /> },
          { label: 'Cần chú ý',        value: data ? (data.thietBiChuY + data.thietBiCanhBao + data.thietBiNguyHiem) : '—', color: '#f97316', icon: <WarningOutlined /> },
        ].map(m => (
          <Col xs={12} sm={6} key={m.label}>
            <Card style={{ background: panelBg, border: `1px solid ${panelBorder}` }}
              styles={{ body: { padding: '16px 20px' } }}>
              <Flex align="center" gap={14}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${m.color}22`, color: m.color, fontSize: 20,
                }}>
                  {m.icon}
                </div>
                <div>
                  <Text style={{ color: '#6b7280', fontSize: 12, display: 'block' }}>{m.label}</Text>
                  <Text style={{ color: tc, fontSize: 22, fontWeight: 700, fontFamily: 'monospace' }}>
                    {m.value ?? '—'}
                  </Text>
                </div>
              </Flex>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Phân bố CSSK */}
      <Card title="Phân bố sức khỏe thiết bị"
        style={{ background: panelBg, border: `1px solid ${panelBorder}` }}
        styles={{ header: { color: tc, borderBottom: `1px solid ${panelBorder}` }, body: { padding: '20px 24px' } }}>
        <Row gutter={[24, 16]}>
          {LEVELS.map(lv => {
            const count = data ? (data[lv.key] as number) : 0;
            const pct = Math.round((count / kiemTraTotal) * 100);
            return (
              <Col xs={24} sm={12} key={lv.key}>
                <Flex justify="space-between" align="center" style={{ marginBottom: 4 }}>
                  <Flex align="center" gap={8}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: lv.color, flexShrink: 0 }} />
                    <Text style={{ color: isDark ? '#d1d5db' : '#374151', fontSize: 13 }}>{lv.label}</Text>
                  </Flex>
                  <Flex align="center" gap={8}>
                    <Text style={{ color: lv.color, fontFamily: 'monospace', fontSize: 13, fontWeight: 700 }}>
                      {count}
                    </Text>
                    <Text style={{ color: '#6b7280', fontSize: 11 }}>({pct}%)</Text>
                  </Flex>
                </Flex>
                <Progress
                  percent={pct}
                  showInfo={false}
                  strokeColor={lv.color}
                  trailColor={isDark ? '#1f2937' : '#e5e7eb'}
                  size="small"
                />
              </Col>
            );
          })}
        </Row>

        {/* Legend bar */}
        {data && data.tongThietBi > 0 && (
          <div style={{ marginTop: 24 }}>
            <Text style={{ color: '#6b7280', fontSize: 12, display: 'block', marginBottom: 8 }}>
              Phân bố tổng quan ({data.tongThietBi} thiết bị)
            </Text>
            <div style={{ display: 'flex', height: 20, borderRadius: 6, overflow: 'hidden', gap: 1 }}>
              {LEVELS.map(lv => {
                const count = data[lv.key] as number;
                const pct = (count / data.tongThietBi) * 100;
                return pct > 0 ? (
                  <Tooltip key={lv.key} title={`${lv.label}: ${count} thiết bị (${pct.toFixed(1)}%)`}>
                    <div style={{ flex: pct, background: lv.color, minWidth: count > 0 ? 4 : 0 }} />
                  </Tooltip>
                ) : null;
              })}
            </div>
          </div>
        )}
      </Card>
    </Spin>
  );
}

// ─── Tab 2: Lịch sử CSSK thiết bị ──────────────────────────────────────────
function TabLichSuThietBi({ isDark }: { isDark: boolean }) {
  const navigate = useNavigate();
  const [thietBis, setThietBis] = useState<ThietBi[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [history, setHistory] = useState<LichSuCSSKDto[]>([]);
  const [loading, setLoading] = useState(false);
  const panelBg = isDark ? '#0d1117' : '#ffffff';
  const panelBorder = isDark ? '#1f2937' : '#e5e7eb';
  const tc = isDark ? '#f9fafb' : '#111827';

  useEffect(() => {
    thietBiApi.getActive().then(setThietBis).catch(() => {});
  }, []);

  const loadHistory = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const data = await thongKeApi.getLichSuThietBi(id);
      setHistory(data);
    } catch {
      message.error('Không thể tải lịch sử kiểm tra');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selected != null) loadHistory(selected);
    else setHistory([]);
  }, [selected, loadHistory]);

  const chartData: LinePoint[] = history.map(h => ({
    id: h.iD_Phieu,
    label: fmtDate(h.ngayKiemTra),
    value: h.tongDiem_Soqt,
  }));

  const latestDiem = history.length > 0 ? history[history.length - 1].tongDiem_Soqt : null;
  const capDo = getCapDo(latestDiem);

  const histCols = [
    { title: 'Ngày kiểm tra', dataIndex: 'ngayKiemTra', key: 'ngay', width: 140,
      render: (v: string) => <Text style={{ color: tc, fontSize: 13 }}>{fmtDate(v)}</Text> },
    { title: 'CSSK', dataIndex: 'tongDiem_Soqt', key: 'diem', width: 180,
      render: (v: number | null) => v != null ? (
        <Flex align="center" gap={8}>
          <Progress percent={v * 10} size="small" showInfo={false}
            strokeColor={getCapDo(v).color}
            trailColor={isDark ? '#1f2937' : '#e5e7eb'} style={{ width: 80 }} />
          <Text style={{ color: getCapDo(v).color, fontFamily: 'monospace', fontSize: 13, fontWeight: 600 }}>
            {v.toFixed(1)}
          </Text>
        </Flex>
      ) : <Text style={{ color: '#6b7280' }}>Chưa tính</Text> },
    { title: 'Mức', dataIndex: 'capDoCanhBao', key: 'cap', width: 110,
      render: (_: unknown, r: LichSuCSSKDto) => {
        const cd = getCapDo(r.tongDiem_Soqt);
        return <Tag color={cd.color} style={{ color: '#fff', borderColor: 'transparent' }}>{r.capDoCanhBao || cd.label}</Tag>;
      } },
    { title: 'KTV', dataIndex: 'nguoiKiemTra', key: 'ktv',
      render: (v: string | null) => <Text style={{ color: '#6b7280', fontSize: 12 }}>{v ?? '—'}</Text> },
    { title: '', key: 'action', width: 80,
      render: (_: unknown, r: LichSuCSSKDto) => (
        <Text style={{ color: '#60a5fa', fontSize: 12, cursor: 'pointer' }}
          onClick={() => navigate(`/ket-qua/${r.iD_Phieu}`)}>
          Xem →
        </Text>
      ) },
  ];

  return (
    <Flex vertical gap={16}>
      <Card style={{ background: panelBg, border: `1px solid ${panelBorder}` }}
        styles={{ body: { padding: '16px 20px' } }}>
        <Flex align="center" gap={16} wrap="wrap">
          <Text style={{ color: tc, fontWeight: 600 }}>Chọn thiết bị:</Text>
          <Select
            showSearch
            placeholder="Tìm và chọn thiết bị..."
            style={{ minWidth: 320 }}
            value={selected}
            onChange={setSelected}
            allowClear
            filterOption={(input, opt) =>
              (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
            options={thietBis.map(tb => ({
              value: tb.ID_ThietBi,
              label: `${tb.TenThietBi}${tb.TenTram ? ` — ${tb.TenTram}` : ''}`,
            }))}
          />
          {latestDiem != null && (
            <Flex align="center" gap={8}>
              <Text style={{ color: '#6b7280', fontSize: 12 }}>CSSK mới nhất:</Text>
              <Tag style={{ background: capDo.bg, color: capDo.color, border: `1px solid ${capDo.color}44`, fontSize: 13, fontWeight: 700 }}>
                {latestDiem.toFixed(1)} — {capDo.label}
              </Tag>
            </Flex>
          )}
        </Flex>
      </Card>

      {selected != null && (
        <Spin spinning={loading}>
          <Card title={`Biểu đồ xu hướng CSSK (${history.length} lần kiểm tra)`}
            style={{ background: panelBg, border: `1px solid ${panelBorder}` }}
            styles={{ header: { color: tc, borderBottom: `1px solid ${panelBorder}` }, body: { padding: '16px 20px' } }}>
            {history.length === 0 && !loading ? (
              <Empty description="Thiết bị chưa có phiếu kiểm tra nào" style={{ padding: '40px 0' }} />
            ) : (
              <CSSKLineChart data={chartData} color="#3b82f6" isDark={isDark} />
            )}
          </Card>

          {history.length > 0 && (
            <Card title="Lịch sử các lần kiểm tra"
              style={{ background: panelBg, border: `1px solid ${panelBorder}` }}
              styles={{ header: { color: tc, borderBottom: `1px solid ${panelBorder}` }, body: { padding: '8px 0' } }}>
              <Table
                dataSource={[...history].reverse()}
                columns={histCols}
                rowKey="iD_Phieu"
                size="small"
                pagination={{ pageSize: 8, showTotal: t => `${t} phiếu` }}
              />
            </Card>
          )}
        </Spin>
      )}

      {selected == null && (
        <Flex justify="center" align="center" style={{ padding: '60px 0' }}>
          <Flex vertical align="center" gap={12}>
            <LineChartOutlined style={{ fontSize: 40, color: '#374151' }} />
            <Text style={{ color: '#6b7280' }}>Chọn một thiết bị để xem biểu đồ xu hướng CSSK</Text>
          </Flex>
        </Flex>
      )}
    </Flex>
  );
}

// ─── Tab 3: Báo cáo theo trạm ───────────────────────────────────────────────
function TabBaoCaoTram({ isDark }: { isDark: boolean }) {
  const [data, setData] = useState<BaoCaoTramItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const panelBg = isDark ? '#0d1117' : '#ffffff';
  const panelBorder = isDark ? '#1f2937' : '#e5e7eb';
  const tc = isDark ? '#f9fafb' : '#111827';

  useEffect(() => {
    thongKeApi.getBaoCaoTram()
      .then(setData)
      .catch(() => message.error('Không thể tải báo cáo trạm'))
      .finally(() => setLoading(false));
  }, []);

  const MiniBar = ({ item }: { item: BaoCaoTramItemDto }) => {
    const total = item.totCount + item.binhThuongCount + item.chuYCount + item.canhBaoCount + item.nguHiemCount;
    if (total === 0) return <Text style={{ color: '#6b7280', fontSize: 11 }}>Chưa có dữ liệu</Text>;
    const bars = [
      { count: item.totCount,         color: '#4ade80' },
      { count: item.binhThuongCount,  color: '#60a5fa' },
      { count: item.chuYCount,        color: '#fbbf24' },
      { count: item.canhBaoCount,     color: '#f97316' },
      { count: item.nguHiemCount,     color: '#f87171' },
    ];
    return (
      <div style={{ display: 'flex', height: 14, borderRadius: 4, overflow: 'hidden', gap: 1, minWidth: 120 }}>
        {bars.map((b, i) =>
          b.count > 0 ? (
            <Tooltip key={i} title={`${b.count} thiết bị`}>
              <div style={{ flex: b.count, background: b.color }} />
            </Tooltip>
          ) : null
        )}
      </div>
    );
  };

  const cols = [
    { title: '#', key: 'idx', width: 40, align: 'center' as const,
      render: (_: unknown, __: unknown, i: number) => <Text style={{ color: '#6b7280' }}>{i + 1}</Text> },
    { title: 'Trạm điện', key: 'tram', dataIndex: 'tenTram',
      render: (v: string, r: BaoCaoTramItemDto) => (
        <div>
          <Text strong style={{ color: tc, fontSize: 13, display: 'block' }}>{v}</Text>
          {r.diaDiem && <Text style={{ color: '#6b7280', fontSize: 11 }}>{r.diaDiem}</Text>}
        </div>
      ) },
    { title: 'Tổng TB', dataIndex: 'tongThietBi', key: 'tong', width: 90, align: 'center' as const,
      render: (v: number) => <Text style={{ color: tc, fontFamily: 'monospace' }}>{v}</Text> },
    { title: 'Đã KT', dataIndex: 'daKiemTra', key: 'dakt', width: 80, align: 'center' as const,
      render: (v: number, r: BaoCaoTramItemDto) => (
        <Flex vertical align="center" gap={2}>
          <Text style={{ color: tc, fontFamily: 'monospace' }}>{v}/{r.tongThietBi}</Text>
          {r.tongThietBi > 0 && (
            <Progress percent={Math.round((v / r.tongThietBi) * 100)} size={[50, 4]}
              showInfo={false} strokeColor="#3b82f6" trailColor={isDark ? '#1f2937' : '#e5e7eb'} />
          )}
        </Flex>
      ) },
    { title: 'CSSK TB', dataIndex: 'diemTrungBinh', key: 'diem', width: 110,
      sorter: (a: BaoCaoTramItemDto, b: BaoCaoTramItemDto) => (a.diemTrungBinh ?? 0) - (b.diemTrungBinh ?? 0),
      render: (v: number | null) => v != null ? (
        <Flex align="center" gap={6}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: getCapDo(v).color, flexShrink: 0 }} />
          <Text style={{ color: getCapDo(v).color, fontFamily: 'monospace', fontWeight: 600, fontSize: 13 }}>
            {v.toFixed(1)}
          </Text>
        </Flex>
      ) : <Text style={{ color: '#6b7280' }}>—</Text> },
    { title: 'Phân bố CSSK', key: 'phanbo',
      render: (_: unknown, r: BaoCaoTramItemDto) => <MiniBar item={r} /> },
    { title: 'Cần xử lý', key: 'canxuly', width: 90, align: 'center' as const,
      render: (_: unknown, r: BaoCaoTramItemDto) => {
        const cnt = r.chuYCount + r.canhBaoCount + r.nguHiemCount;
        return cnt > 0 ? (
          <Tag icon={<WarningOutlined />} color="warning" style={{ fontWeight: 600 }}>{cnt}</Tag>
        ) : (
          <Tag icon={<CheckCircleOutlined />} color="success">OK</Tag>
        );
      } },
  ];

  return (
    <Spin spinning={loading}>
      <Card style={{ background: panelBg, border: `1px solid ${panelBorder}` }}
        styles={{ body: { padding: '8px 0' } }}
        title={`Tổng hợp theo trạm điện (${data.length} trạm)`}
        extra={
          <Flex gap={8} align="center">
            {[
              { color: '#4ade80', label: 'Tốt' }, { color: '#60a5fa', label: 'Bình thường' },
              { color: '#fbbf24', label: 'Chú ý' }, { color: '#f97316', label: 'Cảnh báo' },
              { color: '#f87171', label: 'Nguy hiểm' },
            ].map(l => (
              <Flex key={l.label} align="center" gap={4}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
                <Text style={{ color: isDark ? '#9ca3af' : '#6b7280', fontSize: 11 }}>{l.label}</Text>
              </Flex>
            ))}
          </Flex>
        }>
        <Table
          dataSource={data}
          columns={cols}
          rowKey="iDTram"
          size="small"
          loading={loading}
          pagination={{ pageSize: 12, showTotal: t => `${t} trạm` }}
          rowClassName={(r) =>
            (r.chuYCount + r.canhBaoCount + r.nguHiemCount) > 0
              ? (isDark ? 'row-warn-dark' : 'row-warn-light')
              : ''}
        />
      </Card>
    </Spin>
  );
}

// ─── Tab 4: Cảnh báo ────────────────────────────────────────────────────────
function TabCanhBao({ isDark }: { isDark: boolean }) {
  const navigate = useNavigate();
  const [data, setData] = useState<CanhBaoThietBiDto[]>([]);
  const [loading, setLoading] = useState(true);
  const panelBorder = isDark ? '#1f2937' : '#e5e7eb';
  const tc = isDark ? '#f9fafb' : '#111827';

  useEffect(() => {
    thongKeApi.getCanhBao()
      .then(setData)
      .catch(() => message.error('Không thể tải danh sách cảnh báo'))
      .finally(() => setLoading(false));
  }, []);

  const cols = [
    { title: '#', key: 'idx', width: 44, align: 'center' as const,
      render: (_: unknown, __: unknown, i: number) => <Text style={{ color: '#6b7280' }}>{i + 1}</Text> },
    { title: 'Thiết bị', key: 'tb',
      render: (_: unknown, r: CanhBaoThietBiDto) => (
        <div>
          <Flex align="center" gap={8} style={{ marginBottom: 2 }}>
            {r.kyHieu && <Tag style={{ fontSize: 10, padding: '0 6px', margin: 0 }}>{r.kyHieu}</Tag>}
            <Text strong style={{ color: tc, fontSize: 13, cursor: 'pointer' }}
              onClick={() => navigate(`/ket-qua/${r.iD_Phieu}`)}>
              {r.tenThietBi}
            </Text>
          </Flex>
          <Text style={{ color: '#6b7280', fontSize: 11 }}>{r.tenTram}</Text>
        </div>
      ) },
    { title: 'CSSK', key: 'diem', width: 180,
      sorter: (a: CanhBaoThietBiDto, b: CanhBaoThietBiDto) => (a.tongDiem_Soqt ?? 0) - (b.tongDiem_Soqt ?? 0),
      defaultSortOrder: 'ascend' as const,
      render: (_: unknown, r: CanhBaoThietBiDto) => r.tongDiem_Soqt != null ? (
        <Flex align="center" gap={8}>
          <Progress percent={r.tongDiem_Soqt * 10} size="small" showInfo={false}
            strokeColor={getCapDo(r.tongDiem_Soqt).color}
            trailColor={isDark ? '#1f2937' : '#e5e7eb'} style={{ width: 80 }} />
          <Text style={{ color: getCapDo(r.tongDiem_Soqt).color, fontFamily: 'monospace', fontWeight: 600 }}>
            {r.tongDiem_Soqt.toFixed(1)}
          </Text>
        </Flex>
      ) : <Text style={{ color: '#6b7280' }}>—</Text> },
    { title: 'Mức độ', dataIndex: 'capDoCanhBao', key: 'cap', width: 120,
      render: (v: string, r: CanhBaoThietBiDto) => {
        const cd = getCapDo(r.tongDiem_Soqt);
        return (
          <Tag icon={<ExclamationCircleOutlined />}
            style={{ background: cd.bg, color: cd.color, border: `1px solid ${cd.color}55`, fontWeight: 600 }}>
            {v || cd.label}
          </Tag>
        );
      } },
    { title: 'Ngày KT', dataIndex: 'ngayKiemTra', key: 'ngay', width: 120,
      render: (v: string) => <Text style={{ color: '#6b7280', fontSize: 12 }}>{fmtDate(v)}</Text> },
    { title: '', key: 'action', width: 80,
      render: (_: unknown, r: CanhBaoThietBiDto) => (
        <Text style={{ color: '#60a5fa', fontSize: 12, cursor: 'pointer' }}
          onClick={() => navigate(`/ket-qua/${r.iD_Phieu}`)}>
          Chi tiết →
        </Text>
      ) },
  ];

  const nguHiem = data.filter(d => (d.tongDiem_Soqt ?? 10) < 2).length;
  const canhBao = data.filter(d => {
    const v = d.tongDiem_Soqt ?? 10;
    return v >= 2 && v < 4;
  }).length;
  const chuY = data.filter(d => {
    const v = d.tongDiem_Soqt ?? 10;
    return v >= 4 && v < 6;
  }).length;

  return (
    <Flex vertical gap={16}>
      {/* Alert summary */}
      {data.length > 0 && (
        <Row gutter={[12, 12]}>
          {[
            { label: 'Chú ý (4–6)', count: chuY,    color: '#fbbf24', icon: <WarningOutlined /> },
            { label: 'Cảnh báo (2–4)', count: canhBao, color: '#f97316', icon: <WarningOutlined /> },
            { label: 'Nguy hiểm (<2)', count: nguHiem, color: '#f87171', icon: <ExclamationCircleOutlined /> },
          ].map(s => (
            <Col xs={8} key={s.label}>
              <Card style={{ background: `${s.color}11`, border: `1px solid ${s.color}44`, textAlign: 'center' as const }}
                styles={{ body: { padding: '12px 16px' } }}>
                <div style={{ color: s.color, fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
                <Text style={{ color: s.color, fontSize: 24, fontWeight: 700, fontFamily: 'monospace', display: 'block' }}>
                  {s.count}
                </Text>
                <Text style={{ color: s.color, fontSize: 11 }}>{s.label}</Text>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Card
        title={
          <Flex align="center" gap={10}>
            <WarningOutlined style={{ color: '#f97316' }} />
            <span>Thiết bị cần chú ý / cảnh báo</span>
            {data.length > 0 && (
              <Tag color="orange" style={{ marginLeft: 4 }}>{data.length} thiết bị</Tag>
            )}
          </Flex>
        }
        style={{ background: isDark ? '#0d1117' : '#ffffff', border: `1px solid ${panelBorder}` }}
        styles={{ header: { color: tc, borderBottom: `1px solid ${panelBorder}` }, body: { padding: '8px 0' } }}>
        {data.length === 0 && !loading ? (
          <Flex vertical align="center" gap={12} style={{ padding: '40px 0' }}>
            <CheckCircleOutlined style={{ fontSize: 36, color: '#4ade80' }} />
            <Text style={{ color: '#4ade80', fontSize: 15 }}>Tất cả thiết bị đang ở mức an toàn!</Text>
          </Flex>
        ) : (
          <Table
            dataSource={data}
            columns={cols}
            rowKey="iD_ThietBi"
            size="small"
            loading={loading}
            pagination={{ pageSize: 10, showTotal: t => `${t} thiết bị` }}
            rowClassName={(r) => {
              const v = r.tongDiem_Soqt ?? 10;
              if (v < 2)  return isDark ? 'row-danger-dark' : 'row-danger-light';
              if (v < 4)  return isDark ? 'row-warn-dark'   : 'row-warn-light';
              return '';
            }}
          />
        )}
      </Card>
    </Flex>
  );
}

// ─── Main ThongKePage ────────────────────────────────────────────────────────
export default function ThongKePage() {
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  const tc = isDark ? '#f9fafb' : '#111827';

  const tabs = [
    {
      key: 'tong-hop',
      label: (
        <Flex align="center" gap={6}>
          <BarChartOutlined />
          <span>Tổng hợp</span>
        </Flex>
      ),
      children: <TabTongHop isDark={isDark} />,
    },
    {
      key: 'lich-su',
      label: (
        <Flex align="center" gap={6}>
          <LineChartOutlined />
          <span>Lịch sử thiết bị</span>
        </Flex>
      ),
      children: <TabLichSuThietBi isDark={isDark} />,
    },
    {
      key: 'theo-tram',
      label: (
        <Flex align="center" gap={6}>
          <ApartmentOutlined />
          <span>Báo cáo theo trạm</span>
        </Flex>
      ),
      children: <TabBaoCaoTram isDark={isDark} />,
    },
    {
      key: 'canh-bao',
      label: (
        <Flex align="center" gap={6}>
          <WarningOutlined />
          <span>Cảnh báo</span>
        </Flex>
      ),
      children: <TabCanhBao isDark={isDark} />,
    },
  ];

  return (
    <div style={{ color: tc }}>
      <Flex align="center" justify="space-between" style={{ marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ color: tc, margin: 0 }}>Thống kê & Báo cáo CBM</Title>
          <Text style={{ color: '#6b7280', fontSize: 13 }}>
            Phân tích sức khỏe thiết bị điện theo phương pháp CBM · EVN
          </Text>
        </div>
        <Flex align="center" gap={8}>
          <ReloadOutlined
            style={{ color: '#6b7280', cursor: 'pointer', fontSize: 16 }}
            title="Tải lại trang"
            onClick={() => window.location.reload()}
          />
        </Flex>
      </Flex>

      <Tabs
        defaultActiveKey="tong-hop"
        items={tabs}
        size="large"
        style={{ color: tc }}
      />
    </div>
  );
}
