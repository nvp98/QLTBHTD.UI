import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, Form, Input, Modal, Popconfirm, Result, Select, Space,
  Table, Tag, Typography, message,
} from 'antd';
import { DeleteOutlined, EditOutlined, KeyOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { nguoiDungApi } from '../../api/nguoiDung';
import { vaiTroApi } from '../../api/vaiTro';
import { tramDienApi } from '../../api/tramDien';
import type { NguoiDung, VaiTro, TramDien } from '../../types/entities';
import { useThemeMode } from '../../theme/ThemeModeContext';
import { useAuth } from '../../auth/AuthContext';

const { Title, Text } = Typography;

const TRANG_THAI_OPTIONS = [
  { label: 'Hoạt động', value: 1 },
  { label: 'Đã khóa', value: 0 },
];

interface NguoiDungFormValues {
  TenDangNhap: string;
  MatKhau?: string;
  HoTen: string;
  Email?: string;
  ID_VaiTro: number;
  ID_Tram?: number | null;
  TrangThai: number;
}

export default function NguoiDungPage() {
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  const { user } = useAuth();

  const [data, setData]           = useState<NguoiDung[]>([]);
  const [vaiTros, setVaiTros]     = useState<VaiTro[]>([]);
  const [trams, setTrams]         = useState<TramDien[]>([]);
  const [loading, setLoading]     = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [editing, setEditing]     = useState<NguoiDung | null>(null);
  const [search, setSearch]       = useState('');
  const [form]                    = Form.useForm<NguoiDungFormValues>();

  const [resetOpen, setResetOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<NguoiDung | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await nguoiDungApi.getAll());
    } catch {
      message.error('Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    vaiTroApi.getAll().then(setVaiTros).catch(() => message.error('Lỗi tải danh sách vai trò'));
    tramDienApi.getActive().then(setTrams).catch(() => message.error('Lỗi tải danh sách trạm'));
  }, [load]);

  useEffect(() => {
    if (!modalOpen) return;
    if (editing) {
      form.setFieldsValue({
        TenDangNhap: editing.TenDangNhap,
        HoTen: editing.HoTen,
        Email: editing.Email ?? undefined,
        ID_VaiTro: editing.ID_VaiTro,
        ID_Tram: editing.ID_Tram ?? undefined,
        TrangThai: editing.TrangThai,
      });
    } else {
      form.setFieldsValue({ TrangThai: 1 });
    }
  }, [modalOpen, editing, form]);

  if (user && user.MaVaiTro !== 'Admin') {
    return <Result status="403" title="Không có quyền truy cập" subTitle="Chỉ quản trị viên mới được xem trang này." />;
  }

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (record: NguoiDung) => { setEditing(record); setModalOpen(true); };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const values = await form.validateFields();
      if (editing) {
        await nguoiDungApi.update(editing.ID_NguoiDung, {
          HoTen: values.HoTen,
          Email: values.Email,
          ID_VaiTro: values.ID_VaiTro,
          ID_Tram: values.ID_Tram ?? null,
          TrangThai: values.TrangThai,
        });
        message.success('Cập nhật người dùng thành công');
      } else {
        await nguoiDungApi.create({
          TenDangNhap: values.TenDangNhap,
          MatKhau: values.MatKhau ?? '',
          HoTen: values.HoTen,
          Email: values.Email,
          ID_VaiTro: values.ID_VaiTro,
          ID_Tram: values.ID_Tram ?? null,
        });
        message.success('Thêm người dùng thành công');
      }
      setModalOpen(false);
      load();
    } catch (e: unknown) {
      if (e instanceof Error && 'errorFields' in (e as object)) return;
      message.error(e instanceof Error ? e.message : 'Lỗi khi lưu dữ liệu');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await nguoiDungApi.delete(id);
      message.success('Đã khóa tài khoản');
      load();
    } catch {
      message.error('Không thể khóa tài khoản');
    }
  };

  const openReset = (record: NguoiDung) => {
    setResetTarget(record);
    setResetPassword('');
    setResetOpen(true);
  };

  const handleReset = async () => {
    if (!resetTarget || resetPassword.length < 6) {
      message.error('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    setResetting(true);
    try {
      await nguoiDungApi.datLaiMatKhau(resetTarget.ID_NguoiDung, { MatKhauMoi: resetPassword });
      message.success('Đã đặt lại mật khẩu');
      setResetOpen(false);
    } catch {
      message.error('Không thể đặt lại mật khẩu');
    } finally {
      setResetting(false);
    }
  };

  const filtered = data.filter(d =>
    d.TenDangNhap.toLowerCase().includes(search.toLowerCase()) ||
    d.HoTen.toLowerCase().includes(search.toLowerCase())
  );

  const columns: ColumnsType<NguoiDung> = [
    {
      title: 'Tên đăng nhập', dataIndex: 'TenDangNhap', key: 'tendn',
      render: v => <Text style={{ fontFamily: 'monospace', color: '#93c5fd' }}>{v}</Text>,
    },
    {
      title: 'Họ tên', dataIndex: 'HoTen', key: 'hoten',
      render: v => <Text strong style={{ color: isDark ? '#e5e7eb' : '#111827' }}>{v}</Text>,
    },
    { title: 'Email', dataIndex: 'Email', key: 'email', render: v => v || <Text style={{ color: '#6b7280' }}>—</Text> },
    { title: 'Vai trò', dataIndex: 'TenVaiTro', key: 'vaitro', render: v => <Tag color="blue">{v}</Tag> },
    { title: 'Trạm phụ trách', dataIndex: 'TenTram', key: 'tram', render: v => v || <Text style={{ color: '#6b7280' }}>Toàn hệ thống</Text> },
    {
      title: 'Trạng thái', dataIndex: 'TrangThai', key: 'trangthai', width: 120,
      render: v => <Tag color={v === 1 ? 'success' : 'default'}>{v === 1 ? 'Hoạt động' : 'Đã khóa'}</Tag>,
    },
    {
      title: 'Thao tác', key: 'actions', width: 150, align: 'center',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Button size="small" icon={<KeyOutlined />} onClick={() => openReset(record)} title="Đặt lại mật khẩu" />
          <Popconfirm
            title="Khóa tài khoản này?"
            okText="Khóa" cancelText="Hủy" okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record.ID_NguoiDung)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} disabled={record.TenDangNhap === 'admin'} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ color: isDark ? '#f9fafb' : '#111827', margin: 0 }}>Quản lý người dùng</Title>
        <Text style={{ color: '#6b7280', fontSize: 13 }}>
          Tài khoản đăng nhập và phân quyền theo vai trò · {data.length} người dùng
        </Text>
      </div>

      <Card style={{ background: isDark ? '#0e2c4a' : '#ffffff', border: `1px solid ${isDark ? '#1e4a72' : '#e5e7eb'}` }}
        styles={{ body: { padding: '16px 20px' } }}>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <Input.Search
            placeholder="Tìm tên đăng nhập hoặc họ tên..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 280 }}
            allowClear
          />
          <Space>
            <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Làm mới</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Thêm người dùng</Button>
          </Space>
        </Space>

        <Table<NguoiDung>
          dataSource={filtered}
          columns={columns}
          rowKey="ID_NguoiDung"
          loading={loading}
          size="small"
          pagination={{ pageSize: 15, showTotal: t => `Tổng ${t} người dùng`, showSizeChanger: true }}
        />
      </Card>

      <Modal
        title={editing ? 'Cập nhật người dùng' : 'Thêm người dùng mới'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => { form.resetFields(); setModalOpen(false); }}
        okText={editing ? 'Cập nhật' : 'Thêm mới'}
        cancelText="Hủy"
        confirmLoading={saving}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="TenDangNhap" label="Tên đăng nhập"
            rules={[{ required: true, message: 'Nhập tên đăng nhập' }]}
          >
            <Input placeholder="VD: nguyenvana" disabled={!!editing} />
          </Form.Item>
          {!editing && (
            <Form.Item
              name="MatKhau" label="Mật khẩu"
              rules={[
                { required: true, message: 'Nhập mật khẩu' },
                { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' },
              ]}
            >
              <Input.Password placeholder="Mật khẩu ban đầu" />
            </Form.Item>
          )}
          <Form.Item name="HoTen" label="Họ tên" rules={[{ required: true, message: 'Nhập họ tên' }]}>
            <Input placeholder="VD: Nguyễn Văn A" />
          </Form.Item>
          <Form.Item name="Email" label="Email" rules={[{ type: 'email', message: 'Email không hợp lệ' }]}>
            <Input placeholder="email@example.com" />
          </Form.Item>
          <Form.Item name="ID_VaiTro" label="Vai trò" rules={[{ required: true, message: 'Chọn vai trò' }]}>
            <Select
              placeholder="Chọn vai trò"
              options={vaiTros.map(v => ({ value: v.ID_VaiTro, label: v.TenVaiTro }))}
            />
          </Form.Item>
          <Form.Item name="ID_Tram" label="Trạm phụ trách (để trống = toàn hệ thống)">
            <Select
              allowClear
              showSearch
              placeholder="Toàn hệ thống"
              optionFilterProp="label"
              options={trams.map(t => ({ value: t.IDTram, label: t.TenTram }))}
            />
          </Form.Item>
          {editing && (
            <Form.Item name="TrangThai" label="Trạng thái" rules={[{ required: true }]}>
              <Select options={TRANG_THAI_OPTIONS} />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        title={`Đặt lại mật khẩu — ${resetTarget?.TenDangNhap ?? ''}`}
        open={resetOpen}
        onOk={handleReset}
        onCancel={() => setResetOpen(false)}
        okText="Đặt lại"
        cancelText="Hủy"
        confirmLoading={resetting}
        destroyOnHidden
      >
        <Input.Password
          placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
          value={resetPassword}
          onChange={e => setResetPassword(e.target.value)}
          style={{ marginTop: 16 }}
        />
      </Modal>
    </div>
  );
}
