import { useCallback, useEffect, useState } from 'react';
import { Row, Col, Card, Typography, Flex, Spin, Tag, Empty, Tooltip } from 'antd';
import {
  EnvironmentOutlined, ThunderboltOutlined, ApartmentOutlined,
  SettingOutlined, BulbOutlined, UnorderedListOutlined,
  WarningOutlined, CheckCircleOutlined, HeartOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
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
import type { ThongKeTongHopDto, CanhBaoThietBiDto } from '../api/thongKe';

import hoaPhatImg from '../assets/img/hoa-phat-3d.png';

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
  { label: 'Quản lý khu vực',        path: '/quan-ly/khu-vuc',          icon: <EnvironmentOutlined />,   color: '#10b981' },
  { label: 'Quản lý trạm điện',      path: '/quan-ly/tram-dien',        icon: <ThunderboltOutlined />,   color: '#3b82f6' },
  { label: 'Quản lý thiết bị',       path: '/quan-ly/thiet-bi',         icon: <ApartmentOutlined />,     color: '#6366f1' },
  { label: 'Cấu hình nhóm chỉ tiêu', path: '/cau-hinh/nhom-chi-tieu',  icon: <BulbOutlined />,          color: '#f59e0b' },
  { label: 'Chỉ tiêu & Ngưỡng',      path: '/cau-hinh/chi-tieu',        icon: <SettingOutlined />,       color: '#8b5cf6' },
  { label: 'Nhập liệu kiểm tra',     path: '/nhap-lieu',                icon: <UnorderedListOutlined />, color: '#f97316' },
];

