import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, Col, Form, Input, InputNumber, Modal, Popconfirm,
  Row, Select, Space, Table, Tag, Tooltip, Typography, message,
} from 'antd';
import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { thietBiApi }     from '../../api/thietBi';
import { tramDienApi }    from '../../api/tramDien';
import { loaiThietBiApi } from '../../api/loaiThietBi';
import type { ThietBi, TramDien, LoaiThietBi } from '../../types/entities';

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
  const [data, setData]               = useState<ThietBi[]>([]);
  const [trams, setTrams]             = useState<TramDien[]>([]);
  const [loais, setLoais]             = useState<LoaiThietBi[]>([]);
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
      const [tbs, ts, ls] = await Promise.all([
        thietBiApi.getAll(),
        tramDienApi.getActive(),
        loaiThietBiApi.getActive(),
      ]);
      setData(tbs);
      setTrams(ts);
      setLoais(ls);
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
          <Text strong style={{ color: '#e5e7eb', display: 'block' }}>{v ?? 'Chưa có tên'}</Text>
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
      title: 'Nhãn hiệu', dataIndex: 'NhanHieu', key: 'nhan', width: 110,
      render: v => <Text style={{ color: '#9ca3af', fontSize: 12 }}>{v ?? '—'}</Text>,
    },
    {
      title: 'Năm SX', dataIndex: 'NamSanXuat', key: 'nam', width: 85,
      render: v => <Text style={{ color: '#9ca3af', fontSize: 12 }}>{v ?? '—'}</Text>,
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
        <Title level={4} style={{ color: '#f9fafb', margin: 0 }}>Quản lý thiết bị</Title>
        <Text style={{ color: '#6b7280', fontSize: 13 }}>
          Danh sách thiết bị điện trong hệ thống CBM · {data.length} thiết bị
        </Text>
      </div>

      <Card style={{ background: '#0d1117', border: '1px solid #1f2937' }}
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
                <Select options={TRANG_THAI_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>
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
              ['Nhãn hiệu',     detail.NhanHieu ?? '—'],
              ['Năm sản xuất',  detail.NamSanXuat ?? '—'],
              ['Trạng thái',    trangThaiTag(detail.TrangThai)],
              ['Ghi chú',       detail.GhiChu ?? '—'],
            ].map(([label, value]) => (
              <Row key={String(label)} style={{ marginBottom: 10, borderBottom: '1px solid #1f2937', paddingBottom: 10 }}>
                <Col span={10}>
                  <Text style={{ color: '#6b7280', fontSize: 13 }}>{label}</Text>
                </Col>
                <Col span={14}>
                  {typeof value === 'string' || typeof value === 'number'
                    ? <Text style={{ color: '#e5e7eb', fontSize: 13 }}>{value}</Text>
                    : value}
                </Col>
              </Row>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
