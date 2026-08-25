import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, Col, Divider, Form, Input, InputNumber, Modal, Popconfirm,
  Row, Select, Space, Table, Tag, Tooltip, Typography, message,
} from 'antd';
import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { thietBiApi }     from '../../api/thietBi';
import { tramDienApi }    from '../../api/tramDien';
import { loaiThietBiApi } from '../../api/loaiThietBi';
import { nganLoApi }      from '../../api/nganLo';
import { thietBiThongSoApi } from '../../api/thietBiThongSo';
import { thongSoApi }     from '../../api/thongSo';
import type { ThietBi, TramDien, LoaiThietBi, NganLo, ThietBiThongSo, ThongSo, ThietBiThongSoUsage } from '../../types/entities';
import { useThemeMode } from '../../theme/ThemeModeContext';

const { Title, Text } = Typography;

const TRANG_THAI_OPTIONS = [
  { label: 'Hoạt động', value: 1 },
  { label: 'Bảo trì', value: 2 },
  { label: 'Ngừng vận hành', value: 0 },
];

const trangThaiTag = (v: number) => {
  if (v === 1)  return <Tag color="success">Hoạt động</Tag>;
  if (v === 2)  return <Tag color="warning">Bảo trì</Tag>;
  return              <Tag color="default">Ngừng</Tag>;
};

