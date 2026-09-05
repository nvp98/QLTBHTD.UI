import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, Form, Input, InputNumber, Modal, Popconfirm,
  Select, Space, Table, Tag, Typography, message,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { nhomChiTieuApi }  from '../../api/nhomChiTieu';
import { loaiThietBiApi }  from '../../api/loaiThietBi';
import type { NhomChiTieu, LoaiThietBi } from '../../types/entities';
import { useThemeMode } from '../../theme/ThemeModeContext';

const { Title, Text } = Typography;

/** Phân cấp kiểm tra theo CBM EVNCPC-KT/QT.40. */
const TIER_LABELS: Record<number, string> = { 1: 'Online', 2: 'Offline', 3: 'Chuyên sâu' };
const TIER_COLORS: Record<number, string> = { 1: 'green', 2: 'gold', 3: 'volcano' };

export default function NhomChiTieuPage() {
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  const [data, setData]           = useState<NhomChiTieu[]>([]);
  const [loais, setLoais]         = useState<LoaiThietBi[]>([]);
  const [loading, setLoading]     = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [editing, setEditing]     = useState<NhomChiTieu | null>(null);
  const [search, setSearch]       = useState('');
  const [filterLoai, setFilterLoai] = useState<number | 'all'>('all');
  const [form]                    = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nhoms, ls] = await Promise.all([
        nhomChiTieuApi.getAll(),
        loaiThietBiApi.getActive(),
      ]);
      setData(nhoms);
      setLoais(ls);
    } catch {
      message.error('Không thể tải nhóm chỉ tiêu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Sync form values when modal opens with editing data
  useEffect(() => {
    if (!modalOpen) return;
    if (editing) {
      form.setFieldsValue(editing);
    } else {
      form.setFieldsValue({ TrangThai: 1, PhienBan: 1 });
    }
  }, [modalOpen, editing, form]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (record: NhomChiTieu) => {
    setEditing(record);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const values = await form.validateFields();
      if (editing) {
        await nhomChiTieuApi.update(editing.ID_NhomChiTieu, values);
        message.success('Cập nhật nhóm chỉ tiêu thành công');
      } else {
        await nhomChiTieuApi.create(values);
        message.success('Thêm nhóm chỉ tiêu thành công');
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
      await nhomChiTieuApi.delete(id);
      message.success('Đã xóa nhóm chỉ tiêu');
      load();
    } catch {
      message.error('Không thể xóa — còn chỉ tiêu thuộc nhóm này');
    }
  };

  const loaiName = (id: number) => loais.find(l => l.ID_LoaiThietBi === id)?.TenLoaiTB ?? `Loại ${id}`;
  const loaiKH   = (id: number) => loais.find(l => l.ID_LoaiThietBi === id)?.KyHieu   ?? '';

  const filtered = data.filter(d => {
    const matchSearch = (d.TenNhom ?? '').toLowerCase().includes(search.toLowerCase());
    const matchLoai   = filterLoai === 'all' || d.ID_LoaiThietBi === filterLoai;
    return matchSearch && matchLoai;
  });

  const columns: ColumnsType<NhomChiTieu> = [
    {
      title: 'STT', key: 'stt', width: 55, align: 'center',
      render: (_, __, i) => <Text style={{ color: '#6b7280' }}>{i + 1}</Text>,
    },
    {
      title: 'Mã', dataIndex: 'ID_NhomChiTieu', key: 'id', width: 65,
      render: v => <Text style={{ color: '#93c5fd', fontFamily: 'monospace' }}>{v}</Text>,
    },
    {
      title: 'Tên nhóm chỉ tiêu', dataIndex: 'TenNhom', key: 'name',
      render: v => <Text strong style={{ color: isDark ? '#e5e7eb' : '#111827' }}>{v ?? 'Chưa có tên'}</Text>,
      sorter: (a, b) => (a.TenNhom ?? '').localeCompare(b.TenNhom ?? ''),
    },
    {
      title: 'Loại thiết bị', dataIndex: 'ID_LoaiThietBi', key: 'loai', width: 180,
      render: (v, r) => (
        <Tag color="blue">
          {r.TenLoaiThietBi ?? loaiName(v)} {loaiKH(v) ? `(${loaiKH(v)})` : ''}
        </Tag>
      ),
      filters: loais.map(l => ({ text: l.TenLoaiTB, value: l.ID_LoaiThietBi })),
      onFilter: (val, r) => r.ID_LoaiThietBi === val,
    },
    {
      title: 'Tier', dataIndex: 'Tier', key: 'tier', width: 110, align: 'center',
      render: v => v != null
        ? <Tag color={TIER_COLORS[v]}>Tier {v} · {TIER_LABELS[v] ?? '?'}</Tag>
        : <Text style={{ color: '#6b7280', fontSize: 12 }}>—</Text>,
      filters: [1, 2, 3].map(t => ({ text: `Tier ${t} · ${TIER_LABELS[t]}`, value: t })),
      onFilter: (val, r) => r.Tier === val,
    },
    {
      title: 'Phiên bản', dataIndex: 'PhienBan', key: 'phienban', width: 100, align: 'center',
      render: v => <Tag>v{v}</Tag>,
    },
    {
      title: 'Trọng số Wᵢ', dataIndex: 'TrongSo_Wi', key: 'trongso', width: 110, align: 'center',
      render: v => v != null
        ? <Tag color="purple" style={{ fontFamily: 'monospace', fontWeight: 700 }}>{v}</Tag>
        : <Text style={{ color: '#6b7280', fontSize: 12 }}>—</Text>,
      sorter: (a, b) => (a.TrongSo_Wi ?? 0) - (b.TrongSo_Wi ?? 0),
    },
    {
      title: 'Trạng thái', dataIndex: 'TrangThai', key: 'status', width: 130,
      render: v => <Tag color={v === 1 ? 'success' : 'default'}>{v === 1 ? 'Hoạt động' : 'Ngừng'}</Tag>,
      filters: [{ text: 'Hoạt động', value: 1 }, { text: 'Ngừng', value: 0 }],
      onFilter: (val, r) => r.TrangThai === val,
    },
    {
      title: 'Thao tác', key: 'actions', width: 110, align: 'center',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm
            title="Xác nhận xóa"
            description={`Xóa nhóm "${record.TenNhom}"?`}
            okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record.ID_NhomChiTieu)}
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
        <Title level={4} style={{ color: isDark ? '#f9fafb' : '#111827', margin: 0 }}>Nhóm chỉ tiêu CBM</Title>
        <Text style={{ color: '#6b7280', fontSize: 13 }}>
          Nhóm các chỉ tiêu đánh giá theo loại thiết bị · {data.length} nhóm
        </Text>
      </div>

      <Card style={{ background: isDark ? '#0e2c4a' : '#ffffff', border: `1px solid ${isDark ? '#1e4a72' : '#e5e7eb'}` }}
        styles={{ body: { padding: '16px 20px' } }}>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }} wrap>
          <Space wrap>
            <Input.Search placeholder="Tìm tên nhóm chỉ tiêu..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: 260 }} allowClear />
            <Select value={filterLoai} onChange={setFilterLoai} style={{ width: 200 }}
              options={[
                { label: 'Tất cả loại TB', value: 'all' },
                ...loais.map(l => ({ label: `${l.TenLoaiTB} (${l.KyHieu})`, value: l.ID_LoaiThietBi })),
              ]}
            />
          </Space>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Làm mới</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Thêm nhóm</Button>
          </Space>
        </Space>

        <Table<NhomChiTieu>
          scroll={{ x: 'max-content' }}
          dataSource={filtered} columns={columns} rowKey="ID_NhomChiTieu"
          loading={loading} size="small"
          pagination={{ pageSize: 15, showTotal: t => `Tổng ${t} nhóm`, showSizeChanger: true }}
        />
      </Card>

      <Modal
        title={editing ? 'Cập nhật nhóm chỉ tiêu' : 'Thêm nhóm chỉ tiêu mới'}
        open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)}
        okText={editing ? 'Cập nhật' : 'Thêm mới'} cancelText="Hủy"
        confirmLoading={saving} width={500} destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="TenNhom" label="Tên nhóm chỉ tiêu"
            rules={[{ required: true, message: 'Nhập tên nhóm chỉ tiêu' }]}>
            <Input placeholder="VD: Phân tích khí hòa tan (DGA)" />
          </Form.Item>
          <Form.Item name="ID_LoaiThietBi" label="Áp dụng cho loại thiết bị"
            rules={[{ required: true, message: 'Chọn loại thiết bị' }]}>
            <Select placeholder="Chọn loại thiết bị..."
              options={loais.map(l => ({ label: `${l.TenLoaiTB} (${l.KyHieu})`, value: l.ID_LoaiThietBi }))} />
          </Form.Item>
          <Form.Item name="PhienBan" label="Phiên bản tiêu chuẩn"
            rules={[{ required: true }]} tooltip="Phiên bản quy trình CBM áp dụng">
            <InputNumber style={{ width: '100%' }} min={1} placeholder="1" />
          </Form.Item>
          <Form.Item name="Tier" label="Tier (phân cấp kiểm tra)"
            tooltip="Theo CBM EVNCPC-KT/QT.40. Để trống cho nhóm tổng hợp thuần (vd CHI1/TS1) — nhóm đó gộp điểm từ nhiều Tier khác nhau nên không gán 1 Tier duy nhất.">
            <Select allowClear placeholder="Để trống nếu là nhóm tổng hợp"
              options={[1, 2, 3].map(t => ({ label: `Tier ${t} · ${TIER_LABELS[t]}`, value: t }))} />
          </Form.Item>
          <Form.Item name="TrongSo_Wi" label="Trọng số Wᵢ (khi tham gia công thức nhóm cha)"
            tooltip="Dùng khi nhóm này được chọn làm biến NHOM_CON trong công thức của 1 nhóm COMPOSITE khác (vd 'Chất lượng dầu' Wi=6 khi tham gia TS1). Để trống = coi như đồng trọng số (Wi=1) trừ khi công thức có override riêng.">
            <InputNumber style={{ width: '100%' }} min={0} step={0.5} placeholder="Để trống nếu không cần" />
          </Form.Item>
          <Form.Item name="TrangThai" label="Trạng thái" rules={[{ required: true }]}>
            <Select options={[{ label: 'Hoạt động', value: 1 }, { label: 'Ngừng', value: 0 }]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
