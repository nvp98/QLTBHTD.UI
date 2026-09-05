import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert, Button, Card, Checkbox, Col, Flex, Form, Input, InputNumber, Modal, Popconfirm,
  Row, Select, Space, Table, Tag, Tooltip, Typography, message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckCircleOutlined, CloseCircleOutlined, DeleteOutlined, EditOutlined,
  ExperimentOutlined, PlayCircleOutlined, PlusOutlined,
} from '@ant-design/icons';
import { congThucTongHopApi, congThucBienApi } from '../../api/congThucTongHop';
import { congThucTestCaseApi } from '../../api/congThucTestCase';
import { nhomChiTieuApi } from '../../api/nhomChiTieu';
import { loaiThietBiApi } from '../../api/loaiThietBi';
import { chiTieuApi } from '../../api/chiTieu';
import {
  useNCalcToolbar, NCALC_TOOLBAR_TAG_STYLE, NCALC_OPERATORS, NCALC_PUNCTUATION, NCALC_FUNCTIONS,
} from '../../hooks/useNCalcToolbar';
import type {
  CongThucTongHop, CongThucBien, CongThucTestCase,
  CreateCongThucTongHopDto, CreateCongThucBienDto, CreateCongThucTestCaseDto,
  NhomChiTieuCay, LoaiThietBi, ChiTieu, VongLapKetQua,
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
  { value: 'MIN_BIEN', label: 'Nhỏ nhất trong các biến — kiểu Sm (lịch sử bảo dưỡng)' },
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
  MIN_BIEN: 'Sm',
};
const loaiCongThucShort = (v?: string) => (v ? LOAI_CONG_THUC_SHORT[v] ?? v : '—');

/** Nhãn tiếng Việt cho NguonBien — giá trị lưu DB giữ nguyên tiếng Anh. Nguồn duy nhất,
 * dùng cả cho cột hiển thị lẫn Select trong modal (tránh lệch chữ giữa 2 nơi). */
const NGUON_BIEN_LABEL: Record<string, string> = {
  HANGSO: 'Hằng số',
  CHITIEU: 'Điểm Sᵢ chỉ tiêu',
  NHOM_CON: 'Điểm Sᵢ nhóm con',
};
const nguonBienLabel = (v?: string) => (v ? NGUON_BIEN_LABEL[v] ?? v : '—');
const NGUON_BIEN_OPTIONS = Object.entries(NGUON_BIEN_LABEL).map(([value, label]) => ({ value, label }));

function flattenCay(nodes: NhomChiTieuCay[]): NhomChiTieuCay[] {
  return nodes.flatMap(n => [n, ...flattenCay(n.NhomCon ?? [])]);
}

/** API trả lỗi cấu hình (vd VongLapCauHinhException) dạng JSON {"error":"..."} trong body —
 * bóc ra hiển thị đúng thông điệp thay vì message chung chung. */
