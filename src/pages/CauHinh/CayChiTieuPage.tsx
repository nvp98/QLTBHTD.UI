import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, Card, Col, Form, Input, InputNumber, Modal, Popconfirm,
  Radio, Row, Select, Space, Table, Tag, Tooltip, Tree, Typography, message,
} from 'antd';
import type { DataNode } from 'antd/es/tree';
import type { ColumnsType } from 'antd/es/table';
import {
  ApartmentOutlined, DeleteOutlined, EditOutlined, FileTextOutlined,
  FunctionOutlined, PlusOutlined,
} from '@ant-design/icons';
import { nhomChiTieuApi } from '../../api/nhomChiTieu';
import { loaiThietBiApi } from '../../api/loaiThietBi';
import { chiTieuApi } from '../../api/chiTieu';
import type {
  NhomChiTieuCay, LoaiThietBi, ChiTieu,
  CreateNhomChiTieuV2Dto, UpdateNhomChiTieuV2Dto,
} from '../../types/entities';

const { Title, Text } = Typography;

/** Nhãn tiếng Việt cho LoaiNhom — giá trị lưu DB vẫn giữ nguyên 'LEAF'/'COMPOSITE'. */
const loaiNhomLabel = (v?: string) => (v === 'COMPOSITE' ? 'Chỉ số sức khỏe' : 'Hạng mục');

/** Nhãn tiếng Việt cho LoaiTinhDiem — giá trị lưu DB giữ nguyên 'Nguong'/'Rule'/'LF'. */
const loaiTinhDiemLabel = (v?: string | null) =>
  v === 'Rule' ? 'Biểu thức' : v === 'LF' ? 'Mang tải (LF)' : 'Ngưỡng';

function flattenCay(nodes: NhomChiTieuCay[]): NhomChiTieuCay[] {
  return nodes.flatMap(n => [n, ...flattenCay(n.NhomCon ?? [])]);
}

function collectDescendantIds(node: NhomChiTieuCay): number[] {
  return (node.NhomCon ?? []).flatMap(c => [c.ID_NhomChiTieu, ...collectDescendantIds(c)]);
}

interface TreeHandlers {
  onAddChild: (node: NhomChiTieuCay) => void;
  onEdit: (node: NhomChiTieuCay) => void;
  onDelete: (node: NhomChiTieuCay) => void;
}

function buildTreeData(nodes: NhomChiTieuCay[], handlers: TreeHandlers): DataNode[] {
  return nodes.map(n => ({
    key: n.ID_NhomChiTieu,
    title: (
      <Space size={4} style={{ width: '100%', justifyContent: 'space-between', display: 'flex' }}>
        <Space size={4} wrap>
          <Text>{n.TenNhom}</Text>
          <Tag color={n.LoaiNhom === 'COMPOSITE' ? 'blue' : 'green'}>{loaiNhomLabel(n.LoaiNhom)}</Tag>
          {n.LoaiNhom === 'COMPOSITE' && (
            <Tag color={n.CoCongThuc ? 'success' : 'warning'}>
              {n.CoCongThuc ? 'Có CT' : 'Chưa có CT'}
            </Tag>
          )}
          <Tag>{`Cấp ${n.CapDo}`}</Tag>
          {n.TrongSo_Wi != null && (
            <Tag color="purple" style={{ fontFamily: 'monospace', fontWeight: 700 }}>{`Wᵢ=${n.TrongSo_Wi}`}</Tag>
          )}
        </Space>
        <Space size={2} onClick={e => e.stopPropagation()}>
          {n.LoaiNhom === 'COMPOSITE' && (
            <Tooltip title="Thêm nhóm con">
              <Button size="small" type="text" icon={<PlusOutlined />} onClick={() => handlers.onAddChild(n)} />
            </Tooltip>
          )}
          <Tooltip title="Sửa nhóm">
            <Button size="small" type="text" icon={<EditOutlined />} onClick={() => handlers.onEdit(n)} />
          </Tooltip>
          <Popconfirm
            title={`Xóa nhóm "${n.TenNhom}"?`}
            okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
            onConfirm={() => handlers.onDelete(n)}
          >
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      </Space>
    ),
    icon: n.LoaiNhom === 'COMPOSITE' ? <ApartmentOutlined /> : <FileTextOutlined />,
    children: buildTreeData(n.NhomCon ?? [], handlers),
  }));
}