/** Gom danh sách cảnh báo theo Trạm — giữ nguyên thứ tự trạm xuất hiện đầu tiên (tức trạm có
 * thiết bị xấu nhất, vì canhBao đã được BE sắp xếp tăng dần theo TongDiem_Soqt trước đó). */
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
      const [tk, cb] = await Promise.allSettled([
        thongKeApi.getTongHop(),
        thongKeApi.getCanhBao(),
      ]);
      setTongKe(tk.status === 'fulfilled' ? tk.value : null);
      setCanhBao(cb.status === 'fulfilled' ? cb.value : []);
    } finally {
      setSucKhoeLoading(false);
    }
  }, []);

  useEffect(() => { load(); loadSucKhoe(); }, [load, loadSucKhoe]);

  const panelBg = isDark ? '#0e2c4a' : '#ffffff';
  const panelBorder = isDark ? '#1e4a72' : '#e5e7eb';
  const itemBg = isDark ? '#123a5e' : '#f9fafb';
  const titleColor = isDark ? '#f9fafb' : '#111827';
  const dimText = isDark ? '#9ca3af' : '#6b7280';
  const formulaBoxBg = isDark ? '#123a5e' : '#eff6ff';

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

      {/* ── Sức khỏe thiết bị — tổng quan trực quan ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
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
              <>
                <Flex align="baseline" gap={10} style={{ marginBottom: 18 }}>
                  {tongKe.diemTrungBinh != null ? (
                    <>
                      <Text style={{
                        color: getCapDoSucKhoe(tongKe.diemTrungBinh, isDark).color,
                        fontSize: 44, fontWeight: 700, lineHeight: 1, fontFamily: 'monospace',
                      }}>
                        {tongKe.diemTrungBinh.toFixed(1)}
                      </Text>
                      <Text style={{ color: dimText, fontSize: 14 }}>/ 10 — CSSK trung bình</Text>
                      <Tag style={{
                        marginLeft: 6,
                        color: getCapDoSucKhoe(tongKe.diemTrungBinh, isDark).color,
                        background: getCapDoSucKhoe(tongKe.diemTrungBinh, isDark).bg,
                        borderColor: getCapDoSucKhoe(tongKe.diemTrungBinh, isDark).border,
                      }}>
                        {getCapDoSucKhoe(tongKe.diemTrungBinh, isDark).label}
                      </Tag>
                    </>
                  ) : (
                    <Text style={{ color: dimText, fontSize: 15 }}>Chưa có thiết bị nào được tính CSSK</Text>
                  )}
                </Flex>

                {/* Thanh phân bố xếp chồng */}
                <div style={{ display: 'flex', height: 22, borderRadius: 6, overflow: 'hidden', gap: 1, marginBottom: 10 }}>
                  {([
                    ['thietBiTot', 9], ['thietBiBinhThuong', 7], ['thietBiChuY', 5],
                    ['thietBiCanhBao', 3], ['thietBiNguyHiem', 1],
                  ] as const).map(([key, sample]) => {
                    const count = tongKe[key];
                    const pct = (count / tongKe.tongThietBi) * 100;
                    const info = getCapDoSucKhoe(sample, isDark);
                    return pct > 0 ? (
                      <Tooltip key={key} title={`${info.label}: ${count} thiết bị (${pct.toFixed(0)}%)`}>
                        <div style={{ flex: pct, background: info.color, minWidth: 4 }} />
                      </Tooltip>
                    ) : null;
                  })}
                  {tongKe.thietBiChuaKiemTra > 0 && (
                    <Tooltip title={`Chưa kiểm tra: ${tongKe.thietBiChuaKiemTra} thiết bị`}>
                      <div style={{
                        flex: (tongKe.thietBiChuaKiemTra / tongKe.tongThietBi) * 100,
                        background: isDark ? '#374151' : '#d1d5db', minWidth: 4,
                      }} />
                    </Tooltip>
                  )}
                </div>

                <Row gutter={[12, 6]}>
                  {([
                    ['thietBiTot', 9, 'Tốt'], ['thietBiBinhThuong', 7, 'Khá'], ['thietBiChuY', 5, 'Trung bình'],
                    ['thietBiCanhBao', 3, 'Cảnh báo'], ['thietBiNguyHiem', 1, 'Nguy hiểm'],
                  ] as const).map(([key, sample, label]) => (
                    <Col key={key} xs={12} sm={8}>
                      <Flex align="center" gap={6}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: getCapDoSucKhoe(sample, isDark).color, flexShrink: 0 }} />
                        <Text style={{ color: dimText, fontSize: 12 }}>{label}: </Text>
                        <Text strong style={{ color: titleColor, fontSize: 12, fontFamily: 'monospace' }}>{tongKe[key]}</Text>
                      </Flex>
                    </Col>
                  ))}
                  <Col xs={12} sm={8}>
                    <Flex align="center" gap={6}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: isDark ? '#374151' : '#d1d5db', flexShrink: 0 }} />
                      <Text style={{ color: dimText, fontSize: 12 }}>Chưa kiểm tra: </Text>
                      <Text strong style={{ color: titleColor, fontSize: 12, fontFamily: 'monospace' }}>{tongKe.thietBiChuaKiemTra}</Text>
                    </Flex>
                  </Col>
                </Row>
              </>
            ) : (
              <Empty description="Chưa có dữ liệu thiết bị" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>

        {/* ── Cần chú ý ngay ── */}
        <Col xs={24} lg={10}>
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
              groupCanhBaoTheoTram(canhBao.slice(0, 8)).map(nhom => (
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
                  {nhom.items.map(r => {
                    const info = getCapDoSucKhoe(r.tongDiem_Soqt, isDark);
                    return (
                      <div
                        key={r.iD_ThietBi}
                        onClick={() => navigate(`/ket-qua/${r.iD_Phieu}`)}
                        style={{
                          padding: '10px 20px 10px 32px', cursor: 'pointer', borderBottom: `1px solid ${panelBorder}`,
                        }}
                      >
                        <Flex justify="space-between" align="center">
                          <Text strong style={{ color: titleColor, fontSize: 13, minWidth: 0 }}>
                            {r.tenThietBi}
                          </Text>
                          <Tag style={{ color: info.color, background: info.bg, borderColor: info.border, flexShrink: 0 }}>
                            {r.tongDiem_Soqt?.toFixed(1) ?? '—'}
                          </Tag>
                        </Flex>
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
      </Row>

      {/* ── Stats cards ── */}
      <Spin spinning={loading}>
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
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

      {/* ── Row 1: Ảnh 3D + Quick actions + CBM formula ── */}
      {/* align="stretch" giúp 2 Col bằng nhau chiều cao */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>

        {/* ── Ảnh 3D Khu liên hợp Hòa Phát ── */}
        <Col xs={24} lg={14}>
          <Card
            title="Khu liên hợp sản xuất gang thép Hòa Phát"
            style={{ background: panelBg, border: `1px solid ${panelBorder}` }}
            styles={{
              header: { color: titleColor, borderBottom: `1px solid ${panelBorder}` },
              body: { padding: 0, overflow: 'hidden', borderRadius: '0 0 8px 8px' },
            }}
          >
            {/* Giữ đúng tỷ lệ gốc 3471:2169 ≈ 62.5% */}
            <div style={{ position: 'relative', paddingBottom: '62.5%', overflow: 'hidden' }}>
              <img
                src={hoaPhatImg}
                alt="Khu liên hợp sản xuất gang thép Hòa Phát - Mô hình 3D"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'fill',
                  display: 'block',
                  imageRendering: 'auto',
                }}
              />
              {/* Overlay badge */}
              <div style={{
                position: 'absolute',
                bottom: 12,
                left: 12,
                background: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(6px)',
                borderRadius: 6,
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#10b981',
                  boxShadow: '0 0 6px #10b981',
                }} />
                <Text style={{ color: '#fff', fontSize: 12 }}>
                  Khu liên hợp Dung Quất — Quảng Ngãi
                </Text>
              </div>
            </div>
          </Card>
        </Col>

        {/* ── Quick actions + CBM Formula ── */}
        <Col xs={24} lg={10}>
          <Card title="Truy cập nhanh"
            style={{ background: panelBg, border: `1px solid ${panelBorder}` }}
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

          {/* CBM Formula card */}
          <Card title="Công thức tính CSSK"
            style={{ background: panelBg, border: `1px solid ${panelBorder}`, marginTop: 16 }}
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
      </Row>

      {/* ── Row 2: Quy trình nghiệp vụ ── */}
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card title="Quy trình thiết lập & sử dụng CBM"
            style={{ background: panelBg, border: `1px solid ${panelBorder}` }}
            styles={{ header: { color: titleColor, borderBottom: `1px solid ${panelBorder}` }, body: { padding: 20 } }}>
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
          </Card>
        </Col>
      </Row>
    </div>
  );
}