import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Button, Card, Col, Form, Input, InputNumber, Modal, Popconfirm,
  Row, Select, Space, Table, Tag, Tooltip, Typography, message,
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
  NhomChiTieuCay, LoaiThietBi, ChiTieu,
} from '../../types/entities';

const { Title, Text } = Typography;
const { TextArea } = Input;

/** Nhãn tiếng Việt cho LoaiCongThuc, đặt theo đúng ngữ cảnh công thức CBM điện lực — giá trị lưu DB giữ nguyên tiếng Anh. */
const LOAI_CONG_THUC_OPTIONS = [
  { value: 'CUSTOM_NCALC', label: 'Biểu thức tự do (NCalc)' },
  { value: 'WEIGHTED_AVG', label: 'Trung bình trọng số — kiểu Soqt (chất lượng dầu)' },
  { value: 'WEIGHTED_AVG_SCALED', label: 'Trung bình trọng số quy đổi thang 10 — kiểu TS (nhóm chính/OLTC)' },
  { value: 'LINEAR_COMBINE', label: 'Cộng dồn hiệu chỉnh — kiểu CHI (điểm cha + Xᵢ/Yᵢ)' },
  { value: 'PRODUCT', label: 'Nhân hệ số — kiểu DGA (Sdga × Sr)' },
  { value: 'CUSTOM_MONTHLY_CLASSIFY', label: 'Phân loại theo tháng — kiểu LF (mức mang tải)' },
];
const loaiCongThucLabel = (v?: string) =>
  LOAI_CONG_THUC_OPTIONS.find(o => o.value === v)?.label ?? v ?? '—';

/** Nhãn ngắn dùng cho Tag trong bảng — bản đầy đủ nằm ở LOAI_CONG_THUC_OPTIONS (dropdown/tooltip). */
const LOAI_CONG_THUC_SHORT: Record<string, string> = {
  CUSTOM_NCALC: 'Tự do',
  WEIGHTED_AVG: 'Soqt',
  WEIGHTED_AVG_SCALED: 'TS',
  LINEAR_COMBINE: 'CHI',
  PRODUCT: 'DGA',
  CUSTOM_MONTHLY_CLASSIFY: 'LF',
};
const loaiCongThucShort = (v?: string) => (v ? LOAI_CONG_THUC_SHORT[v] ?? v : '—');

/** Nhãn tiếng Việt cho NguonBien — giá trị lưu DB giữ nguyên tiếng Anh. */
const NGUON_BIEN_LABEL: Record<string, string> = {
  HANGSO: 'Hằng số',
  CHITIEU: 'Điểm chỉ tiêu',
  NHOM_CON: 'Điểm nhóm con',
};
const nguonBienLabel = (v?: string) => (v ? NGUON_BIEN_LABEL[v] ?? v : '—');

function flattenCay(nodes: NhomChiTieuCay[]): NhomChiTieuCay[] {
  return nodes.flatMap(n => [n, ...flattenCay(n.NhomCon ?? [])]);
}

