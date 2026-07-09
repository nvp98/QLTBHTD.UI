import { useCallback, useEffect, useState } from 'react';
import { Row, Col, Card, Typography, Flex, Spin, Tag } from 'antd';
import {
  EnvironmentOutlined, ThunderboltOutlined, ApartmentOutlined,
  SettingOutlined, BulbOutlined, UnorderedListOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import StatCard from '../components/common/StatCard';
import { useThemeMode } from '../theme/ThemeModeContext';
import { khuVucApi }      from '../api/khuVuc';
import { tramDienApi }    from '../api/tramDien';
import { thietBiApi }     from '../api/thietBi';
import { loaiThietBiApi } from '../api/loaiThietBi';
import { nhomChiTieuApi } from '../api/nhomChiTieu';
import { chiTieuApi }     from '../api/chiTieu';

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

const WORKFLOW_STEPS = [
  { step: '01', title: 'Cấu hình loại TB',    desc: 'Thêm MBA, MC, DCL, CSV...',          path: '/cau-hinh/loai-thiet-bi',  color: '#6366f1' },
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

  useEffect(() => { load(); }, [load]);

  const panelBg = isDark ? '#0d1117' : '#ffffff';
  const panelBorder = isDark ? '#1f2937' : '#e5e7eb';
  const itemBg = isDark ? '#111827' : '#f9fafb';
  const titleColor = isDark ? '#f9fafb' : '#111827';
  const dimText = isDark ? '#6b7280' : '#6b7280';
  const formulaBoxBg = isDark ? '#111827' : '#eff6ff';

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

      {/* ── Stats cards ── */}
      <Spin spinning={loading}>
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          {[
            { title: 'Khu vực',      value: stats?.khuVucs,     icon: <EnvironmentOutlined />,  color: '#10b981', path: '/quan-ly/khu-vuc' },
            { title: 'Trạm điện',    value: stats?.tramDiens,   icon: <ThunderboltOutlined />,  color: '#3b82f6', path: '/quan-ly/tram-dien' },
            { title: 'Thiết bị',     value: stats?.thietBis,    icon: <ApartmentOutlined />,    color: '#6366f1', path: '/quan-ly/thiet-bi' },
            { title: 'Loại TB',      value: stats?.loaiThietBi, icon: <UnorderedListOutlined />,color: '#f59e0b', path: '/cau-hinh/loai-thiet-bi' },
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
                { range: '8–10', rank: 'A', label: 'Rất tốt',  color: '#4ade80' },
                { range: '6–8',  rank: 'B', label: 'Tốt',      color: '#60a5fa' },
                { range: '4–6',  rank: 'C', label: 'Trung bình',color: '#fbbf24' },
                { range: '2–4',  rank: 'D', label: 'Kém',      color: '#f97316' },
                { range: '0–2',  rank: 'E', label: 'Rất kém',  color: '#f87171' },
              ].map(r => (
                <Col span={24} key={r.rank} style={{ marginBottom: 4 }}>
                  <Flex align="center" gap={8}>
                    <div style={{ width: 24, height: 24, borderRadius: 4, background: `${r.color}22`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Text style={{ color: r.color, fontSize: 11, fontWeight: 700 }}>{r.rank}</Text>
                    </div>
                    <Text style={{ color: '#9ca3af', fontSize: 12, fontFamily: 'monospace', width: 60 }}>
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