import { useCallback, useEffect, useMemo, useState } from 'react';
import { Row, Col, Card, Typography, Flex, Spin, Tag, Empty, Collapse, Select, message } from 'antd';
import {
  EnvironmentOutlined, ThunderboltOutlined, ApartmentOutlined,
  SettingOutlined, BulbOutlined, UnorderedListOutlined,
  WarningOutlined, CheckCircleOutlined, HeartOutlined, CalendarOutlined,
  ClockCircleOutlined, FileTextOutlined, PercentageOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line,
} from 'recharts';
import StatCard from '../components/common/StatCard';
import { useThemeMode } from '../theme/ThemeModeContext';
import { getCapDoSucKhoe } from '../theme/capDoSucKhoe';
import { khuVucApi }      from '../api/khuVuc';
import { tramDienApi }    from '../api/tramDien';
import { thietBiApi }     from '../api/thietBi';
import { loaiThietBiApi } from '../api/loaiThietBi';
import { nhomChiTieuApi } from '../api/nhomChiTieu';
import { chiTieuApi }     from '../api/chiTieu';
import { thongKeApi } from '../api/thongKe';
import type { ThongKeTongHopDto, CanhBaoThietBiDto, XuHuongThangDto, TongHopTheoLoaiDto, BaoCaoTramItemDto } from '../api/thongKe';
import { lichBaoTriApi } from '../api/lichBaoTri';
import type { ThongKeLichBaoTriDto } from '../api/lichBaoTri';
import type { TramDien, LoaiThietBi, ThietBi } from '../types/entities';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface Stats {
  khuVucs:     number;
  tramDiens:   number;
  thietBis:    number;
  loaiThietBi: number;
  nhomChiTieu: number;
  chiTieu:     number;
}

const QUICK_ACTIONS = [
  { label: 'Quản lý thiết bị',       path: '/quan-ly/thiet-bi',         icon: <ApartmentOutlined />,     color: '#6366f1' },
  { label: 'Chỉ tiêu & Ngưỡng',      path: '/cau-hinh/chi-tieu',        icon: <SettingOutlined />,       color: '#8b5cf6' },
  { label: 'Nhập liệu kiểm tra',     path: '/nhap-lieu',                icon: <UnorderedListOutlined />, color: '#f97316' },
  { label: 'Lịch bảo trì',           path: '/bao-tri/lich',             icon: <CalendarOutlined />,      color: '#3b82f6' },
];

/** Gom danh sách cảnh báo theo Trạm — giữ nguyên thứ tự trạm xuất hiện đầu tiên (tức trạm có
 * thiết bị xấu nhất, vì canhBao đã được BE sắp xếp tăng dần theo DiemHienThi trước đó). */
function groupCanhBaoTheoTram(items: CanhBaoThietBiDto[]): { tenTram: string; items: CanhBaoThietBiDto[] }[] {
  const order: string[] = [];
  const map = new Map<string, CanhBaoThietBiDto[]>();
  for (const r of items) {
    if (!map.has(r.tenTram)) { map.set(r.tenTram, []); order.push(r.tenTram); }
    map.get(r.tenTram)!.push(r);
  }
  return order.map(tenTram => ({ tenTram, items: map.get(tenTram)! }));
}

