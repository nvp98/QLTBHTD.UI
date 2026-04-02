import { useCallback, useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Row, Col, Typography, Flex, Form, InputNumber, Select, Button,
  Steps, Divider, Tag, Alert, Progress, Space, message, Spin, Input,
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined, CalculatorOutlined } from '@ant-design/icons';
import { thietBiApi }     from '../../api/thietBi';
import { tramDienApi }    from '../../api/tramDien';
import { nhomChiTieuApi } from '../../api/nhomChiTieu';
import { chiTieuApi }     from '../../api/chiTieu';
import { nguongApi }      from '../../api/nguong';
import { api }            from '../../api/client';
import type { ThietBi, TramDien, NhomChiTieu, ChiTieu, Nguong } from '../../types/entities';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface ChiTieuWithNguong extends ChiTieu { nguongs: Nguong[] }
interface NhomWithChiTieu extends NhomChiTieu { chiTieus: ChiTieuWithNguong[] }

// Score a value against nguong list, return matched diem_si
function scoreValue(value: number, nguongs: Nguong[]): number | null {
  for (const ng of nguongs) {
    if (value >= ng.CanDuoi && value <= ng.CanTren) return ng.Diem_Si;
  }
  return null;
}

// Color for a score 0-10
function scoreColor(s: number): string {
  if (s >= 8) return '#4ade80';
  if (s >= 6) return '#60a5fa';
  if (s >= 4) return '#fbbf24';
  return '#f87171';
}

function rankFromHI(hi: number): { rank: string; color: string; label: string } {
  if (hi >= 85) return { rank: 'A', color: '#4ade80', label: 'Rất tốt' };
  if (hi >= 70) return { rank: 'B', color: '#60a5fa', label: 'Tốt' };
  if (hi >= 55) return { rank: 'C', color: '#fbbf24', label: 'Trung bình' };
  if (hi >= 40) return { rank: 'D', color: '#f97316', label: 'Kém' };
  return { rank: 'E', color: '#f87171', label: 'Rất kém' };
}

