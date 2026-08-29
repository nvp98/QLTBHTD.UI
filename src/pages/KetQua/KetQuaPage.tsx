import { useCallback, useEffect, useState } from 'react';
import { Card, Typography, Flex, Table, Button, message, Progress, Segmented, Select, DatePicker, Tag } from 'antd';
import { ReloadOutlined, DownloadOutlined, FilterOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { Dayjs } from 'dayjs';
import { phieuKiemTraApi } from '../../api/phieuKiemTra';
import type { PhieuKiemTraFilterParams } from '../../api/phieuKiemTra';
import { tramDienApi } from '../../api/tramDien';
import { loaiThietBiApi } from '../../api/loaiThietBi';
import { thietBiApi } from '../../api/thietBi';
import type { PhieuKiemTra, TramDien, LoaiThietBi, ThietBi } from '../../types/entities';
import { useThemeMode } from '../../theme/ThemeModeContext';
import { getCapDoSucKhoe } from '../../theme/capDoSucKhoe';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

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
  const [displayedPhieus, setDisplayedPhieus] = useState<PhieuKiemTra[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'latest' | 'all'>('all');
  // Phân biệt "hệ thống chưa có phiếu nào" (chỉ biết được lúc chưa lọc gì) với "bộ lọc hiện tại
  // không khớp phiếu nào" — tránh hiện nhầm CTA "tạo phiếu đầu tiên" khi thật ra có dữ liệu.
  const [hasAnyEver, setHasAnyEver] = useState(true);

  const [trams, setTrams]       = useState<TramDien[]>([]);
  const [loais, setLoais]       = useState<LoaiThietBi[]>([]);
  const [thietBis, setThietBis] = useState<ThietBi[]>([]);

  const [filterTram, setFilterTram]       = useState<number | 'all'>('all');
  const [filterLoai, setFilterLoai]       = useState<number | 'all'>('all');
  const [filterThietBi, setFilterThietBi] = useState<number | 'all'>('all');
  const [dateRange, setDateRange]         = useState<[Dayjs, Dayjs] | null>(null);

  const hasActiveFilters = filterTram !== 'all' || filterLoai !== 'all' || filterThietBi !== 'all' || dateRange !== null;

  const filterParams: PhieuKiemTraFilterParams = {
    idTram:    filterTram    !== 'all' ? filterTram    : undefined,
    idLoaiTB:  filterLoai    !== 'all' ? filterLoai    : undefined,
    idThietBi: filterThietBi !== 'all' ? filterThietBi : undefined,
    tuNgay:    dateRange ? dateRange[0].format('YYYY-MM-DD') : undefined,
    denNgay:   dateRange ? dateRange[1].format('YYYY-MM-DD') : undefined,
  };

  const load = useCallback(async (view: 'latest' | 'all', params: PhieuKiemTraFilterParams) => {
    setLoading(true);
    try {
      // BE đã lọc (Trạm/Loại TB/Thiết bị/khoảng ngày) + gộp "mới nhất mỗi thiết bị" bằng SQL —
      // không tải toàn bộ lịch sử về rồi lọc/dedupe bằng JS như trước nữa.
      const items = view === 'all'
        ? (await phieuKiemTraApi.getPaged(params)).items
        : await phieuKiemTraApi.getLatestPerThietBi(params);
      setDisplayedPhieus(items);
      if (!params.idTram && !params.idLoaiTB && !params.idThietBi && !params.tuNgay && !params.denNgay) {
        setHasAnyEver(items.length > 0);
      }
    } catch {
      message.error('Không thể tải kết quả kiểm tra');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFilterOptions = useCallback(async () => {
    try {
      const [ts, ls, tbs] = await Promise.all([
        tramDienApi.getActive(), loaiThietBiApi.getActive(), thietBiApi.getActive(),
      ]);
      setTrams(ts);
      setLoais(ls);
      setThietBis(tbs);
    } catch {
      message.error('Không thể tải danh sách trạm / loại thiết bị');
    }
  }, []);

  useEffect(() => { loadFilterOptions(); }, [loadFilterOptions]);
  // Tải lại mỗi khi viewMode hoặc bộ lọc đổi — filterParams tính lại mỗi render nên so sánh qua
  // JSON để tránh vòng lặp effect vô hạn (object mới mỗi lần nhưng nội dung có thể không đổi).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(viewMode, filterParams); }, [viewMode, JSON.stringify(filterParams)]);

  // Thiết bị khả dụng để lọc — thu hẹp theo Trạm/Loại TB đã chọn (giống cascading ở TaoPhieuKiemTraPage)
  const filteredThietBis = thietBis.filter(t =>
    (filterTram === 'all' || t.ID_Tram === filterTram) &&
    (filterLoai === 'all' || t.ID_LoaiTB === filterLoai)
  );

  const handleFilterTram = (v: number | 'all') => {
    setFilterTram(v);
    if (filterThietBi !== 'all' && !thietBis.some(t =>
      t.ID_ThietBi === filterThietBi && (v === 'all' || t.ID_Tram === v) &&
      (filterLoai === 'all' || t.ID_LoaiTB === filterLoai))) {
      setFilterThietBi('all');
    }
  };
  const handleFilterLoai = (v: number | 'all') => {
    setFilterLoai(v);
    if (filterThietBi !== 'all' && !thietBis.some(t =>
      t.ID_ThietBi === filterThietBi && (v === 'all' || t.ID_LoaiTB === v) &&
      (filterTram === 'all' || t.ID_Tram === filterTram))) {
      setFilterThietBi('all');
    }
  };

  const resetFilters = () => {
    setFilterTram('all'); setFilterLoai('all'); setFilterThietBi('all'); setDateRange(null);
  };

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
      title: 'Trạm / Loại TB', key: 'tramLoai', width: 170,
      render: (_: unknown, r: PhieuKiemTra) => (
        <div>
          <Text style={{ color: isDark ? '#9ca3af' : '#4b5563', fontSize: 12, display: 'block' }}>
            {r.TenTram ?? '—'}
          </Text>
          {r.TenLoaiTB && <Tag style={{ fontSize: 10, marginTop: 2 }}>{r.TenLoaiTB}</Tag>}
        </div>
      ),
    },
    {
      title: 'Nhóm chỉ tiêu', dataIndex: 'TenNhom', key: 'nhom', width: 160,
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
          <Button icon={<ReloadOutlined />} onClick={() => { load(viewMode, filterParams); loadFilterOptions(); }} loading={loading}>Làm mới</Button>
          <Button icon={<DownloadOutlined />} onClick={() => navigate('/bao-cao')}>Xuất báo cáo</Button>
          <Button type="primary" onClick={() => navigate('/nhap-lieu/phieu-kiem-tra')}>+ Tạo phiếu mới</Button>
        </Flex>
      </Flex>

      <Card
        style={{ background: isDark ? '#0e2c4a' : '#ffffff', border: `1px solid ${isDark ? '#1e4a72' : '#e5e7eb'}`, marginBottom: 16 }}
        styles={{ body: { padding: '14px 20px' } }}
      >
        <Flex align="center" gap={8} wrap style={{ marginBottom: 4 }}>
          <FilterOutlined style={{ color: '#6b7280' }} />
          <Text style={{ color: isDark ? '#9ca3af' : '#4b5563', fontSize: 12, marginRight: 4 }}>Lọc theo:</Text>
          <Select
            size="small" style={{ width: 160 }} value={filterTram} onChange={handleFilterTram}
            showSearch optionFilterProp="label"
            options={[{ label: 'Tất cả trạm', value: 'all' }, ...trams.map(t => ({ label: t.TenTram, value: t.IDTram }))]}
          />
          <Select
            size="small" style={{ width: 160 }} value={filterLoai} onChange={handleFilterLoai}
            showSearch optionFilterProp="label"
            options={[{ label: 'Tất cả loại TB', value: 'all' }, ...loais.map(l => ({ label: l.TenLoaiTB, value: l.ID_LoaiThietBi }))]}
          />
          <Select
            size="small" style={{ width: 200 }} value={filterThietBi} onChange={setFilterThietBi}
            showSearch optionFilterProp="label"
            options={[{ label: 'Tất cả thiết bị', value: 'all' }, ...filteredThietBis.map(t => ({
              label: `${t.TenThietBi}${t.SoHieu ? ` (${t.SoHieu})` : ''}`, value: t.ID_ThietBi,
            }))]}
          />
          <RangePicker
            size="small" format="DD/MM/YYYY" placeholder={['Từ ngày', 'Đến ngày']}
            value={dateRange} onChange={v => setDateRange(v && v[0] && v[1] ? [v[0], v[1]] : null)}
          />
          {hasActiveFilters && (
            <Button size="small" type="link" onClick={resetFilters}>Xoá lọc</Button>
          )}
        </Flex>
      </Card>

      <Card
        style={{ background: isDark ? '#0e2c4a' : '#ffffff', border: `1px solid ${isDark ? '#1e4a72' : '#e5e7eb'}` }}
        styles={{ body: { padding: '16px 20px' } }}
        title={
          <Flex align="center" gap={12} wrap>
            <span>
              {viewMode === 'all'
                ? `Danh sách kết quả — ${displayedPhieus.length} phiếu`
                : `Danh sách kết quả — ${displayedPhieus.length} thiết bị`}
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
        {displayedPhieus.length === 0 && !loading ? (
          !hasAnyEver ? (
            <Flex vertical align="center" gap={12} style={{ padding: '40px 0' }}>
              <Text style={{ color: isDark ? '#6b7280' : '#9ca3af', fontSize: 15 }}>Chưa có phiếu kiểm tra nào</Text>
              <Button type="primary" onClick={() => navigate('/nhap-lieu/phieu-kiem-tra')}>
                Tạo phiếu kiểm tra đầu tiên →
              </Button>
            </Flex>
          ) : (
            <Flex vertical align="center" gap={12} style={{ padding: '40px 0' }}>
              <Text style={{ color: isDark ? '#6b7280' : '#9ca3af', fontSize: 15 }}>Không có phiếu nào khớp bộ lọc</Text>
              <Button onClick={resetFilters}>Xoá lọc</Button>
            </Flex>
          )
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