const WORKFLOW_STEPS = [
  { step: '01', title: 'Cấu hình loại TB',    desc: 'Thêm MBA, MC, DCL, CSV...',          path: '/quan-ly/loai-thiet-bi',  color: '#6366f1' },
  { step: '02', title: 'Tạo nhóm chỉ tiêu',  desc: 'Phân nhóm chỉ tiêu cho từng loại TB', path: '/cau-hinh/nhom-chi-tieu',  color: '#3b82f6' },
  { step: '03', title: 'Thêm chỉ tiêu',       desc: 'Định nghĩa chỉ tiêu & ngưỡng điểm',  path: '/cau-hinh/chi-tieu',       color: '#0ea5e9' },
  { step: '04', title: 'Thêm khu vực & trạm', desc: 'Khai báo vị trí địa lý thiết bị',    path: '/quan-ly/khu-vuc',         color: '#10b981' },
  { step: '05', title: 'Đăng ký thiết bị',    desc: 'Thêm thiết bị vào trạm',              path: '/quan-ly/thiet-bi',        color: '#f59e0b' },
  { step: '06', title: 'Nhập liệu & Tính CSSK',desc: 'Tạo phiếu kiểm tra, tính điểm CBM', path: '/nhap-lieu',               color: '#f97316' },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  const [stats, setStats]     = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tongKe, setTongKe]       = useState<ThongKeTongHopDto | null>(null);
  const [canhBao, setCanhBao]     = useState<CanhBaoThietBiDto[]>([]);
  const [sucKhoeLoading, setSucKhoeLoading] = useState(true);
  const [tongHopLoai, setTongHopLoai] = useState<TongHopTheoLoaiDto[]>([]);
  const [baoCaoTram, setBaoCaoTram]   = useState<BaoCaoTramItemDto[]>([]);
  const [baoTri, setBaoTri]           = useState<ThongKeLichBaoTriDto | null>(null);
  const [baoTriLoading, setBaoTriLoading] = useState(true);
  const [xuHuong, setXuHuong]         = useState<XuHuongThangDto[]>([]);
  const [xuHuongLoading, setXuHuongLoading] = useState(true);
  const [xhTrams, setXhTrams]         = useState<TramDien[]>([]);
  const [xhLoais, setXhLoais]         = useState<LoaiThietBi[]>([]);
  const [xhThietBis, setXhThietBis]   = useState<ThietBi[]>([]);
  const [xhIdTram, setXhIdTram]       = useState<number | null>(null);
  const [xhIdLoaiTB, setXhIdLoaiTB]   = useState<number | null>(null);
  const [xhIdThietBi, setXhIdThietBi] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [kvs, tds, tbs, ltbs, ncts, cts] = await Promise.allSettled([
        khuVucApi.getAll(),
        tramDienApi.getAll(),
        thietBiApi.getAll(),
        loaiThietBiApi.getAll(),
        nhomChiTieuApi.getAll(),
        chiTieuApi.getAll(),
      ]);
      setStats({
        khuVucs:     kvs.status   === 'fulfilled' ? kvs.value.length   : 0,
        tramDiens:   tds.status   === 'fulfilled' ? tds.value.length   : 0,
        thietBis:    tbs.status   === 'fulfilled' ? tbs.value.length   : 0,
        loaiThietBi: ltbs.status  === 'fulfilled' ? ltbs.value.length  : 0,
        nhomChiTieu: ncts.status  === 'fulfilled' ? ncts.value.length  : 0,
        chiTieu:     cts.status   === 'fulfilled' ? cts.value.length   : 0,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSucKhoe = useCallback(async () => {
    setSucKhoeLoading(true);
    try {
      const [tk, cb, tl, bt] = await Promise.allSettled([
        thongKeApi.getTongHop(),
        thongKeApi.getCanhBao(),
        thongKeApi.getTongHopTheoLoai(),
        thongKeApi.getBaoCaoTram(),
      ]);
      setTongKe(tk.status === 'fulfilled' ? tk.value : null);
      setCanhBao(cb.status === 'fulfilled' ? cb.value : []);
      setTongHopLoai(tl.status === 'fulfilled' ? tl.value : []);
      setBaoCaoTram(bt.status === 'fulfilled' ? bt.value : []);
    } finally {
      setSucKhoeLoading(false);
    }
  }, []);

  const loadBaoTri = useCallback(async () => {
    setBaoTriLoading(true);
    try {
      setBaoTri(await lichBaoTriApi.getThongKe());
    } catch {
      setBaoTri(null);
    } finally {
      setBaoTriLoading(false);
    }
  }, []);

  const loadXuHuong = useCallback(async () => {
    setXuHuongLoading(true);
    try {
      setXuHuong(await thongKeApi.getXuHuongThang(6, xhIdTram, xhIdLoaiTB, xhIdThietBi));
    } catch {
      setXuHuong([]);
    } finally {
      setXuHuongLoading(false);
    }
  }, [xhIdTram, xhIdLoaiTB, xhIdThietBi]);

  useEffect(() => {
    tramDienApi.getActive().then(setXhTrams).catch(() => message.error('Lỗi tải danh sách trạm'));
    loaiThietBiApi.getActive().then(setXhLoais).catch(() => message.error('Lỗi tải loại thiết bị'));
    thietBiApi.getActive().then(setXhThietBis).catch(() => message.error('Lỗi tải danh sách thiết bị'));
  }, []);

  /** Danh sách thiết bị cho ô chọn, thu hẹp theo trạm/loại thiết bị đang chọn ở trên. */
  const xhThietBiOptions = useMemo(
    () => xhThietBis.filter(t =>
      (xhIdTram == null || t.ID_Tram === xhIdTram) &&
      (xhIdLoaiTB == null || t.ID_LoaiTB === xhIdLoaiTB),
    ),
    [xhThietBis, xhIdTram, xhIdLoaiTB],
  );

  /** Nếu đổi trạm/loại khiến thiết bị đang chọn không còn khớp thì bỏ chọn thiết bị đó. */
  useEffect(() => {
    if (xhIdThietBi != null && !xhThietBiOptions.some(t => t.ID_ThietBi === xhIdThietBi)) {
      setXhIdThietBi(null);
    }
  }, [xhThietBiOptions, xhIdThietBi]);

  useEffect(() => { load(); loadSucKhoe(); loadBaoTri(); }, [load, loadSucKhoe, loadBaoTri]);
  useEffect(() => { loadXuHuong(); }, [loadXuHuong]);

  const panelBg = isDark ? '#0e2c4a' : '#ffffff';
  const panelBorder = isDark ? '#1e4a72' : '#e5e7eb';
  const itemBg = isDark ? '#123a5e' : '#f9fafb';
  const titleColor = isDark ? '#f9fafb' : '#111827';
  const dimText = isDark ? '#9ca3af' : '#6b7280';
  const formulaBoxBg = isDark ? '#123a5e' : '#eff6ff';

  const pieData = useMemo(() => {
    if (!tongKe || tongKe.tongThietBi === 0) return [] as { name: string; value: number; color: string }[];
    const rows: { name: string; value: number; color: string }[] = ([
      ['Tốt', tongKe.thietBiTot, 9],
      ['Khá', tongKe.thietBiBinhThuong, 7],
      ['Trung bình', tongKe.thietBiChuY, 5],
      ['Cảnh báo', tongKe.thietBiCanhBao, 3],
      ['Nguy hiểm', tongKe.thietBiNguyHiem, 1],
    ] as const).map(([name, value, sample]) => ({ name, value, color: getCapDoSucKhoe(sample, isDark).color }));
    if (tongKe.thietBiChuaKiemTra > 0) {
      rows.push({ name: 'Chưa kiểm tra', value: tongKe.thietBiChuaKiemTra, color: isDark ? '#374151' : '#d1d5db' });
    }
    return rows.filter(d => d.value > 0);
  }, [tongKe, isDark]);

  const xuHuongData = useMemo(
    () => xuHuong.map(x => ({
      thang: dayjs(`${x.thang}-01`).format('MM/YYYY'),
      diem: x.diemTrungBinh != null ? Number(x.diemTrungBinh.toFixed(2)) : null,
      soPhieu: x.soPhieu,
    })),
    [xuHuong],
  );

  /** So sánh điểm trung bình tháng gần nhất có dữ liệu với tháng trước đó — biết CSSK đang tăng hay giảm. */
  const xuHuongDelta = useMemo(() => {
    const coDiem = xuHuong.filter(x => x.diemTrungBinh != null);
    if (coDiem.length < 2) return null;
    const ganNhat = coDiem[coDiem.length - 1].diemTrungBinh!;
    const truocDo = coDiem[coDiem.length - 2].diemTrungBinh!;
    return ganNhat - truocDo;
  }, [xuHuong]);

  /** Tỷ lệ lịch bảo trì đang chờ KHÔNG bị quá hạn — chỉ số tuân thủ tiến độ kiểm tra/bảo trì định kỳ. */
  const tyLeTuanThu = useMemo(() => {
    if (!baoTri || baoTri.tongDangCho === 0) return null;
    return ((baoTri.tongDangCho - baoTri.soQuaHan) / baoTri.tongDangCho) * 100;
  }, [baoTri]);

  const canhBaoTheoTram = useMemo(() => groupCanhBaoTheoTram(canhBao), [canhBao]);
  const barData = useMemo(
    () => canhBaoTheoTram.map(g => ({ tram: g.tenTram, soLuong: g.items.length })),
    [canhBaoTheoTram],
  );

  /** CSSK trung bình theo trạm — xấu nhất lên đầu để giám đốc thấy ngay trạm nào cần quan tâm. */
  const baoCaoTramData = useMemo(
    () => baoCaoTram
      .filter(t => t.diemTrungBinh != null)
      .map(t => ({ tram: t.tenTram, diem: Number(t.diemTrungBinh!.toFixed(2)), color: getCapDoSucKhoe(t.diemTrungBinh!, isDark).color }))
      .sort((a, b) => a.diem - b.diem),
    [baoCaoTram, isDark],
  );

  const tooltipStyle = {
    background: panelBg, border: `1px solid ${panelBorder}`, borderRadius: 6,
    fontSize: 12, color: titleColor,
  };

  return (
    <div style={{ color: titleColor }}>
      <Flex align="center" justify="space-between" style={{ marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ color: titleColor, margin: 0 }}>
            Hệ thống CBM — Chỉ số sức khỏe thiết bị điện
          </Title>
          <Text style={{ color: dimText, fontSize: 13 }}>
            Phần mềm tính toán CSSK theo phương pháp CBM của EVN
          </Text>
        </div>
        <Tag color="blue" style={{ fontSize: 12, padding: '4px 10px' }}>
          CBM Platform v1.0
        </Tag>
      </Flex>

      {/* ── KPI: Sức khỏe thiết bị + Tổng quan bảo trì ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={14}>
          <Card
            style={{ background: panelBg, border: `1px solid ${panelBorder}`, height: '100%' }}
            styles={{ body: { padding: '20px 24px' } }}
            loading={sucKhoeLoading}
          >
            <Flex align="center" justify="space-between" style={{ marginBottom: 18 }}>
              <Flex align="center" gap={8}>
                <HeartOutlined style={{ color: '#f87171', fontSize: 16 }} />
                <Text strong style={{ color: titleColor, fontSize: 15 }}>Sức khỏe thiết bị toàn hệ thống</Text>
              </Flex>
              <Tag
                style={{ cursor: 'pointer' }}
                color="blue"
                onClick={() => navigate('/thong-ke')}
              >
                Xem chi tiết →
              </Tag>
            </Flex>

            {tongKe && tongKe.tongThietBi > 0 ? (
              <Row gutter={16} align="middle">
                <Col xs={24} sm={10}>
                  {/* CSSK trung bình theo TỪNG LOẠI THIẾT BỊ — không gộp thành 1 số toàn hệ thống vì
                      mỗi loại dùng bộ chỉ tiêu khác nhau và các trạm độc lập với nhau. */}
                  {tongHopLoai.length > 0 && (
                    <Flex vertical gap={10} style={{ maxHeight: 170, overflowY: 'auto', paddingRight: 6 }}>
                      {tongHopLoai.map(l => {
                        const info = l.diemTrungBinh != null ? getCapDoSucKhoe(l.diemTrungBinh, isDark) : null;
                        return (
                          <Flex key={l.iD_LoaiTB} justify="space-between" align="center" gap={8}>
                            <Flex vertical gap={0} style={{ minWidth: 0 }}>
                              <Text style={{ color: titleColor, fontSize: 13 }} ellipsis>{l.tenLoaiTB}</Text>
                              <Text style={{ color: dimText, fontSize: 11 }}>
                                {l.daKiemTra}/{l.tongThietBi} đã kiểm tra
                              </Text>
                            </Flex>
                            {info ? (
                              <Tag style={{
                                margin: 0, fontFamily: 'monospace', flexShrink: 0,
                                color: info.color, background: info.bg, borderColor: info.border,
                              }}>
                                {l.diemTrungBinh!.toFixed(1)}
                              </Tag>
                            ) : (
                              <Text style={{ color: dimText, fontSize: 11, flexShrink: 0 }}>Chưa có</Text>
                            )}
                          </Flex>
                        );
                      })}
                    </Flex>
                  )}
                </Col>
                <Col xs={24} sm={14}>
                  <ResponsiveContainer width="100%" height={170}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                        innerRadius={42} outerRadius={68} paddingAngle={2}>
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" />)}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value, name) => [`${value} thiết bị`, name]}
                        contentStyle={tooltipStyle}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </Col>
                <Col span={24}>
                  <Row gutter={[12, 6]} style={{ marginTop: 4 }}>
                    {pieData.map(d => (
                      <Col key={d.name} xs={12} sm={8}>
                        <Flex align="center" gap={6}>
                          <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                          <Text style={{ color: dimText, fontSize: 12 }}>{d.name}: </Text>
                          <Text strong style={{ color: titleColor, fontSize: 12, fontFamily: 'monospace' }}>{d.value}</Text>
                        </Flex>
                      </Col>
                    ))}
                  </Row>
                </Col>
              </Row>
            ) : (
              <Empty description="Chưa có dữ liệu thiết bị" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>

        {/* ── Tổng quan bảo trì ── */}
        <Col xs={24} lg={10}>
          <Card
            style={{ background: panelBg, border: `1px solid ${panelBorder}`, height: '100%', cursor: 'pointer' }}
            loading={baoTriLoading}
            onClick={() => navigate('/bao-tri/lich')}
            title={
              <Flex align="center" gap={8}>
                <CalendarOutlined style={{ color: '#3b82f6' }} />
                <span>Tổng quan bảo trì</span>
              </Flex>
            }
            extra={<Tag color="blue">Xem lịch →</Tag>}
            styles={{ header: { color: titleColor, borderBottom: `1px solid ${panelBorder}` }, body: { padding: 20 } }}
          >
            <Row gutter={12}>
              <Col span={8}>
                <Flex vertical align="center" gap={4}>
                  <Text style={{ fontSize: 32, fontWeight: 700, color: '#ef4444', fontFamily: 'monospace', lineHeight: 1 }}>
                    {baoTri?.soQuaHan ?? 0}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: dimText, textAlign: 'center' }}>Quá hạn</Text>
                </Flex>
              </Col>
              <Col span={8}>
                <Flex vertical align="center" gap={4}>
                  <Text style={{ fontSize: 32, fontWeight: 700, color: '#f97316', fontFamily: 'monospace', lineHeight: 1 }}>
                    {baoTri?.soSapToiHan7Ngay ?? 0}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: dimText, textAlign: 'center' }}>Sắp đến hạn</Text>
                </Flex>
              </Col>
              <Col span={8}>
                <Flex vertical align="center" gap={4}>
                  <Text style={{ fontSize: 32, fontWeight: 700, color: '#10b981', fontFamily: 'monospace', lineHeight: 1 }}>
                    {baoTri?.soHoanThanhThangNay ?? 0}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: dimText, textAlign: 'center' }}>Hoàn thành tháng này</Text>
                </Flex>
              </Col>
            </Row>
            <Text style={{ color: dimText, fontSize: 11.5, display: 'block', marginTop: 16, textAlign: 'center' }}>
              {baoTri?.tongDangCho ?? 0} lịch bảo trì đang chờ thực hiện
            </Text>

            {tyLeTuanThu != null && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${panelBorder}` }}>
                <Flex align="center" justify="space-between" style={{ marginBottom: 4 }}>
                  <Text style={{ color: dimText, fontSize: 11.5 }}>Tỷ lệ tuân thủ tiến độ</Text>
                  <Text style={{
                    fontSize: 13, fontWeight: 700, fontFamily: 'monospace',
                    color: tyLeTuanThu >= 90 ? '#10b981' : tyLeTuanThu >= 70 ? '#f59e0b' : '#ef4444',
                  }}>
                    {tyLeTuanThu.toFixed(0)}%
                  </Text>
                </Flex>
                <div style={{ height: 6, borderRadius: 3, background: itemBg, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${tyLeTuanThu}%`, borderRadius: 3,
                    background: tyLeTuanThu >= 90 ? '#10b981' : tyLeTuanThu >= 70 ? '#f59e0b' : '#ef4444',
                  }} />
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* ── KPI vận hành nhanh: độ phủ kiểm tra + khối lượng công việc ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {[
          {
            title: 'Phiếu kiểm tra tháng này', value: tongKe?.tongPhieuThangNay,
            icon: <FileTextOutlined />, color: '#3b82f6', path: '/ket-qua',
          },
          {
            title: 'Thiết bị chưa kiểm tra', value: tongKe?.thietBiChuaKiemTra,
            icon: <WarningOutlined />, color: '#f59e0b', path: '/quan-ly/thiet-bi',
          },
          {
            title: 'Tỷ lệ đã kiểm tra',
            value: tongKe && tongKe.tongThietBi > 0
              ? `${(((tongKe.tongThietBi - tongKe.thietBiChuaKiemTra) / tongKe.tongThietBi) * 100).toFixed(0)}%`
              : '—',
            icon: <PercentageOutlined />, color: '#10b981', path: '/thong-ke',
          },
          {
            title: 'Thiết bị cần chú ý', value: canhBao.length,
            icon: <HeartOutlined />, color: '#ef4444', path: '/thong-ke',
          },
        ].map(k => (
          <Col xs={12} md={6} key={k.title}>
            <StatCard
              title={k.title}
              value={k.value ?? '—'}
              icon={k.icon}
              color={k.color}
              onClick={() => navigate(k.path)}
            />
          </Col>
        ))}
      </Row>

      {/* ── Cảnh báo: thiết bị cần chú ý + bảo trì cần xử lý ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <Card
            style={{ background: panelBg, border: `1px solid ${panelBorder}`, height: '100%' }}
            loading={sucKhoeLoading}
            title={
              <Flex align="center" gap={8}>
                <WarningOutlined style={{ color: '#f97316' }} />
                <span>Cần chú ý ngay</span>
                {canhBao.length > 0 && <Tag color="orange">{canhBao.length}</Tag>}
              </Flex>
            }
            styles={{
              header: { color: titleColor, borderBottom: `1px solid ${panelBorder}` },
              body: { padding: canhBao.length === 0 ? 20 : '4px 0', maxHeight: 300, overflowY: 'auto' },
            }}
          >
            {canhBao.length === 0 ? (
              <Flex vertical align="center" gap={8} style={{ padding: '24px 0' }}>
                <CheckCircleOutlined style={{ fontSize: 30, color: getCapDoSucKhoe(9, isDark).color }} />
                <Text style={{ color: getCapDoSucKhoe(9, isDark).color, fontSize: 13 }}>
                  Tất cả thiết bị đang ở mức an toàn!
                </Text>
              </Flex>
            ) : (
              canhBaoTheoTram.slice(0, 3).map(nhom => (
                <div key={nhom.tenTram}>
                  <Flex align="center" gap={6} style={{
                    padding: '6px 20px', background: itemBg,
                    borderBottom: `1px solid ${panelBorder}`, borderTop: `1px solid ${panelBorder}`,
                  }}>
                    <EnvironmentOutlined style={{ color: dimText, fontSize: 11 }} />
                    <Text strong style={{ color: dimText, fontSize: 11.5 }}>{nhom.tenTram}</Text>
                    <Tag style={{ fontSize: 10, marginLeft: 'auto', lineHeight: '16px' }}>
                      {nhom.items.length} thiết bị
                    </Tag>
                  </Flex>
                  {nhom.items.slice(0, 4).map(r => {
                    const info = getCapDoSucKhoe(r.diemHienThi, isDark);
                    return (
                      <div
                        key={r.iD_ThietBi}
                        onClick={() => navigate(`/ket-qua/${r.iD_Phieu}`)}
                        style={{
                          padding: '10px 20px 10px 32px', cursor: 'pointer', borderBottom: `1px solid ${panelBorder}`,
                        }}
                      >
                        <Flex justify="space-between" align="center">
                          <div style={{ minWidth: 0 }}>
                            <Text strong style={{ color: titleColor, fontSize: 13, display: 'block' }}>
                              {r.tenThietBi}
                            </Text>
                            {r.nguonDiem === 'CHI_TIEU' && r.tenChiTieuThapNhat && (
                              <Text style={{ color: '#6b7280', fontSize: 11 }}>
                                Sᵢ thấp nhất: {r.tenChiTieuThapNhat}
                              </Text>
                            )}
                          </div>
                          <Tag style={{ color: info.color, background: info.bg, borderColor: info.border, flexShrink: 0 }}>
                            {r.diemHienThi.toFixed(1)}
                          </Tag>
                        </Flex>
                        {r.khuyenCaoHanhDong && (
                          <Text style={{ color: '#b45309', fontSize: 11, display: 'block', marginTop: 3 }}>
                            → {r.khuyenCaoHanhDong.length > 90 ? r.khuyenCaoHanhDong.slice(0, 90) + '…' : r.khuyenCaoHanhDong}
                          </Text>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
            {canhBao.length > 8 && (
              <div style={{ padding: '10px 20px', textAlign: 'center' }}>
                <Text
                  style={{ color: '#60a5fa', fontSize: 12, cursor: 'pointer' }}
                  onClick={() => navigate('/thong-ke')}
                >
                  Xem thêm {canhBao.length - 8} thiết bị →
                </Text>
              </div>
            )}
          </Card>
        </Col>

        {/* ── Bảo trì cần xử lý ── */}
        <Col xs={24} lg={12}>
          <Card
            style={{ background: panelBg, border: `1px solid ${panelBorder}`, height: '100%' }}
            loading={baoTriLoading}
            title={
              <Flex align="center" gap={8}>
                <ClockCircleOutlined style={{ color: '#ef4444' }} />
                <span>Bảo trì cần xử lý</span>
                {baoTri && (baoTri.soQuaHan + baoTri.soSapToiHan7Ngay) > 0 && (
                  <Tag color="red">{baoTri.soQuaHan + baoTri.soSapToiHan7Ngay}</Tag>
                )}
              </Flex>
            }
            styles={{
              header: { color: titleColor, borderBottom: `1px solid ${panelBorder}` },
              body: { padding: (baoTri?.danhSachCanChuY.length ?? 0) === 0 ? 20 : '4px 0', maxHeight: 300, overflowY: 'auto' },
            }}
          >
            {!baoTri || baoTri.danhSachCanChuY.length === 0 ? (
              <Flex vertical align="center" gap={8} style={{ padding: '24px 0' }}>
                <CheckCircleOutlined style={{ fontSize: 30, color: getCapDoSucKhoe(9, isDark).color }} />
                <Text style={{ color: getCapDoSucKhoe(9, isDark).color, fontSize: 13 }}>
                  Không có lịch bảo trì quá hạn hoặc sắp đến hạn!
                </Text>
              </Flex>
            ) : (
              baoTri.danhSachCanChuY.map(r => {
                const quaHan = r.trangThaiHienThi === 'QuaHan';
                const color = quaHan ? '#ef4444' : '#f97316';
                return (
                  <div
                    key={r.iD_LichBaoTri}
                    onClick={() => navigate('/bao-tri/lich')}
                    style={{ padding: '10px 20px', cursor: 'pointer', borderBottom: `1px solid ${panelBorder}` }}
                  >
                    <Flex justify="space-between" align="center">
                      <div>
                        <Text strong style={{ color: titleColor, fontSize: 13, display: 'block' }}>
                          {r.tenThietBi}
                        </Text>
                        <Text style={{ color: dimText, fontSize: 11 }}>{r.tenTram}</Text>
                      </div>
                      <Flex vertical align="flex-end" gap={2}>
                        <Tag color={quaHan ? 'red' : 'orange'} style={{ margin: 0 }}>
                          {quaHan ? 'Quá hạn' : 'Sắp đến hạn'}
                        </Tag>
                        <Text style={{ color, fontSize: 11, fontFamily: 'monospace' }}>
                          {dayjs(r.ngayKeHoach).format('DD/MM/YYYY')}
                        </Text>
                      </Flex>
                    </Flex>
                  </div>
                );
              })
            )}
          </Card>
        </Col>
      </Row>

      {/* ── Xu hướng CSSK theo tháng ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24}>
          <Card
            style={{ background: panelBg, border: `1px solid ${panelBorder}` }}
            loading={xuHuongLoading}
            title={
              <Flex align="center" gap={8}>
                <span>Xu hướng CSSK trung bình theo tháng</span>
                {xuHuongDelta != null && (
                  <Tag color={xuHuongDelta > 0 ? 'success' : xuHuongDelta < 0 ? 'error' : 'default'}>
                    {xuHuongDelta > 0 ? '▲' : xuHuongDelta < 0 ? '▼' : '='} {Math.abs(xuHuongDelta).toFixed(2)} so với tháng trước
                  </Tag>
                )}
              </Flex>
            }
            extra={
              <Flex align="center" gap={8}>
                <Select
                  size="small"
                  style={{ width: 150 }}
                  placeholder="Tất cả trạm"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  value={xhIdTram ?? undefined}
                  onChange={v => setXhIdTram(v ?? null)}
                  options={xhTrams.map(t => ({ value: t.IDTram, label: t.TenTram }))}
                />
                <Select
                  size="small"
                  style={{ width: 150 }}
                  placeholder="Tất cả loại TB"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  value={xhIdLoaiTB ?? undefined}
                  onChange={v => setXhIdLoaiTB(v ?? null)}
                  options={xhLoais.map(l => ({ value: l.ID_LoaiThietBi, label: l.TenLoaiTB }))}
                />
                <Select
                  size="small"
                  style={{ width: 170 }}
                  placeholder="Tất cả thiết bị"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  value={xhIdThietBi ?? undefined}
                  onChange={v => setXhIdThietBi(v ?? null)}
                  options={xhThietBiOptions.map(t => ({ value: t.ID_ThietBi, label: t.TenThietBi }))}
                  notFoundContent="Không có thiết bị phù hợp"
                />
              </Flex>
            }
            styles={{ header: { color: titleColor, borderBottom: `1px solid ${panelBorder}` }, body: { padding: '16px 20px' } }}
          >
            {xuHuongData.every(x => x.soPhieu === 0) ? (
              <Empty description="Chưa có phiếu kiểm tra nào trong giai đoạn này" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={xuHuongData} margin={{ left: -8, right: 16, top: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={panelBorder} vertical={false} />
                  <XAxis dataKey="thang" tick={{ fill: dimText, fontSize: 11 }} />
                  <YAxis domain={[0, 10]} tick={{ fill: dimText, fontSize: 11 }} />
                  <RechartsTooltip
                    formatter={(v, name) => name === 'diem' ? [`${v} / 10`, 'CSSK trung bình'] : [v, name]}
                    contentStyle={tooltipStyle}
                  />
                  <Line type="monotone" dataKey="diem" stroke="#3b82f6" strokeWidth={2}
                    dot={{ r: 3, fill: '#3b82f6' }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
      </Row>

      {/* ── Sức khỏe theo trạm điện ── */}
      {(baoCaoTramData.length > 0 || barData.length > 0) && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          {baoCaoTramData.length > 0 && (
            <Col xs={24} lg={barData.length > 0 ? 12 : 24}>
              <Card
                title="CSSK trung bình theo trạm điện"
                style={{ background: panelBg, border: `1px solid ${panelBorder}`, height: '100%' }}
                styles={{ header: { color: titleColor, borderBottom: `1px solid ${panelBorder}` }, body: { padding: '16px 20px' } }}
              >
                <ResponsiveContainer width="100%" height={Math.max(160, baoCaoTramData.length * 32)}>
                  <BarChart data={baoCaoTramData} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={panelBorder} horizontal={false} />
                    <XAxis type="number" domain={[0, 10]} tick={{ fill: dimText, fontSize: 11 }} />
                    <YAxis type="category" dataKey="tram" width={160} tick={{ fill: titleColor, fontSize: 12 }} />
                    <RechartsTooltip formatter={v => [`${v} / 10`, 'CSSK trung bình']} contentStyle={tooltipStyle} />
                    <Bar dataKey="diem" radius={[0, 4, 4, 0]} barSize={16}>
                      {baoCaoTramData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          )}
          {barData.length > 0 && (
            <Col xs={24} lg={baoCaoTramData.length > 0 ? 12 : 24}>
              <Card
                title="Thiết bị cần chú ý theo trạm điện"
                style={{ background: panelBg, border: `1px solid ${panelBorder}`, height: '100%' }}
                styles={{ header: { color: titleColor, borderBottom: `1px solid ${panelBorder}` }, body: { padding: '16px 20px' } }}
              >
                <ResponsiveContainer width="100%" height={Math.max(160, barData.length * 32)}>
                  <BarChart data={barData} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={panelBorder} horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fill: dimText, fontSize: 11 }} />
                    <YAxis type="category" dataKey="tram" width={160} tick={{ fill: titleColor, fontSize: 12 }} />
                    <RechartsTooltip formatter={v => [`${v} thiết bị`, 'Cần chú ý']} contentStyle={tooltipStyle} />
                    <Bar dataKey="soLuong" fill="#f97316" radius={[0, 4, 4, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          )}
        </Row>
      )}

      {/* ── Stats cards ── */}
      <Spin spinning={loading}>
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          {[
            { title: 'Khu vực',      value: stats?.khuVucs,     icon: <EnvironmentOutlined />,  color: '#10b981', path: '/quan-ly/khu-vuc' },
            { title: 'Trạm điện',    value: stats?.tramDiens,   icon: <ThunderboltOutlined />,  color: '#3b82f6', path: '/quan-ly/tram-dien' },
            { title: 'Thiết bị',     value: stats?.thietBis,    icon: <ApartmentOutlined />,    color: '#6366f1', path: '/quan-ly/thiet-bi' },
            { title: 'Loại TB',      value: stats?.loaiThietBi, icon: <UnorderedListOutlined />,color: '#f59e0b', path: '/quan-ly/loai-thiet-bi' },
            { title: 'Nhóm chỉ tiêu',value: stats?.nhomChiTieu, icon: <BulbOutlined />,         color: '#8b5cf6', path: '/cau-hinh/nhom-chi-tieu' },
            { title: 'Chỉ tiêu',     value: stats?.chiTieu,     icon: <SettingOutlined />,      color: '#f97316', path: '/cau-hinh/chi-tieu' },
          ].map(s => (
            <Col xs={12} sm={8} md={4} key={s.title}>
              <StatCard
                title={s.title}
                value={s.value ?? '—'}
                icon={s.icon}
                color={s.color}
                onClick={() => navigate(s.path)}
              />
            </Col>
          ))}
        </Row>
      </Spin>

      {/* ── Công thức CSSK + Truy cập nhanh ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={14}>
          <Card title="Công thức tính CSSK"
            style={{ background: panelBg, border: `1px solid ${panelBorder}`, height: '100%' }}
            styles={{ header: { color: titleColor, borderBottom: `1px solid ${panelBorder}`, fontSize: 13 }, body: { padding: 16 } }}>
            <Text style={{ color: dimText, fontSize: 12, display: 'block', marginBottom: 8 }}>
              Chỉ số sức khỏe tổng hợp (CSSK):
            </Text>
            <div style={{ padding: '10px 14px', background: formulaBoxBg, borderRadius: 6, fontFamily: 'monospace' }}>
              <Text style={{ color: '#93c5fd', fontSize: 13 }}>
                CSSK = Σ (Điểm_nhóm × W_nhóm) — thang 0–10
              </Text>
            </div>
            <Text style={{ color: dimText, fontSize: 12, display: 'block', marginTop: 8 }}>
              Trong đó Điểm_nhóm = Σ (Điểm_Sᵢ × Wᵢ)
            </Text>
            <Row gutter={8} style={{ marginTop: 12 }}>
              {[
                { range: '8–10', rank: 'A', label: 'Rất tốt',   color: getCapDoSucKhoe(9, isDark).color },
                { range: '6–8',  rank: 'B', label: 'Tốt',       color: getCapDoSucKhoe(7, isDark).color },
                { range: '4–6',  rank: 'C', label: 'Trung bình',color: getCapDoSucKhoe(5, isDark).color },
                { range: '2–4',  rank: 'D', label: 'Kém',       color: getCapDoSucKhoe(3, isDark).color },
                { range: '0–2',  rank: 'E', label: 'Rất kém',   color: getCapDoSucKhoe(1, isDark).color },
              ].map(r => (
                <Col span={24} key={r.rank} style={{ marginBottom: 4 }}>
                  <Flex align="center" gap={8}>
                    <div style={{ width: 24, height: 24, borderRadius: 4, background: `${r.color}22`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Text style={{ color: r.color, fontSize: 11, fontWeight: 700 }}>{r.rank}</Text>
                    </div>
                    <Text style={{ color: dimText, fontSize: 12, fontFamily: 'monospace', width: 60 }}>
                      {r.range}
                    </Text>
                    <Text style={{ color: r.color, fontSize: 12 }}>{r.label}</Text>
                  </Flex>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>

        {/* ── Quick actions ── */}
        <Col xs={24} lg={10}>
          <Card title="Truy cập nhanh"
            style={{ background: panelBg, border: `1px solid ${panelBorder}`, height: '100%' }}
            styles={{ header: { color: titleColor, borderBottom: `1px solid ${panelBorder}` }, body: { padding: 12 } }}>
            {QUICK_ACTIONS.map(item => (
              <div key={item.path} onClick={() => navigate(item.path)}
                style={{
                  padding: '10px 14px', marginBottom: 6, borderRadius: 8, cursor: 'pointer',
                  background: itemBg, border: `1px solid ${panelBorder}`,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = item.color;
                  e.currentTarget.style.background = `${item.color}11`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = panelBorder;
                  e.currentTarget.style.background = itemBg;
                }}
              >
                <Flex align="center" gap={10}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 6, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `${item.color}22`, color: item.color, fontSize: 15,
                  }}>
                    {item.icon}
                  </div>
                  <Text style={{ color: titleColor, fontSize: 13 }}>{item.label}</Text>
                </Flex>
              </div>
            ))}
          </Card>
        </Col>
      </Row>

      {/* ── Hướng dẫn thiết lập hệ thống (đóng mặc định) ── */}
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Collapse
            style={{ background: panelBg, border: `1px solid ${panelBorder}` }}
            items={[{
              key: 'workflow',
              label: <Text strong style={{ color: titleColor, fontSize: 13 }}>Hướng dẫn thiết lập & sử dụng CBM</Text>,
              children: (
                <Row gutter={[12, 12]}>
                  {WORKFLOW_STEPS.map(step => (
                    <Col xs={24} sm={12} md={8} key={step.step}>
                      <div
                        onClick={() => navigate(step.path)}
                        style={{
                          padding: '12px 14px', borderRadius: 8, cursor: 'pointer',
                          background: itemBg, border: `1px solid ${panelBorder}`,
                          transition: 'border-color 0.2s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = step.color)}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = panelBorder)}
                      >
                        <Flex align="flex-start" gap={10}>
                          <Text style={{
                            color: step.color, fontFamily: 'monospace', fontSize: 18,
                            fontWeight: 700, opacity: 0.5, lineHeight: 1, flexShrink: 0,
                          }}>
                            {step.step}
                          </Text>
                          <div>
                            <Text strong style={{ color: titleColor, fontSize: 13, display: 'block' }}>
                              {step.title}
                            </Text>
                            <Text style={{ color: dimText, fontSize: 11 }}>{step.desc}</Text>
                          </div>
                        </Flex>
                      </div>
                    </Col>
                  ))}
                </Row>
              ),
            }]}
          />
        </Col>
      </Row>
    </div>
  );
}
