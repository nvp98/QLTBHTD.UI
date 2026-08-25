import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge, Button, Card, Col, Empty, Form, Input, InputNumber, Modal, Popconfirm,
  Row, Select, Space, Tag, Tooltip, Tree, Typography, message,
} from 'antd';
import type { DataNode } from 'antd/es/tree';
import {
  ApartmentOutlined, ClearOutlined, ClusterOutlined, DeleteOutlined, EditOutlined, EnvironmentOutlined,
  ExpandAltOutlined, FilterOutlined, PlusOutlined, ShrinkOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import { khuVucApi } from '../../api/khuVuc';
import { tramDienApi } from '../../api/tramDien';
import { thietBiApi } from '../../api/thietBi';
import { loaiThietBiApi } from '../../api/loaiThietBi';
import { phieuKiemTraApi } from '../../api/phieuKiemTra';
import type { KhuVuc, TramDien, ThietBi, LoaiThietBi, PhieuKiemTra } from '../../types/entities';
import { useThemeMode } from '../../theme/ThemeModeContext';
import { capDoKeyOf, getCapDoSucKhoe, type CapDoKey } from '../../theme/capDoSucKhoe';

const { Title, Text } = Typography;

type CsskFilter = CapDoKey | 'chuaDo' | 'all';

const CSSK_FILTER_OPTIONS: { label: string; value: CsskFilter }[] = [
  { label: 'Tất cả CSSK', value: 'all' },
  { label: 'Tốt', value: 'tot' },
  { label: 'Khá', value: 'kha' },
  { label: 'Trung bình', value: 'trungBinh' },
  { label: 'Cảnh báo', value: 'canhBao' },
  { label: 'Nguy hiểm', value: 'nguyHiem' },
  { label: 'Chưa đo', value: 'chuaDo' },
];

const TRANG_THAI_2 = [{ label: 'Hoạt động', value: 1 }, { label: 'Ngừng hoạt động', value: 0 }];
const TRANG_THAI_TB = [
  { label: 'Hoạt động', value: 1 }, { label: 'Bảo trì', value: 2 }, { label: 'Ngừng vận hành', value: 0 },
];

const trangThaiTag2 = (v: number) => <Tag color={v === 1 ? 'success' : 'default'}>{v === 1 ? 'Hoạt động' : 'Ngừng'}</Tag>;
const trangThaiTagTB = (v: number) => {
  if (v === 1) return <Tag color="success">Hoạt động</Tag>;
  if (v === 2) return <Tag color="warning">Bảo trì</Tag>;
  return <Tag color="default">Ngừng</Tag>;
};

type Selection =
  | { type: 'kv'; record: KhuVuc }
  | { type: 'tram'; record: TramDien }
  | { type: 'tb'; record: ThietBi }
  | null;

export default function CayThietBiPage() {
  const navigate = useNavigate();
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';

  const [khuVucs, setKhuVucs]   = useState<KhuVuc[]>([]);
  const [trams, setTrams]       = useState<TramDien[]>([]);
  const [thietBis, setThietBis] = useState<ThietBi[]>([]);
  const [loais, setLoais]       = useState<LoaiThietBi[]>([]);
  const [latestByThietBi, setLatestByThietBi] = useState<Record<number, PhieuKiemTra>>({});
  const [loading, setLoading]   = useState(false);
  const [search, setSearch]     = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Bộ lọc cây
  const [filtersOpen, setFiltersOpen]         = useState(false);
  const [filterKhuVuc, setFilterKhuVuc]       = useState<number | 'all'>('all');
  const [filterLoai, setFilterLoai]           = useState<number | 'all'>('all');
  const [filterTrangThai, setFilterTrangThai] = useState<number | 'all'>('all');
  const [filterCssk, setFilterCssk]           = useState<CsskFilter>('all');
  const [expandedKeys, setExpandedKeys]       = useState<string[]>([]);

  // Modal khu vực
  const [kvModalOpen, setKvModalOpen] = useState(false);
  const [editingKv, setEditingKv]     = useState<KhuVuc | null>(null);
  const [savingKv, setSavingKv]       = useState(false);
  const [kvForm] = Form.useForm();

  // Modal trạm điện
  const [tramModalOpen, setTramModalOpen] = useState(false);
  const [editingTram, setEditingTram]     = useState<TramDien | null>(null);
  const [parentKvForTram, setParentKvForTram] = useState<KhuVuc | null>(null);
  const [savingTram, setSavingTram]       = useState(false);
  const [tramForm] = Form.useForm();

  // Modal thiết bị
  const [tbModalOpen, setTbModalOpen]   = useState(false);
  const [editingTb, setEditingTb]       = useState<ThietBi | null>(null);
  const [parentTramForTb, setParentTramForTb] = useState<TramDien | null>(null);
  const [savingTb, setSavingTb]         = useState(false);
  const [tbForm] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [kvs, ts, tbs, ls, phieuPaged] = await Promise.all([
        khuVucApi.getAll(),
        tramDienApi.getAll(),
        thietBiApi.getAll(),
        loaiThietBiApi.getActive(),
        phieuKiemTraApi.getPaged({ page: 1, pageSize: 1000 }),
      ]);
      setKhuVucs(kvs);
      setTrams(ts);
      setThietBis(tbs);
      setLoais(ls);

      // Phiếu mới nhất của mỗi thiết bị — dùng để hiện CSSK trên cây
      const latest: Record<number, PhieuKiemTra> = {};
      for (const p of phieuPaged.items) {
        const cur = latest[p.ID_ThietBi];
        if (!cur || p.ID_Phieu > cur.ID_Phieu) latest[p.ID_ThietBi] = p;
      }
      setLatestByThietBi(latest);
    } catch {
      message.error('Không thể tải cây thiết bị');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loaiName = (id: number) => loais.find(l => l.ID_LoaiThietBi === id)?.TenLoaiTB ?? `Loại ${id}`;

  /** Cấp độ CSSK của 1 thiết bị (điểm phiếu mới nhất), 'chuaDo' nếu chưa có phiếu nào. */
  const csskOf = (idThietBi: number): CsskFilter => {
    const diem = latestByThietBi[idThietBi]?.TongDiem_Soqt;
    return diem == null ? 'chuaDo' : capDoKeyOf(diem);
  };

  /** Tag CSSK cho 1 thiết bị — dùng điểm phiếu mới nhất, "Chưa đo" nếu chưa có phiếu nào. */
  const csskTag = (idThietBi: number) => {
    const diem = latestByThietBi[idThietBi]?.TongDiem_Soqt;
    if (diem == null) return <Tag style={{ fontSize: 10 }}>Chưa đo</Tag>;
    const info = getCapDoSucKhoe(diem, isDark);
    return (
      <Tag style={{ fontSize: 10, color: info.color, background: info.bg, borderColor: info.border }}>
        {diem.toFixed(1)} · {info.label}
      </Tag>
    );
  };

  /** Số lượng thiết bị theo từng cấp độ CSSK — dùng cho dải thống kê + lọc nhanh. */
  const csskCounts = useMemo(() => {
    const counts: Record<CsskFilter, number> = { all: thietBis.length, tot: 0, kha: 0, trungBinh: 0, canhBao: 0, nguyHiem: 0, chuaDo: 0 };
    for (const tb of thietBis) {
      const key = csskOf(tb.ID_ThietBi);
      counts[key] += 1;
    }
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thietBis, latestByThietBi]);

  // ── Khu vực: CRUD ──────────────────────────────────────────────────────
  const openAddKv = () => { setEditingKv(null); setKvModalOpen(true); };
  const openEditKv = (kv: KhuVuc) => { setEditingKv(kv); setKvModalOpen(true); };

  useEffect(() => {
    if (!kvModalOpen) return;
    kvForm.setFieldsValue(editingKv ? editingKv : { TenKhuVuc: '', TrangThai: 1 });
  }, [kvModalOpen, editingKv, kvForm]);

  const saveKv = async () => {
    setSavingKv(true);
    try {
      const v = await kvForm.validateFields();
      if (editingKv) { await khuVucApi.update(editingKv.ID_KhuVuc, v); message.success('Đã cập nhật khu vực'); }
      else { await khuVucApi.create(v); message.success('Đã thêm khu vực'); }
      setKvModalOpen(false);
      load();
    } catch (e: unknown) {
      if (e instanceof Error && 'errorFields' in (e as object)) return;
      message.error('Lỗi lưu khu vực');
    } finally { setSavingKv(false); }
  };

  const handleDeleteKv = async (kv: KhuVuc) => {
    if (trams.some(t => t.IDKhuVuc === kv.ID_KhuVuc)) {
      message.warning('Không thể xóa — khu vực còn trạm điện bên trong. Hãy xóa các trạm trước.');
      return;
    }
    try {
      await khuVucApi.delete(kv.ID_KhuVuc);
      message.success('Đã xóa khu vực');
      if (selectedKey === `kv-${kv.ID_KhuVuc}`) setSelectedKey(null);
      load();
    } catch { message.error('Không thể xóa khu vực'); }
  };

  // ── Trạm điện: CRUD ────────────────────────────────────────────────────
  const openAddTram = (kv: KhuVuc) => { setEditingTram(null); setParentKvForTram(kv); setTramModalOpen(true); };
  const openEditTram = (tram: TramDien) => { setEditingTram(tram); setParentKvForTram(null); setTramModalOpen(true); };

  useEffect(() => {
    if (!tramModalOpen) return;
    if (editingTram) tramForm.setFieldsValue(editingTram);
    else tramForm.setFieldsValue({ IDKhuVuc: parentKvForTram?.ID_KhuVuc, TenTram: '', DiaDiem: '', TrangThai: 1 });
  }, [tramModalOpen, editingTram, parentKvForTram, tramForm]);

  const saveTram = async () => {
    setSavingTram(true);
    try {
      const v = await tramForm.validateFields();
      if (editingTram) { await tramDienApi.update(editingTram.IDTram, v); message.success('Đã cập nhật trạm điện'); }
      else { await tramDienApi.create(v); message.success('Đã thêm trạm điện'); }
      setTramModalOpen(false);
      load();
    } catch (e: unknown) {
      if (e instanceof Error && 'errorFields' in (e as object)) return;
      message.error('Lỗi lưu trạm điện');
    } finally { setSavingTram(false); }
  };

  const handleDeleteTram = async (tram: TramDien) => {
    if (thietBis.some(tb => tb.ID_Tram === tram.IDTram)) {
      message.warning('Không thể xóa — trạm còn thiết bị bên trong. Hãy xóa các thiết bị trước.');
      return;
    }
    try {
      await tramDienApi.delete(tram.IDTram);
      message.success('Đã xóa trạm điện');
      if (selectedKey === `tram-${tram.IDTram}`) setSelectedKey(null);
      load();
    } catch { message.error('Không thể xóa trạm điện'); }
  };

  // ── Thiết bị: CRUD ─────────────────────────────────────────────────────
  const openAddThietBi = (tram: TramDien) => { setEditingTb(null); setParentTramForTb(tram); setTbModalOpen(true); };
  const openEditThietBi = (tb: ThietBi) => { setEditingTb(tb); setParentTramForTb(null); setTbModalOpen(true); };

  useEffect(() => {
    if (!tbModalOpen) return;
    if (editingTb) tbForm.setFieldsValue(editingTb);
    else tbForm.setFieldsValue({ ID_Tram: parentTramForTb?.IDTram, TenThietBi: '', TrangThai: 1 });
  }, [tbModalOpen, editingTb, parentTramForTb, tbForm]);

  const saveThietBi = async () => {
    setSavingTb(true);
    try {
      const v = await tbForm.validateFields();
      if (editingTb) { await thietBiApi.update(editingTb.ID_ThietBi, v); message.success('Đã cập nhật thiết bị'); }
      else { await thietBiApi.create(v); message.success('Đã thêm thiết bị'); }
      setTbModalOpen(false);
      load();
    } catch (e: unknown) {
      if (e instanceof Error && 'errorFields' in (e as object)) return;
      message.error('Lỗi lưu thiết bị');
    } finally { setSavingTb(false); }
  };

  const handleDeleteThietBi = async (tb: ThietBi) => {
    try {
      await thietBiApi.delete(tb.ID_ThietBi);
      message.success('Đã xóa thiết bị');
      if (selectedKey === `tb-${tb.ID_ThietBi}`) setSelectedKey(null);
      load();
    } catch { message.error('Không thể xóa — thiết bị đang có phiếu kiểm tra'); }
  };

  // ── Selection lookup ───────────────────────────────────────────────────
  const selection: Selection = useMemo(() => {
    if (!selectedKey) return null;
    if (selectedKey.startsWith('kv-')) {
      const record = khuVucs.find(k => k.ID_KhuVuc === Number(selectedKey.slice(3)));
      return record ? { type: 'kv', record } : null;
    }
    if (selectedKey.startsWith('tram-')) {
      const record = trams.find(t => t.IDTram === Number(selectedKey.slice(5)));
      return record ? { type: 'tram', record } : null;
    }
    if (selectedKey.startsWith('tb-')) {
      const record = thietBis.find(t => t.ID_ThietBi === Number(selectedKey.slice(3)));
      return record ? { type: 'tb', record } : null;
    }
    return null;
  }, [selectedKey, khuVucs, trams, thietBis]);

  // ── Tree data (lọc theo tìm kiếm + bộ lọc nâng cao) ─────────────────────
  const searchLower = search.trim().toLowerCase();
  const matchTb = (tb: ThietBi) => {
    if (searchLower && ![tb.TenThietBi, tb.SoHieu, tb.NhanHieu].some(s => (s ?? '').toLowerCase().includes(searchLower))) return false;
    if (filterLoai !== 'all' && tb.ID_LoaiTB !== filterLoai) return false;
    if (filterTrangThai !== 'all' && tb.TrangThai !== filterTrangThai) return false;
    if (filterCssk !== 'all' && csskOf(tb.ID_ThietBi) !== filterCssk) return false;
    return true;
  };

  const hasActiveFilter = !!searchLower || filterKhuVuc !== 'all' || filterLoai !== 'all'
    || filterTrangThai !== 'all' || filterCssk !== 'all';
  const activeFilterCount = [searchLower, filterKhuVuc !== 'all', filterLoai !== 'all',
    filterTrangThai !== 'all', filterCssk !== 'all'].filter(Boolean).length;

  const clearFilters = () => {
    setSearch(''); setFilterKhuVuc('all'); setFilterLoai('all'); setFilterTrangThai('all'); setFilterCssk('all');
  };

  const nodeRowStyle = (accent?: string) => ({
    width: '100%', display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const,
    padding: '4px 8px', borderRadius: 6, borderLeft: `3px solid ${accent ?? 'transparent'}`,
  });

  const treeData: DataNode[] = useMemo(() => khuVucs
    .filter(kv => filterKhuVuc === 'all' || kv.ID_KhuVuc === filterKhuVuc)
    .map(kv => {
      const tramsOfKv = trams.filter(t => t.IDKhuVuc === kv.ID_KhuVuc);
      const tramNodes = tramsOfKv
        .map(t => {
          const tbsOfTram = thietBis.filter(tb => tb.ID_Tram === t.IDTram && matchTb(tb));
          if (hasActiveFilter && tbsOfTram.length === 0) return null;
          const diems = tbsOfTram
            .map(tb => latestByThietBi[tb.ID_ThietBi]?.TongDiem_Soqt)
            .filter((d): d is number => d != null);
          const tramInfo = diems.length ? getCapDoSucKhoe(diems.reduce((a, b) => a + b, 0) / diems.length, isDark) : null;
          return {
            key: `tram-${t.IDTram}`,
            icon: <ThunderboltOutlined />,
            title: (
              <Space size={4} style={nodeRowStyle(tramInfo?.color)}>
                <Space size={4} wrap>
                  <Text>{t.TenTram}</Text>
                  <Tag color={t.TrangThai === 1 ? 'success' : 'default'} style={{ fontSize: 10 }}>
                    {t.TrangThai === 1 ? 'Hoạt động' : 'Ngừng'}
                  </Tag>
                  <Tag style={{ fontSize: 10 }}>{tbsOfTram.length} thiết bị</Tag>
                  {tramInfo && diems.length > 0 && (
                    <Tag style={{ fontSize: 10, color: tramInfo.color, background: tramInfo.bg, borderColor: tramInfo.border }}>
                      CSSK TB: {(diems.reduce((a, b) => a + b, 0) / diems.length).toFixed(1)}
                    </Tag>
                  )}
                </Space>
                <Space size={2} onClick={e => e.stopPropagation()}>
                  <Tooltip title="Thêm thiết bị">
                    <Button size="small" type="text" icon={<PlusOutlined />} onClick={() => openAddThietBi(t)} />
                  </Tooltip>
                  <Tooltip title="Sửa trạm">
                    <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEditTram(t)} />
                  </Tooltip>
                  <Popconfirm title={`Xóa trạm "${t.TenTram}"?`} okText="Xóa" cancelText="Hủy"
                    okButtonProps={{ danger: true }} onConfirm={() => handleDeleteTram(t)}>
                    <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              </Space>
            ),
            children: Array.from(new Set(tbsOfTram.map(tb => tb.ID_LoaiTB)))
              .sort((a, b) => loaiName(a).localeCompare(loaiName(b)))
              .map(idLoai => {
                const tbsOfLoai = tbsOfTram.filter(tb => tb.ID_LoaiTB === idLoai);
                const diemsLoai = tbsOfLoai
                  .map(tb => latestByThietBi[tb.ID_ThietBi]?.TongDiem_Soqt)
                  .filter((d): d is number => d != null);
                const loaiInfo = diemsLoai.length ? getCapDoSucKhoe(diemsLoai.reduce((a, b) => a + b, 0) / diemsLoai.length, isDark) : null;
                return {
                  key: `loai-${t.IDTram}-${idLoai}`,
                  selectable: false,
                  icon: <ClusterOutlined />,
                  title: (
                    <Space size={4} style={nodeRowStyle(loaiInfo?.color)}>
                      <Space size={4} wrap>
                        <Tag color="blue" style={{ fontSize: 10 }}>{loaiName(idLoai)}</Tag>
                        <Tag style={{ fontSize: 10 }}>{tbsOfLoai.length} thiết bị</Tag>
                        {loaiInfo && diemsLoai.length > 0 && (
                          <Tag style={{ fontSize: 10, color: loaiInfo.color, background: loaiInfo.bg, borderColor: loaiInfo.border }}>
                            CSSK TB: {(diemsLoai.reduce((a, b) => a + b, 0) / diemsLoai.length).toFixed(1)}
                          </Tag>
                        )}
                      </Space>
                    </Space>
                  ),
                  children: tbsOfLoai.map(tb => {
                    const info = getCapDoSucKhoe(latestByThietBi[tb.ID_ThietBi]?.TongDiem_Soqt, isDark);
                    return {
                      key: `tb-${tb.ID_ThietBi}`,
                      isLeaf: true,
                      icon: <ApartmentOutlined />,
                      title: (
                        <Space size={4} style={nodeRowStyle(info.color)}>
                          <Space size={4} wrap>
                            <Text>{tb.TenThietBi}</Text>
                            {tb.TenNganLo && <Tag color="purple" style={{ fontSize: 10 }}>{tb.TenNganLo}</Tag>}
                            {trangThaiTagTB(tb.TrangThai)}
                            {csskTag(tb.ID_ThietBi)}
                          </Space>
                          <Space size={2} onClick={e => e.stopPropagation()}>
                            <Tooltip title="Sửa thiết bị">
                              <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEditThietBi(tb)} />
                            </Tooltip>
                            <Popconfirm title={`Xóa thiết bị "${tb.TenThietBi}"?`} okText="Xóa" cancelText="Hủy"
                              okButtonProps={{ danger: true }} onConfirm={() => handleDeleteThietBi(tb)}>
                              <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                          </Space>
                        </Space>
                      ),
                    };
                  }),
                };
              }),
          };
        })
        .filter((n): n is NonNullable<typeof n> => n !== null);

      if (hasActiveFilter && tramNodes.length === 0) return null;

      return {
        key: `kv-${kv.ID_KhuVuc}`,
        icon: <EnvironmentOutlined />,
        title: (
          <Space size={4} style={nodeRowStyle()}>
            <Space size={4} wrap>
              <Text strong>{kv.TenKhuVuc}</Text>
              <Tag color={kv.TrangThai === 1 ? 'success' : 'default'} style={{ fontSize: 10 }}>
                {kv.TrangThai === 1 ? 'Hoạt động' : 'Ngừng'}
              </Tag>
              <Tag style={{ fontSize: 10 }}>{tramsOfKv.length} trạm</Tag>
            </Space>
            <Space size={2} onClick={e => e.stopPropagation()}>
              <Tooltip title="Thêm trạm điện">
                <Button size="small" type="text" icon={<PlusOutlined />} onClick={() => openAddTram(kv)} />
              </Tooltip>
              <Tooltip title="Sửa khu vực">
                <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEditKv(kv)} />
              </Tooltip>
              <Popconfirm title={`Xóa khu vực "${kv.TenKhuVuc}"?`} okText="Xóa" cancelText="Hủy"
                okButtonProps={{ danger: true }} onConfirm={() => handleDeleteKv(kv)}>
                <Button size="small" type="text" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space>
          </Space>
        ),
        children: tramNodes,
      };
    })
    .filter((n): n is NonNullable<typeof n> => n !== null),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [khuVucs, trams, thietBis, loais, searchLower, filterKhuVuc, filterLoai, filterTrangThai, filterCssk, latestByThietBi, isDark]);

  const allExpandableKeys = useMemo(() => [
    ...khuVucs.map(k => `kv-${k.ID_KhuVuc}`),
    ...trams.map(t => `tram-${t.IDTram}`),
    ...trams.flatMap(t => {
      const loaiIds = new Set(thietBis.filter(tb => tb.ID_Tram === t.IDTram).map(tb => tb.ID_LoaiTB));
      return Array.from(loaiIds).map(idLoai => `loai-${t.IDTram}-${idLoai}`);
    }),
  ], [khuVucs, trams, thietBis]);

  useEffect(() => { setExpandedKeys(allExpandableKeys); }, [allExpandableKeys]);

  /** Khi đang lọc, luôn mở hết các nhánh còn kết quả để người dùng thấy ngay thiết bị khớp. */
  const filteredExpandableKeys = useMemo(() => {
    const keys: string[] = [];
    const walk = (nodes: DataNode[]) => {
      for (const n of nodes) {
        if (n.children && n.children.length) { keys.push(String(n.key)); walk(n.children as DataNode[]); }
      }
    };
    walk(treeData);
    return keys;
  }, [treeData]);

  const borderColor = isDark ? '#1e4a72' : '#e5e7eb';
  const mutedColor = isDark ? '#9ca3af' : '#6b7280';

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ color: isDark ? '#f9fafb' : '#111827', margin: 0 }}>Cây thiết bị</Title>
        <Text style={{ color: mutedColor, fontSize: 13 }}>
          Xem &amp; quản lý theo cấu trúc Khu vực → Trạm điện → Loại thiết bị → Thiết bị · {khuVucs.length} khu vực,{' '}
          {trams.length} trạm, {thietBis.length} thiết bị
        </Text>
      </div>

      {/* ── Dải thống kê CSSK — bấm để lọc nhanh theo cấp độ ── */}
      <Row gutter={10} style={{ marginBottom: 16 }}>
        {CSSK_FILTER_OPTIONS.filter(o => o.value !== 'all').map(opt => {
          const info = opt.value === 'chuaDo'
            ? getCapDoSucKhoe(null, isDark)
            : getCapDoSucKhoe(opt.value === 'tot' ? 9 : opt.value === 'kha' ? 7 : opt.value === 'trungBinh' ? 5 : opt.value === 'canhBao' ? 3 : 1, isDark);
          const active = filterCssk === opt.value;
          return (
            <Col key={opt.value} flex="1 1 0">
              <Card
                size="small"
                hoverable
                onClick={() => setFilterCssk(active ? 'all' : opt.value)}
                style={{
                  background: active ? info.bg : (isDark ? '#0e2c4a' : '#ffffff'),
                  border: `1px solid ${active ? info.border : borderColor}`,
                  boxShadow: active ? `0 0 0 1px ${info.border}` : undefined,
                  cursor: 'pointer',
                }}
                styles={{ body: { padding: '8px 10px' } }}
              >
                <Text style={{ color: info.color, fontSize: 20, fontWeight: 700, display: 'block', lineHeight: 1.2 }}>
                  {csskCounts[opt.value]}
                </Text>
                <Text style={{ color: active ? info.color : mutedColor, fontSize: 12 }}>{opt.label}</Text>
              </Card>
            </Col>
          );
        })}
      </Row>

      <Row gutter={16}>
        <Col span={selection ? 14 : 24}>
          <Card
            style={{ background: isDark ? '#0e2c4a' : '#ffffff', border: `1px solid ${borderColor}` }}
            styles={{ body: { padding: '16px 20px' } }}
            loading={loading}
          >
            <Space style={{ marginBottom: 12, width: '100%', justifyContent: 'space-between' }} wrap>
              <Space wrap>
                <Input.Search
                  placeholder="Tìm thiết bị theo tên, số hiệu, nhãn hiệu..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ width: 280 }}
                  allowClear
                />
                <Badge count={activeFilterCount} size="small" offset={[-4, 4]}>
                  <Button
                    icon={<FilterOutlined />}
                    type={filtersOpen ? 'primary' : 'default'}
                    onClick={() => setFiltersOpen(o => !o)}
                  >
                    Bộ lọc
                  </Button>
                </Badge>
                {hasActiveFilter && (
                  <Button icon={<ClearOutlined />} onClick={clearFilters}>Xóa lọc</Button>
                )}
                <Tooltip title="Mở rộng tất cả">
                  <Button icon={<ExpandAltOutlined />} disabled={hasActiveFilter}
                    onClick={() => setExpandedKeys(allExpandableKeys)} />
                </Tooltip>
                <Tooltip title="Thu gọn tất cả">
                  <Button icon={<ShrinkOutlined />} disabled={hasActiveFilter}
                    onClick={() => setExpandedKeys([])} />
                </Tooltip>
              </Space>
              <Button type="primary" icon={<PlusOutlined />} onClick={openAddKv}>Thêm khu vực</Button>
            </Space>

            {filtersOpen && (
              <div style={{
                marginBottom: 14, padding: '12px 14px', borderRadius: 8,
                background: isDark ? '#123a5e' : '#f9fafb', border: `1px solid ${borderColor}`,
              }}>
                <Space wrap size={12}>
                  <div>
                    <Text style={{ display: 'block', fontSize: 12, color: mutedColor, marginBottom: 4 }}>Khu vực</Text>
                    <Select value={filterKhuVuc} onChange={setFilterKhuVuc} style={{ width: 180 }}
                      showSearch optionFilterProp="label"
                      options={[{ label: 'Tất cả khu vực', value: 'all' }, ...khuVucs.map(k => ({ label: k.TenKhuVuc, value: k.ID_KhuVuc }))]} />
                  </div>
                  <div>
                    <Text style={{ display: 'block', fontSize: 12, color: mutedColor, marginBottom: 4 }}>Loại thiết bị</Text>
                    <Select value={filterLoai} onChange={setFilterLoai} style={{ width: 180 }}
                      options={[{ label: 'Tất cả loại', value: 'all' }, ...loais.map(l => ({ label: `${l.TenLoaiTB} (${l.KyHieu})`, value: l.ID_LoaiThietBi }))]} />
                  </div>
                  <div>
                    <Text style={{ display: 'block', fontSize: 12, color: mutedColor, marginBottom: 4 }}>Trạng thái thiết bị</Text>
                    <Select value={filterTrangThai} onChange={setFilterTrangThai} style={{ width: 170 }}
                      options={[{ label: 'Tất cả trạng thái', value: 'all' }, ...TRANG_THAI_TB]} />
                  </div>
                  <div>
                    <Text style={{ display: 'block', fontSize: 12, color: mutedColor, marginBottom: 4 }}>Cấp độ CSSK</Text>
                    <Select value={filterCssk} onChange={setFilterCssk} style={{ width: 160 }}
                      options={CSSK_FILTER_OPTIONS} />
                  </div>
                </Space>
              </div>
            )}

            {treeData.length === 0 && !loading ? (
              <Empty
                description={
                  hasActiveFilter ? 'Không tìm thấy thiết bị phù hợp với bộ lọc.' : 'Chưa có khu vực nào — bấm "Thêm khu vực" để bắt đầu.'
                }
                style={{ margin: '32px 0' }}
              >
                {hasActiveFilter && <Button icon={<ClearOutlined />} onClick={clearFilters}>Xóa lọc</Button>}
              </Empty>
            ) : (
              <Tree
                showIcon
                showLine={{ showLeafIcon: false }}
                blockNode
                treeData={treeData}
                expandedKeys={hasActiveFilter ? filteredExpandableKeys : expandedKeys}
                onExpand={keys => setExpandedKeys(keys.map(String))}
                selectedKeys={selectedKey ? [selectedKey] : []}
                onSelect={keys => setSelectedKey(keys.length ? String(keys[0]) : null)}
                style={{ minHeight: 300 }}
              />
            )}
          </Card>
        </Col>

        {selection && (
          <Col span={10}>
            <Card
              title={
                selection.type === 'kv' ? `Khu vực: ${selection.record.TenKhuVuc}`
                : selection.type === 'tram' ? `Trạm điện: ${selection.record.TenTram}`
                : `Thiết bị: ${selection.record.TenThietBi}`
              }
              extra={
                <Space>
                  <Button size="small" icon={<EditOutlined />} onClick={() => {
                    if (selection.type === 'kv') openEditKv(selection.record);
                    else if (selection.type === 'tram') openEditTram(selection.record);
                    else openEditThietBi(selection.record);
                  }}>Sửa</Button>
                  {selection.type === 'kv' && (
                    <Button size="small" icon={<PlusOutlined />} onClick={() => openAddTram(selection.record)}>
                      Thêm trạm
                    </Button>
                  )}
                  {selection.type === 'tram' && (
                    <Button size="small" icon={<PlusOutlined />} onClick={() => openAddThietBi(selection.record)}>
                      Thêm thiết bị
                    </Button>
                  )}
                </Space>
              }
            >
              {selection.type === 'kv' && (
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div><Text strong>ID: </Text><Text>{selection.record.ID_KhuVuc}</Text></div>
                  <div><Text strong>Trạng thái: </Text>{trangThaiTag2(selection.record.TrangThai)}</div>
                  <div><Text strong>Số trạm điện: </Text>
                    <Text>{trams.filter(t => t.IDKhuVuc === selection.record.ID_KhuVuc).length}</Text>
                  </div>
                  <Button size="small" onClick={() => navigate('/quan-ly/khu-vuc')}>
                    Xem trong danh sách khu vực →
                  </Button>
                </Space>
              )}

              {selection.type === 'tram' && (
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div><Text strong>ID: </Text><Text>{selection.record.IDTram}</Text></div>
                  <div><Text strong>Địa điểm: </Text><Text>{selection.record.DiaDiem ?? '—'}</Text></div>
                  <div><Text strong>Khu vực: </Text>
                    <Text>{selection.record.TenKhuVuc ?? khuVucs.find(k => k.ID_KhuVuc === selection.record.IDKhuVuc)?.TenKhuVuc}</Text>
                  </div>
                  <div><Text strong>Trạng thái: </Text>{trangThaiTag2(selection.record.TrangThai)}</div>
                  <div><Text strong>Số thiết bị: </Text>
                    <Text>{thietBis.filter(tb => tb.ID_Tram === selection.record.IDTram).length}</Text>
                  </div>
                  <Button size="small" onClick={() => navigate('/quan-ly/tram-dien')}>
                    Xem trong danh sách trạm điện →
                  </Button>
                </Space>
              )}

              {selection.type === 'tb' && (
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div><Text strong>ID: </Text><Text>{selection.record.ID_ThietBi}</Text></div>
                  <div><Text strong>Số hiệu: </Text><Text>{selection.record.SoHieu ?? '—'}</Text></div>
                  <div><Text strong>Loại thiết bị: </Text>
                    <Tag color="blue">{selection.record.TenLoaiTB ?? loaiName(selection.record.ID_LoaiTB)}</Tag>
                  </div>
                  <div><Text strong>Trạm điện: </Text>
                    <Text>{selection.record.TenTram ?? trams.find(t => t.IDTram === selection.record.ID_Tram)?.TenTram}</Text>
                  </div>
                  <div><Text strong>Ngăn lộ: </Text>
                    {selection.record.TenNganLo ? <Tag color="purple">{selection.record.TenNganLo}</Tag> : <Text>—</Text>}
                  </div>
                  <div><Text strong>Nhãn hiệu: </Text><Text>{selection.record.NhanHieu ?? '—'}</Text></div>
                  <div><Text strong>Năm sản xuất: </Text><Text>{selection.record.NamSanXuat ?? '—'}</Text></div>
                  <div><Text strong>Trạng thái: </Text>{trangThaiTagTB(selection.record.TrangThai)}</div>
                  <div><Text strong>CSSK mới nhất: </Text>{csskTag(selection.record.ID_ThietBi)}</div>
                  {selection.record.GhiChu && (
                    <div><Text strong>Ghi chú: </Text><Text>{selection.record.GhiChu}</Text></div>
                  )}
                  <Space wrap>
                    {latestByThietBi[selection.record.ID_ThietBi] && (
                      <Button size="small" onClick={() =>
                        navigate(`/ket-qua/${latestByThietBi[selection.record.ID_ThietBi].ID_Phieu}`)
                      }>
                        Xem chi tiết phiếu →
                      </Button>
                    )}
                    <Button size="small" onClick={() => navigate('/nhap-lieu/dong')}>Nhập liệu →</Button>
                    <Button size="small" onClick={() => navigate('/quan-ly/thiet-bi')}>Xem trong danh sách →</Button>
                  </Space>
                </Space>
              )}
            </Card>
          </Col>
        )}
      </Row>

      {/* ── Modal Khu vực ── */}
      <Modal
        title={editingKv ? `Sửa khu vực — ${editingKv.TenKhuVuc}` : 'Thêm khu vực mới'}
        open={kvModalOpen}
        onOk={saveKv}
        onCancel={() => setKvModalOpen(false)}
        okText={editingKv ? 'Cập nhật' : 'Thêm mới'}
        cancelText="Hủy"
        confirmLoading={savingKv}
        destroyOnHidden
      >
        <Form form={kvForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="TenKhuVuc" label="Tên khu vực" rules={[{ required: true, message: 'Nhập tên khu vực' }]}>
            <Input placeholder="VD: Khu vực miền Trung" />
          </Form.Item>
          <Form.Item name="TrangThai" label="Trạng thái" rules={[{ required: true }]}>
            <Select options={TRANG_THAI_2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modal Trạm điện ── */}
      <Modal
        title={editingTram ? `Sửa trạm điện — ${editingTram.TenTram}` : `Thêm trạm điện${parentKvForTram ? ` — ${parentKvForTram.TenKhuVuc}` : ''}`}
        open={tramModalOpen}
        onOk={saveTram}
        onCancel={() => setTramModalOpen(false)}
        okText={editingTram ? 'Cập nhật' : 'Thêm mới'}
        cancelText="Hủy"
        confirmLoading={savingTram}
        width={520}
        destroyOnHidden
      >
        <Form form={tramForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="IDKhuVuc" label="Khu vực" rules={[{ required: true, message: 'Chọn khu vực' }]}>
            <Select placeholder="Chọn khu vực..." showSearch optionFilterProp="label"
              disabled={!!parentKvForTram}
              options={khuVucs.map(k => ({ label: k.TenKhuVuc, value: k.ID_KhuVuc }))} />
          </Form.Item>
          <Form.Item name="TenTram" label="Tên trạm" rules={[{ required: true, message: 'Nhập tên trạm điện' }]}>
            <Input placeholder="VD: Trạm 110kV Quảng Ngãi" />
          </Form.Item>
          <Form.Item name="DiaDiem" label="Địa điểm">
            <Input placeholder="VD: Xã Tịnh Phong, Sơn Tịnh, Quảng Ngãi" />
          </Form.Item>
          <Form.Item name="TrangThai" label="Trạng thái" rules={[{ required: true }]}>
            <Select options={TRANG_THAI_2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modal Thiết bị ── */}
      <Modal
        title={editingTb ? `Sửa thiết bị — ${editingTb.TenThietBi}` : `Thêm thiết bị${parentTramForTb ? ` — ${parentTramForTb.TenTram}` : ''}`}
        open={tbModalOpen}
        onOk={saveThietBi}
        onCancel={() => setTbModalOpen(false)}
        okText={editingTb ? 'Cập nhật' : 'Thêm mới'}
        cancelText="Hủy"
        confirmLoading={savingTb}
        width={640}
        destroyOnHidden
      >
        <Form form={tbForm} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="ID_Tram" label="Trạm điện" rules={[{ required: true, message: 'Chọn trạm điện' }]}>
                <Select placeholder="Chọn trạm điện..." showSearch optionFilterProp="label"
                  disabled={!!parentTramForTb}
                  options={trams.map(t => ({ label: t.TenTram, value: t.IDTram }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="ID_LoaiTB" label="Loại thiết bị" rules={[{ required: true, message: 'Chọn loại thiết bị' }]}>
                <Select placeholder="Chọn loại thiết bị..."
                  options={loais.map(l => ({ label: `${l.TenLoaiTB} (${l.KyHieu})`, value: l.ID_LoaiThietBi }))} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="TenThietBi" label="Tên thiết bị" rules={[{ required: true, message: 'Nhập tên thiết bị' }]}>
            <Input placeholder="VD: Máy biến áp T1 110/22kV" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="SoHieu" label="Số hiệu">
                <Input placeholder="VD: T1" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="NhanHieu" label="Nhãn hiệu / NSX">
                <Input placeholder="VD: ABB, Siemens, THIÊN TRƯỜNG..." />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="NamSanXuat" label="Năm sản xuất">
                <InputNumber style={{ width: '100%' }} min={1950} max={2100} placeholder="VD: 2010" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="TrangThai" label="Trạng thái" rules={[{ required: true }]}>
                <Select options={TRANG_THAI_TB} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="GhiChu" label="Ghi chú">
            <Input.TextArea rows={2} placeholder="Ghi chú thêm về thiết bị..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