export default function CayChiTieuPage() {
  const navigate = useNavigate();

  const [loais, setLoais] = useState<LoaiThietBi[]>([]);
  const [selectedLoai, setSelectedLoai] = useState<number | null>(null);
  const [cay, setCay] = useState<NhomChiTieuCay[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // ── Modal Nhóm chỉ tiêu ──────────────────────────────────────────────────
  const [nhomModalOpen, setNhomModalOpen] = useState(false);
  const [editingNhom, setEditingNhom] = useState<NhomChiTieuCay | null>(null);
  const [parentNode, setParentNode] = useState<NhomChiTieuCay | null>(null);
  const [savingNhom, setSavingNhom] = useState(false);
  const [nhomForm] = Form.useForm();

  // ── Modal Chỉ tiêu con ───────────────────────────────────────────────────
  const [chiTieuCon, setChiTieuCon] = useState<ChiTieu[]>([]);
  const [ctLoading, setCtLoading] = useState(false);
  const [ctModalOpen, setCtModalOpen] = useState(false);
  const [editingCt, setEditingCt] = useState<ChiTieu | null>(null);
  const [savingCt, setSavingCt] = useState(false);
  const [ctForm] = Form.useForm();

  useEffect(() => {
    loaiThietBiApi.getActive().then(setLoais).catch(() => message.error('Lỗi tải loại thiết bị'));
  }, []);

  const loadCay = useCallback(async (idLoai: number) => {
    setLoading(true);
    try {
      const data = await nhomChiTieuApi.getCay(idLoai);
      setCay(data);
    } catch {
      message.error('Lỗi tải cây chỉ tiêu');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelectLoai = (id: number) => {
    setSelectedLoai(id);
    setSelectedId(null);
    loadCay(id);
  };

  const flatCay = useMemo(() => flattenCay(cay), [cay]);
  const selectedNode = flatCay.find(n => n.ID_NhomChiTieu === selectedId) ?? null;

  const loadChiTieuCon = useCallback(async (idNhom: number) => {
    setCtLoading(true);
    try {
      setChiTieuCon(await chiTieuApi.getByNhom(idNhom));
    } catch {
      message.error('Lỗi tải chỉ tiêu con');
    } finally {
      setCtLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedNode && selectedNode.LoaiNhom === 'LEAF') {
      loadChiTieuCon(selectedNode.ID_NhomChiTieu);
    } else {
      setChiTieuCon([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNode?.ID_NhomChiTieu, selectedNode?.LoaiNhom]);

  // ── Nhóm chỉ tiêu: CRUD ──────────────────────────────────────────────────
  const openAddRoot = () => {
    if (!selectedLoai) { message.warning('Chọn loại thiết bị trước'); return; }
    setEditingNhom(null);
    setParentNode(null);
    setNhomModalOpen(true);
  };

  const openAddChild = (parent: NhomChiTieuCay) => {
    setEditingNhom(null);
    setParentNode(parent);
    setNhomModalOpen(true);
  };

  const openEditNhom = (node: NhomChiTieuCay) => {
    setEditingNhom(node);
    setParentNode(null);
    setNhomModalOpen(true);
  };

  useEffect(() => {
    if (!nhomModalOpen) return;
    if (editingNhom) {
      nhomForm.setFieldsValue({
        TenNhom: editingNhom.TenNhom,
        LoaiNhom: editingNhom.LoaiNhom,
        ID_NhomCha: editingNhom.ID_NhomCha ?? undefined,
        CapDo: editingNhom.CapDo,
        PhienBan: editingNhom.PhienBan,
        TrangThai: editingNhom.TrangThai,
        TrongSo_Wi: editingNhom.TrongSo_Wi ?? undefined,
      });
    } else if (parentNode) {
      nhomForm.setFieldsValue({
        TenNhom: '',
        LoaiNhom: 'LEAF',
        ID_NhomCha: parentNode.ID_NhomChiTieu,
        CapDo: Math.max(1, parentNode.CapDo - 1),
        PhienBan: 1,
        TrangThai: 1,
        TrongSo_Wi: undefined,
      });
    } else {
      nhomForm.setFieldsValue({
        TenNhom: '',
        LoaiNhom: 'LEAF',
        ID_NhomCha: undefined,
        CapDo: 1,
        PhienBan: 1,
        TrangThai: 1,
        TrongSo_Wi: undefined,
      });
    }
  }, [nhomModalOpen, editingNhom, parentNode, nhomForm]);

  const compositeOptions = useMemo(() => flatCay
    .filter(n => n.LoaiNhom === 'COMPOSITE')
    .filter(n => !editingNhom
      || (n.ID_NhomChiTieu !== editingNhom.ID_NhomChiTieu
        && !collectDescendantIds(editingNhom).includes(n.ID_NhomChiTieu)))
    .map(n => ({ value: n.ID_NhomChiTieu, label: n.TenNhom })),
  [flatCay, editingNhom]);

  const saveNhom = async () => {
    if (!selectedLoai) return;
    setSavingNhom(true);
    try {
      const v = await nhomForm.validateFields();
      const dto: CreateNhomChiTieuV2Dto | UpdateNhomChiTieuV2Dto = {
        TenNhom: v.TenNhom,
        ID_LoaiThietBi: selectedLoai,
        ID_NhomCha: v.ID_NhomCha ?? null,
        CapDo: v.CapDo,
        LoaiNhom: v.LoaiNhom,
        PhienBan: v.PhienBan,
        TrangThai: v.TrangThai,
        TrongSo_Wi: v.TrongSo_Wi ?? null,
      };
      if (editingNhom) {
        await nhomChiTieuApi.update(editingNhom.ID_NhomChiTieu, dto as UpdateNhomChiTieuV2Dto);
        message.success('Đã cập nhật nhóm chỉ tiêu');
      } else {
        await nhomChiTieuApi.create(dto as CreateNhomChiTieuV2Dto);
        message.success('Đã thêm nhóm chỉ tiêu');
      }
      setNhomModalOpen(false);
      await loadCay(selectedLoai);
    } catch (e: unknown) {
      if (e instanceof Error && 'errorFields' in (e as object)) return;
      message.error('Lỗi lưu nhóm chỉ tiêu');
    } finally {
      setSavingNhom(false);
    }
  };

  const handleDeleteNhom = async (node: NhomChiTieuCay) => {
    if (!selectedLoai) return;
    if ((node.NhomCon?.length ?? 0) > 0) {
      message.warning('Không thể xóa — nhóm còn nhóm con bên trong. Hãy xóa các nhóm con trước.');
      return;
    }
    try {
      await nhomChiTieuApi.delete(node.ID_NhomChiTieu);
      message.success('Đã xóa nhóm chỉ tiêu');
      if (selectedId === node.ID_NhomChiTieu) setSelectedId(null);
      await loadCay(selectedLoai);
    } catch {
      message.error('Không thể xóa — nhóm còn chỉ tiêu con hoặc công thức tham chiếu');
    }
  };

  // ── Chỉ tiêu con: CRUD ───────────────────────────────────────────────────
  const openCreateCt = () => { setEditingCt(null); setCtModalOpen(true); };
  const openEditCt = (r: ChiTieu) => { setEditingCt(r); setCtModalOpen(true); };

  useEffect(() => {
    if (!ctModalOpen) return;
    if (editingCt) {
      ctForm.setFieldsValue(editingCt);
    } else {
      ctForm.setFieldsValue({
        ID_NhomChiTieu: selectedNode?.ID_NhomChiTieu,
        TrongSo_Wi: 0,
        TrangThai: 1,
        LoaiTinhDiem: 'Nguong',
      });
    }
  }, [ctModalOpen, editingCt, selectedNode, ctForm]);

  const saveCt = async () => {
    setSavingCt(true);
    try {
      const v = await ctForm.validateFields();
      if (editingCt) {
        await chiTieuApi.update(editingCt.ID_ChiTieu, v);
        message.success('Đã cập nhật chỉ tiêu con');
      } else {
        await chiTieuApi.create(v);
        message.success('Đã thêm chỉ tiêu con');
      }
      setCtModalOpen(false);
      if (selectedNode) loadChiTieuCon(selectedNode.ID_NhomChiTieu);
      if (selectedLoai) loadCay(selectedLoai);
    } catch (e: unknown) {
      if (e instanceof Error && 'errorFields' in (e as object)) return;
      message.error('Lỗi lưu chỉ tiêu con');
    } finally {
      setSavingCt(false);
    }
  };

  const handleDeleteCt = async (id: number) => {
    try {
      await chiTieuApi.delete(id);
      message.success('Đã xóa chỉ tiêu con');
      if (selectedNode) loadChiTieuCon(selectedNode.ID_NhomChiTieu);
    } catch {
      message.error('Không thể xóa — chỉ tiêu còn dữ liệu liên quan (ngưỡng/phiếu kiểm tra)');
    }
  };

  const treeData = buildTreeData(cay, {
    onAddChild: openAddChild,
    onEdit: openEditNhom,
    onDelete: handleDeleteNhom,
  });

  const ctColumns: ColumnsType<ChiTieu> = [
    {
      title: 'Tên chỉ tiêu', dataIndex: 'TenChiTieu',
      render: v => <Text strong>{v}</Text>,
    },
    {
      title: 'Trọng số Wᵢ', dataIndex: 'TrongSo_Wi', width: 100, align: 'center',
      render: v => <Tag>{Number(v)}</Tag>,
    },
    {
      title: 'Kiểu điểm', dataIndex: 'LoaiTinhDiem', width: 110, align: 'center',
      render: v => v === 'Rule'
        ? <Tag color="purple" icon={<FunctionOutlined />}>Biểu thức</Tag>
        : v === 'LF'
        ? <Tag color="magenta">Mang tải (LF)</Tag>
        : <Tag color="blue">{loaiTinhDiemLabel(v)}</Tag>,
    },
    {
      title: 'Trạng thái', dataIndex: 'TrangThai', width: 100, align: 'center',
      render: v => <Tag color={v === 1 ? 'success' : 'default'}>{v === 1 ? 'Hoạt động' : 'Ngừng'}</Tag>,
    },
    {
      title: '', width: 76, align: 'center',
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEditCt(r)} />
          <Popconfirm title="Xóa chỉ tiêu này?" okText="Xóa" cancelText="Hủy"
            okButtonProps={{ danger: true }} onConfirm={() => handleDeleteCt(r.ID_ChiTieu)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>Cây chỉ tiêu đánh giá</Title>

      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Text strong>Loại thiết bị:</Text>
          <Select
            style={{ width: 240 }}
            placeholder="Chọn loại thiết bị"
            value={selectedLoai ?? undefined}
            onChange={handleSelectLoai}
            options={loais.map(l => ({ value: l.ID_LoaiThietBi, label: l.TenLoaiTB }))}
          />
          {selectedLoai && (
            <Button icon={<PlusOutlined />} onClick={openAddRoot}>
              Thêm nhóm gốc
            </Button>
          )}
        </Space>
      </Card>

      <Row gutter={16}>
        <Col span={selectedNode ? 14 : 24}>
          <Card title="Cây phân cấp nhóm chỉ tiêu" loading={loading}>
            {cay.length === 0 && !loading && (
              <Text type="secondary">
                {selectedLoai ? 'Chưa có nhóm chỉ tiêu nào.' : 'Chọn loại thiết bị để xem cây.'}
              </Text>
            )}
            {cay.length > 0 && (
              <Tree
                showIcon
                defaultExpandAll
                treeData={treeData}
                selectedKeys={selectedId != null ? [selectedId] : []}
                onSelect={keys => setSelectedId(keys.length ? Number(keys[0]) : null)}
                style={{ minHeight: 300 }}
              />
            )}
          </Card>
        </Col>

        {selectedNode && (
          <Col span={10}>
            <Card
              title={`Chi tiết: ${selectedNode.TenNhom}`}
              extra={
                <Space>
                  <Button size="small" icon={<EditOutlined />} onClick={() => openEditNhom(selectedNode)}>
                    Sửa
                  </Button>
                  {selectedNode.LoaiNhom === 'COMPOSITE' && (
                    <Button
                      size="small" type="primary"
                      onClick={() => navigate(`/cau-hinh/cong-thuc?nhom=${selectedNode.ID_NhomChiTieu}`)}
                    >
                      Cấu hình công thức
                    </Button>
                  )}
                </Space>
              }
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <div><Text strong>ID: </Text><Text>{selectedNode.ID_NhomChiTieu}</Text></div>
                <div>
                  <Text strong>Loại nhóm: </Text>
                  <Tag color={selectedNode.LoaiNhom === 'COMPOSITE' ? 'blue' : 'green'}>
                    {loaiNhomLabel(selectedNode.LoaiNhom)}
                  </Tag>
                </div>
                <div><Text strong>Cấp độ: </Text><Text>{selectedNode.CapDo}</Text></div>
                <div>
                  <Text strong>Trọng số Wᵢ (khi tham gia công thức nhóm cha): </Text>
                  {selectedNode.TrongSo_Wi != null
                    ? <Tag color="purple" style={{ fontFamily: 'monospace', fontWeight: 700 }}>{selectedNode.TrongSo_Wi}</Tag>
                    : <Text style={{ color: '#6b7280' }}>— chưa đặt (mặc định = 1)</Text>}
                </div>
                <div>
                  <Text strong>Nhóm cha: </Text>
                  <Text>
                    {selectedNode.ID_NhomCha != null
                      ? (flatCay.find(n => n.ID_NhomChiTieu === selectedNode.ID_NhomCha)?.TenNhom ?? selectedNode.ID_NhomCha)
                      : '(gốc)'}
                  </Text>
                </div>
                {selectedNode.LoaiNhom === 'COMPOSITE' && (
                  <div>
                    <Text strong>Công thức: </Text>
                    <Tag color={selectedNode.CoCongThuc ? 'success' : 'error'}>
                      {selectedNode.CoCongThuc ? 'Đã cấu hình' : 'Chưa có công thức'}
                    </Tag>
                  </div>
                )}
              </Space>

              {selectedNode.LoaiNhom === 'LEAF' && (
                <>
                  <div style={{ marginTop: 16, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong>Chỉ tiêu con</Text>
                    <Button size="small" icon={<PlusOutlined />} onClick={openCreateCt}>
                      Thêm chỉ tiêu con
                    </Button>
                  </div>
                  <Table<ChiTieu>
                    rowKey="ID_ChiTieu"
                    size="small"
                    loading={ctLoading}
                    dataSource={chiTieuCon}
                    columns={ctColumns}
                    pagination={false}
                    locale={{ emptyText: 'Chưa có chỉ tiêu con — nhấn "Thêm chỉ tiêu con"' }}
                  />
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                    Cấu hình ngưỡng / biểu thức chi tiết cho từng chỉ tiêu tại trang{' '}
                    <a onClick={() => navigate('/cau-hinh/chi-tieu')}>Chỉ tiêu &amp; Ngưỡng điểm</a>.
                  </Text>
                </>
              )}
            </Card>
          </Col>
        )}
      </Row>

      {/* ── Modal Nhóm chỉ tiêu ── */}
      <Modal
        title={
          editingNhom
            ? `Sửa nhóm — ${editingNhom.TenNhom}`
            : parentNode
              ? `Thêm nhóm con của "${parentNode.TenNhom}"`
              : 'Thêm nhóm gốc'
        }
        open={nhomModalOpen}
        onOk={saveNhom}
        onCancel={() => setNhomModalOpen(false)}
        confirmLoading={savingNhom}
        okText={editingNhom ? 'Cập nhật' : 'Thêm mới'}
        cancelText="Hủy"
        destroyOnHidden
        width={520}
      >
        <Form form={nhomForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="TenNhom" label="Tên nhóm chỉ tiêu"
            rules={[{ required: true, message: 'Nhập tên nhóm chỉ tiêu' }]}>
            <Input placeholder="VD: Phân tích khí hòa tan (DGA)" />
          </Form.Item>
          <Form.Item name="LoaiNhom" label="Loại nhóm" rules={[{ required: true }]}
            tooltip="Hạng mục: chứa chỉ tiêu con trực tiếp (nơi nhập số đo). Chỉ số sức khỏe: gộp điểm từ các nhóm con khác qua công thức.">
            <Radio.Group buttonStyle="solid">
              <Radio.Button value="LEAF">Hạng mục — chứa chỉ tiêu con</Radio.Button>
              <Radio.Button value="COMPOSITE">Chỉ số sức khỏe — gộp nhóm con</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="ID_NhomCha" label="Nhóm cha" tooltip="Để trống nếu đây là nhóm gốc">
            <Select
              allowClear
              placeholder="(gốc — không có nhóm cha)"
              disabled={!!parentNode}
              options={compositeOptions}
            />
          </Form.Item>
          <Form.Item name="CapDo" label="Cấp độ"
            tooltip="1 = tầng lá, số càng lớn càng ở tầng tổng hợp cao hơn"
            rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={1} />
          </Form.Item>
          <Form.Item name="TrongSo_Wi" label="Trọng số Wᵢ (khi tham gia công thức nhóm cha)"
            tooltip="Dùng khi nhóm này được chọn làm biến NHOM_CON trong công thức của 1 nhóm COMPOSITE khác (vd 'Chất lượng dầu' Wi=6 khi tham gia TS1). Để trống = coi như đồng trọng số (Wi=1) trừ khi công thức có override riêng.">
            <InputNumber style={{ width: '100%' }} min={0} step={0.5} placeholder="Để trống nếu không cần" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="PhienBan" label="Phiên bản" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={1} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="TrangThai" label="Trạng thái" rules={[{ required: true }]}>
                <Select options={[{ value: 1, label: 'Hoạt động' }, { value: 0, label: 'Ngừng' }]} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* ── Modal Chỉ tiêu con ── */}
      <Modal
        title={editingCt ? `Sửa chỉ tiêu — ${editingCt.TenChiTieu}` : `Thêm chỉ tiêu con — ${selectedNode?.TenNhom ?? ''}`}
        open={ctModalOpen}
        onOk={saveCt}
        onCancel={() => setCtModalOpen(false)}
        confirmLoading={savingCt}
        okText={editingCt ? 'Cập nhật' : 'Thêm mới'}
        cancelText="Hủy"
        destroyOnHidden
        width={480}
      >
        <Form form={ctForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="ID_NhomChiTieu" hidden><InputNumber /></Form.Item>
          <Form.Item name="TenChiTieu" label="Tên chỉ tiêu"
            rules={[{ required: true, message: 'Nhập tên chỉ tiêu' }]}>
            <Input placeholder="VD: Điện áp đánh thủng (BDV)" />
          </Form.Item>
          <Form.Item name="TrongSo_Wi" label="Trọng số Wᵢ"
            tooltip="0 < Wᵢ ≤ 1. Tổng Wᵢ trong nhóm = 1.0" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} max={1} step={0.001} precision={3} />
          </Form.Item>
          <Form.Item name="LoaiTinhDiem" label="Kiểu tính điểm" rules={[{ required: true }]}>
            <Radio.Group buttonStyle="solid">
              <Radio.Button value="Nguong">Ngưỡng</Radio.Button>
              <Radio.Button value="Rule">Biểu thức (Rule)</Radio.Button>
              <Radio.Button value="LF">Mang tải (LF)</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="TrangThai" label="Trạng thái" rules={[{ required: true }]}>
            <Select options={[{ value: 1, label: 'Hoạt động' }, { value: 0, label: 'Ngừng' }]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
