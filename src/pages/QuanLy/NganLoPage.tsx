import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, Form, Input, Modal, Popconfirm, Select, Space,
  Table, Tag, Typography, message,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { nganLoApi } from '../../api/nganLo';
import { tramDienApi } from '../../api/tramDien';
import type { NganLo, TramDien } from '../../types/entities';
import { useThemeMode } from '../../theme/ThemeModeContext';

const { Title, Text } = Typography;

const TRANG_THAI_OPTIONS = [
  { label: 'Hoạt động', value: 1 },
  { label: 'Ngừng hoạt động', value: 0 },
];

export default function NganLoPage() {
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  const [data, setData]           = useState<NganLo[]>([]);
  const [trams, setTrams]         = useState<TramDien[]>([]);
  const [loading, setLoading]     = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [editing, setEditing]     = useState<NganLo | null>(null);
  const [search, setSearch]       = useState('');
  const [filterTram, setFilterTram] = useState<number | 'all'>('all');
  const [form]                    = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nganLos, tramList] = await Promise.all([
        nganLoApi.getAll(),
        tramDienApi.getActive(),
      ]);
      setData(nganLos);
      setTrams(tramList);
    } catch {
      message.error('Không thể tải dữ liệu ngăn lộ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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

  const openEdit = (record: NganLo) => {
    setEditing(record);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const values = await form.validateFields();
      if (editing) {
        await nganLoApi.update(editing.ID_NganLo, values);
        message.success('Cập nhật ngăn lộ thành công');
      } else {
        await nganLoApi.create(values);
        message.success('Thêm ngăn lộ thành công');
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
      await nganLoApi.delete(id);
      message.success('Đã xóa ngăn lộ');
      load();
    } catch (e: any) {
      message.error(e?.message ?? 'Không thể xóa — ngăn lộ đang có thiết bị');
    }
  };

  const filtered = data.filter(d => {
    const matchSearch = (d.TenNganLo ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (d.MaNganLo ?? '').toLowerCase().includes(search.toLowerCase());
    const matchTram = filterTram === 'all' || d.ID_Tram === filterTram;
    return matchSearch && matchTram;
  });

  const columns: ColumnsType<NganLo> = [
    {
      title: 'STT', key: 'stt', width: 55, align: 'center',
      render: (_, __, i) => <Text style={{ color: '#6b7280' }}>{i + 1}</Text>,
    },
    {
      title: 'Mã', dataIndex: 'ID_NganLo', key: 'id', width: 70,
      render: v => <Text style={{ color: '#93c5fd', fontFamily: 'monospace' }}>{v}</Text>,
    },
    {
      title: 'Tên ngăn lộ', dataIndex: 'TenNganLo', key: 'name',
      render: v => <Text strong style={{ color: isDark ? '#e5e7eb' : '#111827' }}>{v ?? 'Chưa có tên'}</Text>,
      sorter: (a, b) => (a.TenNganLo ?? '').localeCompare(b.TenNganLo ?? ''),
    },
    {
      title: 'Mã hiệu', dataIndex: 'MaNganLo', key: 'ma', width: 140,
      render: v => <Text style={{ color: '#9ca3af', fontSize: 12 }}>{v ?? '—'}</Text>,
    },
    {
      title: 'Trạm', dataIndex: 'ID_Tram', key: 'tram', width: 200,
      render: (_, r) => <Tag color="geekblue">{r.TenTram}</Tag>,
      filters: trams.map(t => ({ text: t.TenTram, value: t.IDTram })),
      onFilter: (val, r) => r.ID_Tram === val,
    },
    {
      title: 'Số thiết bị', dataIndex: 'SoThietBi', key: 'sotb', width: 100, align: 'center',
      render: v => <Tag color={v > 0 ? 'blue' : 'default'}>{v ?? 0}</Tag>,
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
            description={`Xóa ngăn lộ "${record.TenNganLo}"?`}
            okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record.ID_NganLo)}
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
        <Title level={4} style={{ color: isDark ? '#f9fafb' : '#111827', margin: 0 }}>Quản lý ngăn lộ</Title>
        <Text style={{ color: '#6b7280', fontSize: 13 }}>
          Nhóm thiết bị (MBA/MC/DCL/TU/TI) cùng ngắt điện chung khi kiểm tra offline · {data.length} ngăn lộ
        </Text>
      </div>

      <Card style={{ background: isDark ? '#0e2c4a' : '#ffffff', border: `1px solid ${isDark ? '#1e4a72' : '#e5e7eb'}` }}
        styles={{ body: { padding: '16px 20px' } }}>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }} wrap>
          <Space wrap>
            <Input.Search
              placeholder="Tìm tên ngăn lộ, mã hiệu..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: 260 }}
              allowClear
            />
            <Select
              value={filterTram}
              onChange={setFilterTram}
              style={{ width: 220 }}
              options={[
                { label: 'Tất cả trạm', value: 'all' },
                ...trams.map(t => ({ label: t.TenTram, value: t.IDTram })),
              ]}
            />
          </Space>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Làm mới</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Thêm ngăn lộ</Button>
          </Space>
        </Space>

        <Table<NganLo>
          dataSource={filtered}
          columns={columns}
          rowKey="ID_NganLo"
          loading={loading}
          size="small"
          pagination={{ pageSize: 15, showTotal: t => `Tổng ${t} ngăn lộ`, showSizeChanger: true }}
        />
      </Card>

      <Modal
        title={editing ? 'Cập nhật ngăn lộ' : 'Thêm ngăn lộ mới'}
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
            name="ID_Tram" label="Trạm"
            rules={[{ required: true, message: 'Chọn trạm' }]}
          >
            <Select
              placeholder="Chọn trạm..."
              options={trams.map(t => ({ label: t.TenTram, value: t.IDTram }))}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item
            name="TenNganLo" label="Tên ngăn lộ"
            rules={[{ required: true, message: 'Nhập tên ngăn lộ' }]}
          >
            <Input placeholder="VD: Ngăn lộ 171" />
          </Form.Item>
          <Form.Item name="MaNganLo" label="Mã hiệu">
            <Input placeholder="VD: NL171" />
          </Form.Item>
          <Form.Item name="TrangThai" label="Trạng thái" rules={[{ required: true }]}>
            <Select options={TRANG_THAI_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
