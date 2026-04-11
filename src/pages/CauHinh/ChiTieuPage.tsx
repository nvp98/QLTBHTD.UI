import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, Col, Form, Input, InputNumber, Modal, Popconfirm,
  Row, Select, Space, Switch, Table, Tag, Tooltip, Typography, message,
  Divider, Flex,
} from 'antd';
import {
  DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined,
  SettingOutlined, UnorderedListOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { chiTieuApi }      from '../../api/chiTieu';
import { nguongApi }       from '../../api/nguong';
import { nhomChiTieuApi }  from '../../api/nhomChiTieu';
import { loaiThietBiApi }  from '../../api/loaiThietBi';
import type { ChiTieu, Nguong, NhomChiTieu, LoaiThietBi } from '../../types/entities';
import { useThemeMode } from '../../theme/ThemeModeContext';

const { Title, Text } = Typography;

// ─── Nguong Sub-panel ──────────────────────────────────────────────────────
function NguongPanel({ chiTieuId, chiTieuName }: { chiTieuId: number; chiTieuName: string }) {
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  const [data, setData]       = useState<Nguong[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModal] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [editing, setEditing] = useState<Nguong | null>(null);
  const [form]                = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await nguongApi.getByChiTieu(chiTieuId)); }
    catch { message.error('Không thể tải ngưỡng'); }
    finally { setLoading(false); }
  }, [chiTieuId]);

  useEffect(() => { load(); }, [load]);

  // Sync form values when modal opens
  useEffect(() => {
    if (!modalOpen) return;
    if (editing) {
      form.setFieldsValue(editing);
    } else {
      form.setFieldsValue({
        ID_ChiTieu:     chiTieuId,
        CanDuoi_BaoGom: true,
        CanTren_BaoGom: false,
      });
    }
  }, [modalOpen, editing, chiTieuId, form]);

  const openCreate = () => {
    setEditing(null);
    setModal(true);
  };
  const openEdit = (r: Nguong) => { setEditing(r); setModal(true); };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const v = await form.validateFields();
      if (editing) { await nguongApi.update(editing.ID_Nguong, v); message.success('Đã cập nhật ngưỡng'); }
      else          { await nguongApi.create(v);                    message.success('Đã thêm ngưỡng'); }
      setModal(false); load();
    } catch (e: unknown) {
      if (e instanceof Error && 'errorFields' in (e as object)) return;
      message.error('Lỗi lưu ngưỡng');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    try { await nguongApi.delete(id); message.success('Đã xóa ngưỡng'); load(); }
    catch { message.error('Lỗi xóa ngưỡng'); }
  };

  const cols: ColumnsType<Nguong> = [
    {
      title: 'Điều kiện', key: 'range', width: 240,
      render: (_, r) => {
        const lo  = r.CanDuoi  != null ? String(r.CanDuoi)  : '−∞';
        const hi  = r.CanTren  != null ? String(r.CanTren)  : '+∞';
        const lBr = r.CanDuoi_BaoGom ? '[' : '(';
        const rBr = r.CanTren_BaoGom ? ']' : ')';
        const lOp = r.CanDuoi_BaoGom ? '≤' : '<';
        const rOp = r.CanTren_BaoGom ? '≤' : '<';
        return (
          <Flex gap={6} align="center">
            <Text style={{ color: isDark ? '#e5e7eb' : '#111827', fontFamily: 'monospace', fontSize: 13 }}>
              {lBr}{lo} ; {hi}{rBr}
            </Text>
            <Text style={{ color: '#6b7280', fontSize: 11 }}>
              {r.CanDuoi != null ? `${lo} ${lOp} x` : `x`}{r.CanTren != null ? ` ${rOp} ${hi}` : ''}
            </Text>
          </Flex>
        );
      },
    },
    {
      title: 'Điểm Sᵢ', dataIndex: 'Diem_Si', key: 'diem', width: 100, align: 'center',
      render: v => (
        <Tag color={v >= 8 ? 'success' : v >= 5 ? 'processing' : v >= 2 ? 'warning' : 'error'}
          style={{ fontFamily: 'monospace', fontWeight: 700 }}>
          {v}
        </Tag>
      ),
      sorter: (a, b) => a.Diem_Si - b.Diem_Si,
    },
    {
      title: '', key: 'actions', width: 80, align: 'center',
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title="Xóa ngưỡng này?" okText="Xóa" cancelText="Hủy"
            okButtonProps={{ danger: true }} onConfirm={() => handleDelete(r.ID_Nguong)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{
      padding: '12px 16px',
      background: isDark ? '#060c14' : '#f9fafb',
      borderRadius: 8,
      border: `1px solid ${isDark ? '#1f2937' : '#e5e7eb'}`,
    }}>
      <Flex align="center" justify="space-between" style={{ marginBottom: 12 }}>
        <Text style={{ color: '#8b5cf6', fontSize: 12, fontWeight: 600 }}>
          <SettingOutlined style={{ marginRight: 6 }} />
          Ngưỡng điểm · {chiTieuName}
        </Text>
        <Button size="small" icon={<PlusOutlined />} onClick={openCreate} type="dashed">
          Thêm ngưỡng
        </Button>
      </Flex>

      <Table<Nguong>
        dataSource={data} columns={cols} rowKey="ID_Nguong"
        loading={loading} size="small" pagination={false}
        locale={{ emptyText: 'Chưa có ngưỡng — nhấn "Thêm ngưỡng" để tạo' }}
      />

      <Modal title="Thiết lập ngưỡng điểm" open={modalOpen}
        onOk={handleSubmit} onCancel={() => { form.resetFields(); setModal(false); }}
        okText={editing ? 'Cập nhật' : 'Thêm'} cancelText="Hủy"
        confirmLoading={saving} destroyOnHidden>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="ID_ChiTieu" hidden><InputNumber /></Form.Item>

          <Row gutter={12} align="bottom">
            <Col span={14}>
              <Form.Item name="CanDuoi" label="Cận dưới"
                tooltip="Để trống = không giới hạn (−∞)">
                <InputNumber style={{ width: '100%' }} step={0.01} placeholder="−∞ (bỏ trống)" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="CanDuoi_BaoGom" label="Bao gồm dấu ="
                valuePropName="checked"
                tooltip="Bật = dùng ≥  |  Tắt = dùng >">
                <Switch
                  checkedChildren="≥ (có =)"
                  unCheckedChildren="> (không =)"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12} align="bottom">
            <Col span={14}>
              <Form.Item name="CanTren" label="Cận trên"
                tooltip="Để trống = không giới hạn (+∞)">
                <InputNumber style={{ width: '100%' }} step={0.01} placeholder="+∞ (bỏ trống)" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="CanTren_BaoGom" label="Bao gồm dấu ="
                valuePropName="checked"
                tooltip="Bật = dùng ≤  |  Tắt = dùng <">
                <Switch
                  checkedChildren="≤ (có =)"
                  unCheckedChildren="< (không =)"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="Diem_Si" label="Điểm Sᵢ đạt được"
            rules={[{ required: true, message: 'Nhập điểm' }]}
            tooltip="Điểm từ 0-10 khi giá trị đo thỏa mãn điều kiện trên">
            <InputNumber style={{ width: '100%' }} min={0} max={10} step={0.5}
              placeholder="0 – 10" />
          </Form.Item>

          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) => {
              const cd   = getFieldValue('CanDuoi');
              const ct   = getFieldValue('CanTren');
              const cdBG = getFieldValue('CanDuoi_BaoGom');
              const ctBG = getFieldValue('CanTren_BaoGom');
              const lo   = cd  != null ? cd  : '−∞';
              const hi   = ct  != null ? ct  : '+∞';
              const lOp  = cd  != null ? (cdBG ? '≥' : '>') : '';
              const rOp  = ct  != null ? (ctBG ? '≤' : '<') : '';
              const expr = [lOp && `x ${lOp === '≥' ? '≥' : '>'} ${lo}`, rOp && `x ${rOp === '≤' ? '≤' : '<'} ${hi}`]
                .filter(Boolean).join(' và ');
              return (
                <div style={{ padding: '8px 12px', background: isDark ? '#0d1117' : '#eff6ff', borderRadius: 6,
                  border: `1px solid ${isDark ? '#1f2937' : '#dbeafe'}`, fontSize: 12 }}>
                  <Text style={{ color: '#6b7280' }}>Điều kiện: </Text>
                  <Text style={{ color: '#93c5fd', fontFamily: 'monospace' }}>
                    {expr || '(chưa nhập)'}
                  </Text>
                </div>
              );
            }}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function ChiTieuPage() {
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  const [rows, setRows]           = useState<ChiTieu[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(15);
  const [nhoms, setNhoms]         = useState<NhomChiTieu[]>([]);
  const [loais, setLoais]         = useState<LoaiThietBi[]>([]);
  const [loading, setLoading]     = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [editing, setEditing]     = useState<ChiTieu | null>(null);
  const [search, setSearch]       = useState('');
  const [filterNhom, setFilterNhom]   = useState<number | undefined>(undefined);
  const [filterLoai, setFilterLoai]   = useState<number | undefined>(undefined);
  const [expandedKeys, setExpandedKeys] = useState<number[]>([]);
  const [form]                    = Form.useForm();

  // Load dropdown data once
  useEffect(() => {
    Promise.all([nhomChiTieuApi.getActive(), loaiThietBiApi.getActive()])
      .then(([ns, ls]) => { setNhoms(ns); setLoais(ls); })
      .catch(() => message.error('Không thể tải danh mục'));
  }, []);

  const load = useCallback(async (p = page, ps = pageSize) => {
    setLoading(true);
    try {
      const result = await chiTieuApi.getPaged({
        search:   search || undefined,
        idNhom:   filterNhom,
        idLoai:   filterLoai,
        page:     p,
        pageSize: ps,
      });
      setRows(result.items);
      setTotal(result.total);
    } catch {
      message.error('Không thể tải chỉ tiêu CBM');
    } finally {
      setLoading(false);
    }
  }, [search, filterNhom, filterLoai, page, pageSize]);

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
  const openEdit = (record: ChiTieu) => {
    setEditing(record);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const values = await form.validateFields();
      if (editing) {
        await chiTieuApi.update(editing.ID_ChiTieu, values);
        message.success('Cập nhật chỉ tiêu thành công');
      } else {
        await chiTieuApi.create(values);
        message.success('Thêm chỉ tiêu thành công');
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
    try { await chiTieuApi.delete(id); message.success('Đã xóa chỉ tiêu'); load(); }
    catch { message.error('Không thể xóa — còn dữ liệu liên quan'); }
  };

  // Nhóm hiển thị trong dropdown — lọc theo loại TB đang chọn
  const filteredNhoms = filterLoai != null
    ? nhoms.filter(n => n.ID_LoaiThietBi === filterLoai)
    : nhoms;

  // Loại TB của 1 nhóm (dùng cho cột bảng)
  const loaiForNhom = (nhomId: number) => {
    const nhom = nhoms.find(n => n.ID_NhomChiTieu === nhomId);
    return nhom ? loais.find(l => l.ID_LoaiThietBi === nhom.ID_LoaiThietBi) : null;
  };

  const toggleExpand = (id: number) => {
    setExpandedKeys(prev =>
      prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id]
    );
  };

  const columns: ColumnsType<ChiTieu> = [
    {
      title: 'STT', key: 'stt', width: 55, align: 'center',
      render: (_, __, i) => <Text style={{ color: '#6b7280' }}>{i + 1}</Text>,
    },
    {
      title: 'Mã', dataIndex: 'ID_ChiTieu', key: 'id', width: 65,
      render: v => <Text style={{ color: '#93c5fd', fontFamily: 'monospace' }}>{v}</Text>,
    },
    {
      title: 'Tên chỉ tiêu', dataIndex: 'TenChiTieu', key: 'name', width: 300,
      render: v => <Text strong style={{ color: isDark ? '#e5e7eb' : '#111827' }}>{v ?? 'Chưa có tên'}</Text>,
      sorter: (a, b) => (a.TenChiTieu ?? '').localeCompare(b.TenChiTieu ?? ''),
    },
    {
      title: 'Nhóm chỉ tiêu', dataIndex: 'ID_NhomChiTieu', key: 'nhom', width: 220,
      render: (v, r) => {
        const loai = loaiForNhom(v);
        const nhomName = nhoms.find(n => n.ID_NhomChiTieu === v)?.TenNhom ?? 'N/A';
        return (
          <div>
            <Text style={{ color: isDark ? '#9ca3af' : '#4b5563', fontSize: 12, display: 'block' }}>{r.TenNhom ?? nhomName}</Text>
            {loai && <Tag color="blue" style={{ fontSize: 10 }}>{loai.KyHieu}</Tag>}
          </div>
        );
      },
      filters: filteredNhoms.map(n => ({ text: n.TenNhom, value: n.ID_NhomChiTieu })),
      onFilter: (val, r) => r.ID_NhomChiTieu === val,
    },
    {
      title: 'Trọng số Wᵢ', dataIndex: 'TrongSo_Wi', key: 'trongso', width: 120, align: 'center',
      render: v => (
        <Tag  style={{  fontWeight: 500,color: isDark ? '#f9fafb' : '#111827' ,fontSize: 15 }}>
          {Number(v) }
        </Tag>
      ),
      sorter: (a, b) => a.TrongSo_Wi - b.TrongSo_Wi,
    },
    {
      title: 'Trạng thái', dataIndex: 'TrangThai', key: 'status', width: 120,
      render: v => <Tag color={v === 1 ? 'success' : 'default'}>{v === 1 ? 'Hoạt động' : 'Ngừng'}</Tag>,
      filters: [{ text: 'Hoạt động', value: 1 }, { text: 'Ngừng', value: 0 }],
      onFilter: (val, r) => r.TrangThai === val,
    },
    {
      title: 'Thao tác', key: 'actions', width: 150, align: 'center',
      render: (_, record) => (
        <Space>
          <Tooltip title={expandedKeys.includes(record.ID_ChiTieu) ? 'Ẩn ngưỡng' : 'Xem/sửa ngưỡng'}>
            <Button size="small" icon={<UnorderedListOutlined />}
              type={expandedKeys.includes(record.ID_ChiTieu) ? 'primary' : 'default'}
              onClick={() => toggleExpand(record.ID_ChiTieu)} />
          </Tooltip>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm title="Xóa chỉ tiêu này?" okText="Xóa" cancelText="Hủy"
            okButtonProps={{ danger: true }} onConfirm={() => handleDelete(record.ID_ChiTieu)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ color: isDark ? '#f9fafb' : '#111827', margin: 0 }}>Chỉ tiêu & Ngưỡng điểm CBM</Title>
        <Text style={{ color: '#6b7280', fontSize: 13 }}>
          Cấu hình chỉ tiêu đánh giá và ngưỡng chấm điểm · {total} chỉ tiêu
        </Text>
      </div>

      <Card style={{ background: isDark ? '#0d1117' : '#ffffff', border: `1px solid ${isDark ? '#1f2937' : '#e5e7eb'}` }}
        styles={{ body: { padding: '16px 20px' } }}>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }} wrap>
          <Space wrap>
            <Input.Search placeholder="Tìm tên chỉ tiêu..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: 240 }} allowClear />
            <Select<number | 0>
              value={filterLoai ?? 0}
              onChange={v => { setFilterLoai(v === 0 ? undefined : v); setFilterNhom(undefined); setPage(1); }}
              style={{ width: 170 }}
              options={[
                { label: 'Tất cả loại TB', value: 0 },
                ...loais.map(l => ({ label: `${l.TenLoaiTB} (${l.KyHieu})`, value: l.ID_LoaiThietBi })),
              ]}
            />
            <Select<number | 0>
              value={filterNhom ?? 0}
              onChange={v => { setFilterNhom(v === 0 ? undefined : v); setPage(1); }}
              style={{ width: 230 }} showSearch
              options={[
                { label: 'Tất cả nhóm', value: 0 },
                ...filteredNhoms.map(n => ({ label: n.TenNhom, value: n.ID_NhomChiTieu })),
              ]}
            />
          </Space>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => load()} loading={loading}>Làm mới</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Thêm chỉ tiêu</Button>
          </Space>
        </Space>

        <Table<ChiTieu>
          dataSource={rows} columns={columns} rowKey="ID_ChiTieu"
          loading={loading} size="small"
          pagination={{
            current: page, pageSize, total,
            showTotal: t => `Tổng ${t} chỉ tiêu`,
            showSizeChanger: true,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          }}
          expandable={{
            expandedRowKeys: expandedKeys,
            showExpandColumn: false,
            expandedRowRender: record => (
              <NguongPanel chiTieuId={record.ID_ChiTieu} chiTieuName={record.TenChiTieu} />
            ),
          }}
        />
      </Card>

      {/* ── Create / Edit Modal ── */}
      <Modal
        title={editing ? `Cập nhật chỉ tiêu — ${editing.TenChiTieu}` : 'Thêm chỉ tiêu mới'}
        open={modalOpen} onOk={handleSubmit} onCancel={() => { form.resetFields(); setModalOpen(false); }}
        okText={editing ? 'Cập nhật' : 'Thêm mới'} cancelText="Hủy"
        confirmLoading={saving} width={500} destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="ID_NhomChiTieu" label="Thuộc nhóm chỉ tiêu"
            rules={[{ required: true, message: 'Chọn nhóm chỉ tiêu' }]}>
            <Select placeholder="Chọn nhóm..." showSearch optionFilterProp="label"
              options={nhoms.map(n => ({ label: n.TenNhom, value: n.ID_NhomChiTieu }))} />
          </Form.Item>
          <Form.Item name="TenChiTieu" label="Tên chỉ tiêu"
            rules={[{ required: true, message: 'Nhập tên chỉ tiêu' }]}>
            <Input placeholder="VD: Điện áp đánh thủng (BDV)" />
          </Form.Item>
          <Form.Item name="TrongSo_Wi" label="Trọng số Wᵢ"
            rules={[{ required: false, message: 'Nhập trọng số' }]}
            tooltip="Trọng số chỉ tiêu trong nhóm (0 < Wᵢ ≤ 1). Tổng Wᵢ trong nhóm = 1.0">
            <InputNumber style={{ width: '100%' }} min={0.00} max={1} step={0.001}
              precision={3} placeholder="VD: 0.250" />
          </Form.Item>
          <Divider style={{ borderColor: isDark ? '#1f2937' : '#e5e7eb', margin: '8px 0' }} />
          <Form.Item name="TrangThai" label="Trạng thái" rules={[{ required: true }]}>
            <Select options={[{ label: 'Hoạt động', value: 1 }, { label: 'Ngừng', value: 0 }]} />
          </Form.Item>
          <Text style={{ color: '#6b7280', fontSize: 11 }}>
            Sau khi thêm chỉ tiêu, nhấn nút <UnorderedListOutlined /> trong bảng để thêm ngưỡng điểm.
          </Text>
        </Form>
      </Modal>
    </div>
  );
}