export default function ThietBiPage() {
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  const [data, setData]               = useState<ThietBi[]>([]);
  const [trams, setTrams]             = useState<TramDien[]>([]);
  const [loais, setLoais]             = useState<LoaiThietBi[]>([]);
  const [nganLos, setNganLos]         = useState<NganLo[]>([]);
  const [loading, setLoading]         = useState(false);
  const [modalOpen, setModalOpen]     = useState(false);
  const [detailOpen, setDetailOpen]   = useState(false);
  const [saving, setSaving]           = useState(false);
  const [editing, setEditing]         = useState<ThietBi | null>(null);
  const [detail, setDetail]           = useState<ThietBi | null>(null);
  const [search, setSearch]           = useState('');
  const [filterTram, setFilterTram]   = useState<number | 'all'>('all');
  const [filterLoai, setFilterLoai]   = useState<number | 'all'>('all');
  const [form]                        = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tbs, ts, ls, nls] = await Promise.all([
        thietBiApi.getAll(),
        tramDienApi.getActive(),
        loaiThietBiApi.getActive(),
        nganLoApi.getActive(),
      ]);
      setData(tbs);
      setTrams(ts);
      setLoais(ls);
      setNganLos(nls);
    } catch {
      message.error('Không thể tải dữ liệu thiết bị');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ TrangThai: 1 });
    setModalOpen(true);
  };

  const openEdit = (record: ThietBi) => {
    setEditing(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const openDetail = (record: ThietBi) => {
    setDetail(record);
    setDetailOpen(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const values = await form.validateFields();
      if (editing) {
        await thietBiApi.update(editing.ID_ThietBi, values);
        message.success('Cập nhật thiết bị thành công');
      } else {
        await thietBiApi.create(values);
        message.success('Thêm thiết bị thành công');
      }
      setModalOpen(false);
      load();
    } catch (e: unknown) {
      if (e instanceof Error && 'errorFields' in (e as object)) return;
      message.error('Lỗi khi lưu dữ liệu');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await thietBiApi.delete(id);
      message.success('Đã xóa thiết bị');
      load();
    } catch {
      message.error('Không thể xóa — thiết bị đang có phiếu kiểm tra');
    }
  };

  const tramName = (id: number) => trams.find(t => t.IDTram === id)?.TenTram ?? `Trạm ${id}`;
  const loaiName = (id: number) => loais.find(l => l.ID_LoaiThietBi === id)?.TenLoaiTB ?? `Loại ${id}`;
  const loaiKH   = (id: number) => loais.find(l => l.ID_LoaiThietBi === id)?.KyHieu ?? '';

  const searchLower = search.toLowerCase();

  const filtered = data.filter(d => {
    const matchSearch = [d.TenThietBi ?? '', d.SoHieu ?? '', d.NhanHieu ?? '']
      .some(s => String(s ?? '').toLowerCase().includes(searchLower));
    const matchTram = filterTram === 'all' || d.ID_Tram === filterTram;
    const matchLoai = filterLoai === 'all' || d.ID_LoaiTB === filterLoai;
    return matchSearch && matchTram && matchLoai;
  });

  const columns: ColumnsType<ThietBi> = [
    {
      title: 'STT', key: 'stt', width: 55, align: 'center',
      render: (_, __, i) => <Text style={{ color: '#6b7280' }}>{i + 1}</Text>,
    },
    {
      title: 'Mã', dataIndex: 'ID_ThietBi', key: 'id', width: 65,
      render: v => <Text style={{ color: '#93c5fd', fontFamily: 'monospace', fontSize: 12 }}>{v}</Text>,
    },
    {
      title: 'Tên thiết bị', dataIndex: 'TenThietBi', key: 'name', width: 220,
      render: (v, r) => (
        <div>
          <Text strong style={{ color: isDark ? '#e5e7eb' : '#111827', display: 'block' }}>{v ?? 'Chưa có tên'}</Text>
          {r.SoHieu && <Text style={{ color: '#6b7280', fontSize: 11 }}>Số hiệu: {r.SoHieu}</Text>}
        </div>
      ),
      sorter: (a, b) => (a.TenThietBi ?? '').localeCompare(b.TenThietBi ?? ''),
    },
    {
      title: 'Loại TB', dataIndex: 'ID_LoaiTB', key: 'loai', width: 130,
      render: (v, r) => (
        <Tag color="blue">
          {r.TenLoaiTB ?? loaiName(v)} {r.KyHieu ? `(${r.KyHieu})` : loaiKH(v) ? `(${loaiKH(v)})` : ''}
        </Tag>
      ),
      filters: loais.map(l => ({ text: l.TenLoaiTB, value: l.ID_LoaiThietBi })),
      onFilter: (val, r) => r.ID_LoaiTB === val,
    },
    {
      title: 'Trạm điện', dataIndex: 'ID_Tram', key: 'tram', width: 180,
      render: (v, r) => <Text style={{ color: '#9ca3af', fontSize: 12 }}>{r.TenTram ?? tramName(v)}</Text>,
      filters: trams.map(t => ({ text: t.TenTram, value: t.IDTram })),
      onFilter: (val, r) => r.ID_Tram === val,
    },
    {
      title: 'Ngăn lộ', dataIndex: 'ID_NganLo', key: 'nganlo', width: 130,
      render: (_, r) => r.TenNganLo ? <Tag color="purple">{r.TenNganLo}</Tag> : <Text style={{ color: '#6b7280', fontSize: 12 }}>—</Text>,
      filters: nganLos.map(n => ({ text: n.TenNganLo, value: n.ID_NganLo })),
      onFilter: (val, r) => r.ID_NganLo === val,
    },
    {
      title: 'Nhãn hiệu', dataIndex: 'NhanHieu', key: 'nhan', width: 110,
      render: v => <Text style={{ color: '#9ca3af', fontSize: 12 }}>{v ?? '—'}</Text>,
    },
    {
      title: 'Năm SX', dataIndex: 'NamSanXuat', key: 'nam', width: 85,
      render: v => <Text style={{ color: '#9ca3af', fontSize: 12 }}>{v ?? '—'}</Text>,
    },
    {
      title: 'Tải định mức', dataIndex: 'TaiDinhMuc', key: 'taiDinhMuc', width: 110, align: 'right',
      render: v => <Text style={{ color: '#9ca3af', fontSize: 12 }}>{v != null ? `${v} MVA` : '—'}</Text>,
      sorter: (a, b) => (a.TaiDinhMuc ?? 0) - (b.TaiDinhMuc ?? 0),
    },
    {
      title: 'Trạng thái', dataIndex: 'TrangThai', key: 'status', width: 130,
      render: trangThaiTag,
      filters: [{ text: 'Hoạt động', value: 1 }, { text: 'Bảo trì', value: 2 }, { text: 'Ngừng', value: 0 }],
      onFilter: (val, r) => r.TrangThai === val,
    },
    {
      title: 'Thao tác', key: 'actions', width: 120, align: 'center',
      render: (_, record) => (
        <Space>
          <Tooltip title="Xem chi tiết">
            <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)} />
          </Tooltip>
          <Tooltip title="Chỉnh sửa">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          </Tooltip>
          <Popconfirm
            title="Xác nhận xóa"
            description={`Xóa thiết bị "${record.TenThietBi}"?`}
            okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record.ID_ThietBi)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ color: isDark ? '#f9fafb' : '#111827', margin: 0 }}>Quản lý thiết bị</Title>
        <Text style={{ color: '#6b7280', fontSize: 13 }}>
          Danh sách thiết bị điện trong hệ thống CBM · {data.length} thiết bị
        </Text>
      </div>

      <Card style={{ background: isDark ? '#0e2c4a' : '#ffffff', border: `1px solid ${isDark ? '#1e4a72' : '#e5e7eb'}` }}
        styles={{ body: { padding: '16px 20px' } }}>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }} wrap>
          <Space wrap>
            <Input.Search
              placeholder="Tìm tên, số hiệu, nhãn hiệu..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: 260 }}
              allowClear
            />
            <Select value={filterTram} onChange={setFilterTram} style={{ width: 200 }}
              showSearch optionFilterProp="label"
              options={[
                { label: 'Tất cả trạm', value: 'all' },
                ...trams.map(t => ({ label: t.TenTram, value: t.IDTram })),
              ]}
            />
            <Select value={filterLoai} onChange={setFilterLoai} style={{ width: 170 }}
              options={[
                { label: 'Tất cả loại', value: 'all' },
                ...loais.map(l => ({ label: `${l.TenLoaiTB} (${l.KyHieu})`, value: l.ID_LoaiThietBi })),
              ]}
            />
          </Space>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Làm mới</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Thêm thiết bị</Button>
          </Space>
        </Space>

        <Table<ThietBi>
          dataSource={filtered}
          columns={columns}
          rowKey="ID_ThietBi"
          loading={loading}
          size="small"
          scroll={{ x: 1100 }}
          pagination={{ pageSize: 15, showTotal: t => `Tổng ${t} thiết bị`, showSizeChanger: true }}
        />
      </Card>

      {/* ── Create / Edit Modal ── */}
      <Modal
        title={editing ? `Cập nhật thiết bị — ${editing.TenThietBi}` : 'Thêm thiết bị mới'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        okText={editing ? 'Cập nhật' : 'Thêm mới'}
        cancelText="Hủy"
        confirmLoading={saving}
        width={640}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="ID_Tram" label="Trạm điện" rules={[{ required: true, message: 'Chọn trạm điện' }]}>
                <Select placeholder="Chọn trạm điện..." showSearch optionFilterProp="label"
                  options={trams.map(t => ({ label: t.TenTram, value: t.IDTram }))}
                  onChange={() => form.setFieldValue('ID_NganLo', undefined)} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="ID_LoaiTB" label="Loại thiết bị" rules={[{ required: true, message: 'Chọn loại thiết bị' }]}>
                <Select placeholder="Chọn loại thiết bị..."
                  options={loais.map(l => ({ label: `${l.TenLoaiTB} (${l.KyHieu})`, value: l.ID_LoaiThietBi }))} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item shouldUpdate={(prev, cur) => prev.ID_Tram !== cur.ID_Tram} noStyle>
            {() => {
              const idTram = form.getFieldValue('ID_Tram');
              const options = nganLos.filter(n => n.ID_Tram === idTram).map(n => ({ label: n.TenNganLo, value: n.ID_NganLo }));
              return (
                <Form.Item name="ID_NganLo" label="Ngăn lộ"
                  tooltip="Nhóm thiết bị cùng ngắt điện chung khi kiểm tra offline. Để trống nếu không thuộc ngăn lộ nào.">
                  <Select allowClear placeholder={idTram ? 'Chọn ngăn lộ (không bắt buộc)...' : 'Chọn trạm điện trước'}
                    options={options} disabled={!idTram} />
                </Form.Item>
              );
            }}
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
              <Form.Item name="TaiDinhMuc" label="Tải định mức (MVA)"
                tooltip="Dùng làm SB trong công thức LF (Si/SB) của chỉ tiêu 'Quá khứ mang tải' — chỉ áp dụng cho MBA.">
                <InputNumber style={{ width: '100%' }} min={0} step={0.1} precision={2} placeholder="VD: 25" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="TrangThai" label="Trạng thái" rules={[{ required: true }]}>
            <Select options={TRANG_THAI_OPTIONS} />
          </Form.Item>
          <Form.Item name="GhiChu" label="Ghi chú">
            <Input.TextArea rows={2} placeholder="Ghi chú thêm về thiết bị..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Detail View Modal ── */}
      <Modal
        title={`Chi tiết thiết bị — ${detail?.TenThietBi}`}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={
          <Button onClick={() => { setDetailOpen(false); openEdit(detail!); }}>
            Chỉnh sửa
          </Button>
        }
        width={540}
      >
        {detail && (
          <div style={{ marginTop: 16 }}>
            {[
              ['Mã thiết bị',   detail.ID_ThietBi],
              ['Tên thiết bị',  detail.TenThietBi],
              ['Số hiệu',       detail.SoHieu ?? '—'],
              ['Loại thiết bị', detail.TenLoaiTB ?? loaiName(detail.ID_LoaiTB)],
              ['Trạm điện',     detail.TenTram ?? tramName(detail.ID_Tram)],
              ['Ngăn lộ',       detail.TenNganLo ?? '—'],
              ['Nhãn hiệu',     detail.NhanHieu ?? '—'],
              ['Năm sản xuất',  detail.NamSanXuat ?? '—'],
              ['Tải định mức',  detail.TaiDinhMuc != null ? `${detail.TaiDinhMuc} MVA` : '—'],
              ['Trạng thái',    trangThaiTag(detail.TrangThai)],
              ['Ghi chú',       detail.GhiChu ?? '—'],
            ].map(([label, value]) => (
              <Row key={String(label)} style={{ marginBottom: 10, borderBottom: `1px solid ${isDark ? '#1e4a72' : '#e5e7eb'}`, paddingBottom: 10 }}>
                <Col span={10}>
                  <Text style={{ color: '#6b7280', fontSize: 13 }}>{label}</Text>
                </Col>
                <Col span={14}>
                  {typeof value === 'string' || typeof value === 'number'
                    ? <Text style={{ color: isDark ? '#e5e7eb' : '#111827', fontSize: 13 }}>{value}</Text>
                    : value}
                </Col>
              </Row>
            ))}
            <ThongSoPanel idThietBi={detail.ID_ThietBi} isDark={isDark} />
          </div>
        )}
      </Modal>
    </div>
  );
}

