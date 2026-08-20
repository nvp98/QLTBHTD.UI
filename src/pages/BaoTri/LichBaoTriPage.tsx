import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button, Card, Col, DatePicker, Form, Input, InputNumber, Modal, Popconfirm,
  Radio, Row, Select, Space, Table, Tag, Tooltip, Typography, message,
} from 'antd';
import {
  CheckCircleOutlined, DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, StopOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { lichBaoTriApi } from '../../api/lichBaoTri';
import type { LichBaoTri, ThongKeLichBaoTriDto, TrangThaiHienThi, LoaiBaoTri } from '../../api/lichBaoTri';
import { thietBiApi } from '../../api/thietBi';
import { tramDienApi } from '../../api/tramDien';
import type { ThietBi, TramDien } from '../../types/entities';
import StatCard from '../../components/common/StatCard';
import { useThemeMode } from '../../theme/ThemeModeContext';

const { Title, Text } = Typography;

const TRANG_THAI_INFO: Record<TrangThaiHienThi, { label: string; color: string }> = {
  ChoThucHien: { label: 'Chờ thực hiện', color: 'blue' },
  QuaHan:      { label: 'Quá hạn',        color: 'red' },
  SapToiHan:   { label: 'Sắp đến hạn',    color: 'orange' },
  HoanThanh:   { label: 'Hoàn thành',     color: 'green' },
  DaHuy:       { label: 'Đã hủy',         color: 'default' },
};

const trangThaiTag = (v: TrangThaiHienThi) => {
  const info = TRANG_THAI_INFO[v] ?? TRANG_THAI_INFO.ChoThucHien;
  return <Tag color={info.color}>{info.label}</Tag>;
};

const loaiBaoTriTag = (v: LoaiBaoTri) =>
  v === 'DinhKy' ? <Tag color="geekblue">Định kỳ</Tag> : <Tag color="purple">Đột xuất</Tag>;

export default function LichBaoTriPage() {
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  const panelBg = isDark ? '#0e2c4a' : '#ffffff';
  const panelBorder = isDark ? '#1e4a72' : '#e5e7eb';
  const titleColor = isDark ? '#f9fafb' : '#111827';

  const [data, setData]           = useState<LichBaoTri[]>([]);
  const [thietBis, setThietBis]   = useState<ThietBi[]>([]);
  const [trams, setTrams]         = useState<TramDien[]>([]);
  const [thongKe, setThongKe]     = useState<ThongKeLichBaoTriDto | null>(null);
  const [loading, setLoading]     = useState(false);

  const [search, setSearch]             = useState('');
  const [filterTrangThai, setFilterTrangThai] = useState<'all' | TrangThaiHienThi>('all');
  const [filterTram, setFilterTram]     = useState<number | 'all'>('all');
  const [dateRange, setDateRange]       = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [editing, setEditing]     = useState<LichBaoTri | null>(null);
  const [loaiBaoTri, setLoaiBaoTri] = useState<LoaiBaoTri>('DinhKy');
  const [form] = Form.useForm();

  const [hoanThanhTarget, setHoanThanhTarget] = useState<LichBaoTri | null>(null);
  const [hoanThanhSaving, setHoanThanhSaving] = useState(false);
  const [hoanThanhForm] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [paged, tk] = await Promise.all([
        lichBaoTriApi.getPaged({ pageSize: 1000 }),
        lichBaoTriApi.getThongKe(),
      ]);
      setData(paged.items);
      setThongKe(tk);
    } catch {
      message.error('Không thể tải danh sách lịch bảo trì');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDanhMuc = useCallback(async () => {
    try {
      const [tbs, ts] = await Promise.all([thietBiApi.getActive(), tramDienApi.getActive()]);
      setThietBis(tbs);
      setTrams(ts);
    } catch { /* không chặn trang chính nếu lỗi tải danh mục */ }
  }, []);

  useEffect(() => { load(); loadDanhMuc(); }, [load, loadDanhMuc]);

  const openCreate = () => {
    setEditing(null);
    setLoaiBaoTri('DinhKy');
    form.resetFields();
    form.setFieldsValue({ loaiBaoTri: 'DinhKy', chuKyThang: 6, ngayKeHoach: dayjs() });
    setModalOpen(true);
  };

  const openEdit = (record: LichBaoTri) => {
    setEditing(record);
    setLoaiBaoTri(record.loaiBaoTri);
    form.setFieldsValue({
      loaiBaoTri: record.loaiBaoTri,
      chuKyThang: record.chuKyThang,
      ngayKeHoach: dayjs(record.ngayKeHoach),
      nguoiPhuTrach: record.nguoiPhuTrach,
      noiDungCongViec: record.noiDungCongViec,
      ghiChu: record.ghiChu,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        chuKyThang: values.loaiBaoTri === 'DinhKy' ? values.chuKyThang : null,
        ngayKeHoach: (values.ngayKeHoach as Dayjs).toISOString(),
      };
      if (editing) {
        await lichBaoTriApi.update(editing.iD_LichBaoTri, payload);
        message.success('Cập nhật lịch bảo trì thành công');
      } else {
        await lichBaoTriApi.create(payload);
        message.success('Thêm lịch bảo trì thành công');
      }
      setModalOpen(false);
      load();
    } catch (e: unknown) {
      if (e instanceof Error && 'errorFields' in (e as object)) return;
      message.error('Lỗi khi lưu lịch bảo trì');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await lichBaoTriApi.delete(id);
      message.success('Đã xóa lịch bảo trì');
      load();
    } catch {
      message.error('Không thể xóa lịch bảo trì');
    }
  };

  const handleHuy = async (id: number) => {
    try {
      await lichBaoTriApi.huy(id);
      message.success('Đã hủy lịch bảo trì');
      load();
    } catch {
      message.error('Không thể hủy lịch bảo trì');
    }
  };

  const openHoanThanh = (record: LichBaoTri) => {
    setHoanThanhTarget(record);
    hoanThanhForm.resetFields();
    hoanThanhForm.setFieldsValue({ ngayThucHien: dayjs() });
  };

  const handleHoanThanh = async () => {
    if (!hoanThanhTarget) return;
    setHoanThanhSaving(true);
    try {
      const values = await hoanThanhForm.validateFields();
      await lichBaoTriApi.hoanThanh(hoanThanhTarget.iD_LichBaoTri, {
        ngayThucHien: (values.ngayThucHien as Dayjs).toISOString(),
        ghiChu: values.ghiChu,
      });
      message.success(
        hoanThanhTarget.chuKyThang
          ? 'Đã hoàn thành — đã tự sinh lịch bảo trì định kỳ kế tiếp'
          : 'Đã hoàn thành lịch bảo trì',
      );
      setHoanThanhTarget(null);
      load();
    } catch (e: unknown) {
      if (e instanceof Error && 'errorFields' in (e as object)) return;
      message.error('Lỗi khi xác nhận hoàn thành');
    } finally {
      setHoanThanhSaving(false);
    }
  };

  const searchLower = search.toLowerCase();
  const filtered = useMemo(() => data.filter(d => {
    const matchSearch = !searchLower ||
      [d.tenThietBi, d.tenTram].some(s => String(s ?? '').toLowerCase().includes(searchLower));
    const matchTrangThai = filterTrangThai === 'all' || d.trangThaiHienThi === filterTrangThai;
    const matchTram = filterTram === 'all' || d.iD_Tram === filterTram;
    const matchDate = !dateRange || !dateRange[0] || !dateRange[1] ||
      (dayjs(d.ngayKeHoach).isAfter(dateRange[0].startOf('day').subtract(1, 'ms')) &&
       dayjs(d.ngayKeHoach).isBefore(dateRange[1].endOf('day')));
    return matchSearch && matchTrangThai && matchTram && matchDate;
  }), [data, searchLower, filterTrangThai, filterTram, dateRange]);

  const columns: ColumnsType<LichBaoTri> = [
    {
      title: 'Thiết bị', dataIndex: 'tenThietBi', key: 'thietBi', width: 220,
      render: (v, r) => (
        <div>
          <Text strong style={{ color: titleColor, display: 'block' }}>{v}</Text>
          <Text style={{ color: '#6b7280', fontSize: 11 }}>{r.tenTram}</Text>
        </div>
      ),
      sorter: (a, b) => a.tenThietBi.localeCompare(b.tenThietBi),
    },
    {
      title: 'Loại bảo trì', dataIndex: 'loaiBaoTri', key: 'loai', width: 130,
      render: (v, r) => (
        <div>
          {loaiBaoTriTag(v)}
          {r.chuKyThang != null && (
            <Text style={{ color: '#6b7280', fontSize: 11, display: 'block', marginTop: 2 }}>
              Chu kỳ {r.chuKyThang} tháng
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Ngày kế hoạch', dataIndex: 'ngayKeHoach', key: 'ngayKeHoach', width: 130,
      render: v => <Text style={{ fontFamily: 'monospace', fontSize: 12.5 }}>{dayjs(v).format('DD/MM/YYYY')}</Text>,
      sorter: (a, b) => dayjs(a.ngayKeHoach).valueOf() - dayjs(b.ngayKeHoach).valueOf(),
      defaultSortOrder: 'ascend',
    },
    {
      title: 'Ngày thực hiện', dataIndex: 'ngayThucHien', key: 'ngayThucHien', width: 130,
      render: v => <Text style={{ fontFamily: 'monospace', fontSize: 12.5, color: '#9ca3af' }}>
        {v ? dayjs(v).format('DD/MM/YYYY') : '—'}
      </Text>,
    },
    {
      title: 'Trạng thái', dataIndex: 'trangThaiHienThi', key: 'trangThai', width: 130,
      render: trangThaiTag,
      filters: Object.entries(TRANG_THAI_INFO).map(([value, info]) => ({ text: info.label, value })),
      onFilter: (val, r) => r.trangThaiHienThi === val,
    },
    {
      title: 'Người phụ trách', dataIndex: 'nguoiPhuTrach', key: 'nguoiPhuTrach', width: 140,
      render: v => <Text style={{ color: '#9ca3af', fontSize: 12 }}>{v ?? '—'}</Text>,
    },
    {
      title: 'Thao tác', key: 'actions', width: 150, align: 'center', fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          {record.trangThai === 'ChoThucHien' && (
            <Tooltip title="Hoàn thành">
              <Button size="small" icon={<CheckCircleOutlined />} onClick={() => openHoanThanh(record)} />
            </Tooltip>
          )}
          <Tooltip title="Chỉnh sửa">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          </Tooltip>
          {record.trangThai === 'ChoThucHien' && (
            <Popconfirm
              title="Hủy lịch bảo trì này?"
              okText="Hủy lịch" cancelText="Đóng" okButtonProps={{ danger: true }}
              onConfirm={() => handleHuy(record.iD_LichBaoTri)}
            >
              <Tooltip title="Hủy lịch">
                <Button size="small" icon={<StopOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
          <Popconfirm
            title="Xác nhận xóa"
            description={`Xóa lịch bảo trì "${record.tenThietBi}"?`}
            okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record.iD_LichBaoTri)}
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
        <Title level={4} style={{ color: titleColor, margin: 0 }}>Lịch bảo trì</Title>
        <Text style={{ color: '#6b7280', fontSize: 13 }}>
          Lập kế hoạch & theo dõi bảo trì định kỳ / đột xuất cho thiết bị điện
        </Text>
      </div>

      {/* ── Stat cards ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <StatCard title="Đang chờ" value={thongKe?.tongDangCho ?? '—'} color="#3b82f6" />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard title="Quá hạn" value={thongKe?.soQuaHan ?? '—'} color="#ef4444" />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard title="Sắp đến hạn (≤7 ngày)" value={thongKe?.soSapToiHan7Ngay ?? '—'} color="#f97316" />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard title="Hoàn thành tháng này" value={thongKe?.soHoanThanhThangNay ?? '—'} color="#10b981" />
        </Col>
      </Row>

      <Card style={{ background: panelBg, border: `1px solid ${panelBorder}` }}
        styles={{ body: { padding: '16px 20px' } }}>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }} wrap>
          <Space wrap>
            <Input.Search
              placeholder="Tìm tên thiết bị, trạm..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: 240 }}
              allowClear
            />
            <Select value={filterTrangThai} onChange={setFilterTrangThai} style={{ width: 170 }}
              options={[
                { label: 'Tất cả trạng thái', value: 'all' },
                ...Object.entries(TRANG_THAI_INFO).map(([value, info]) => ({ label: info.label, value })),
              ]}
            />
            <Select value={filterTram} onChange={setFilterTram} style={{ width: 190 }}
              showSearch optionFilterProp="label"
              options={[
                { label: 'Tất cả trạm', value: 'all' },
                ...trams.map(t => ({ label: t.TenTram, value: t.IDTram })),
              ]}
            />
            <DatePicker.RangePicker
              value={dateRange as [Dayjs, Dayjs] | null}
              onChange={v => setDateRange(v as [Dayjs | null, Dayjs | null] | null)}
              format="DD/MM/YYYY"
              placeholder={['Từ ngày', 'Đến ngày']}
            />
          </Space>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Làm mới</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Thêm lịch bảo trì</Button>
          </Space>
        </Space>

        <Table<LichBaoTri>
          dataSource={filtered}
          columns={columns}
          rowKey="iD_LichBaoTri"
          loading={loading}
          size="small"
          scroll={{ x: 1050 }}
          pagination={{ pageSize: 15, showTotal: t => `Tổng ${t} lịch bảo trì`, showSizeChanger: true }}
        />
      </Card>

      {/* ── Create / Edit Modal ── */}
      <Modal
        title={editing ? `Cập nhật lịch bảo trì — ${editing.tenThietBi}` : 'Thêm lịch bảo trì mới'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        okText={editing ? 'Cập nhật' : 'Thêm mới'}
        cancelText="Hủy"
        confirmLoading={saving}
        width={600}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          {!editing && (
            <Form.Item name="iD_ThietBi" label="Thiết bị" rules={[{ required: true, message: 'Chọn thiết bị' }]}>
              <Select placeholder="Chọn thiết bị..." showSearch optionFilterProp="label"
                options={thietBis.map(t => ({ label: `${t.TenThietBi} — ${t.TenTram ?? ''}`, value: t.ID_ThietBi }))} />
            </Form.Item>
          )}
          <Form.Item name="loaiBaoTri" label="Loại bảo trì" rules={[{ required: true }]}>
            <Radio.Group onChange={e => setLoaiBaoTri(e.target.value)}>
              <Radio.Button value="DinhKy">Định kỳ</Radio.Button>
              <Radio.Button value="DotXuat">Đột xuất</Radio.Button>
            </Radio.Group>
          </Form.Item>
          {loaiBaoTri === 'DinhKy' && (
            <Form.Item name="chuKyThang" label="Chu kỳ (tháng)"
              rules={[{ required: true, message: 'Nhập chu kỳ bảo trì' }]}
              tooltip="Sau khi hoàn thành, hệ thống tự sinh lịch bảo trì kế tiếp cách ngày hoàn thành đúng số tháng này.">
              <InputNumber style={{ width: '100%' }} min={1} max={120} placeholder="VD: 6" />
            </Form.Item>
          )}
          <Form.Item name="ngayKeHoach" label="Ngày kế hoạch" rules={[{ required: true, message: 'Chọn ngày kế hoạch' }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="nguoiPhuTrach" label="Người phụ trách">
            <Input placeholder="VD: Nguyễn Văn A" />
          </Form.Item>
          <Form.Item name="noiDungCongViec" label="Nội dung công việc">
            <Input.TextArea rows={2} placeholder="VD: Vệ sinh, kiểm tra dầu cách điện, siết lại đầu cực..." />
          </Form.Item>
          <Form.Item name="ghiChu" label="Ghi chú">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Hoàn thành Modal ── */}
      <Modal
        title={`Xác nhận hoàn thành — ${hoanThanhTarget?.tenThietBi ?? ''}`}
        open={!!hoanThanhTarget}
        onOk={handleHoanThanh}
        onCancel={() => setHoanThanhTarget(null)}
        okText="Xác nhận hoàn thành"
        cancelText="Hủy"
        confirmLoading={hoanThanhSaving}
        destroyOnHidden
        width={480}
      >
        <Form form={hoanThanhForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="ngayThucHien" label="Ngày thực hiện" rules={[{ required: true, message: 'Chọn ngày thực hiện' }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="ghiChu" label="Ghi chú">
            <Input.TextArea rows={2} placeholder="Kết quả thực hiện, vật tư thay thế..." />
          </Form.Item>
        </Form>
        {hoanThanhTarget?.chuKyThang != null && (
          <Text style={{ color: '#6b7280', fontSize: 12 }}>
            Lịch bảo trì định kỳ ({hoanThanhTarget.chuKyThang} tháng/lần) — hệ thống sẽ tự sinh lịch kế tiếp sau khi xác nhận.
          </Text>
        )}
      </Modal>
    </div>
  );
}
