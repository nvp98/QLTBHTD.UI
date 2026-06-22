import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, Col, Form, Input, InputNumber, Modal, Popconfirm,
  Row, Select, Space, Table, Tag, Typography, message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { congThucTongHopApi, congThucBienApi } from '../../api/congThucTongHop';
import { nhomChiTieuApi } from '../../api/nhomChiTieu';
import { loaiThietBiApi } from '../../api/loaiThietBi';
import { chiTieuApi } from '../../api/chiTieu';
import type {
  CongThucTongHop, CongThucBien,
  CreateCongThucTongHopDto, CreateCongThucBienDto,
  NhomChiTieu, LoaiThietBi, ChiTieu,
} from '../../types/entities';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function CongThucTongHopPage() {
  const [loais, setLoais]           = useState<LoaiThietBi[]>([]);
  const [nhoms, setNhoms]           = useState<NhomChiTieu[]>([]);
  const [chiTieus, setChiTieus]     = useState<ChiTieu[]>([]);
  const [congThucs, setCongThucs]   = useState<CongThucTongHop[]>([]);
  const [loading, setLoading]       = useState(false);
  const [selectedLoai, setSelectedLoai] = useState<number | null>(null);
  const [selectedNhom, setSelectedNhom] = useState<number | null>(null);

  // Modal công thức
  const [ctModalOpen, setCtModalOpen] = useState(false);
  const [editingCt, setEditingCt]     = useState<CongThucTongHop | null>(null);
  const [ctForm]                      = Form.useForm();

  // Modal biến
  const [bienModalOpen, setBienModalOpen] = useState(false);
  const [editingBien, setEditingBien]     = useState<CongThucBien | null>(null);
  const [bienForm]                        = Form.useForm();
  const [currentCongThuc, setCurrentCongThuc] = useState<CongThucTongHop | null>(null);

  useEffect(() => {
    loaiThietBiApi.getActive().then(setLoais).catch(() => {});
  }, []);

  const handleSelectLoai = async (id: number) => {
    setSelectedLoai(id);
    setSelectedNhom(null);
    setCongThucs([]);
    try {
      const [ns, cts] = await Promise.all([
        nhomChiTieuApi.getByLoai(id),
        // lấy tất cả chỉ tiêu thuộc loại thiết bị này
        Promise.resolve([] as ChiTieu[]),
      ]);
      setNhoms(ns.filter((n: NhomChiTieu & { loaiNhom?: string }) =>
        (n as any).LoaiNhom === 'COMPOSITE' || (n as any).loaiNhom === 'COMPOSITE'
      ));
    } catch {
      message.error('Lỗi tải nhóm chỉ tiêu');
    }
  };

  const handleSelectNhom = useCallback(async (id: number) => {
    setSelectedNhom(id);
    setLoading(true);
    try {
      const data = await congThucTongHopApi.getByNhom(id);
      setCongThucs(data);
    } catch {
      message.error('Lỗi tải công thức');
    } finally {
      setLoading(false);
    }
  }, []);

  const openCreateCt = () => {
    setEditingCt(null);
    ctForm.resetFields();
    ctForm.setFieldsValue({ ID_NhomChiTieu: selectedNhom, LoaiCongThuc: 'CUSTOM_NCALC', PhienBan: 1 });
    setCtModalOpen(true);
  };

  const saveCt = async () => {
    try {
      const vals = await ctForm.validateFields();
      if (editingCt) {
        await congThucTongHopApi.update(editingCt.ID_CongThuc, vals);
        message.success('Đã cập nhật công thức');
      } else {
        await congThucTongHopApi.create(vals as CreateCongThucTongHopDto);
        message.success('Đã tạo công thức mới');
      }
      setCtModalOpen(false);
      if (selectedNhom) handleSelectNhom(selectedNhom);
    } catch {
      message.error('Lỗi lưu công thức');
    }
  };

  const openBienManager = (ct: CongThucTongHop) => {
    setCurrentCongThuc(ct);
  };

  const openCreateBien = () => {
    setEditingBien(null);
    bienForm.resetFields();
    bienForm.setFieldsValue({ ID_CongThuc: currentCongThuc?.ID_CongThuc, NguonBien: 'HANGSO' });
    setBienModalOpen(true);
  };

  const saveBien = async () => {
    try {
      const vals = await bienForm.validateFields();
      if (editingBien) {
        await congThucBienApi.update(editingBien.ID_Bien, vals);
        message.success('Đã cập nhật biến');
      } else {
        await congThucBienApi.create(vals as CreateCongThucBienDto);
        message.success('Đã thêm biến');
      }
      setBienModalOpen(false);
      if (selectedNhom) handleSelectNhom(selectedNhom);
    } catch {
      message.error('Lỗi lưu biến');
    }
  };

  const columnsCt: ColumnsType<CongThucTongHop> = [
    { title: 'Phiên bản', dataIndex: 'PhienBan', width: 90 },
    {
      title: 'Biểu thức',
      dataIndex: 'BieuThuc',
      render: (v: string) => (
        <Text code style={{ fontSize: 12, display: 'block', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {v}
        </Text>
      ),
    },
    { title: 'Loại', dataIndex: 'LoaiCongThuc', width: 140 },
    {
      title: 'Trạng thái',
      dataIndex: 'TrangThai',
      width: 100,
      render: (v: number) => <Tag color={v === 1 ? 'success' : 'default'}>{v === 1 ? 'ACTIVE' : 'Cũ'}</Tag>,
    },
    {
      title: 'Biến',
      width: 100,
      render: (_: unknown, rec: CongThucTongHop) => (
        <Button size="small" onClick={() => openBienManager(rec)}>
          {rec.DanhSachBien?.length ?? 0} biến
        </Button>
      ),
    },
    {
      title: '',
      width: 80,
      render: (_: unknown, rec: CongThucTongHop) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => {
            setEditingCt(rec);
            ctForm.setFieldsValue(rec);
            setCtModalOpen(true);
          }} />
          <Popconfirm title="Xóa công thức này?" onConfirm={() =>
            congThucTongHopApi.delete(rec.ID_CongThuc).then(() => {
              message.success('Đã xóa');
              if (selectedNhom) handleSelectNhom(selectedNhom);
            })
          }>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const columnsBien: ColumnsType<CongThucBien> = [
    { title: 'Tên biến', dataIndex: 'MaBien', width: 120 },
    {
      title: 'Nguồn',
      dataIndex: 'NguonBien',
      width: 100,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: 'Nguồn dữ liệu',
      render: (_: unknown, r: CongThucBien) => {
        if (r.NguonBien === 'HANGSO') return <Text>{r.GiaTriHangSo}</Text>;
        if (r.NguonBien === 'CHITIEU') return <Text>{r.TenChiTieu ?? r.ID_ChiTieuNguon}</Text>;
        return <Text>{r.TenNhomCon ?? r.ID_NhomCon}</Text>;
      },
    },
    { title: 'Ghi chú', dataIndex: 'MoTa' },
    {
      title: '',
      width: 60,
      render: (_: unknown, r: CongThucBien) => (
        <Popconfirm title="Xóa biến?" onConfirm={() =>
          congThucBienApi.delete(r.ID_Bien).then(() => {
            message.success('Đã xóa');
            if (selectedNhom) handleSelectNhom(selectedNhom);
          })
        }>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>Cấu hình công thức tổng hợp</Title>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            style={{ width: 200 }}
            placeholder="Loại thiết bị"
            onChange={handleSelectLoai}
            options={loais.map(l => ({ value: l.ID_LoaiThietBi, label: l.TenLoaiTB }))}
          />
          <Select
            style={{ width: 280 }}
            placeholder="Nhóm COMPOSITE"
            disabled={!selectedLoai}
            onChange={handleSelectNhom}
            options={nhoms.map(n => ({ value: n.ID_NhomChiTieu, label: n.TenNhom }))}
          />
          {selectedNhom && (
            <Button icon={<PlusOutlined />} type="primary" onClick={openCreateCt}>
              Tạo phiên bản mới
            </Button>
          )}
        </Space>
      </Card>

      <Row gutter={16}>
        <Col span={currentCongThuc ? 12 : 24}>
          <Card title="Danh sách công thức" loading={loading}>
            <Table
              rowKey="ID_CongThuc"
              dataSource={congThucs}
              columns={columnsCt}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>

        {currentCongThuc && (
          <Col span={12}>
            <Card
              title={`Biến trong công thức v${currentCongThuc.PhienBan}`}
              extra={
                <Button size="small" icon={<PlusOutlined />} onClick={openCreateBien}>
                  Thêm biến
                </Button>
              }
            >
              <Text code style={{ display: 'block', marginBottom: 12, padding: 8 }}>
                {currentCongThuc.BieuThuc}
              </Text>
              <Table
                rowKey="ID_Bien"
                dataSource={currentCongThuc.DanhSachBien}
                columns={columnsBien}
                pagination={false}
                size="small"
              />
            </Card>
          </Col>
        )}
      </Row>

      {/* Modal công thức */}
      <Modal
        title={editingCt ? 'Sửa công thức' : 'Tạo công thức mới'}
        open={ctModalOpen}
        onOk={saveCt}
        onCancel={() => setCtModalOpen(false)}
        width={680}
      >
        <Form form={ctForm} layout="vertical">
          <Form.Item name="ID_NhomChiTieu" hidden><Input /></Form.Item>
          <Form.Item
            name="BieuThuc"
            label="Biểu thức NCalc"
            rules={[{ required: true, message: 'Nhập biểu thức' }]}
            extra="Ví dụ: 0.6 * TS1 + 0.4 * TS2"
          >
            <TextArea rows={4} style={{ fontFamily: 'monospace' }} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="LoaiCongThuc" label="Loại công thức">
                <Select options={[
                  { value: 'CUSTOM_NCALC', label: 'Custom NCalc' },
                  { value: 'WEIGHTED_AVG', label: 'Weighted Average' },
                  { value: 'WEIGHTED_AVG_SCALED', label: 'Weighted Avg Scaled' },
                  { value: 'LINEAR_COMBINE', label: 'Linear Combine' },
                  { value: 'PRODUCT', label: 'Product' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="ThangDiem_Min" label="Điểm min">
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="ThangDiem_Max" label="Điểm max">
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          {editingCt && (
            <Form.Item name="TrangThai" label="Trạng thái">
              <Select options={[{ value: 1, label: 'ACTIVE' }, { value: 0, label: 'Archived' }]} />
            </Form.Item>
          )}
          <Form.Item name="MoTa" label="Mô tả">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal biến */}
      <Modal
        title={editingBien ? 'Sửa biến' : 'Thêm biến vào công thức'}
        open={bienModalOpen}
        onOk={saveBien}
        onCancel={() => setBienModalOpen(false)}
      >
        <Form form={bienForm} layout="vertical">
          <Form.Item name="ID_CongThuc" hidden><Input /></Form.Item>
          <Form.Item name="MaBien" label="Tên biến (trong BieuThuc)" rules={[{ required: true }]}>
            <Input placeholder="ví dụ: TS1, W1, Soqt" />
          </Form.Item>
          <Form.Item name="NguonBien" label="Nguồn biến" rules={[{ required: true }]}>
            <Select options={[
              { value: 'HANGSO', label: 'Hằng số' },
              { value: 'CHITIEU', label: 'Điểm Si chỉ tiêu' },
              { value: 'NHOM_CON', label: 'Điểm nhóm con' },
            ]} />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, cur) => prev.NguonBien !== cur.NguonBien}
          >
            {({ getFieldValue }) => {
              const src = getFieldValue('NguonBien');
              if (src === 'HANGSO') return (
                <Form.Item name="GiaTriHangSo" label="Giá trị hằng số" rules={[{ required: true }]}>
                  <InputNumber style={{ width: '100%' }} step={0.1} />
                </Form.Item>
              );
              if (src === 'CHITIEU') return (
                <Form.Item name="ID_ChiTieuNguon" label="ID Chỉ tiêu nguồn" rules={[{ required: true }]}>
                  <InputNumber style={{ width: '100%' }} />
                </Form.Item>
              );
              if (src === 'NHOM_CON') return (
                <Form.Item name="ID_NhomCon" label="ID Nhóm con" rules={[{ required: true }]}>
                  <InputNumber style={{ width: '100%' }} />
                </Form.Item>
              );
              return null;
            }}
          </Form.Item>
          <Form.Item name="MoTa" label="Mô tả">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