function extractApiErrorMessage(e: unknown, macDinh: string): string {
  if (e instanceof Error) {
    try {
      const parsed = JSON.parse(e.message) as { error?: string };
      if (parsed.error) return parsed.error;
    } catch { /* không phải JSON — dùng mặc định */ }
  }
  return macDinh;
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
  const [vongLap, setVongLap] = useState<VongLapKetQua | null>(null);

  // Modal công thức
  const [ctModalOpen, setCtModalOpen] = useState(false);
  const [editingCt, setEditingCt]     = useState<CongThucTongHop | null>(null);
  const [ctForm]                      = Form.useForm();
  const { ref: bieuThucCtRef, insertVar: insertCtVar, insertOp: insertCtOp, insertPunc: insertCtPunc, insertFunc: insertCtFunc } =
    useNCalcToolbar(ctForm, 'BieuThuc');

  // Modal biến
  const [bienModalOpen, setBienModalOpen] = useState(false);
  const [editingBien, setEditingBien]     = useState<CongThucBien | null>(null);
  const [bienForm]                        = Form.useForm();
  const [currentCongThuc, setCurrentCongThuc] = useState<CongThucTongHop | null>(null);
  const [chiHienLienQuan, setChiHienLienQuan] = useState(true);

  useEffect(() => {
    loaiThietBiApi.getActive().then(setLoais).catch(() => message.error('Lỗi tải loại thiết bị'));
  }, []);

  const flatNhoms = useMemo(() => flattenCay(cay), [cay]);
  const compositeNhoms = useMemo(() => flatNhoms.filter(n => n.LoaiNhom === 'COMPOSITE'), [flatNhoms]);
  const selectedNode = flatNhoms.find(n => n.ID_NhomChiTieu === selectedNhom) ?? null;
  const childNhomOptions = (selectedNode?.NhomCon ?? []).map(n => ({ value: n.ID_NhomChiTieu, label: n.TenNhom }));
  // Khi bật "Chỉ hiện chỉ tiêu liên quan": lọc còn chỉ tiêu thuộc chính nhóm đang chọn hoặc các
  // nhóm con của nó — tránh chọn nhầm chỉ tiêu của nhóm khác khi ráp biến cho công thức. Người
  // dùng tự tắt toggle khi cần tham chiếu chỉ tiêu ở nhóm khác (không phải hậu duệ) — tránh kiểu
  // lỗi "im lặng chặn" nếu chỉ dựa vào fallback tự động lúc danh sách lọc rỗng.
  const relevantNhomIds = selectedNode
    ? new Set(flattenCay([selectedNode]).map(n => n.ID_NhomChiTieu))
    : null;
  const chiTieusHienThi = (chiHienLienQuan && relevantNhomIds)
    ? chiTieus.filter(c => relevantNhomIds.has(c.ID_NhomChiTieu))
    : chiTieus;
  const chiTieuOptions = chiTieusHienThi.map(c => ({
    value: c.ID_ChiTieu,
    label: c.TenNhom ? `${c.TenChiTieu} — ${c.TenNhom}` : c.TenChiTieu,
  }));

  const fetchCongThucs = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const data = await congThucTongHopApi.getByNhom(id);
      setCongThucs(data);
      return data;
    } catch {
      message.error('Lỗi tải công thức');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelectNhom = useCallback(async (id: number) => {
    setSelectedNhom(id);
    setCurrentCongThuc(null);
    await fetchCongThucs(id);
  }, [fetchCongThucs]);

  // Tải lại danh sách công thức sau khi thêm/sửa/xóa 1 biến (hoặc sửa công thức) NHƯNG giữ panel
  // "Biến trong công thức" đang mở — khác handleSelectNhom (dùng khi đổi hẳn sang nhóm khác, phải
  // đóng panel). Không giữ nguyên state cũ vì DanhSachBien đã đổi, phải đồng bộ lại từ dữ liệu mới.
  const refreshCongThucsGiuPanel = useCallback(async (id: number) => {
    const data = await fetchCongThucs(id);
    setCurrentCongThuc(prev => prev ? (data.find(ct => ct.ID_CongThuc === prev.ID_CongThuc) ?? null) : prev);
  }, [fetchCongThucs]);

  const handleSelectLoai = useCallback(async (id: number, autoNhom?: number) => {
    setSelectedLoai(id);
    setSelectedNhom(null);
    setCongThucs([]);
    setCurrentCongThuc(null);
    setVongLap(null);
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
    // Config Validator mục 3.2 — quét vòng lặp tham chiếu toàn bộ cây của loại thiết bị này.
    congThucTongHopApi.validateVongLap(id).then(setVongLap).catch(() => {});
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
      if (selectedNhom) refreshCongThucsGiuPanel(selectedNhom);
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
      if (selectedNhom) refreshCongThucsGiuPanel(selectedNhom);
    } catch (e: unknown) {
      if (e instanceof Error && 'errorFields' in (e as object)) return;
      message.error(extractApiErrorMessage(e, 'Lỗi lưu biến'));
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
      render: (v: number) => <Tag color={v === 1 ? 'success' : 'default'}>{v === 1 ? 'Hoạt động' : 'Ngừng'}</Tag>,
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
            setCurrentCongThuc(rec); // đảm bảo toolbar chèn biến hiện đúng biến của công thức đang sửa
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
        if (r.NguonBien === 'CHITIEU') return (
          <>
            <Text>{r.TenChiTieu ?? r.ID_ChiTieuNguon}</Text>
            {r.ID_NhomCon && (
              <Tooltip title="Trọng số Wᵢ của biến này lấy từ Nhóm chỉ tiêu này, không lấy từ Chỉ tiêu">
                <Tag style={{ marginLeft: 6, borderStyle: 'dashed' }}>Wᵢ từ: {r.TenNhomCon ?? r.ID_NhomCon}</Tag>
              </Tooltip>
            )}
          </>
        );
        return <Text>{r.TenNhomCon ?? r.ID_NhomCon}</Text>;
      },
    },
    {
      title: 'Trọng số Wᵢ',
      dataIndex: 'TrongSo',
      width: 110,
      align: 'center',
      render: (v: number | null | undefined, r: CongThucBien) => {
        if (v != null) return <Tag color="purple">{v}</Tag>;

        // Trống ở CBM_CongThuc_Bien.TrongSo -> tra fallback: ưu tiên Wᵢ của Nhóm chỉ tiêu nếu biến có
        // gắn ID_NhomCon (kể cả khi Nguồn dữ liệu là CHITIEU), rồi mới tới Wᵢ gốc của Chỉ tiêu.
        let goc: number | null | undefined;
        if (r.ID_NhomCon) {
          goc = flattenCay(cay).find(n => n.ID_NhomChiTieu === r.ID_NhomCon)?.TrongSo_Wi;
        } else if (r.NguonBien === 'CHITIEU') {
          goc = chiTieus.find(c => c.ID_ChiTieu === r.ID_ChiTieuNguon)?.TrongSo_Wi || null;
        }

        return goc != null ? (
          <Tooltip title="Chưa override riêng — tự động lấy từ Wᵢ gốc của Chỉ tiêu/Nhóm nguồn">
            <Tag style={{ borderStyle: 'dashed' }}>{goc}</Tag>
          </Tooltip>
        ) : <Text type="secondary">—</Text>;
      },
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
              if (selectedNhom) refreshCongThucsGiuPanel(selectedNhom);
            })
          }>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={3}>Cấu hình công thức tổng hợp</Title>

      {vongLap?.CoVongLap && (
        <Alert
          type="error" showIcon style={{ marginBottom: 16 }}
          message="Phát hiện VÒNG LẶP tham chiếu trong cây công thức tổng hợp"
          description={`Đường đi: ${vongLap.DuongDi.join(' → ')} — nhóm ở cuối trùng nhóm đầu, chỉ số CSSK của các nhóm trong vòng lặp này sẽ LỖI khi tính điểm (VongLapNhomChiTieuException). Sửa lại biến NHOM_CON gây vòng lặp trước khi dùng.`}
        />
      )}

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

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={currentCongThuc ? 12 : 24}>
          <Card title="Danh sách công thức" loading={loading}>
            <Table
              scroll={{ x: 'max-content' }}
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
          <Col xs={24} lg={12}>
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
                scroll={{ x: 'max-content' }}
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

      {currentCongThuc && (
        <TestCasePanel congThuc={currentCongThuc} />
      )}

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

          {!editingCt && (
            <div style={{ marginBottom: 12, padding: '8px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, fontSize: 12 }}>
              💡 Có thể để trống Biểu thức lúc tạo mới — tạo công thức trước, bấm vào "N biến" trong bảng để khai các biến (`Thêm biến`), rồi quay lại <b>Sửa</b> công thức này để ráp Biểu thức bằng các biến đã có (toolbar chèn biến bên dưới sẽ tự hiện).
            </div>
          )}

          {editingCt && currentCongThuc && (currentCongThuc.DanhSachBien?.length ?? 0) > 0 && (
            <Flex wrap gap={6} style={{ marginBottom: 6 }}>
              <Text style={{ color: '#6b7280', fontSize: 13, alignSelf: 'center' }}>Bấm để chèn biến: </Text>
              {currentCongThuc.DanhSachBien!.map(b => (
                <Tag key={b.ID_Bien} color="orange" style={NCALC_TOOLBAR_TAG_STYLE} onClick={() => insertCtVar(b.MaBien)}>
                  {b.MaBien}
                </Tag>
              ))}
            </Flex>
          )}
          <Flex wrap gap={6} style={{ marginBottom: 6 }}>
            <Text style={{ color: '#6b7280', fontSize: 13, alignSelf: 'center' }}>Toán tử: </Text>
            {NCALC_OPERATORS.map(op => (
              <Tag key={`ctop-${op}`} color="blue" style={{ ...NCALC_TOOLBAR_TAG_STYLE, minWidth: 30 }} onClick={() => insertCtOp(op)}>
                {op}
              </Tag>
            ))}
          </Flex>
          <Flex wrap gap={6} style={{ marginBottom: 6 }}>
            <Text style={{ color: '#6b7280', fontSize: 13, alignSelf: 'center' }}>Dấu: </Text>
            {NCALC_PUNCTUATION.map(p => (
              <Tag key={`ctpunc-${p}`} color="cyan" style={{ ...NCALC_TOOLBAR_TAG_STYLE, minWidth: 26 }} onClick={() => insertCtPunc(p)}>
                {p}
              </Tag>
            ))}
          </Flex>
          <Flex wrap gap={6} style={{ marginBottom: 10 }}>
            <Text style={{ color: '#6b7280', fontSize: 13, alignSelf: 'center' }}>Hàm: </Text>
            {NCALC_FUNCTIONS.map(f => (
              <Tag key={`ctfunc-${f.fn}`} color="magenta" style={NCALC_TOOLBAR_TAG_STYLE} onClick={() => insertCtFunc(f.fn)}>
                {f.label}
              </Tag>
            ))}
          </Flex>
          <Form.Item
            name="BieuThuc"
            label="Biểu thức NCalc"
            extra="Ví dụ: 0.6 * TS1 + 0.4 * TS2. Có thể để trống nếu chưa khai biến. LƯU Ý: nếu Loại công thức bên dưới là 'Trung bình trọng số' (WEIGHTED_AVG/WEIGHTED_AVG_SCALED) hoặc 'Nhỏ nhất trong các biến' (MIN_BIEN), engine tự tính trực tiếp từ các biến và BỎ QUA nội dung ô này — chỉ cần nhập 1 công thức tham khảo để tự đọc lại sau."
          >
            <TextArea ref={bieuThucCtRef} rows={3} style={{ fontFamily: 'monospace', fontSize: 15 }} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="LoaiCongThuc" label="Loại công thức"
                tooltip="'Trung bình trọng số' (2 loại WEIGHTED_AVG*): engine TỰ tính ΣSiWi/ΣWi từ Trọng số Wᵢ khai ở từng biến, bỏ qua ô Biểu thức. 'Nhỏ nhất trong các biến' (MIN_BIEN): engine TỰ lấy MIN của toàn bộ biến, cũng bỏ qua ô Biểu thức — dùng cho công thức kiểu Sm (MIN nhiều bộ phận), không cần viết Min() lồng nhau tay. Các loại khác: biểu thức phía trên mới là thứ thực sự được tính.">
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
              <Select options={[{ value: 1, label: 'Hoạt động' }, { value: 0, label: 'Ngừng' }]} />
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
            <Select
              options={NGUON_BIEN_OPTIONS}
              onChange={() => bienForm.setFieldsValue({
                ID_ChiTieuNguon: undefined, ID_NhomCon: undefined, GiaTriHangSo: undefined,
              })}
            />
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
                <>
                  {relevantNhomIds && (
                    <Form.Item label={null} style={{ marginBottom: 8 }}>
                      <Checkbox
                        checked={chiHienLienQuan}
                        onChange={e => setChiHienLienQuan(e.target.checked)}
                      >
                        Chỉ hiện chỉ tiêu thuộc nhóm "{selectedNode?.TenNhom}" (và nhóm con)
                      </Checkbox>
                    </Form.Item>
                  )}
                  <Form.Item name="ID_ChiTieuNguon" label="Chỉ tiêu nguồn (lấy điểm Sᵢ)" rules={[{ required: true }]}>
                    <Select
                      showSearch
                      optionFilterProp="label"
                      placeholder="Chọn chỉ tiêu"
                      options={chiTieuOptions}
                      notFoundContent="Loại thiết bị này chưa có chỉ tiêu nào"
                      onChange={val => {
                        // Chỉ tự-điền nếu chưa chọn riêng "Nguồn trọng số" bên dưới — tránh ghi đè lựa chọn cố ý.
                        if (getFieldValue('ID_NhomCon')) return;
                        const ct = chiTieus.find(c => c.ID_ChiTieu === val);
                        if (ct?.TrongSo_Wi) bienForm.setFieldsValue({ TrongSo: ct.TrongSo_Wi });
                      }}
                    />
                  </Form.Item>
                  <Form.Item
                    name="ID_NhomCon"
                    label="Nguồn trọng số (Nhóm chỉ tiêu, không bắt buộc)"
                    tooltip="Để trống: Wᵢ tự lấy từ chính Chỉ tiêu nguồn ở trên. Chọn 1 Nhóm chỉ tiêu (vd hạng mục Sᵢ theo QT.40): Wᵢ sẽ lấy từ Nhóm này thay vì từ Chỉ tiêu — dùng khi trọng số 'chính danh' được quy định ở cấp hạng mục, không phải ở từng chỉ tiêu lẻ."
                  >
                    <Select
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      placeholder="Để trống = lấy Wᵢ từ Chỉ tiêu nguồn ở trên"
                      options={childNhomOptions}
                      onChange={val => {
                        if (!val) return;
                        const nhom = flattenCay(cay).find(n => n.ID_NhomChiTieu === val);
                        if (nhom?.TrongSo_Wi != null) bienForm.setFieldsValue({ TrongSo: nhom.TrongSo_Wi });
                      }}
                    />
                  </Form.Item>
                </>
              );
              if (src === 'NHOM_CON') return (
                <Form.Item name="ID_NhomCon" label="Nhóm con" rules={[{ required: true }]}>
                  <Select
                    showSearch
                    optionFilterProp="label"
                    placeholder="Chọn nhóm con"
                    options={childNhomOptions}
                    notFoundContent="Nhóm này chưa có nhóm con — tạo tại trang Cây chỉ tiêu"
                    onChange={val => {
                      const nhom = flattenCay(cay).find(n => n.ID_NhomChiTieu === val);
                      if (nhom?.TrongSo_Wi != null) bienForm.setFieldsValue({ TrongSo: nhom.TrongSo_Wi });
                    }}
                  />
                </Form.Item>
              );
              return null;
            }}
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, cur) =>
              prev.NguonBien !== cur.NguonBien ||
              prev.ID_ChiTieuNguon !== cur.ID_ChiTieuNguon ||
              prev.ID_NhomCon !== cur.ID_NhomCon ||
              prev.TrongSo !== cur.TrongSo
            }
          >
            {({ getFieldValue }) => {
              const src = getFieldValue('NguonBien');

              // Tra "trọng số gốc" (Wᵢ đã lưu sẵn ở Chỉ tiêu/Nhóm được chọn làm nguồn biến) — ưu tiên
              // ID_NhomCon nếu có (kể cả khi src=CHITIEU, tức đã chọn riêng "Nguồn trọng số"), khớp
              // đúng thứ tự ưu tiên phía backend (ScoringEngine).
              let goc: number | null | undefined;
              let ten = '';
              const idNhomTrongSo = getFieldValue('ID_NhomCon');
              if (idNhomTrongSo && (src === 'CHITIEU' || src === 'NHOM_CON')) {
                const nhom = flattenCay(cay).find(n => n.ID_NhomChiTieu === idNhomTrongSo);
                if (nhom) { goc = nhom.TrongSo_Wi; ten = nhom.TenNhom; }
              } else if (src === 'CHITIEU') {
                const ct = chiTieus.find(c => c.ID_ChiTieu === getFieldValue('ID_ChiTieuNguon'));
                if (ct) { goc = ct.TrongSo_Wi || null; ten = ct.TenChiTieu; }
              }

              const placeholder = ten
                ? (goc != null ? `Để trống = tự lấy Wᵢ = ${goc} từ "${ten}"` : `"${ten}" chưa có Wᵢ riêng — để trống sẽ mặc định = 1`)
                : 'Để trống nếu công thức không phải WEIGHTED_AVG(_SCALED)';

              return (
                <>
                  <Form.Item name="TrongSo" label="Trọng số Wᵢ"
                    tooltip={
                      currentCongThuc?.LoaiCongThuc === 'WEIGHTED_AVG' || currentCongThuc?.LoaiCongThuc === 'WEIGHTED_AVG_SCALED'
                        ? "Công thức nhóm này kiểu \"Trung bình trọng số\" — engine TỰ tính ΣSiWi/ΣWi (hoặc /(3·ΣWi)×10) từ trọng số khai ở đây, KHÔNG cần tự viết hệ số vào ô Biểu thức NCalc phía trên."
                        : "Chỉ có tác dụng khi Loại công thức của nhóm là \"Trung bình trọng số\" (WEIGHTED_AVG/WEIGHTED_AVG_SCALED). Với loại khác (Biểu thức tự do...), để trống — hệ số phải viết trực tiếp trong Biểu thức NCalc."
                    }
                  >
                    <InputNumber style={{ width: '100%' }} step={0.1} placeholder={placeholder} />
                  </Form.Item>
                </>
              );
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

// ─── TestCasePanel — Formula Test: lưu bộ test case mẫu + chạy lại (regression) ────────────
function TestCasePanel({ congThuc }: { congThuc: CongThucTongHop }) {
  const [data, setData] = useState<CongThucTestCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<CongThucTestCase | null>(null);
  const [form] = Form.useForm();

  const isWeightedAvg = congThuc.LoaiCongThuc === 'WEIGHTED_AVG' || congThuc.LoaiCongThuc === 'WEIGHTED_AVG_SCALED' || congThuc.LoaiCongThuc === 'MIN_BIEN';

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await congThucTestCaseApi.getByCongThuc(congThuc.ID_CongThuc)); }
    catch { message.error('Không thể tải test case'); }
    finally { setLoading(false); }
  }, [congThuc.ID_CongThuc]);

  useEffect(() => { load(); }, [load]);

  const bienMauInput = useMemo(() => {
    const obj: Record<string, number> = {};
    for (const b of congThuc.DanhSachBien) obj[b.MaBien] = 0;
    return JSON.stringify(obj, null, 2);
  }, [congThuc.DanhSachBien]);

  const openCreate = () => {
    setEditing(null);
    form.setFieldsValue({ TenTestCase: '', InputJson: bienMauInput, KetQuaMongDoi: undefined, MoTa: '' });
    setModalOpen(true);
  };
  const openEdit = (r: CongThucTestCase) => {
    setEditing(r);
    form.setFieldsValue(r);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const v = await form.validateFields();
      try { JSON.parse(v.InputJson); }
      catch { message.error('Input JSON không hợp lệ'); setSaving(false); return; }

      if (editing) await congThucTestCaseApi.update(editing.ID_TestCase, v);
      else await congThucTestCaseApi.create({ ...v, ID_CongThuc: congThuc.ID_CongThuc } as CreateCongThucTestCaseDto);
      message.success(editing ? 'Đã cập nhật test case' : 'Đã thêm test case');
      setModalOpen(false);
      load();
    } catch (e: unknown) {
      if (e instanceof Error && 'errorFields' in (e as object)) return;
      message.error('Lỗi lưu test case');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    try { await congThucTestCaseApi.delete(id); message.success('Đã xóa test case'); load(); }
    catch { message.error('Lỗi xóa test case'); }
  };

  const handleRunAll = async () => {
    setRunning(true);
    try {
      const ketQua = await congThucTestCaseApi.run(congThuc.ID_CongThuc);
      setData(ketQua);
      const soDat = ketQua.filter(r => r.DatLanCuoi).length;
      if (ketQua.length === 0) message.info('Chưa có test case nào — bấm "Thêm test case" trước.');
      else if (soDat === ketQua.length) message.success(`Đạt toàn bộ ${ketQua.length}/${ketQua.length} test case.`);
      else message.warning(`Chỉ đạt ${soDat}/${ketQua.length} test case — công thức có thể vừa bị sửa lệch kết quả.`);
    } catch { message.error('Lỗi chạy test'); }
    finally { setRunning(false); }
  };

  const cols: ColumnsType<CongThucTestCase> = [
    { title: 'Tên test case', dataIndex: 'TenTestCase', key: 'ten' },
    { title: 'Input', dataIndex: 'InputJson', key: 'input',
      render: v => <Text code style={{ fontSize: 11 }}>{v}</Text> },
    { title: 'Kỳ vọng', dataIndex: 'KetQuaMongDoi', key: 'kyvong', width: 90, align: 'right' },
    { title: 'Thực tế (lần cuối)', dataIndex: 'KetQuaThucTeLanCuoi', key: 'thucte', width: 130, align: 'right',
      render: (v, r) => r.LoiLanCuoi
        ? <Tooltip title={r.LoiLanCuoi}><Text type="danger" style={{ fontSize: 12 }}>Lỗi</Text></Tooltip>
        : v ?? '—' },
    { title: 'Kết quả', key: 'ketqua', width: 100, align: 'center',
      render: (_, r) => r.DatLanCuoi == null
        ? <Tag>Chưa chạy</Tag>
        : r.DatLanCuoi
          ? <Tag color="success" icon={<CheckCircleOutlined />}>Đạt</Tag>
          : <Tag color="error" icon={<CloseCircleOutlined />}>Fail</Tag> },
    { title: '', key: 'actions', width: 76, align: 'center',
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title="Xóa test case này?" okText="Xóa" cancelText="Hủy"
            okButtonProps={{ danger: true }} onConfirm={() => handleDelete(r.ID_TestCase)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ) },
  ];

  return (
    <Card
      style={{ marginTop: 16 }}
      title={<Space><ExperimentOutlined />Test case (Formula Test) · v{congThuc.PhienBan}</Space>}
      extra={
        <Space>
          <Button size="small" icon={<PlusOutlined />} onClick={openCreate}>Thêm test case</Button>
          <Button size="small" type="primary" icon={<PlayCircleOutlined />} loading={running} onClick={handleRunAll}>
            Chạy test
          </Button>
        </Space>
      }
    >
      {isWeightedAvg && (
        <Alert
          type="warning" showIcon style={{ marginBottom: 12 }}
          message="Công thức kiểu &quot;Trung bình trọng số&quot; (WEIGHTED_AVG/WEIGHTED_AVG_SCALED) hoặc &quot;Nhỏ nhất trong các biến&quot; (MIN_BIEN) không evaluate ô Biểu thức NCalc — engine tự tính trực tiếp từ các biến, nên chạy test ở đây sẽ KHÔNG phản ánh đúng kết quả thật."
        />
      )}
      <Table<CongThucTestCase>
        scroll={{ x: 'max-content' }}
        dataSource={data} columns={cols} rowKey="ID_TestCase"
        loading={loading} size="small" pagination={false}
        locale={{ emptyText: `Chưa có test case — dùng để chạy lại (regression) mỗi khi sửa công thức` }}
      />
      <Modal
        title={editing ? 'Sửa test case' : 'Thêm test case'}
        open={modalOpen}
        onOk={handleSubmit} onCancel={() => setModalOpen(false)}
        okText={editing ? 'Cập nhật' : 'Thêm'} cancelText="Hủy"
        confirmLoading={saving} destroyOnHidden width={560}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="TenTestCase" label="Tên test case" rules={[{ required: true }]}>
            <Input placeholder="VD: Sdga = Sc·St·Sr trường hợp Sc=2.1" />
          </Form.Item>
          <Form.Item name="InputJson" label="Input (JSON — tên biến : giá trị giả lập)"
            rules={[{ required: true }]}
            tooltip="Điền đúng tên biến đã khai trong công thức (xem cột 'Biến trong công thức' ở bảng bên trên).">
            <TextArea rows={5} style={{ fontFamily: 'monospace' }} />
          </Form.Item>
          <Form.Item name="KetQuaMongDoi" label="Kết quả mong đợi" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} step={0.01} />
          </Form.Item>
          <Form.Item name="MoTa" label="Mô tả">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
