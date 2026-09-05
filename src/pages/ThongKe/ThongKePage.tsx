import { useCallback, useEffect, useState } from 'react';
import {
  Row, Col, Card, Typography, Flex, Tabs, Spin, Table, Select,
  Tag, Progress, message, Tooltip, Empty,
} from 'antd';
import {
  ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis,
  Tooltip as RTooltip, Legend,
} from 'recharts';
import {
  WarningOutlined, CheckCircleOutlined, ReloadOutlined,
  ApartmentOutlined, BarChartOutlined, LineChartOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useThemeMode } from '../../theme/ThemeModeContext';
import { getCapDoSucKhoe } from '../../theme/capDoSucKhoe';
import { thongKeApi } from '../../api/thongKe';
import { thietBiApi } from '../../api/thietBi';
import type {
  ThongKeTongHopDto, LichSuCSSKDto, BaoCaoTramItemDto, CanhBaoThietBiDto,
} from '../../api/thongKe';
import type { ThietBi } from '../../types/entities';

const { Title, Text } = Typography;

// ─── Màu & nhãn theo mức CSSK (theo theme sáng/tối) ─────────────────────────
const getCapDo = (diem: number | null | undefined, isDark: boolean) => getCapDoSucKhoe(diem, isDark);

const fmtDate = (iso?: string) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// ─── Line Chart (recharts) — phong cách nhiều đường mảnh, nền sáng, legend trên đầu ────────────
interface LinePoint { label: string; value: number | null; id: number }

function CSSKLineChart({ data, color, isDark, name = 'CSSK' }: {
  data: LinePoint[]; color: string; isDark: boolean; name?: string;
}) {
  const H = 260;

  const validPoints = data.filter(d => d.value !== null);
  if (validPoints.length === 0) return (
    <Flex justify="center" align="center" style={{ height: H }}>
      <Empty description="Chưa có dữ liệu kiểm tra" />
    </Flex>
  );

  const chartData = data.map(d => ({ label: d.label, value: d.value }));
  const gridColor = isDark ? '#1e4a72' : '#e5e7eb';
  const textColor = isDark ? '#9ca3af' : '#6b7280';
  const n = data.length;
  const tickInterval = n <= 12 ? 0 : Math.ceil(n / 12) - 1;

  return (
    <ResponsiveContainer width="100%" height={H}>
      <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke={gridColor} strokeDasharray="3 3" />
        <XAxis dataKey="label" interval={tickInterval} tick={{ fontSize: 11, fill: textColor }}
          axisLine={{ stroke: gridColor }} tickLine={false} />
        <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: textColor }}
          axisLine={false} tickLine={false} width={28} />
        <RTooltip
          contentStyle={{ background: isDark ? '#123a5e' : '#fff', border: `1px solid ${gridColor}`, fontSize: 12 }}
          labelStyle={{ color: textColor }}
        />
        <Legend verticalAlign="top" align="left" height={32} wrapperStyle={{ fontSize: 12, color: textColor }} />
        <Line type="monotone" dataKey="value" name={name} stroke={color}
          strokeWidth={2} dot={false} activeDot={{ r: 4 }} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Tab 1: Tổng hợp ────────────────────────────────────────────────────────