/** API trả lỗi cấu hình (vd ThongSoDangSuDungException) dạng JSON {"error":"..."} trong body —
 * bóc ra hiển thị đúng thông điệp thay vì message chung chung. */
function extractApiErrorMessage(e: unknown, macDinh: string): string {
  if (e instanceof Error) {
    try {
      const parsed = JSON.parse(e.message) as { error?: string };
      if (parsed.error) return parsed.error;
    } catch { /* không phải JSON — dùng mặc định */ }
  }
  return macDinh;
}

// ─── ThongSoCatalogModal — quản lý danh mục thông số dùng chung (sửa/xóa mã) ───────────────
function ThongSoCatalogModal({ open, onClose, onChanged }: { open: boolean; onClose: () => void; onChanged: () => void }) {
  const [items, setItems]     = useState<ThongSo[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<ThongSo | null>(null);
  const [saving, setSaving]   = useState(false);
  const [usageMap, setUsageMap] = useState<Record<number, ThietBiThongSoUsage[] | undefined>>({});
  const [usageLoading, setUsageLoading] = useState<number | null>(null);
  const [form]                = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await thongSoApi.getAll()); }
    catch { message.error('Không thể tải danh mục thông số'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (open) load(); }, [open, load]);

  const loadUsage = async (idThongSo: number) => {
    setUsageLoading(idThongSo);
    try {
      const rows = await thietBiThongSoApi.getByThongSo(idThongSo);
      setUsageMap(prev => ({ ...prev, [idThongSo]: rows }));
    } catch { message.error('Không thể tải danh sách thiết bị đang dùng'); }
    finally { setUsageLoading(null); }
  };

  const handleGoBoThongSo = async (idThietBiThongSo: number, idThongSo: number) => {
    try {
      await thietBiThongSoApi.delete(idThietBiThongSo);
      message.success('Đã gỡ thông số khỏi thiết bị');
      loadUsage(idThongSo);
      onChanged();
    } catch { message.error('Lỗi gỡ thông số'); }
  };

  const openEdit = (r: ThongSo) => { setEditing(r); form.setFieldsValue(r); };

  const handleSubmit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const v = await form.validateFields();
      await thongSoApi.update(editing.ID_ThongSo, v);
      message.success('Đã cập nhật danh mục');
      setEditing(null); load(); onChanged();
    } catch (e: unknown) {
      if (e instanceof Error && 'errorFields' in (e as object)) return;
      message.error(extractApiErrorMessage(e, 'Lỗi lưu danh mục'));
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    try { await thongSoApi.delete(id); message.success('Đã xóa khỏi danh mục'); load(); onChanged(); }
    catch (e: unknown) { message.error(extractApiErrorMessage(e, 'Lỗi xóa danh mục')); }
  };

  const cols: ColumnsType<ThongSo> = [
    { title: 'Mã', dataIndex: 'MaThongSo', key: 'ma', width: 100,
      render: v => <Text code style={{ fontSize: 11 }}>{v}</Text> },
    { title: 'Tên thông số', dataIndex: 'TenThongSo', key: 'ten' },
    { title: 'ĐVT', dataIndex: 'DonVi', key: 'donvi', width: 70 },
    { title: '', key: 'actions', width: 76, align: 'center',
      render: (_, r) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title="Xóa mã thông số này khỏi danh mục?" okText="Xóa" cancelText="Hủy"
            okButtonProps={{ danger: true }} onConfirm={() => handleDelete(r.ID_ThongSo)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ) },
  ];

  return (
    <Modal
      title="Quản lý danh mục thông số dùng chung" open={open} onCancel={onClose}
      footer={<Button onClick={onClose}>Đóng</Button>} width={620} destroyOnHidden
    >
      <Text type="secondary" style={{ fontSize: 12 }}>
        Không thể xóa mã đang được thiết bị nào đó sử dụng — xóa giá trị đã khai ở thiết bị trước.
      </Text>
      <Table<ThongSo>
        dataSource={items} columns={cols} rowKey="ID_ThongSo"
        loading={loading} size="small" pagination={false} style={{ marginTop: 12 }}
        expandable={{
          onExpand: (expanded, record) => { if (expanded && !usageMap[record.ID_ThongSo]) loadUsage(record.ID_ThongSo); },
          expandedRowRender: record => {
            const rows = usageMap[record.ID_ThongSo];
            if (usageLoading === record.ID_ThongSo) return <Text type="secondary" style={{ fontSize: 12 }}>Đang tải...</Text>;
            if (!rows || rows.length === 0) return <Text type="secondary" style={{ fontSize: 12 }}>Chưa thiết bị nào dùng mã này</Text>;
            return (
              <Table<ThietBiThongSoUsage>
                dataSource={rows} rowKey="ID_ThietBi_ThongSo" size="small" pagination={false}
                showHeader={false}
                columns={[
                  { key: 'ten', render: (_, r) => <Text>{r.TenThietBi}</Text> },
                  { key: 'giatri', width: 120, align: 'right',
                    render: (_, r) => <Text strong>{r.GiaTri}{record.DonVi ? ` ${record.DonVi}` : ''}</Text> },
                  { key: 'action', width: 90, align: 'center',
                    render: (_, r) => (
                      <Popconfirm title="Gỡ thông số này khỏi thiết bị?" okText="Gỡ" cancelText="Hủy"
                        okButtonProps={{ danger: true }} onConfirm={() => handleGoBoThongSo(r.ID_ThietBi_ThongSo, record.ID_ThongSo)}>
                        <Button size="small" danger>Gỡ</Button>
                      </Popconfirm>
                    ) },
                ]}
              />
            );
          },
        }}
      />
      <Modal
        title="Sửa danh mục thông số" open={!!editing} onOk={handleSubmit} onCancel={() => setEditing(null)}
        okText="Cập nhật" cancelText="Hủy" confirmLoading={saving} destroyOnHidden width={420}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="MaThongSo" label="Mã thông số"
            rules={[{ required: true }, { pattern: /^\w+$/, message: 'Chỉ dùng chữ/số/_' }]}>
            <Input style={{ fontFamily: 'monospace' }} />
          </Form.Item>
          <Form.Item name="TenThongSo" label="Tên thông số" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="DonVi" label="Đơn vị">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </Modal>
  );
}