export default function TaoPhieuKiemTraPage() {
  const navigate = useNavigate();
  const [step, setStep]             = useState(0);

  // Equipment selection
  const [trams, setTrams]           = useState<TramDien[]>([]);
  const [thietBis, setThietBis]     = useState<ThietBi[]>([]);
  const [selectedTB, setSelectedTB] = useState<ThietBi | null>(null);
  const [filterTram, setFilterTram] = useState<number | 'all'>('all');

  // CBM config loaded from API
  const [nhoms, setNhoms]           = useState<NhomWithChiTieu[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(false);

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
    } catch {
      message.error('Không thể tải cấu hình chỉ tiêu cho thiết bị này');
    } finally {
      setLoadingConfig(false);
    }
  }, [thietBis]);

  const filteredTBs = filterTram === 'all'
    ? thietBis
    : thietBis.filter(t => t.ID_Tram === filterTram);

  // Calculate scores
  const { groupResults, healthIndex } = useMemo(() => {
    if (!nhoms.length) return { groupResults: [], healthIndex: null };

    let totalWeightedScore = 0;
    let totalWeight = 0;

    const groupResults = nhoms.map(nhom => {
      let nhomWeightedSum = 0;
      let nhomWeightSum = 0;
      const paramResults = nhom.chiTieus.map(ct => {
        const val = values[ct.ID_ChiTieu];
        const score = val !== undefined ? scoreValue(val, ct.nguongs) : null;
        if (score !== null && score !== undefined) {
          nhomWeightedSum += Number(ct.TrongSo_Wi) * score;
          nhomWeightSum += Number(ct.TrongSo_Wi);
        }
        return { ct, val, score };
      });
      const nhomScore = nhomWeightSum > 0 ? nhomWeightedSum / nhomWeightSum : null;
      // Assume equal weights for nhoms unless configured - use TrongSo_Wi if available
      const nhomWeight = 1 / nhoms.length; // fallback
      if (nhomScore !== null) {
        totalWeightedScore += nhomScore * nhomWeight;
        totalWeight += nhomWeight;
      }
      return { nhom, paramResults, nhomScore };
    });

    const healthIndex = totalWeight > 0
      ? Math.round((totalWeightedScore / totalWeight) * 100 * 10) / 10
      : null;

    return { groupResults, healthIndex };
  }, [nhoms, values]);

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
        ID_ThietBi: selectedTB.ID_ThietBi,
        NgayKiemTra: new Date().toISOString(),
        NguoiKiemTra: nguoiKT,
        GhiChuChung: ghiChu,
        ChiTiets: chiTiets,
      });
      message.success('Lưu phiếu kiểm tra thành công');
      navigate('/ket-qua');
    } catch {
      message.error('Lỗi khi lưu phiếu kiểm tra');
    } finally {
      setSaving(false);
    }
  };

  const rankInfo = healthIndex !== null ? rankFromHI(healthIndex) : null;

  return (
    <div style={{ color: '#f9fafb' }}>
      <Flex align="center" gap={12} style={{ marginBottom: 20 }}>
        <Button icon={<ArrowLeftOutlined />} type="text" style={{ color: '#9ca3af' }}
          onClick={() => navigate('/nhap-lieu')}>Nhập liệu</Button>
        <Text style={{ color: '#4b5563' }}>/</Text>
        <Text style={{ color: '#f9fafb' }}>Tạo phiếu kiểm tra mới</Text>
      </Flex>

      <Steps current={step} size="small" style={{ marginBottom: 24 }} items={[
        { title: 'Chọn thiết bị' },
        { title: 'Nhập giá trị chỉ tiêu' },
        { title: 'Xem kết quả & Lưu' },
      ]} />

      <Row gutter={[16, 0]}>
        <Col xs={24} lg={16}>

          {/* ── Step 0: Select equipment ── */}
          {step === 0 && (
            <Card style={{ background: '#111827', border: '1px solid #1f2937' }}
              styles={{ body: { padding: 24 } }}>
              <Title level={5} style={{ color: '#f9fafb', marginTop: 0 }}>Chọn thiết bị cần kiểm tra</Title>
              <Form layout="vertical">
                <Form.Item label={<Text style={{ color: '#9ca3af' }}>Lọc theo trạm</Text>}>
                  <Select value={filterTram} onChange={setFilterTram} style={{ width: '100%' }}
                    options={[{ label: 'Tất cả trạm', value: 'all' }, ...trams.map(t => ({ label: t.TenTram, value: t.IDTram }))]}
                  />
                </Form.Item>
                <Form.Item label={<Text style={{ color: '#9ca3af' }}>Thiết bị</Text>} required>
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
                  <Flex wrap="wrap" gap={8}>
                    {[['Loại', selectedTB.TenLoaiTB ?? `Loại ${selectedTB.ID_LoaiTB}`],
                      ['Trạm', selectedTB.TenTram ?? `Trạm ${selectedTB.ID_Tram}`],
                      ['Nhãn hiệu', selectedTB.NhanHieu ?? '—'],
                      ['Năm SX', String(selectedTB.NamSanXuat ?? '—')],
                    ].map(([k, v]) => (
                      <Tag key={k} style={{ background: '#1f2937', border: '1px solid #374151', color: '#9ca3af' }}>
                        {k}: <strong style={{ color: '#e5e7eb' }}>{v}</strong>
                      </Tag>
                    ))}
                  </Flex>
                )}
                <Divider style={{ borderColor: '#1f2937' }} />
                <Form.Item label={<Text style={{ color: '#9ca3af' }}>Kỹ thuật viên</Text>}>
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
                nhoms.map(nhom => (
                  <Card key={nhom.ID_NhomChiTieu}
                    title={
                      <Flex align="center" gap={8}>
                        <div style={{ width: 4, height: 16, borderRadius: 2, background: '#3b82f6', flexShrink: 0 }} />
                        <Text strong style={{ color: '#f9fafb' }}>{nhom.TenNhom}</Text>
                        <Tag style={{ fontSize: 10 }}>Phiên bản v{nhom.PhienBan}</Tag>
                      </Flex>
                    }
                    style={{ background: '#111827', border: '1px solid #1f2937', marginBottom: 16 }}
                    styles={{ header: { borderBottom: '1px solid #1f2937' }, body: { padding: 20 } }}>
                    <Row gutter={[16, 12]}>
                      {nhom.chiTieus.map(ct => {
                        const val = values[ct.ID_ChiTieu];
                        const score = val !== undefined ? scoreValue(val, ct.nguongs) : null;
                        return (
                          <Col xs={24} sm={12} key={ct.ID_ChiTieu}>
                            <div style={{
                              padding: '12px 14px', background: '#0d1117', borderRadius: 8,
                              border: `1px solid ${score !== null ? scoreColor(score) + '44' : '#1f2937'}`,
                            }}>
                              <Flex justify="space-between" style={{ marginBottom: 8 }}>
                                <Text style={{ color: '#e5e7eb', fontSize: 13 }}>{ct.TenChiTieu}</Text>
                                <Text style={{ color: '#6b7280', fontSize: 10 }}>W={Number(ct.TrongSo_Wi).toFixed(3)}</Text>
                              </Flex>
                              <InputNumber
                                style={{ width: '100%', background: '#111827', borderColor: '#374151' }}
                                value={val}
                                onChange={v => setValues(prev => v !== null && v !== undefined
                                  ? { ...prev, [ct.ID_ChiTieu]: v }
                                  : Object.fromEntries(Object.entries(prev).filter(([k]) => k !== String(ct.ID_ChiTieu)))
                                )}
                                step={0.01} placeholder="Nhập giá trị..."
                              />
                              {score !== null && (
                                <Flex align="center" gap={8} style={{ marginTop: 8 }}>
                                  <Progress percent={score * 10} size="small" showInfo={false}
                                    strokeColor={scoreColor(score)} trailColor="#1f2937" style={{ flex: 1 }} />
                                  <Text style={{ color: scoreColor(score), fontFamily: 'monospace', fontSize: 12 }}>
                                    {score}/10
                                  </Text>
                                </Flex>
                              )}
                              {val !== undefined && score === null && (
                                <Text style={{ color: '#f87171', fontSize: 11, display: 'block', marginTop: 4 }}>
                                  Không có ngưỡng phù hợp
                                </Text>
                              )}
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
            <Card style={{ background: '#111827', border: '1px solid #1f2937' }}
              styles={{ body: { padding: 24 } }}>
              <Title level={5} style={{ color: '#f9fafb', marginTop: 0 }}>Xác nhận và lưu phiếu kiểm tra</Title>
              {selectedTB && (
                <Alert
                  message={`Thiết bị: ${selectedTB.TenThietBi}${selectedTB.SoHieu ? ` (${selectedTB.SoHieu})` : ''}`}
                  type="info" style={{ marginBottom: 16 }} />
              )}
              {healthIndex !== null && rankInfo && (
                <div style={{
                  padding: 16, borderRadius: 8, marginBottom: 16,
                  background: `${rankInfo.color}11`, border: `1px solid ${rankInfo.color}44`,
                }}>
                  <Flex align="center" gap={16}>
                    <div style={{ textAlign: 'center' }}>
                      <Text style={{ color: rankInfo.color, fontSize: 32, fontWeight: 700, fontFamily: 'monospace', display: 'block' }}>
                        {healthIndex.toFixed(1)}
                      </Text>
                      <Text style={{ color: '#6b7280', fontSize: 12 }}>CSSK</Text>
                    </div>
                    <div>
                      <Tag style={{ background: `${rankInfo.color}22`, border: `1px solid ${rankInfo.color}44`, color: rankInfo.color, fontSize: 14, padding: '2px 12px' }}>
                        Hạng {rankInfo.rank} — {rankInfo.label}
                      </Tag>
                    </div>
                  </Flex>
                </div>
              )}
              <Form layout="vertical">
                <Form.Item label={<Text style={{ color: '#9ca3af' }}>Ghi chú chung</Text>}>
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

        {/* ── Score preview panel ── */}
        <Col xs={24} lg={8}>
          <Card title={<Flex align="center" gap={8}><CalculatorOutlined style={{ color: '#8b5cf6' }} /><span>Kết quả tính toán</span></Flex>}
            style={{ background: '#0d1117', border: '1px solid #1f2937', position: 'sticky', top: 20 }}
            styles={{ header: { color: '#f9fafb', borderBottom: '1px solid #1f2937', fontSize: 13 }, body: { padding: 20 } }}>

            {healthIndex !== null && rankInfo ? (
              <>
                <Flex justify="center" align="center" style={{ marginBottom: 16 }}>
                  <div style={{ textAlign: 'center' }}>
                    <Text style={{ color: rankInfo.color, fontSize: 48, fontWeight: 700, fontFamily: 'monospace', lineHeight: 1 }}>
                      {healthIndex.toFixed(1)}
                    </Text>
                    <Text style={{ color: '#6b7280', display: 'block', fontSize: 13 }}>/ 100 — CSSK</Text>
                    <Tag style={{ marginTop: 8, background: `${rankInfo.color}22`, border: `1px solid ${rankInfo.color}44`, color: rankInfo.color, fontSize: 13, padding: '2px 12px' }}>
                      Hạng {rankInfo.rank} · {rankInfo.label}
                    </Tag>
                  </div>
                </Flex>
                <Divider style={{ borderColor: '#1f2937', margin: '12px 0' }} />
              </>
            ) : (
              <Flex vertical align="center" gap={8} style={{ padding: '20px 0' }}>
                <CalculatorOutlined style={{ fontSize: 32, color: '#374151' }} />
                <Text style={{ color: '#4b5563', fontSize: 12, textAlign: 'center' }}>
                  Chọn thiết bị và nhập giá trị để xem kết quả tính toán
                </Text>
              </Flex>
            )}

            {groupResults.map(({ nhom, nhomScore }) => (
              <Flex key={nhom.ID_NhomChiTieu} align="center" gap={8} style={{ marginBottom: 10 }}>
                <div style={{ width: 3, height: 16, borderRadius: 2, background: '#3b82f6', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <Flex justify="space-between" style={{ marginBottom: 3 }}>
                    <Text style={{ color: '#9ca3af', fontSize: 11 }} ellipsis>{nhom.TenNhom}</Text>
                    <Text style={{ color: nhomScore !== null ? scoreColor(nhomScore) : '#4b5563', fontFamily: 'monospace', fontSize: 11 }}>
                      {nhomScore !== null ? (nhomScore * 10).toFixed(0) : '—'}/100
                    </Text>
                  </Flex>
                  <Progress percent={nhomScore !== null ? nhomScore * 10 : 0} size="small" showInfo={false}
                    strokeColor="#3b82f6" trailColor="#1f2937" />
                </div>
              </Flex>
            ))}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