export default function CongThucTongHopPage() {
  const [searchParams] = useSearchParams();

  const [loais, setLoais]           = useState<LoaiThietBi[]>([]);
  const [cay, setCay]               = useState<NhomChiTieuCay[]>([]);
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
    loaiThietBiApi.getActive().then(setLoais).catch(() => message.error('Lỗi tải loại thiết bị'));
  }, []);

  const flatNhoms = useMemo(() => flattenCay(cay), [cay]);
  const compositeNhoms = useMemo(() => flatNhoms.filter(n => n.LoaiNhom === 'COMPOSITE'), [flatNhoms]);
  const selectedNode = flatNhoms.find(n => n.ID_NhomChiTieu === selectedNhom) ?? null;
  const childNhomOptions = (selectedNode?.NhomCon ?? []).map(n => ({ value: n.ID_NhomChiTieu, label: n.TenNhom }));
  const chiTieuOptions = chiTieus.map(c => ({
    value: c.ID_ChiTieu,
    label: c.TenNhom ? `${c.TenChiTieu} — ${c.TenNhom}` : c.TenChiTieu,
  }));

  const handleSelectNhom = useCallback(async (id: number) => {
    setSelectedNhom(id);
    setCurrentCongThuc(null);
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

  const handleSelectLoai = useCallback(async (id: number, autoNhom?: number) => {
    setSelectedLoai(id);
    setSelectedNhom(null);
    setCongThucs([]);
    setCurrentCongThuc(null);
    try {
      const [cayData, cts] = await Promise.all([
        nhomChiTieuApi.getCay(id),
        chiTieuApi.getAll({ idLoai: id }),
      ]);
      setCay(cayData);
      setChiTieus(cts);
      if (autoNhom != null) handleSelectNhom(autoNhom);
    } catch {
      message.error('Lỗi tải nhóm chỉ tiêu / chỉ tiêu');
    }
  }, [handleSelectNhom]);

  // Tự động chọn loại thiết bị + nhóm khi được điều hướng từ trang Cây chỉ tiêu (?nhom=ID)
  useEffect(() => {
    const nhomParam = searchParams.get('nhom');
    if (!nhomParam) return;
    const idNhom = Number(nhomParam);
    if (!idNhom) return;
    nhomChiTieuApi.getById(idNhom)
      .then(nhom => handleSelectLoai(nhom.ID_LoaiThietBi, idNhom))
      .catch(() => message.error('Không tìm thấy nhóm chỉ tiêu được liên kết'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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
    } catch (e: unknown) {
      if (e instanceof Error && 'errorFields' in (e as object)) return;
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

  const openEditBien = (r: CongThucBien) => {
    setEditingBien(r);
    bienForm.setFieldsValue(r);
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
    } catch (e: unknown) {
      if (e instanceof Error && 'errorFields' in (e as object)) return;
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
    { title: 'Loại', dataIndex: 'LoaiCongThuc', width: 90,
      render: (v: string) => (
        <Tooltip title={loaiCongThucLabel(v)}>
          <Tag style={{ cursor: 'help' }}>{loaiCongThucShort(v)}</Tag>
        </Tooltip>
      ) },
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
      width: 130,
      render: (v: string) => <Tag>{nguonBienLabel(v)}</Tag>,
    },
    {
      title: 'Nguồn dữ liệu',
      render: (_: unknown, r: CongThucBien) => {
        if (r.NguonBien === 'HANGSO') return <Text>{r.GiaTriHangSo}</Text>;
        if (r.NguonBien === 'CHITIEU') return <Text>{r.TenChiTieu ?? r.ID_ChiTieuNguon}</Text>;
        return <Text>{r.TenNhomCon ?? r.ID_NhomCon}</Text>;
      },
    },
    {
      title: 'Trọng số Wᵢ',
      dataIndex: 'TrongSo',
      width: 100,
      align: 'center',
      render: (v?: number | null) => v != null ? <Tag color="purple">{v}</Tag> : <Text type="secondary">—</Text>,
    },
    { title: 'Ghi chú', dataIndex: 'MoTa' },
    {
      title: '',
      width: 84,
      render: (_: unknown, r: CongThucBien) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEditBien(r)} />
          <Popconfirm title="Xóa biến?" onConfirm={() =>
            congThucBienApi.delete(r.ID_Bien).then(() => {
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

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>Cấu hình công thức tổng hợp</Title>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            style={{ width: 200 }}
            placeholder="Loại thiết bị"
            value={selectedLoai ?? undefined}
            onChange={(id: number) => handleSelectLoai(id)}
            options={loais.map(l => ({ value: l.ID_LoaiThietBi, label: l.TenLoaiTB }))}
          />
          <Select
            style={{ width: 280 }}
            placeholder="Nhóm COMPOSITE"
            disabled={!selectedLoai}
            value={selectedNhom ?? undefined}
            onChange={handleSelectNhom}
            showSearch
            optionFilterProp="label"
            options={compositeNhoms.map(n => ({ value: n.ID_NhomChiTieu, label: n.TenNhom }))}
            notFoundContent={selectedLoai ? 'Chưa có nhóm COMPOSITE nào — tạo tại trang Cây chỉ tiêu' : undefined}
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
              locale={{ emptyText: selectedNhom ? 'Chưa có công thức — nhấn "Tạo phiên bản mới"' : 'Chọn nhóm COMPOSITE để xem công thức' }}
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
        destroyOnHidden
      >
        <Form form={ctForm} layout="vertical">
          <Form.Item name="ID_NhomChiTieu" hidden><Input /></Form.Item>
          <Form.Item
            name="BieuThuc"
            label="Biểu thức NCalc"
            rules={[{ required: true, message: 'Nhập biểu thức' }]}
            extra="Ví dụ: 0.6 * TS1 + 0.4 * TS2. LƯU Ý: nếu Loại công thức bên dưới là 'Trung bình trọng số' (WEIGHTED_AVG/WEIGHTED_AVG_SCALED), engine tự tính từ Trọng số Wᵢ khai ở từng biến và BỎ QUA nội dung ô này — chỉ cần nhập 1 công thức tham khảo để tự đọc lại sau."
          >
            <TextArea rows={4} style={{ fontFamily: 'monospace' }} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="LoaiCongThuc" label="Loại công thức"
                tooltip="'Trung bình trọng số' (2 loại WEIGHTED_AVG*): engine TỰ tính ΣSiWi/ΣWi từ Trọng số Wᵢ khai ở từng biến, bỏ qua ô Biểu thức. Các loại khác: biểu thức phía trên mới là thứ thực sự được tính.">
                <Select options={LOAI_CONG_THUC_OPTIONS} />
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
        destroyOnHidden
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
                <Form.Item name="ID_ChiTieuNguon" label="Chỉ tiêu nguồn" rules={[{ required: true }]}>
                  <Select
                    showSearch
                    optionFilterProp="label"
                    placeholder="Chọn chỉ tiêu"
                    options={chiTieuOptions}
                    notFoundContent="Loại thiết bị này chưa có chỉ tiêu nào"
                  />
                </Form.Item>
              );
              if (src === 'NHOM_CON') return (
                <Form.Item name="ID_NhomCon" label="Nhóm con" rules={[{ required: true }]}>
                  <Select
                    showSearch
                    optionFilterProp="label"
                    placeholder="Chọn nhóm con"
                    options={childNhomOptions}
                    notFoundContent="Nhóm này chưa có nhóm con — tạo tại trang Cây chỉ tiêu"
                  />
                </Form.Item>
              );
              return null;
            }}
          </Form.Item>
          <Form.Item name="TrongSo" label="Trọng số Wᵢ"
            tooltip={
              currentCongThuc?.LoaiCongThuc === 'WEIGHTED_AVG' || currentCongThuc?.LoaiCongThuc === 'WEIGHTED_AVG_SCALED'
                ? "Công thức nhóm này kiểu \"Trung bình trọng số\" — engine TỰ tính ΣSiWi/ΣWi (hoặc /(3·ΣWi)×10) từ trọng số khai ở đây, KHÔNG cần tự viết hệ số vào ô Biểu thức NCalc phía trên."
                : "Chỉ có tác dụng khi Loại công thức của nhóm là \"Trung bình trọng số\" (WEIGHTED_AVG/WEIGHTED_AVG_SCALED). Với loại khác (Biểu thức tự do...), để trống — hệ số phải viết trực tiếp trong Biểu thức NCalc."
            }
          >
            <InputNumber style={{ width: '100%' }} step={0.1} placeholder="Để trống nếu công thức không phải WEIGHTED_AVG(_SCALED)" />
          </Form.Item>
          <Form.Item name="MoTa" label="Mô tả">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