// ─── ThongSoPanel — thông số kỹ thuật cố định (nhãn máy) của thiết bị, vd Ir ───────────────
function ThongSoPanel({ idThietBi, isDark }: { idThietBi: number; isDark: boolean }) {
  const [data, setData]       = useState<ThietBiThongSo[]>([]);
  const [catalog, setCatalog] = useState<ThongSo[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModal] = useState(false);
  const [catalogModalOpen, setCatalogModal] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [editing, setEditing] = useState<ThietBiThongSo | null>(null);
  const [newMa, setNewMa]     = useState('');
  const [newTen, setNewTen]   = useState('');
  const [newDonVi, setNewDonVi] = useState('');
  const [form]                = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await thietBiThongSoApi.getByThietBi(idThietBi)); }
    catch { message.error('Không thể tải thông số thiết bị'); }
    finally { setLoading(false); }
  }, [idThietBi]);

  const loadCatalog = useCallback(async () => {
    try { setCatalog(await thongSoApi.getAll()); }
    catch { message.error('Không thể tải danh mục thông số'); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModal(true);
  };
  const openEdit = (r: ThietBiThongSo) => { setEditing(r); form.setFieldsValue(r); setModal(true); };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const v = await form.validateFields();
      if (editing) await thietBiThongSoApi.update(editing.ID_ThietBi_ThongSo, v);
      else         await thietBiThongSoApi.create({ ...v, ID_ThietBi: idThietBi });
      message.success(editing ? 'Đã cập nhật thông số' : 'Đã thêm thông số');
      setModal(false); load();
    } catch (e: unknown) {
      if (e instanceof Error && 'errorFields' in (e as object)) return;
      message.error('Lỗi lưu thông số');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    try { await thietBiThongSoApi.delete(id); message.success('Đã xóa thông số'); load(); }
    catch { message.error('Lỗi xóa thông số'); }
  };

  const addNewThongSo = async () => {
    if (!newMa.trim() || !newTen.trim()) { message.warning('Nhập mã và tên thông số'); return; }
    try {
      const created = await thongSoApi.create({ MaThongSo: newMa.trim(), TenThongSo: newTen.trim(), DonVi: newDonVi.trim() || null });
      setCatalog(prev => [...prev, created]);
      form.setFieldsValue({ ID_ThongSo: created.ID_ThongSo });
      setNewMa(''); setNewTen(''); setNewDonVi('');
      message.success('Đã thêm vào danh mục thông số');
    } catch { message.error('Lỗi thêm danh mục — mã có thể đã tồn tại'); }
  };

  const cols: ColumnsType<ThietBiThongSo> = [
    { title: 'Mã', dataIndex: 'MaThongSo', key: 'ma', width: 90,
      render: v => <Text code style={{ fontSize: 11 }}>{v}</Text> },
    { title: 'Tên thông số', dataIndex: 'TenThongSo', key: 'ten' },
    { title: 'Giá trị', key: 'giatri', width: 110, align: 'right',
      render: (_, r) => <Text strong>{r.GiaTri}{r.DonVi ? ` ${r.DonVi}` : ''}</Text> },
    { title: '', key: 'actions', width: 70, align: 'center',
      render: (_, r) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title="Xóa thông số này?" okText="Xóa" cancelText="Hủy"
            okButtonProps={{ danger: true }} onConfirm={() => handleDelete(r.ID_ThietBi_ThongSo)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ) },
  ];

  return (
    <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${isDark ? '#1e4a72' : '#e5e7eb'}` }}>
      <Space align="center" style={{ marginBottom: 8, width: '100%', justifyContent: 'space-between' }}>
        <Text strong style={{ fontSize: 13 }}>Thông số kỹ thuật (nhãn máy)</Text>
        <Space size={8}>
          <Button size="small" onClick={() => setCatalogModal(true)}>Quản lý danh mục</Button>
          <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={openCreate}>Thêm thông số</Button>
        </Space>
      </Space>
      <ThongSoCatalogModal
        open={catalogModalOpen}
        onClose={() => setCatalogModal(false)}
        onChanged={loadCatalog}
      />
      <Table<ThietBiThongSo>
        dataSource={data} columns={cols} rowKey="ID_ThietBi_ThongSo"
        loading={loading} size="small" pagination={false}
        locale={{ emptyText: 'Chưa có thông số nào — vd Ir (dòng định mức động cơ OLTC)' }}
      />
      <Modal
        title={editing ? 'Sửa thông số' : 'Thêm thông số kỹ thuật'}
        open={modalOpen} onOk={handleSubmit} onCancel={() => setModal(false)}
        okText={editing ? 'Cập nhật' : 'Thêm'} cancelText="Hủy"
        confirmLoading={saving} destroyOnHidden width={480}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="ID_ThongSo" label="Thông số"
            rules={[{ required: true, message: 'Chọn thông số' }]}
            tooltip="Chọn từ danh mục thông số dùng chung — nếu chưa có, gõ mã/tên mới bên dưới danh sách để thêm vào danh mục.">
            <Select
              showSearch optionFilterProp="label" placeholder="Chọn thông số"
              options={catalog.map(c => ({ value: c.ID_ThongSo, label: `${c.MaThongSo} — ${c.TenThongSo}${c.DonVi ? ` (${c.DonVi})` : ''}` }))}
              dropdownRender={menu => (
                <>
                  {menu}
                  <Divider style={{ margin: '8px 0' }} />
                  <Space style={{ padding: '0 8px 8px', width: '100%' }} wrap>
                    <Input placeholder="Mã mới" value={newMa} style={{ width: 90, fontFamily: 'monospace' }}
                      onChange={e => setNewMa(e.target.value)} />
                    <Input placeholder="Tên thông số" value={newTen} style={{ width: 150 }}
                      onChange={e => setNewTen(e.target.value)} />
                    <Input placeholder="ĐVT" value={newDonVi} style={{ width: 60 }}
                      onChange={e => setNewDonVi(e.target.value)} />
                    <Button type="text" size="small" icon={<PlusOutlined />} onClick={addNewThongSo}>Thêm vào danh mục</Button>
                  </Space>
                </>
              )}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="GiaTri" label="Giá trị" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} step={0.01} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="GhiChu" label="Ghi chú">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
