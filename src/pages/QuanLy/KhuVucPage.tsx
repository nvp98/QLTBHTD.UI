import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, Form, Input, Modal, Popconfirm, Select, Space,
  Table, Tag, Typography, message,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { khuVucApi } from '../../api/khuVuc';
import type { KhuVuc } from '../../types/entities';
import { useThemeMode } from '../../theme/ThemeModeContext';

const { Title, Text } = Typography;

const TRANG_THAI_OPTIONS = [
  { label: 'Hoạt động', value: 1 },
  { label: 'Ngừng hoạt động', value: 0 },
];

export default function KhuVucPage() {
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  const [data, setData]         = useState<KhuVuc[]>([]);
  const [loading, setLoading]   = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [editing, setEditing]   = useState<KhuVuc | null>(null);
  const [search, setSearch]     = useState('');
  const [form]                  = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await khuVucApi.getAll());
    } catch {
      message.error('Không thể tải dữ liệu khu vực');
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

  const openEdit = (record: KhuVuc) => {
    setEditing(record);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const values = await form.validateFields();
      if (editing) {
        await khuVucApi.update(editing.ID_KhuVuc, values);
        message.success('Cập nhật khu vực thành công');
      } else {
        await khuVucApi.create(values);
        message.success('Thêm khu vực thành công');
      }
      setModalOpen(false);
      load();
    } catch (e: unknown) {
      if (e instanceof Error && 'errorFields' in (e as object)) return; // validation only
      message.error('Lỗi khi lưu dữ liệu');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await khuVucApi.delete(id);
      message.success('Đã xóa khu vực');
      load();
    } catch {
      message.error('Không thể xóa — có thể đang được sử dụng');
    }
  };

  const filtered = data.filter(d =>
    (d.TenKhuVuc ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const columns: ColumnsType<KhuVuc> = [
    {
      title: 'STT', key: 'stt', width: 60, align: 'center',
      render: (_, __, i) => <Text style={{ color: '#6b7280' }}>{i + 1}</Text>,
    },
    {
      title: 'Mã', dataIndex: 'ID_KhuVuc', key: 'id', width: 70,
      render: v => <Text style={{ color: '#93c5fd', fontFamily: 'monospace' }}>{v}</Text>,
    },
    {
      title: 'Tên khu vực', dataIndex: 'TenKhuVuc', key: 'name',
      render: v => <Text strong style={{ color: isDark ? '#e5e7eb' : '#111827' }}>{v ?? 'Chưa có tên'}</Text>,
      sorter: (a, b) => (a.TenKhuVuc ?? '').localeCompare(b.TenKhuVuc ?? ''),
    },
    {
      title: 'Trạng thái', dataIndex: 'TrangThai', key: 'status', width: 140,
      render: v => <Tag color={v === 1 ? 'success' : 'default'}>{v === 1 ? 'Hoạt động' : 'Ngừng hoạt động'}</Tag>,
      filters: [{ text: 'Hoạt động', value: 1 }, { text: 'Ngừng', value: 0 }],
      onFilter: (val, r) => r.TrangThai === val,
    },
    {
      title: 'Thao tác', key: 'actions', width: 120, align: 'center',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm
            title="Xác nhận xóa"
            description={`Xóa khu vực "${record.TenKhuVuc}"?`}
            okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record.ID_KhuVuc)}
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
        <Title level={4} style={{ color: isDark ? '#f9fafb' : '#111827', margin: 0 }}>Quản lý khu vực</Title>
        <Text style={{ color: '#6b7280', fontSize: 13 }}>
          Khu vực quản lý các trạm điện · {data.length} khu vực
        </Text>
      </div>

      <Card style={{ background: isDark ? '#0e2c4a' : '#ffffff', border: `1px solid ${isDark ? '#1e4a72' : '#e5e7eb'}` }}
        styles={{ body: { padding: '16px 20px' } }}>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <Input.Search
            placeholder="Tìm tên khu vực..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 280 }}
            allowClear
          />
          <Space>
            <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Làm mới</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Thêm khu vực</Button>
          </Space>
        </Space>

        <Table<KhuVuc>
          dataSource={filtered}
          columns={columns}
          rowKey="ID_KhuVuc"
          loading={loading}
          size="small"
          pagination={{ pageSize: 15, showTotal: t => `Tổng ${t} khu vực`, showSizeChanger: true }}
        />
      </Card>

      <Modal
        title={editing ? 'Cập nhật khu vực' : 'Thêm khu vực mới'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => {
          form.resetFields();
          setModalOpen(false);
        }}
        okText={editing ? 'Cập nhật' : 'Thêm mới'}
        cancelText="Hủy"
        confirmLoading={saving}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="TenKhuVuc" label="Tên khu vực"
            rules={[{ required: true, message: 'Nhập tên khu vực' }]}
          >
            <Input placeholder="VD: Khu vực miền Trung" />
          </Form.Item>
          <Form.Item name="TrangThai" label="Trạng thái" rules={[{ required: true }]}>
            <Select options={TRANG_THAI_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