function TabTongHop({ isDark }: { isDark: boolean }) {
  const [data, setData] = useState<ThongKeTongHopDto | null>(null);
  const [loading, setLoading] = useState(true);
  const panelBg = isDark ? '#0e2c4a' : '#ffffff';
  const panelBorder = isDark ? '#1e4a72' : '#e5e7eb';
  const tc = isDark ? '#f9fafb' : '#111827';

  useEffect(() => {
    thongKeApi.getTongHop()
      .then(setData)
      .catch(() => message.error('Không thể tải thống kê tổng hợp'))
      .finally(() => setLoading(false));
  }, []);

  const LEVELS = [
    { key: 'thietBiTot', label: 'Tốt (≥8)', color: getCapDoSucKhoe(9, isDark).color },
    { key: 'thietBiBinhThuong', label: 'Khá (6–8)', color: getCapDoSucKhoe(7, isDark).color },
    { key: 'thietBiChuY', label: 'Trung bình (4–6)', color: getCapDoSucKhoe(5, isDark).color },
    { key: 'thietBiCanhBao', label: 'Cảnh báo (2–4)', color: getCapDoSucKhoe(3, isDark).color },
    { key: 'thietBiNguyHiem', label: 'Nguy hiểm (<2)', color: getCapDoSucKhoe(1, isDark).color },
    { key: 'thietBiChuaKiemTra', label: 'Chưa kiểm tra', color: '#6b7280' },
  ] as const;

  const kiemTraTotal = data ? (data.tongThietBi || 1) : 1;

  return (
    <Spin spinning={loading}>
      {/* Summary metric cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {[
          { label: 'Tổng thiết bị', value: data?.tongThietBi, color: '#6366f1', icon: <ApartmentOutlined /> },
          { label: 'Phiếu tháng này', value: data?.tongPhieuThangNay, color: '#3b82f6', icon: <BarChartOutlined /> },
          { label: 'CSSK trung bình', value: data?.diemTrungBinh != null ? data.diemTrungBinh.toFixed(1) : '—', color: '#10b981', icon: <LineChartOutlined /> },
          { label: 'Cần chú ý', value: data ? (data.thietBiChuY + data.thietBiCanhBao + data.thietBiNguyHiem) : '—', color: '#f97316', icon: <WarningOutlined /> },
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
                  railColor={isDark ? '#1e4a72' : '#e5e7eb'}
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
  const panelBg = isDark ? '#0e2c4a' : '#ffffff';
  const panelBorder = isDark ? '#1e4a72' : '#e5e7eb';
  const tc = isDark ? '#f9fafb' : '#111827';

  useEffect(() => {
    thietBiApi.getActive().then(setThietBis).catch(() => { });
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
  const capDo = getCapDo(latestDiem, isDark);

  const histCols = [
    {
      title: 'Ngày kiểm tra', dataIndex: 'ngayKiemTra', key: 'ngay', width: 140,
      render: (v: string) => <Text style={{ color: tc, fontSize: 13 }}>{fmtDate(v)}</Text>
    },
    {
      title: 'CSSK', dataIndex: 'tongDiem_Soqt', key: 'diem', width: 180,
      render: (v: number | null) => v != null ? (
        <Flex align="center" gap={8}>
          <Progress percent={v * 10} size="small" showInfo={false}
            strokeColor={getCapDo(v, isDark).color}
            railColor={isDark ? '#1e4a72' : '#e5e7eb'} style={{ width: 80 }} />
          <Text style={{ color: getCapDo(v, isDark).color, fontFamily: 'monospace', fontSize: 13, fontWeight: 600 }}>
            {v.toFixed(1)}
          </Text>
        </Flex>
      ) : <Text style={{ color: '#6b7280' }}>Chưa tính</Text>
    },
    {
      title: 'Mức',
      dataIndex: 'capDoCanhBao',
      key: 'cap',
      width: 110,
      render: (_: unknown, r: LichSuCSSKDto) => {
        const cd = getCapDo(r.tongDiem_Soqt, isDark);

        return (
          <Tag
            style={{
              background: cd.bg,
              color: cd.color,
              border: `1px solid ${cd.color}55`,
              fontWeight: 600,
              opacity: 1,
            }}
          >
            {r.capDoCanhBao || cd.label}
          </Tag>
        );
      },
    },
    {
      title: 'KTV', dataIndex: 'nguoiKiemTra', key: 'ktv',
      render: (v: string | null) => <Text style={{ color: '#6b7280', fontSize: 12 }}>{v ?? '—'}</Text>
    },
    {
      title: '', key: 'action', width: 80,
      render: (_: unknown, r: LichSuCSSKDto) => (
        <Text style={{ color: '#60a5fa', fontSize: 12, cursor: 'pointer' }}
          onClick={() => navigate(`/ket-qua/${r.iD_Phieu}`)}>
          Xem →
        </Text>
      )
    },
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
                scroll={{ x: 'max-content' }}
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
  const panelBg = isDark ? '#0e2c4a' : '#ffffff';
  const panelBorder = isDark ? '#1e4a72' : '#e5e7eb';
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
      { count: item.totCount, color: getCapDoSucKhoe(9, isDark).color },
      { count: item.binhThuongCount, color: getCapDoSucKhoe(7, isDark).color },
      { count: item.chuYCount, color: getCapDoSucKhoe(5, isDark).color },
      { count: item.canhBaoCount, color: getCapDoSucKhoe(3, isDark).color },
      { count: item.nguHiemCount, color: getCapDoSucKhoe(1, isDark).color },
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
    {
      title: '#', key: 'idx', width: 40, align: 'center' as const,
      render: (_: unknown, __: unknown, i: number) => <Text style={{ color: '#6b7280' }}>{i + 1}</Text>
    },
    {
      title: 'Trạm điện', key: 'tram', dataIndex: 'tenTram',
      render: (v: string, r: BaoCaoTramItemDto) => (
        <div>
          <Text strong style={{ color: tc, fontSize: 13, display: 'block' }}>{v}</Text>
          {r.diaDiem && <Text style={{ color: '#6b7280', fontSize: 11 }}>{r.diaDiem}</Text>}
        </div>
      )
    },
    {
      title: 'Tổng TB', dataIndex: 'tongThietBi', key: 'tong', width: 90, align: 'center' as const,
      render: (v: number) => <Text style={{ color: tc, fontFamily: 'monospace' }}>{v}</Text>
    },
    {
      title: 'Đã KT', dataIndex: 'daKiemTra', key: 'dakt', width: 80, align: 'center' as const,
      render: (v: number, r: BaoCaoTramItemDto) => (
        <Flex vertical align="center" gap={2}>
          <Text style={{ color: tc, fontFamily: 'monospace' }}>{v}/{r.tongThietBi}</Text>
          {r.tongThietBi > 0 && (
            <Progress percent={Math.round((v / r.tongThietBi) * 100)} size={[50, 4]}
              showInfo={false} strokeColor="#3b82f6" railColor={isDark ? '#1e4a72' : '#e5e7eb'} />
          )}
        </Flex>
      )
    },
    {
      title: 'CSSK TB', dataIndex: 'diemTrungBinh', key: 'diem', width: 110,
      sorter: (a: BaoCaoTramItemDto, b: BaoCaoTramItemDto) => (a.diemTrungBinh ?? 0) - (b.diemTrungBinh ?? 0),
      render: (v: number | null) => v != null ? (
        <Flex align="center" gap={6}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: getCapDo(v, isDark).color, flexShrink: 0 }} />
          <Text style={{ color: getCapDo(v, isDark).color, fontFamily: 'monospace', fontWeight: 600, fontSize: 13 }}>
            {v.toFixed(1)}
          </Text>
        </Flex>
      ) : <Text style={{ color: '#6b7280' }}>—</Text>
    },
    {
      title: 'Phân bố CSSK', key: 'phanbo',
      render: (_: unknown, r: BaoCaoTramItemDto) => <MiniBar item={r} />
    },
    {
      title: 'Cần xử lý', key: 'canxuly', width: 90, align: 'center' as const,
      render: (_: unknown, r: BaoCaoTramItemDto) => {
        const cnt = r.chuYCount + r.canhBaoCount + r.nguHiemCount;
        return cnt > 0 ? (
          <Tag icon={<WarningOutlined />} color="warning" style={{ fontWeight: 600 }}>{cnt}</Tag>
        ) : (
          <Tag icon={<CheckCircleOutlined />} color="success">OK</Tag>
        );
      }
    },
  ];

  return (
    <Spin spinning={loading}>
      <Card style={{ background: panelBg, border: `1px solid ${panelBorder}` }}
        styles={{ body: { padding: '8px 0' } }}
        title={`Tổng hợp theo trạm điện (${data.length} trạm)`}
        extra={
          <Flex gap={8} align="center">
            {[
              { color: getCapDoSucKhoe(9, isDark).color, label: 'Tốt' },
              { color: getCapDoSucKhoe(7, isDark).color, label: 'Khá' },
              { color: getCapDoSucKhoe(5, isDark).color, label: 'Trung bình' },
              { color: getCapDoSucKhoe(3, isDark).color, label: 'Cảnh báo' },
              { color: getCapDoSucKhoe(1, isDark).color, label: 'Nguy hiểm' },
            ].map(l => (
              <Flex key={l.label} align="center" gap={4}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
                <Text style={{ color: isDark ? '#9ca3af' : '#6b7280', fontSize: 11 }}>{l.label}</Text>
              </Flex>
            ))}
          </Flex>
        }>
        <Table
          scroll={{ x: 'max-content' }}
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
  const panelBorder = isDark ? '#1e4a72' : '#e5e7eb';
  const tc = isDark ? '#f9fafb' : '#111827';

  useEffect(() => {
    thongKeApi.getCanhBao()
      .then(setData)
      .catch(() => message.error('Không thể tải danh sách cảnh báo'))
      .finally(() => setLoading(false));
  }, []);

  const cols = [
    {
      title: '#', key: 'idx', width: 44, align: 'center' as const,
      render: (_: unknown, __: unknown, i: number) => <Text style={{ color: '#6b7280' }}>{i + 1}</Text>
    },
    {
      title: 'Thiết bị', key: 'tb',
      render: (_: unknown, r: CanhBaoThietBiDto) => (
        <div>
          <Flex align="center" gap={8} style={{ marginBottom: 2 }}>
            {r.kyHieu && <Tag style={{ fontSize: 10, padding: '0 6px', margin: 0 }}>{r.kyHieu}</Tag>}
            <Text strong style={{ color: tc, fontSize: 13, cursor: 'pointer' }}
              onClick={() => navigate(`/ket-qua/${r.iD_Phieu}`)}>
              {r.tenThietBi}
            </Text>
          </Flex>
          <Text style={{ color: '#6b7280', fontSize: 11 }}>
            {r.tenTram}
            {r.nguonDiem === 'CHI_TIEU' && r.tenChiTieuThapNhat && ` · Sᵢ thấp nhất: ${r.tenChiTieuThapNhat}`}
          </Text>
        </div>
      )
    },
    {
      title: 'CSSK', key: 'diem', width: 180,
      sorter: (a: CanhBaoThietBiDto, b: CanhBaoThietBiDto) => a.diemHienThi - b.diemHienThi,
      defaultSortOrder: 'ascend' as const,
      render: (_: unknown, r: CanhBaoThietBiDto) => (
        <Flex align="center" gap={8}>
          <Progress percent={r.diemHienThi * 10} size="small" showInfo={false}
            strokeColor={getCapDo(r.diemHienThi, isDark).color}
            railColor={isDark ? '#1e4a72' : '#e5e7eb'} style={{ width: 80 }} />
          <Text style={{ color: getCapDo(r.diemHienThi, isDark).color, fontFamily: 'monospace', fontWeight: 600 }}>
            {r.diemHienThi.toFixed(1)}
          </Text>
          {r.nguonDiem === 'CHI_TIEU' && (
            <Tag style={{ fontSize: 9, margin: 0 }}>theo chỉ tiêu</Tag>
          )}
        </Flex>
      )
    },
    {
      title: 'Mức độ', dataIndex: 'capDoCanhBao', key: 'cap', width: 120,
      render: (v: string, r: CanhBaoThietBiDto) => {
        const cd = getCapDo(r.diemHienThi, isDark);
        return (
          <Tag icon={<ExclamationCircleOutlined />}
            style={{ background: cd.bg, color: cd.color, border: `1px solid ${cd.color}55`, fontWeight: 600 }}>
            {v || cd.label}
          </Tag>
        );
      }
    },
    {
      title: 'Ngày KT', dataIndex: 'ngayKiemTra', key: 'ngay', width: 120,
      render: (v: string) => <Text style={{ color: '#6b7280', fontSize: 12 }}>{fmtDate(v)}</Text>
    },
    {
      title: '', key: 'action', width: 80,
      render: (_: unknown, r: CanhBaoThietBiDto) => (
        <Text style={{ color: '#60a5fa', fontSize: 12, cursor: 'pointer' }}
          onClick={() => navigate(`/ket-qua/${r.iD_Phieu}`)}>
          Chi tiết →
        </Text>
      )
    },
  ];

  const nguHiem = data.filter(d => d.diemHienThi < 2).length;
  const canhBao = data.filter(d => d.diemHienThi >= 2 && d.diemHienThi < 4).length;
  const chuY = data.filter(d => d.diemHienThi >= 4 && d.diemHienThi < 6).length;

  return (
    <Flex vertical gap={16}>
      {/* Alert summary */}
      {data.length > 0 && (
        <Row gutter={[12, 12]}>
          {[
            { label: 'Trung bình (4–6)', count: chuY, color: getCapDoSucKhoe(5, isDark).color, icon: <WarningOutlined /> },
            { label: 'Cảnh báo (2–4)', count: canhBao, color: getCapDoSucKhoe(3, isDark).color, icon: <WarningOutlined /> },
            { label: 'Nguy hiểm (<2)', count: nguHiem, color: getCapDoSucKhoe(1, isDark).color, icon: <ExclamationCircleOutlined /> },
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
        style={{ background: isDark ? '#0e2c4a' : '#ffffff', border: `1px solid ${panelBorder}` }}
        styles={{ header: { color: tc, borderBottom: `1px solid ${panelBorder}` }, body: { padding: '8px 0' } }}>
        {data.length === 0 && !loading ? (
          <Flex vertical align="center" gap={12} style={{ padding: '40px 0' }}>
            <CheckCircleOutlined style={{ fontSize: 36, color: getCapDoSucKhoe(9, isDark).color }} />
            <Text style={{ color: getCapDoSucKhoe(9, isDark).color, fontSize: 15 }}>Tất cả thiết bị đang ở mức an toàn!</Text>
          </Flex>
        ) : (
          <Table
            scroll={{ x: 'max-content' }}
            dataSource={data}
            columns={cols}
            rowKey="iD_ThietBi"
            size="small"
            loading={loading}
            pagination={{ pageSize: 10, showTotal: t => `${t} thiết bị` }}
            rowClassName={(r) => {
              const v = r.tongDiem_Soqt ?? 10;
              if (v < 2) return isDark ? 'row-danger-dark' : 'row-danger-light';
              if (v < 4) return isDark ? 'row-warn-dark' : 'row-warn-light';
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
