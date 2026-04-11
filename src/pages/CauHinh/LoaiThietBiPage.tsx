import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select,
  Space, Table, Tag, Typography, message,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { loaiThietBiApi } from '../../api/loaiThietBi';
import type { LoaiThietBi } from '../../types/entities';
import { useThemeMode } from '../../theme/ThemeModeContext';

const { Title, Text } = Typography;

export default function LoaiThietBiPage() {
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  const [data, setData]           = useState<LoaiThietBi[]>([]);
  const [loading, setLoading]     = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [editing, setEditing]     = useState<LoaiThietBi | null>(null);
  const [search, setSearch]       = useState('');
  const [form]                    = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await loaiThietBiApi.getAll());
    } catch {
      message.error('Không thể tải loại thiết bị');
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
      form.setFieldsValue({ TrangThai: 1 });
    }
  }, [modalOpen, editing, form]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (record: LoaiThietBi) => {
    setEditing(record);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const values = await form.validateFields();
      if (editing) {
        await loaiThietBiApi.update(editing.ID_LoaiThietBi, values);
        message.success('Cập nhật loại thiết bị thành công');
      } else {
        await loaiThietBiApi.create(values);
        message.success('Thêm loại thiết bị thành công');
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
      await loaiThietBiApi.delete(id);
      message.success('Đã xóa loại thiết bị');
      load();
    } catch {
      message.error('Không thể xóa — đang được sử dụng');
    }
  };

  const filtered = data.filter(d =>
    (d.TenLoaiTB ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (d.KyHieu ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const columns: ColumnsType<LoaiThietBi> = [
    {
      title: 'STT', key: 'stt', width: 55, align: 'center',
      render: (_, __, i) => <Text style={{ color: '#6b7280' }}>{i + 1}</Text>,
    },
    {
      title: 'Mã', dataIndex: 'ID_LoaiThietBi', key: 'id', width: 65,
      render: v => <Text style={{ color: '#93c5fd', fontFamily: 'monospace' }}>{v}</Text>,
    },
    {
      title: 'Tên loại thiết bị', dataIndex: 'TenLoaiTB', key: 'name',
      render: v => <Text strong style={{ color: isDark ? '#e5e7eb' : '#111827' }}>{v ?? 'Chưa có tên'}</Text>,
      sorter: (a, b) => (a.TenLoaiTB ?? '').localeCompare(b.TenLoaiTB ?? ''),
    },
    {
      title: 'Ký hiệu', dataIndex: 'KyHieu', key: 'kyhieu', width: 120,
      render: v => (
        <Tag style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{v ?? '—'}</Tag>
      ),
    },
    {
      title: 'Trạng thái', dataIndex: 'TrangThai', key: 'status', width: 140,
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
            description={`Xóa loại "${record.TenLoaiTB}"?`}
            okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record.ID_LoaiThietBi)}
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
        <Title level={4} style={{ color: isDark ? '#f9fafb' : '#111827', margin: 0 }}>Loại thiết bị</Title>
        <Text style={{ color: '#6b7280', fontSize: 13 }}>
          Phân loại thiết bị điện · {data.length} loại (MBA, MC, DCL, CSV...)
        </Text>
      </div>

      <Card style={{ background: isDark ? '#0d1117' : '#ffffff', border: `1px solid ${isDark ? '#1f2937' : '#e5e7eb'}` }}
        styles={{ body: { padding: '16px 20px' } }}>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <Input.Search placeholder="Tìm tên loại hoặc ký hiệu..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: 280 }} allowClear />
          <Space>
            <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Làm mới</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Thêm loại TB</Button>
          </Space>
        </Space>

        <Table<LoaiThietBi>
          dataSource={filtered} columns={columns} rowKey="ID_LoaiThietBi"
          loading={loading} size="small"
          pagination={{ pageSize: 15, showTotal: t => `Tổng ${t} loại` }}
        />
      </Card>

      <Modal
        title={editing ? 'Cập nhật loại thiết bị' : 'Thêm loại thiết bị mới'}
        open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)}
        okText={editing ? 'Cập nhật' : 'Thêm mới'} cancelText="Hủy"
        confirmLoading={saving} destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          {!editing && (
            <Form.Item name="ID_LoaiThietBi" label="Mã loại (ID)"
              rules={[{ required: true, message: 'Nhập mã loại thiết bị' }]}>
              <InputNumber style={{ width: '100%' }} min={1} placeholder="VD: 1, 2, 3..." />
            </Form.Item>
          )}
          <Form.Item name="TenLoaiTB" label="Tên loại thiết bị"
            rules={[{ required: true, message: 'Nhập tên loại' }]}>
            <Input placeholder="VD: Máy biến áp lực" />
          </Form.Item>
          <Form.Item name="KyHieu" label="Ký hiệu"
            rules={[{ required: true, message: 'Nhập ký hiệu' }]}>
            <Input placeholder="VD: MBA" style={{ textTransform: 'uppercase' }} />
          </Form.Item>
          <Form.Item name="TrangThai" label="Trạng thái" rules={[{ required: true }]}>
            <Select options={[{ label: 'Hoạt động', value: 1 }, { label: 'Ngừng', value: 0 }]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
