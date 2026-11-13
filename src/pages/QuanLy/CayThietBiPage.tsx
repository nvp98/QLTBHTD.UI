import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge, Button, Card, Col, Empty, Form, Input, InputNumber, Modal, Popconfirm,
  Row, Segmented, Select, Space, Tag, Tooltip, Tree, Typography, message,
} from 'antd';
import type { DataNode } from 'antd/es/tree';
import {
  ApartmentOutlined, ClearOutlined, ClusterOutlined, DeleteOutlined, EditOutlined, EnvironmentOutlined,
  ExpandAltOutlined, FilterOutlined, PlusOutlined, ShrinkOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import { khuVucApi } from '../../api/khuVuc';
import { tramDienApi } from '../../api/tramDien';
import { thietBiApi } from '../../api/thietBi';
import { nganLoApi } from '../../api/nganLo';
import { loaiThietBiApi } from '../../api/loaiThietBi';
import { cayThietBiApi, type CayNode, type CayThietBiResult } from '../../api/cayThietBi';
import type { KhuVuc, TramDien, ThietBi, LoaiThietBi, NganLo } from '../../types/entities';
import { useThemeMode } from '../../theme/ThemeModeContext';
import { getCapDoByKey, type CapDoKey } from '../../theme/capDoSucKhoe';

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

const trangThaiTag2 = (v: number) => <Tag>{v === 1 ? 'Hoạt động' : 'Ngừng'}</Tag>;
const trangThaiTagTB = (v: number) => {
  if (v === 1) return <Tag>Hoạt động</Tag>;
  if (v === 2) return <Tag>Bảo trì</Tag>;
  return <Tag>Ngừng</Tag>;
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
  const [nganLos, setNganLos]   = useState<NganLo[]>([]);
  // Cấp thứ 3 của cây (dưới Trạm): nhóm theo Ngăn lộ (mặc định) hoặc theo Loại thiết bị.
  const [groupBy, setGroupBy]   = useState<'nganlo' | 'loai'>('nganlo');
  // Cây do BE dựng sẵn (lọc + nhóm + CSSK); FE chỉ hiển thị.
  const [cay, setCay]           = useState<CayThietBiResult | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [reloadTick, setReloadTick] = useState(0);
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
  const [parentNganLoForTb, setParentNganLoForTb] = useState<NganLo | null>(null);
  const [savingTb, setSavingTb]         = useState(false);
  const [tbForm] = Form.useForm();

  /** Tải danh mục (dùng cho form sửa/xóa + panel chi tiết) rồi nhờ BE dựng lại cây. */
  const load = useCallback(async (refreshTree = true) => {
    try {
      const [kvs, ts, tbs, ls, nls] = await Promise.all([
        khuVucApi.getAll(),
        tramDienApi.getAll(),
        thietBiApi.getAll(),
        loaiThietBiApi.getActive(),
        nganLoApi.getAll(),
      ]);
      setKhuVucs(kvs);
      setTrams(ts);
      setThietBis(tbs);
      setLoais(ls);
      setNganLos(nls);
      if (refreshTree) setReloadTick(t => t + 1);
    } catch {
      message.error('Không thể tải cây thiết bị');
    }
  }, []);

  useEffect(() => { load(false); }, [load]);

  const loaiName = (id: number) => loais.find(l => l.ID_LoaiThietBi === id)?.TenLoaiTB ?? `Loại ${id}`;

  /** CSSK (phiếu đã tính điểm mới nhất) của từng thiết bị — BE trả sẵn. */
  const csskMap = useMemo(() => {
    const m: Record<number, { diem: number | null; label: string; idPhieu: number | null }> = {};
    for (const x of cay?.thietBiCssk ?? []) m[x.idThietBi] = { diem: x.diem, label: x.capDoLabel, idPhieu: x.idPhieu };
    return m;
  }, [cay]);

  /** Tag CSSK cho 1 thiết bị — "Chưa đo" nếu chưa có phiếu nào đã tính điểm. */
  const csskTagOf = (diem: number | null | undefined, label?: string | null) => {
    if (diem == null) return <Tag style={{ fontSize: 10 }}>Chưa đo</Tag>;
    return (
      <Tag style={{ fontSize: 10 }}>
        {Number(diem).toFixed(1)} · {label}
      </Tag>
    );
  };
  const csskTag = (idThietBi: number) => csskTagOf(csskMap[idThietBi]?.diem, csskMap[idThietBi]?.label);

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
  const openAddThietBi = (tram: TramDien, nganLo?: NganLo | null) => {
    setEditingTb(null); setParentTramForTb(tram); setParentNganLoForTb(nganLo ?? null); setTbModalOpen(true);
  };
  const openEditThietBi = (tb: ThietBi) => { setEditingTb(tb); setParentTramForTb(null); setParentNganLoForTb(null); setTbModalOpen(true); };

  useEffect(() => {
    if (!tbModalOpen) return;
    if (editingTb) tbForm.setFieldsValue(editingTb);
    else tbForm.setFieldsValue({ ID_Tram: parentTramForTb?.IDTram, ID_NganLo: parentNganLoForTb?.ID_NganLo ?? null, TenThietBi: '', TrangThai: 1 });
  }, [tbModalOpen, editingTb, parentTramForTb, parentNganLoForTb, tbForm]);

  // Ngăn lộ chọn được = các ngăn lộ thuộc trạm đang chọn trong form thiết bị.
  const tbFormTram = Form.useWatch('ID_Tram', tbForm);

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

  // ── Tree data: BE đã lọc + nhóm + tính CSSK; FE chỉ ánh xạ sang node của antd ─────────
  const searchLower = search.trim().toLowerCase();
  const hasActiveFilter = !!searchLower || filterKhuVuc !== 'all' || filterLoai !== 'all'
    || filterTrangThai !== 'all' || filterCssk !== 'all';
  const activeFilterCount = [searchLower, filterKhuVuc !== 'all', filterLoai !== 'all',
    filterTrangThai !== 'all', filterCssk !== 'all'].filter(Boolean).length;

  const clearFilters = () => {
    setSearch(''); setFilterKhuVuc('all'); setFilterLoai('all'); setFilterTrangThai('all'); setFilterCssk('all');
  };

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    cayThietBiApi.get({
      idKhuVuc: filterKhuVuc === 'all' ? undefined : filterKhuVuc,
      idLoaiTB: filterLoai === 'all' ? undefined : filterLoai,
      trangThai: filterTrangThai === 'all' ? undefined : filterTrangThai,
      cssk: filterCssk === 'all' ? undefined : filterCssk,
      search: debouncedSearch || undefined,
      groupBy,
    })
      .then(r => { if (!cancelled) setCay(r); })
      .catch(() => { if (!cancelled) message.error('Không thể tải cây thiết bị'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filterKhuVuc, filterLoai, filterTrangThai, filterCssk, debouncedSearch, groupBy, reloadTick]);

  const nodeRowStyle = () => ({
    width: '100%', display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const,
    padding: '4px 8px', borderRadius: 6, borderLeft: '3px solid transparent',
  });

  const cssAvgTag = (n: CayNode, size = 10) =>
    n.csskTrungBinh != null && (
      <Tag style={{ fontSize: size }}>CSSK TB: {Number(n.csskTrungBinh).toFixed(1)}</Tag>
    );

  /** Node 1 thiết bị (lá của cây). */
  const buildTbNode = (n: CayNode): DataNode => {
    const tb = thietBis.find(t => t.ID_ThietBi === n.id);
    return {
      key: n.key,
      isLeaf: true,
      icon: <ApartmentOutlined />,
      title: (
        <Space size={4} style={nodeRowStyle()}>
          <Space size={4} wrap>
            <Text>{n.ten}</Text>
            {groupBy === 'loai' && n.tenNganLo && <Tag style={{ fontSize: 10 }}>{n.tenNganLo}</Tag>}
            {trangThaiTagTB(n.trangThai ?? 0)}
            {csskTagOf(n.diem, n.capDoLabel)}
          </Space>
          {tb && (
            <Space size={2} onClick={e => e.stopPropagation()}>
              <Tooltip title="Sửa thiết bị">
                <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEditThietBi(tb)} />
              </Tooltip>
              <Popconfirm title={`Xóa thiết bị "${tb.TenThietBi}"?`} okText="Xóa" cancelText="Hủy"
                okButtonProps={{ danger: true }} onConfirm={() => handleDeleteThietBi(tb)}>
                <Button size="small" type="text" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space>
          )}
        </Space>
      ),
    };
  };

  /** Node nhóm: ngăn lộ hoặc loại thiết bị. */
  const buildGroupNode = (n: CayNode): DataNode => {
    // key ngăn lộ dạng nl-{idTram}-{idNganLo}
    const tramId = n.loai === 'nganlo' ? Number(n.key.split('-')[1]) : 0;
    const tram = trams.find(t => t.IDTram === tramId);
    const nl = n.loai === 'nganlo' && n.id > 0 ? nganLos.find(x => x.ID_NganLo === n.id) : undefined;
    return {
      key: n.key,
      selectable: false,
      icon: <ClusterOutlined />,
      title: (
        <Space size={4} style={nodeRowStyle()}>
          <Space size={4} wrap>
            <Text>{n.ten}</Text>
            {n.loai === 'nganlo' && n.trangThai === 0 && <Tag style={{ fontSize: 10 }}>Ngừng</Tag>}
            <Tag style={{ fontSize: 10 }}>{n.soThietBi} thiết bị</Tag>
            {cssAvgTag(n)}
          </Space>
          {tram && nl && (
            <Space size={2} onClick={e => e.stopPropagation()}>
              <Tooltip title="Thêm thiết bị vào ngăn lộ này">
                <Button size="small" type="text" icon={<PlusOutlined />} onClick={() => openAddThietBi(tram, nl)} />
              </Tooltip>
            </Space>
          )}
        </Space>
      ),
      children: n.children.map(c => (c.loai === 'tb' ? buildTbNode(c) : buildGroupNode(c))),
    };
  };

  const buildTramNode = (n: CayNode): DataNode => {
    const t = trams.find(x => x.IDTram === n.id);
    return {
      key: n.key,
      icon: <ThunderboltOutlined />,
      title: (
        <Space size={4} style={nodeRowStyle()}>
          <Space size={4} wrap>
            <Text>{n.ten}</Text>
            <Tag style={{ fontSize: 10 }}>{n.trangThai === 1 ? 'Hoạt động' : 'Ngừng'}</Tag>
            <Tag style={{ fontSize: 10 }}>{n.soThietBi} thiết bị</Tag>
            {cssAvgTag(n)}
          </Space>
          {t && (
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
          )}
        </Space>
      ),
      children: n.children.map(buildGroupNode),
    };
  };

  const buildKvNode = (n: CayNode): DataNode => {
    const kv = khuVucs.find(k => k.ID_KhuVuc === n.id);
    return {
      key: n.key,
      icon: <EnvironmentOutlined />,
      title: (
        <Space size={4} style={nodeRowStyle()}>
          <Space size={4} wrap>
            <Text strong>{n.ten}</Text>
            <Tag style={{ fontSize: 10 }}>{n.trangThai === 1 ? 'Hoạt động' : 'Ngừng'}</Tag>
            <Tag style={{ fontSize: 10 }}>{n.soTram ?? n.children.length} trạm</Tag>
          </Space>
          {kv && (
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
          )}
        </Space>
      ),
      children: n.children.map(buildTramNode),
    };
  };

  const treeData: DataNode[] = useMemo(
    () => (cay?.nodes ?? []).map(buildKvNode),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cay, khuVucs, trams, thietBis, nganLos, groupBy],
  );

  const allExpandableKeys = useMemo(() => {
    const keys: string[] = [];
    const walk = (nodes: DataNode[]) => {
      for (const n of nodes) {
        if (n.children && n.children.length) { keys.push(String(n.key)); walk(n.children as DataNode[]); }
      }
    };
    walk(treeData);
    return keys;
  }, [treeData]);

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
          Xem &amp; quản lý theo cấu trúc Khu vực → Trạm điện → {groupBy === 'nganlo' ? 'Ngăn lộ' : 'Loại thiết bị'} → Thiết bị · {khuVucs.length} khu vực,{' '}
          {trams.length} trạm, {thietBis.length} thiết bị
        </Text>
      </div>

      {/* ── Dải thống kê CSSK — bấm để lọc nhanh theo cấp độ ── */}
      <Row gutter={10} style={{ marginBottom: 16 }}>
        {CSSK_FILTER_OPTIONS.filter(o => o.value !== 'all').map(opt => {
          const info = getCapDoByKey(opt.value, isDark);
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
                  {cay?.csskCounts?.[opt.value] ?? 0}
                </Text>
                <Text style={{ color: active ? info.color : mutedColor, fontSize: 12 }}>{opt.label}</Text>
              </Card>
            </Col>
          );
        })}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={selection ? 14 : 24}>
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
                <Segmented size="middle" value={groupBy} onChange={v => setGroupBy(v as 'nganlo' | 'loai')}
                  options={[{ label: 'Theo ngăn lộ', value: 'nganlo' }, { label: 'Theo loại TB', value: 'loai' }]} />
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
          <Col xs={24} lg={10}>
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
                    <Tag>{selection.record.TenLoaiTB ?? loaiName(selection.record.ID_LoaiTB)}</Tag>
                  </div>
                  <div><Text strong>Trạm điện: </Text>
                    <Text>{selection.record.TenTram ?? trams.find(t => t.IDTram === selection.record.ID_Tram)?.TenTram}</Text>
                  </div>
                  <div><Text strong>Ngăn lộ: </Text>
                    {selection.record.TenNganLo ? <Tag>{selection.record.TenNganLo}</Tag> : <Text>—</Text>}
                  </div>
                  <div><Text strong>Nhãn hiệu: </Text><Text>{selection.record.NhanHieu ?? '—'}</Text></div>
                  <div><Text strong>Năm sản xuất: </Text><Text>{selection.record.NamSanXuat ?? '—'}</Text></div>
                  <div><Text strong>Trạng thái: </Text>{trangThaiTagTB(selection.record.TrangThai)}</div>
                  <div><Text strong>CSSK mới nhất: </Text>{csskTag(selection.record.ID_ThietBi)}</div>
                  {selection.record.GhiChu && (
                    <div><Text strong>Ghi chú: </Text><Text>{selection.record.GhiChu}</Text></div>
                  )}
                  <Space wrap>
                    {csskMap[selection.record.ID_ThietBi]?.idPhieu != null && (
                      <Button size="small" onClick={() =>
                        navigate(`/ket-qua/${csskMap[selection.record.ID_ThietBi].idPhieu}`)
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
          <Form.Item name="ID_NganLo" label="Ngăn lộ" tooltip="Ngăn lộ thuộc trạm đã chọn. Để trống nếu thiết bị chưa gán ngăn lộ.">
            <Select allowClear placeholder={tbFormTram ? 'Chọn ngăn lộ...' : 'Chọn trạm điện trước'}
              disabled={!tbFormTram} showSearch optionFilterProp="label"
              options={nganLos.filter(n => n.ID_Tram === tbFormTram).map(n => ({ label: n.TenNganLo, value: n.ID_NganLo }))} />
          </Form.Item>
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
