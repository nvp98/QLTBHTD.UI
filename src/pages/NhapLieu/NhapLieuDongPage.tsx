import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, Col, Collapse, Form, InputNumber, Row, Select,
  Space, Spin, Tag, Tree, Typography, message,
} from 'antd';
import { SaveOutlined, CalculatorOutlined } from '@ant-design/icons';
import { phieuKiemTraApi } from '../../api/phieuKiemTra';
import { chiTieuApi } from '../../api/chiTieu';
import { chiTieuInputApi } from '../../api/chiTieuInput';
import { nhomChiTieuApi } from '../../api/nhomChiTieu';
import { tinhDiemApi } from '../../api/tinhDiem';
import type {
  PhieuKiemTra, ChiTieu, ChiTieuInput, NhomChiTieuCay,
  NhapChiTietDto, KetQuaNhom,
} from '../../types/entities';

const { Title, Text } = Typography;
const { Panel } = Collapse;

interface NhomChiTieuData {
  nhom: NhomChiTieuCay;
  chiTieus: ChiTieu[];
  inputs: Record<number, ChiTieuInput[]>; // ID_ChiTieu -> inputs
}

export default function NhapLieuDongPage() {
  const [phieus, setPhieus]         = useState<PhieuKiemTra[]>([]);
  const [selectedPhieu, setSelectedPhieu] = useState<PhieuKiemTra | null>(null);
  const [nhomData, setNhomData]     = useState<NhomChiTieuData[]>([]);
  const [loading, setLoading]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [ketQua, setKetQua]         = useState<KetQuaNhom | null>(null);
  const [form]                      = Form.useForm();

  useEffect(() => {
    phieuKiemTraApi.getAll().then(setPhieus).catch(() => {});
  }, []);

  const loadNhomData = useCallback(async (phieu: PhieuKiemTra) => {
    setLoading(true);
    setKetQua(null);
    form.resetFields();
    try {
      // Lấy cây nhóm chỉ tiêu cho loại thiết bị của phiếu
      // (cần ID_LoaiThietBi — lấy từ ThietBi, đơn giản hóa: giả sử có trong phiếu)
      const allNhoms = await nhomChiTieuApi.getActive();
      // Lọc leaf nodes
      const leafNhoms = allNhoms.filter((n: any) =>
        n.LoaiNhom === 'LEAF' || n.loaiNhom === 'LEAF'
      );

      const data: NhomChiTieuData[] = [];
      for (const nhom of leafNhoms.slice(0, 10)) { // giới hạn 10 nhóm để demo
        const cts = await chiTieuApi.getByNhom(nhom.ID_NhomChiTieu);
        const inputs: Record<number, ChiTieuInput[]> = {};
        for (const ct of cts) {
          const inps = await chiTieuInputApi.getByChiTieu(ct.ID_ChiTieu);
          inputs[ct.ID_ChiTieu] = inps;
        }
        data.push({ nhom: nhom as unknown as NhomChiTieuCay, chiTieus: cts, inputs });
      }
      setNhomData(data);
    } catch {
      message.error('Lỗi tải dữ liệu nhóm chỉ tiêu');
    } finally {
      setLoading(false);
    }
  }, [form]);

  const handleSelectPhieu = (id: number) => {
    const p = phieus.find(x => x.ID_Phieu === id) ?? null;
    setSelectedPhieu(p);
    if (p) loadNhomData(p);
  };

  const handleSave = async () => {
    if (!selectedPhieu) return;
    setSaving(true);
    try {
      const values = form.getFieldsValue(true);
      const danhSachChiTieu: NhapChiTietDto[] = [];

      for (const nd of nhomData) {
        for (const ct of nd.chiTieus) {
          const inps = nd.inputs[ct.ID_ChiTieu] ?? [];
          if (inps.length === 0) {
            const val = values[`ct_${ct.ID_ChiTieu}`];
            if (val !== undefined && val !== null) {
              danhSachChiTieu.push({ ID_ChiTieu: ct.ID_ChiTieu, GiaTriNhap_So: val });
            }
          } else {
            const inputVals: Record<string, number> = {};
            let hasAll = true;
            for (const inp of inps) {
              const v = values[`inp_${ct.ID_ChiTieu}_${inp.MaInput}`];
              if (v === undefined || v === null) { hasAll = false; break; }
              inputVals[inp.MaInput] = v;
            }
            if (hasAll) {
              danhSachChiTieu.push({ ID_ChiTieu: ct.ID_ChiTieu, DanhSachInput: inputVals });
            }
          }
        }
      }

      const res = await tinhDiemApi.nhapLieu(selectedPhieu.ID_Phieu, {
        DanhSachChiTieu: danhSachChiTieu,
        TuDongTinhDiem: false,
      });

      message.success(`Đã lưu ${res.KetQuaNhap.length} chỉ tiêu. Điểm Si đã được tính.`);
    } catch (e: any) {
      message.error(e?.response?.data?.Error ?? 'Lỗi khi lưu dữ liệu');
    } finally {
      setSaving(false);
    }
  };

  const handleTinhDiem = async (idNhom: number) => {
    if (!selectedPhieu) return;
    try {
      const res = await tinhDiemApi.tinhDiemNhom(selectedPhieu.ID_Phieu, idNhom);
      setKetQua({
        ID_NhomChiTieu: res.ID_NhomChiTieu,
        TenNhom: '',
        LoaiNhom: 'COMPOSITE',
        CapDo: 0,
        Diem: res.Diem,
        ThoiGianTinh: new Date().toISOString(),
        NhomCon: [],
      });
      message.success(`Điểm nhóm ${idNhom}: ${res.Diem.toFixed(4)}`);
    } catch (e: any) {
      message.error(e?.response?.data?.Error ?? 'Lỗi tính điểm');
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>Nhập liệu kiểm tra (Form động)</Title>

      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Text strong>Phiếu kiểm tra:</Text>
          <Select
            style={{ width: 340 }}
            placeholder="Chọn phiếu kiểm tra"
            onChange={handleSelectPhieu}
            options={phieus.map(p => ({
              value: p.ID_Phieu,
              label: `Phiếu #${p.ID_Phieu} — ${p.TenThietBi ?? p.ID_ThietBi} (${p.NgayKiemTra})`,
            }))}
          />
        </Space>
      </Card>

      {loading && <Spin size="large" style={{ display: 'block', margin: '40px auto' }} />}

      {!loading && selectedPhieu && (
        <Form form={form} layout="vertical">
          <Collapse>
            {nhomData.map(nd => (
              <Panel
                key={nd.nhom.ID_NhomChiTieu}
                header={
                  <Space>
                    <Text strong>{nd.nhom.TenNhom}</Text>
                    <Tag color="green">LEAF</Tag>
                    <Tag>{nd.chiTieus.length} chỉ tiêu</Tag>
                  </Space>
                }
                extra={
                  <Button
                    size="small"
                    icon={<CalculatorOutlined />}
                    onClick={e => { e.stopPropagation(); handleTinhDiem(nd.nhom.ID_NhomChiTieu); }}
                  >
                    Tính điểm nhóm
                  </Button>
                }
              >
                <Row gutter={[16, 8]}>
                  {nd.chiTieus.map(ct => {
                    const inps = nd.inputs[ct.ID_ChiTieu] ?? [];
                    return (
                      <Col key={ct.ID_ChiTieu} span={inps.length > 1 ? 24 : 12}>
                        <Card
                          size="small"
                          title={<Text>{ct.TenChiTieu}</Text>}
                          style={{ marginBottom: 8 }}
                        >
                          {inps.length === 0 ? (
                            <Form.Item
                              name={`ct_${ct.ID_ChiTieu}`}
                              label="Giá trị đo"
                              style={{ marginBottom: 0 }}
                            >
                              <InputNumber style={{ width: '100%' }} />
                            </Form.Item>
                          ) : (
                            <Row gutter={8}>
                              {inps.map(inp => (
                                <Col key={inp.MaInput} span={24 / Math.min(inps.length, 3)}>
                                  <Form.Item
                                    name={`inp_${ct.ID_ChiTieu}_${inp.MaInput}`}
                                    label={inp.TenInput}
                                    style={{ marginBottom: 0 }}
                                  >
                                    <InputNumber style={{ width: '100%' }} />
                                  </Form.Item>
                                </Col>
                              ))}
                            </Row>
                          )}
                        </Card>
                      </Col>
                    );
                  })}
                </Row>
              </Panel>
            ))}
          </Collapse>

          {ketQua && (
            <Card style={{ marginTop: 16 }} title="Kết quả điểm nhóm">
              <Text strong>Nhóm {ketQua.ID_NhomChiTieu}: </Text>
              <Tag color="blue" style={{ fontSize: 16 }}>{ketQua.Diem.toFixed(4)}</Tag>
            </Card>
          )}

          <Card style={{ marginTop: 16 }}>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={handleSave}
              size="large"
            >
              Lưu số liệu & Tính Si
            </Button>
          </Card>
        </Form>
      )}
    </div>
  );
}
