import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, Form, Input, Modal, Popconfirm, Select, Space,
  Table, Tag, Typography, message,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { tramDienApi } from '../../api/tramDien';
import { khuVucApi }   from '../../api/khuVuc';
import type { TramDien, KhuVuc } from '../../types/entities';
import { useThemeMode } from '../../theme/ThemeModeContext';

const { Title, Text } = Typography;

const TRANG_THAI_OPTIONS = [
  { label: 'Hoạt động', value: 1 },
  { label: 'Ngừng hoạt động', value: 0 },
];

export default function TramDienPage() {
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  const [data, setData]           = useState<TramDien[]>([]);
  const [khuVucs, setKhuVucs]     = useState<KhuVuc[]>([]);
  const [loading, setLoading]     = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [editing, setEditing]     = useState<TramDien | null>(null);
  const [search, setSearch]       = useState('');
  const [filterKV, setFilterKV]   = useState<number | 'all'>('all');
  const [form]                    = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [trams, kvs] = await Promise.all([
        tramDienApi.getAll(),
        khuVucApi.getActive(),
      ]);
      setData(trams);
      setKhuVucs(kvs);
    } catch {
      message.error('Không thể tải dữ liệu trạm điện');
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

  const openEdit = (record: TramDien) => {
    setEditing(record);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const values = await form.validateFields();
      if (editing) {
        await tramDienApi.update(editing.IDTram, values);
        message.success('Cập nhật trạm điện thành công');
      } else {
        await tramDienApi.create(values);
        message.success('Thêm trạm điện thành công');
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
      await tramDienApi.delete(id);
      message.success('Đã xóa trạm điện');
      load();
    } catch {
      message.error('Không thể xóa — trạm điện đang có thiết bị');
    }
  };

  const filtered = data.filter(d => {
    const matchSearch = (d.TenTram ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (d.DiaDiem ?? '').toLowerCase().includes(search.toLowerCase());
    const matchKV = filterKV === 'all' || d.IDKhuVuc === filterKV;
    return matchSearch && matchKV;
  });

  const kvName = (id: number) => khuVucs.find(k => k.ID_KhuVuc === id)?.TenKhuVuc ?? String(id);

  const columns: ColumnsType<TramDien> = [
    {
      title: 'STT', key: 'stt', width: 55, align: 'center',
      render: (_, __, i) => <Text style={{ color: '#6b7280' }}>{i + 1}</Text>,
    },
    {
      title: 'Mã', dataIndex: 'IDTram', key: 'id', width: 70,
      render: v => <Text style={{ color: '#93c5fd', fontFamily: 'monospace' }}>{v}</Text>,
    },
    {
      title: 'Tên trạm', dataIndex: 'TenTram', key: 'name',
      render: v => <Text strong style={{ color: isDark ? '#e5e7eb' : '#111827' }}>{v ?? 'Chưa có tên'}</Text>,
      sorter: (a, b) => (a.TenTram ?? '').localeCompare(b.TenTram ?? ''),
    },
    {
      title: 'Địa điểm', dataIndex: 'DiaDiem', key: 'location', width: 200,
      render: v => <Text style={{ color: '#9ca3af', fontSize: 12 }}>{v ?? '—'}</Text>,
    },
    {
      title: 'Khu vực', dataIndex: 'IDKhuVuc', key: 'khuvuc', width: 160,
      render: (v, r) => <Tag color="geekblue">{r.TenKhuVuc ?? kvName(v)}</Tag>,
      filters: khuVucs.map(k => ({ text: k.TenKhuVuc, value: k.ID_KhuVuc })),
      onFilter: (val, r) => r.IDKhuVuc === val,
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
            description={`Xóa trạm "${record.TenTram}"?`}
            okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record.IDTram)}
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
        <Title level={4} style={{ color: isDark ? '#f9fafb' : '#111827', margin: 0 }}>Quản lý trạm điện</Title>
        <Text style={{ color: '#6b7280', fontSize: 13 }}>
          Danh sách trạm biến áp · {data.length} trạm điện
        </Text>
      </div>

      <Card style={{ background: isDark ? '#0e2c4a' : '#ffffff', border: `1px solid ${isDark ? '#1e4a72' : '#e5e7eb'}` }}
        styles={{ body: { padding: '16px 20px' } }}>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }} wrap>
          <Space wrap>
            <Input.Search
              placeholder="Tìm tên trạm, địa điểm..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: 260 }}
              allowClear
            />
            <Select
              value={filterKV}
              onChange={setFilterKV}
              style={{ width: 200 }}
              options={[
                { label: 'Tất cả khu vực', value: 'all' },
                ...khuVucs.map(k => ({ label: k.TenKhuVuc, value: k.ID_KhuVuc })),
              ]}
            />
          </Space>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Làm mới</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Thêm trạm</Button>
          </Space>
        </Space>

        <Table<TramDien>
          dataSource={filtered}
          columns={columns}
          rowKey="IDTram"
          loading={loading}
          size="small"
          pagination={{ pageSize: 15, showTotal: t => `Tổng ${t} trạm`, showSizeChanger: true }}
        />
      </Card>

      <Modal
        title={editing ? 'Cập nhật trạm điện' : 'Thêm trạm điện mới'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => {
          form.resetFields();
          setModalOpen(false);
        }}
        okText={editing ? 'Cập nhật' : 'Thêm mới'}
        cancelText="Hủy"
        confirmLoading={saving}
        width={520}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="IDKhuVuc" label="Khu vực"
            rules={[{ required: true, message: 'Chọn khu vực' }]}
          >
            <Select
              placeholder="Chọn khu vực..."
              options={khuVucs.map(k => ({ label: k.TenKhuVuc, value: k.ID_KhuVuc }))}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item
            name="TenTram" label="Tên trạm"
            rules={[{ required: true, message: 'Nhập tên trạm điện' }]}
          >
            <Input placeholder="VD: Trạm 110kV Quảng Ngãi" />
          </Form.Item>
          <Form.Item name="DiaDiem" label="Địa điểm">
            <Input placeholder="VD: Xã Tịnh Phong, Sơn Tịnh, Quảng Ngãi" />
          </Form.Item>
          <Form.Item name="TrangThai" label="Trạng thái" rules={[{ required: true }]}>
            <Select options={TRANG_THAI_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
