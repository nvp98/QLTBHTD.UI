import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Row, Col, Typography, Flex, Form, InputNumber, Select, Button,
  Steps, Divider, Tag, Alert, Space, message, Spin, Input,
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { thietBiApi }     from '../../api/thietBi';
import { tramDienApi }    from '../../api/tramDien';
import { nhomChiTieuApi } from '../../api/nhomChiTieu';
import { chiTieuApi }     from '../../api/chiTieu';
import { nguongApi }      from '../../api/nguong';
import { api }            from '../../api/client';
import type { ThietBi, TramDien, NhomChiTieu, ChiTieu, Nguong } from '../../types/entities';
import { useThemeMode } from '../../theme/ThemeModeContext';

const CHON_TAT_CA = 0; // giá trị đặc biệt: kiểm tra toàn diện (ID_NhomChiTieu = null)

const { Title, Text } = Typography;
const { TextArea } = Input;

interface ChiTieuWithNguong extends ChiTieu { nguongs: Nguong[] }
interface NhomWithChiTieu extends NhomChiTieu { chiTieus: ChiTieuWithNguong[] }

export default function TaoPhieuKiemTraPage() {
  const navigate = useNavigate();
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  const [step, setStep]             = useState(0);

  // Equipment selection
  const [trams, setTrams]           = useState<TramDien[]>([]);
  const [thietBis, setThietBis]     = useState<ThietBi[]>([]);
  const [selectedTB, setSelectedTB] = useState<ThietBi | null>(null);
  const [filterTram, setFilterTram] = useState<number | 'all'>('all');

  // CBM config loaded from API
  const [nhoms, setNhoms]           = useState<NhomWithChiTieu[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(false);

  // Nhóm chỉ tiêu được chọn để đo trong phiếu này
  // CHON_TAT_CA (0) = kiểm tra toàn diện tất cả nhóm
  const [selectedNhomId, setSelectedNhomId] = useState<number>(CHON_TAT_CA);

  // Form values: chiTieuId → raw value
  const [values, setValues]         = useState<Record<number, number>>({});
  const [ghiChu, setGhiChu]         = useState('');
  const [nguoiKT, setNguoiKT]       = useState('Nguyễn Văn A');
  const [saving, setSaving]         = useState(false);

  // Load tram + thietbi
  const loadInit = useCallback(async () => {
    try {
      const [ts, tbs] = await Promise.all([tramDienApi.getActive(), thietBiApi.getActive()]);
      setTrams(ts);
      setThietBis(tbs);
    } catch {
      message.error('Không thể tải danh sách thiết bị');
    }
  }, []);

  useEffect(() => { loadInit(); }, [loadInit]);

  // When a ThietBi is selected, load its NhomChiTieu + ChiTieu + Nguong
  const handleSelectTB = useCallback(async (tbId: number) => {
    const tb = thietBis.find(t => t.ID_ThietBi === tbId) ?? null;
    setSelectedTB(tb);
    if (!tb) return;

    setLoadingConfig(true);
    try {
      const nhomList = await nhomChiTieuApi.getByLoai(tb.ID_LoaiTB);
      const nhomWithCT: NhomWithChiTieu[] = await Promise.all(
        nhomList.map(async nhom => {
          const chiTieuList = await chiTieuApi.getByNhom(nhom.ID_NhomChiTieu);
          const chiTieuWithNg = await Promise.all(
            chiTieuList.map(async ct => ({
              ...ct,
              nguongs: await nguongApi.getByChiTieu(ct.ID_ChiTieu),
            }))
          );
          return { ...nhom, chiTieus: chiTieuWithNg };
        })
      );
      setNhoms(nhomWithCT);
      setValues({});
      setSelectedNhomId(CHON_TAT_CA); // reset về toàn diện khi đổi thiết bị
    } catch {
      message.error('Không thể tải cấu hình chỉ tiêu cho thiết bị này');
    } finally {
      setLoadingConfig(false);
    }
  }, [thietBis]);

  const filteredTBs = filterTram === 'all'
    ? thietBis
    : thietBis.filter(t => t.ID_Tram === filterTram);

  const titleColor = isDark ? '#f9fafb' : '#111827';
  const textColor = isDark ? '#9ca3af' : '#4b5563';
  const panelBg = isDark ? '#111827' : '#ffffff';
  const panelBorder = isDark ? '#1f2937' : '#e5e7eb';
  const itemBg = isDark ? '#0d1117' : '#f9fafb';

  const handleSave = async () => {
    if (!selectedTB) return;
    setSaving(true);
    try {
      const chiTiets = Object.entries(values).map(([idStr, val]) => ({
        ID_ChiTieu: Number(idStr),
        GiaTriNhap_So: val,
        GhiChu: '',
      }));
      await api.post('/api/PhieuKiemTra', {
        ID_ThietBi:    selectedTB.ID_ThietBi,
        ID_NhomChiTieu: selectedNhomId === CHON_TAT_CA ? null : selectedNhomId,
        NgayKiemTra:   new Date().toISOString(),
        NguoiKiemTra:  nguoiKT,
        GhiChuChung:   ghiChu,
        ChiTiets:      chiTiets,
      });
      message.success('Lưu phiếu kiểm tra thành công');
      navigate('/ket-qua');
    } catch {
      message.error('Lỗi khi lưu phiếu kiểm tra');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ color: titleColor }}>
      <Flex align="center" gap={12} style={{ marginBottom: 20 }}>
        <Button icon={<ArrowLeftOutlined />} type="text" style={{ color: textColor }}
          onClick={() => navigate('/nhap-lieu')}>Nhập liệu</Button>
        <Text style={{ color: '#4b5563' }}>/</Text>
        <Text style={{ color: titleColor }}>Tạo phiếu kiểm tra mới</Text>
      </Flex>

      <Steps current={step} size="small" style={{ marginBottom: 24 }} items={[
        { title: 'Chọn thiết bị' },
        { title: 'Nhập giá trị chỉ tiêu' },
        { title: 'Xác nhận & Lưu' },
      ]} />

      <Row gutter={[16, 0]}>
        <Col xs={24}>

          {/* ── Step 0: Select equipment ── */}
          {step === 0 && (
            <Card style={{ background: panelBg, border: `1px solid ${panelBorder}` }}
              styles={{ body: { padding: 24 } }}>
              <Title level={5} style={{ color: titleColor, marginTop: 0 }}>Chọn thiết bị cần kiểm tra</Title>
              <Form layout="vertical">
                <Form.Item label={<Text style={{ color: textColor }}>Lọc theo trạm</Text>}>
                  <Select value={filterTram} onChange={setFilterTram} style={{ width: '100%' }}
                    options={[{ label: 'Tất cả trạm', value: 'all' }, ...trams.map(t => ({ label: t.TenTram, value: t.IDTram }))]}
                  />
                </Form.Item>
                <Form.Item label={<Text style={{ color: textColor }}>Thiết bị</Text>} required>
                  <Select
                    value={selectedTB?.ID_ThietBi}
                    onChange={handleSelectTB}
                    style={{ width: '100%' }} size="large"
                    placeholder="Chọn thiết bị..."
                    showSearch optionFilterProp="label"
                    options={filteredTBs.map(t => ({
                      label: `${t.TenThietBi}${t.SoHieu ? ` (${t.SoHieu})` : ''}`,
                      value: t.ID_ThietBi,
                    }))}
                  />
                </Form.Item>
                {selectedTB && (
                  <Flex wrap="wrap" gap={8} style={{ marginBottom: 16 }}>
                    {[['Loại', selectedTB.TenLoaiTB ?? `Loại ${selectedTB.ID_LoaiTB}`],
                      ['Trạm', selectedTB.TenTram ?? `Trạm ${selectedTB.ID_Tram}`],
                      ['Nhãn hiệu', selectedTB.NhanHieu ?? '—'],
                      ['Năm SX', String(selectedTB.NamSanXuat ?? '—')],
                    ].map(([k, v]) => (
                      <Tag key={k} style={{ background: isDark ? '#1f2937' : '#f3f4f6', border: `1px solid ${isDark ? '#374151' : '#d1d5db'}`, color: textColor }}>
                        {k}: <strong style={{ color: titleColor }}>{v}</strong>
                      </Tag>
                    ))}
                  </Flex>
                )}
                {selectedTB && nhoms.length > 0 && (
                  <Form.Item
                    label={<Text style={{ color: textColor }}>Nhóm chỉ tiêu cần đo</Text>}
                    extra={
                      <Text style={{ color: '#4b5563', fontSize: 11 }}>
                        Chọn nhóm theo tần suất đo định kỳ, hoặc "Toàn diện" để đo tất cả
                      </Text>
                    }
                  >
                    <Select
                      value={selectedNhomId}
                      onChange={setSelectedNhomId}
                      style={{ width: '100%' }}
                      options={[
                        { label: '📋 Kiểm tra toàn diện (tất cả nhóm)', value: CHON_TAT_CA },
                        ...nhoms.map(n => ({ label: n.TenNhom, value: n.ID_NhomChiTieu })),
                      ]}
                    />
                  </Form.Item>
                )}
                <Divider style={{ borderColor: panelBorder }} />
                <Form.Item label={<Text style={{ color: textColor }}>Kỹ thuật viên</Text>}>
                  <Input value={nguoiKT} onChange={e => setNguoiKT(e.target.value)} placeholder="Họ tên kỹ thuật viên" />
                </Form.Item>
              </Form>
            </Card>
          )}

          {/* ── Step 1: Input values ── */}
          {step === 1 && (
            <Spin spinning={loadingConfig}>
              {nhoms.length === 0 && !loadingConfig ? (
                <Alert type="warning" message="Không có cấu hình chỉ tiêu cho loại thiết bị này. Vào Cấu hình → Nhóm chỉ tiêu để thiết lập." />
              ) : (
                nhoms
                .filter(n => selectedNhomId === CHON_TAT_CA || n.ID_NhomChiTieu === selectedNhomId)
                .map(nhom => (
                  <Card key={nhom.ID_NhomChiTieu}
                    title={
                      <Flex align="center" gap={8}>
                        <div style={{ width: 4, height: 16, borderRadius: 2, background: '#3b82f6', flexShrink: 0 }} />
                        <Text strong style={{ color: titleColor }}>{nhom.TenNhom}</Text>
                        <Tag style={{ fontSize: 10 }}>Phiên bản v{nhom.PhienBan}</Tag>
                      </Flex>
                    }
                    style={{ background: panelBg, border: `1px solid ${panelBorder}`, marginBottom: 16 }}
                    styles={{ header: { borderBottom: `1px solid ${panelBorder}` }, body: { padding: 20 } }}>
                    <Row gutter={[16, 12]}>
                      {nhom.chiTieus.map(ct => {
                        const val = values[ct.ID_ChiTieu];
                        return (
                          <Col xs={24} sm={12} key={ct.ID_ChiTieu}>
                            <div style={{
                              padding: '12px 14px', background: itemBg, borderRadius: 8,
                              border: `1px solid ${panelBorder}`,
                            }}>
                              <Text style={{ color: titleColor, fontSize: 13, display: 'block', marginBottom: 8 }}>
                                {ct.TenChiTieu}
                              </Text>
                              <InputNumber
                                style={{ width: '100%', background: panelBg, borderColor: isDark ? '#374151' : '#d1d5db' }}
                                value={val}
                                onChange={v => setValues(prev => v !== null && v !== undefined
                                  ? { ...prev, [ct.ID_ChiTieu]: v }
                                  : Object.fromEntries(Object.entries(prev).filter(([k]) => k !== String(ct.ID_ChiTieu)))
                                )}
                                step={0.01} placeholder="Nhập giá trị..."
                              />
                            </div>
                          </Col>
                        );
                      })}
                    </Row>
                  </Card>
                ))
              )}
            </Spin>
          )}

          {/* ── Step 2: Review & Save ── */}
          {step === 2 && (
            <Card style={{ background: panelBg, border: `1px solid ${panelBorder}` }}
              styles={{ body: { padding: 24 } }}>
              <Title level={5} style={{ color: titleColor, marginTop: 0 }}>Xác nhận và lưu phiếu kiểm tra</Title>
              {selectedTB && (
                <Alert
                  message={`Thiết bị: ${selectedTB.TenThietBi}${selectedTB.SoHieu ? ` (${selectedTB.SoHieu})` : ''}`}
                  type="info" style={{ marginBottom: 16 }} />
              )}
              <Form layout="vertical">
                <Form.Item label={<Text style={{ color: textColor }}>Ghi chú chung</Text>}>
                  <TextArea rows={3} value={ghiChu} onChange={e => setGhiChu(e.target.value)}
                    placeholder="Nhận xét, ghi chú về đợt kiểm tra..." />
                </Form.Item>
              </Form>
            </Card>
          )}

          {/* ── Navigation buttons ── */}
          <Flex justify="space-between" style={{ marginTop: 16 }}>
            <Button disabled={step === 0} onClick={() => setStep(s => s - 1)}>← Bước trước</Button>
            <Space>
              {step < 2 && (
                <Button type="primary"
                  disabled={step === 0 && !selectedTB}
                  onClick={() => setStep(s => s + 1)}>
                  Bước tiếp →
                </Button>
              )}
              {step === 2 && (
                <Button type="primary" icon={<SaveOutlined />}
                  loading={saving} onClick={handleSave}>
                  Lưu phiếu kiểm tra
                </Button>
              )}
            </Space>
          </Flex>
        </Col>
      </Row>
    </div>
  );
}
