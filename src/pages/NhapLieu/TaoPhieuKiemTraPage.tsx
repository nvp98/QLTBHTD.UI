import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Row, Col, Typography, Flex, Form, InputNumber, Select, Button,
  Steps, Divider, Tag, Alert, Space, message, Spin, Input, Collapse,
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { thietBiApi }      from '../../api/thietBi';
import { tramDienApi }     from '../../api/tramDien';
import { nhomChiTieuApi }  from '../../api/nhomChiTieu';
import { chiTieuApi }      from '../../api/chiTieu';
import { nguongApi }       from '../../api/nguong';
import { chiTieuInputApi } from '../../api/chiTieuInput';
import { chiTieuRuleApi }  from '../../api/chiTieuRule';
import { api }             from '../../api/client';
import type {
  ThietBi, TramDien, NhomChiTieu, ChiTieu, Nguong, ChiTieuInput, ChiTieuRule,
} from '../../types/entities';
import { useThemeMode } from '../../theme/ThemeModeContext';

const CHON_TAT_CA = 0;

const { Title, Text } = Typography;
const { TextArea } = Input;

interface ChiTieuWithNguong extends ChiTieu { nguongs: Nguong[] }
interface NhomWithChiTieu extends NhomChiTieu { chiTieus: ChiTieuWithNguong[] }

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Tính điểm dự kiến phía client cho loại Nguong (bỏ qua BieuThuc_Logic phức tạp). */
function calcNguongScore(val: number, nguongs: Nguong[]): number | null {
  const sorted = [...nguongs].sort((a, b) => b.Diem_Si - a.Diem_Si);
  for (const ng of sorted) {
    if (ng.BieuThuc_Logic) continue; // biểu thức logic — server mới tính được
    const duoi = ng.CanDuoi === null
      || (ng.CanDuoi_BaoGom ? val >= ng.CanDuoi : val > ng.CanDuoi);
    const tren = ng.CanTren === null
      || (ng.CanTren_BaoGom ? val <= ng.CanTren : val < ng.CanTren);
    if (duoi && tren) return ng.Diem_Si;
  }
  return null;
}

/** Định dạng khoảng giá trị của ngưỡng thành chuỗi dễ đọc. */
function formatNguongRange(ng: Nguong): string {
  if (ng.BieuThuc_Logic) return ng.BieuThuc_Logic;
  const lo = ng.CanDuoi !== null
    ? `${ng.CanDuoi_BaoGom ? '≥' : '>'} ${ng.CanDuoi}`
    : null;
  const hi = ng.CanTren !== null
    ? `${ng.CanTren_BaoGom ? '≤' : '<'} ${ng.CanTren}`
    : null;
  if (lo && hi) return `${lo}  và  ${hi}`;
  return lo ?? hi ?? 'Bất kỳ giá trị';
}

/**
 * Trích xuất tên biến từ biểu thức NCalc.
 * Loại bỏ hàm dựng sẵn và từ khóa để chỉ giữ lại tên biến thực sự.
 * Ví dụ: "Imotor <= 1.1 * Ir || Is <= 3 * Ir" → ["Imotor", "Ir", "Is"]
 */
const NCALC_BUILTINS = new Set([
  'true', 'false', 'null', 'if', 'in', 'not', 'and', 'or', 'xor',
  'Abs', 'Ceiling', 'Floor', 'Round', 'Sign', 'Truncate',
  'Max', 'Min', 'Pow', 'Log', 'Exp', 'Sin', 'Cos', 'Tan',
  'Asin', 'Acos', 'Atan', 'Sqrt', 'IEEERemainder',
]);

function extractNCalcVars(expr: string): string[] {
  const matches = expr.match(/\b[A-Za-z_]\w*\b/g) ?? [];
  return [...new Set(matches)].filter(v => !NCALC_BUILTINS.has(v));
}

function scoreTagColor(score: number): 'success' | 'processing' | 'warning' | 'error' {
  if (score >= 8) return 'success';
  if (score >= 6) return 'processing';
  if (score >= 4) return 'warning';
  return 'error';
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function TaoPhieuKiemTraPage() {
  const navigate = useNavigate();
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  const [step, setStep] = useState(0);

  const [trams, setTrams]           = useState<TramDien[]>([]);
  const [thietBis, setThietBis]     = useState<ThietBi[]>([]);
  const [selectedTB, setSelectedTB] = useState<ThietBi | null>(null);
  const [filterTram, setFilterTram] = useState<number | 'all'>('all');

  const [nhoms, setNhoms]                   = useState<NhomWithChiTieu[]>([]);
  const [loadingConfig, setLoadingConfig]   = useState(false);
  const [selectedNhomId, setSelectedNhomId] = useState<number>(CHON_TAT_CA);

  // Single-value inputs (Nguong): chiTieuId → value
  const [values, setValues] = useState<Record<number, number>>({});

  // Multi-variable inputs (Rule): chiTieuId → { maInput → value }
  const [ruleValues, setRuleValues] = useState<Record<number, Record<string, number>>>({});

  // Metadata: input definitions & rules per criterion
  const [chiTieuInputs, setChiTieuInputs] = useState<Record<number, ChiTieuInput[]>>({});
  const [chiTieuRules,  setChiTieuRules]  = useState<Record<number, ChiTieuRule[]>>({});
  // Tập ID chỉ tiêu có biến được tự trích từ BieuThuc_Logic (không có DB ChiTieuInput)
  const [syntheticCtIds, setSyntheticCtIds] = useState<Set<number>>(new Set());

  const [ghiChu, setGhiChu]   = useState('');
  const [nguoiKT, setNguoiKT] = useState('Nguyễn Văn A');
  const [saving, setSaving]   = useState(false);

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

      // Load định nghĩa biến đầu vào VÀ quy tắc biểu thức song song cho tất cả chỉ tiêu
      const allCT = nhomWithCT.flatMap(n => n.chiTieus);
      const [inputEntries, ruleEntries] = await Promise.all([
        Promise.all(
          allCT.map(ct =>
            chiTieuInputApi.getByChiTieu(ct.ID_ChiTieu)
              .then(inputs => [ct.ID_ChiTieu, inputs] as const)
          )
        ),
        Promise.all(
          allCT.map(ct =>
            chiTieuRuleApi.getByChiTieu(ct.ID_ChiTieu)
              .then(rules => [ct.ID_ChiTieu, rules] as const)
          )
        ),
      ]);

      const inputsMap: Record<number, ChiTieuInput[]> = {};
      for (const [ctId, inputs] of inputEntries) {
        if (inputs.length > 0) inputsMap[ctId] = inputs;
      }

      // Tự trích biến từ BieuThuc_Logic cho chỉ tiêu Nguong chưa có ChiTieuInput trong DB
      const syntheticIds = new Set<number>();
      for (const ct of allCT) {
        if (inputsMap[ct.ID_ChiTieu]) continue; // đã có DB entries — bỏ qua
        const vars = new Set<string>();
        for (const ng of ct.nguongs) {
          if (ng.BieuThuc_Logic) {
            for (const v of extractNCalcVars(ng.BieuThuc_Logic)) vars.add(v);
          }
        }
        if (vars.size > 0) {
          syntheticIds.add(ct.ID_ChiTieu);
          inputsMap[ct.ID_ChiTieu] = [...vars].map((v, i) => ({
            ID_Input:   -(ct.ID_ChiTieu * 1000 + i), // âm = synthetic, không có trong DB
            ID_ChiTieu: ct.ID_ChiTieu,
            MaInput:    v,
            TenInput:   v,
          }));
        }
      }
      setSyntheticCtIds(syntheticIds);
      setChiTieuInputs(inputsMap);

      const rulesMap: Record<number, ChiTieuRule[]> = {};
      for (const [ctId, rules] of ruleEntries) {
        if (rules.length > 0) rulesMap[ctId] = rules;
      }
      setChiTieuRules(rulesMap);

      setValues({});
      setRuleValues({});
      setSyntheticCtIds(new Set());
      setSelectedNhomId(CHON_TAT_CA);
    } catch {
      message.error('Không thể tải cấu hình chỉ tiêu cho thiết bị này');
    } finally {
      setLoadingConfig(false);
    }
  }, [thietBis]);

  const filteredTBs = filterTram === 'all'
    ? thietBis
    : thietBis.filter(t => t.ID_Tram === filterTram);

  const titleColor  = isDark ? '#f9fafb' : '#111827';
  const textColor   = isDark ? '#9ca3af' : '#4b5563';
  const panelBg     = isDark ? '#111827' : '#ffffff';
  const panelBorder = isDark ? '#1f2937' : '#e5e7eb';
  const itemBg      = isDark ? '#0d1117' : '#f9fafb';

  const handleSave = async () => {
    if (!selectedTB) return;
    setSaving(true);
    try {
      const chiTiets = [
        ...Object.entries(values).map(([idStr, val]) => ({
          ID_ChiTieu: Number(idStr),
          GiaTriNhap_So: val,
          GhiChu: '',
        })),
        ...Object.entries(ruleValues)
          .filter(([, varMap]) => Object.keys(varMap).length > 0)
          .map(([idStr]) => ({
            ID_ChiTieu: Number(idStr),
            GhiChu: '',
          })),
      ];

      // Chỉ tiêu Rule thực (có DB ChiTieuInput, ID_Input > 0) → gửi qua ChiTietInputs
      const chiTietInputsPayload = Object.entries(ruleValues)
        .filter(([ctIdStr]) => !syntheticCtIds.has(Number(ctIdStr)))
        .flatMap(([ctIdStr, varMap]) => {
          const ctId = Number(ctIdStr);
          const inputs = chiTieuInputs[ctId] ?? [];
          return Object.entries(varMap)
            .map(([maInput, giaTriSo]) => {
              const inp = inputs.find(i => i.MaInput === maInput);
              return inp ? { ID_Input: inp.ID_Input, GiaTriSo: giaTriSo } : null;
            })
            .filter((x): x is { ID_Input: number; GiaTriSo: number } => x !== null);
        });

      // Chỉ tiêu Nguong BieuThuc_Logic (biến tự trích, không có DB) → gửi qua ChiTietInputsNamed
      const chiTietInputsNamed = Object.entries(ruleValues)
        .filter(([ctIdStr]) => syntheticCtIds.has(Number(ctIdStr)))
        .flatMap(([ctIdStr, varMap]) =>
          Object.entries(varMap).map(([maInput, giaTriSo]) => ({
            ID_ChiTieu: Number(ctIdStr),
            MaInput:    maInput,
            GiaTriSo:   giaTriSo,
          }))
        );

      await api.post('/api/PhieuKiemTra', {
        ID_ThietBi:          selectedTB.ID_ThietBi,
        ID_NhomChiTieu:      selectedNhomId === CHON_TAT_CA ? null : selectedNhomId,
        NgayKiemTra:         new Date().toISOString(),
        NguoiKiemTra:        nguoiKT,
        GhiChuChung:         ghiChu,
        ChiTiets:            chiTiets,
        ChiTietInputs:       chiTietInputsPayload,
        ChiTietInputsNamed:  chiTietInputsNamed,
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

          {/* ── Step 0: Chọn thiết bị ── */}
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
                    extra={<Text style={{ color: '#4b5563', fontSize: 11 }}>Chọn nhóm theo tần suất đo định kỳ, hoặc "Toàn diện" để đo tất cả</Text>}
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

          {/* ── Step 1: Nhập giá trị chỉ tiêu ── */}
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
                          <Tag style={{ fontSize: 10 }}>{nhom.chiTieus.length} chỉ tiêu</Tag>
                        </Flex>
                      }
                      style={{ background: panelBg, border: `1px solid ${panelBorder}`, marginBottom: 16 }}
                      styles={{ header: { borderBottom: `1px solid ${panelBorder}` }, body: { padding: 20 } }}>
                      <Row gutter={[16, 14]}>
                        {nhom.chiTieus.map(ct => {
                          const inputs = chiTieuInputs[ct.ID_ChiTieu];
                          const isRule = !!(inputs && inputs.length > 0);
                          const rules  = chiTieuRules[ct.ID_ChiTieu] ?? [];

                          /* ── Chỉ tiêu loại Biểu thức (Rule) ── */
                          if (isRule) {
                            const varMap     = ruleValues[ct.ID_ChiTieu] ?? {};
                            const filledCount = inputs.filter(inp => varMap[inp.MaInput] !== undefined).length;
                            const allFilled   = filledCount === inputs.length;

                            return (
                              <Col xs={24} key={ct.ID_ChiTieu}>
                                <div style={{
                                  padding: '14px 16px',
                                  background: itemBg,
                                  borderRadius: 8,
                                  border: `1px solid ${allFilled
                                    ? (isDark ? '#5b21b6' : '#c4b5fd')
                                    : (isDark ? '#4c1d95' : '#ede9fe')}`,
                                  transition: 'border-color 0.25s',
                                }}>
                                  {/* Header chỉ tiêu */}
                                  <Flex align="center" gap={8} wrap="wrap" style={{ marginBottom: 12 }}>
                                    <div style={{ width: 4, height: 20, borderRadius: 2, background: '#7c3aed', flexShrink: 0 }} />
                                    <Text strong style={{ color: titleColor, fontSize: 14, flex: 1 }}>
                                      {ct.TenChiTieu}
                                    </Text>
                                    <Tag color="purple" style={{ fontSize: 10 }}>Biểu thức logic</Tag>
                                    <Tag style={{ fontSize: 10, color: textColor }}>
                                      Trọng số: {ct.TrongSo_Wi}
                                    </Tag>
                                    {allFilled
                                      ? <Tag color="success" style={{ fontSize: 10 }}>Đã nhập đủ</Tag>
                                      : <Tag color="default" style={{ fontSize: 10 }}>{filledCount}/{inputs.length} biến</Tag>
                                    }
                                  </Flex>

                                  {/* Lưới nhập biến */}
                                  <Text style={{ color: textColor, fontSize: 12, display: 'block', marginBottom: 10 }}>
                                    Nhập giá trị đo cho từng đại lượng trong biểu thức:
                                  </Text>
                                  <Row gutter={[12, 10]}>
                                    {inputs.map(inp => {
                                      const isFilled = varMap[inp.MaInput] !== undefined;
                                      return (
                                        <Col xs={24} sm={12} md={8} key={inp.ID_Input}>
                                          <div style={{
                                            padding: '10px 12px',
                                            background: panelBg,
                                            borderRadius: 6,
                                            border: `1px solid ${isFilled
                                              ? (isDark ? '#4ade80' : '#86efac')
                                              : (isDark ? '#374151' : '#d1d5db')}`,
                                            transition: 'border-color 0.2s',
                                          }}>
                                            <Flex align="center" gap={6} style={{ marginBottom: 6 }}>
                                              <Text style={{ color: titleColor, fontSize: 13, fontWeight: 500, flex: 1 }}>
                                                {inp.TenInput}
                                              </Text>
                                              <code style={{
                                                fontSize: 11,
                                                padding: '1px 5px',
                                                borderRadius: 4,
                                                background: isDark ? '#1f2937' : '#f3f4f6',
                                                color: isDark ? '#a78bfa' : '#7c3aed',
                                                border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                                              }}>
                                                {inp.MaInput}
                                              </code>
                                            </Flex>
                                            <InputNumber
                                              style={{
                                                width: '100%',
                                                background: panelBg,
                                                borderColor: isFilled
                                                  ? (isDark ? '#4ade80' : '#86efac')
                                                  : (isDark ? '#374151' : '#d1d5db'),
                                              }}
                                              value={varMap[inp.MaInput]}
                                              onChange={v =>
                                                setRuleValues(prev => ({
                                                  ...prev,
                                                  [ct.ID_ChiTieu]: {
                                                    ...(prev[ct.ID_ChiTieu] ?? {}),
                                                    [inp.MaInput]: v ?? 0,
                                                  },
                                                }))
                                              }
                                              step={0.01}
                                              placeholder={`Nhập ${inp.MaInput}...`}
                                            />
                                          </div>
                                        </Col>
                                      );
                                    })}
                                  </Row>

                                  {/* Bảng quy tắc tính điểm (có thể thu/mở) */}
                                  {rules.length > 0 && (
                                    <Collapse
                                      ghost
                                      size="small"
                                      style={{ marginTop: 10 }}
                                      items={[{
                                        key: 'rules',
                                        label: (
                                          <Text style={{ color: textColor, fontSize: 11 }}>
                                            Quy tắc tính điểm — {rules.length} mức xếp loại
                                          </Text>
                                        ),
                                        children: (
                                          <div style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                              <thead>
                                                <tr style={{ background: isDark ? '#1f2937' : '#f3f4f6' }}>
                                                  <th style={{ padding: '6px 10px', textAlign: 'left', color: textColor, fontWeight: 500 }}>Mức</th>
                                                  <th style={{ padding: '6px 10px', textAlign: 'left', color: textColor, fontWeight: 500 }}>Điều kiện biểu thức</th>
                                                  <th style={{ padding: '6px 10px', textAlign: 'center', color: textColor, fontWeight: 500 }}>Điểm</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {[...rules].sort((a, b) => b.Diem_Si - a.Diem_Si).map(rule => (
                                                  <tr key={rule.ID_Rule}
                                                    style={{ borderTop: `1px solid ${panelBorder}` }}>
                                                    <td style={{ padding: '6px 10px', color: titleColor, whiteSpace: 'nowrap' }}>
                                                      {rule.TenMuc}
                                                    </td>
                                                    <td style={{ padding: '6px 10px' }}>
                                                      <code style={{
                                                        fontSize: 11,
                                                        background: isDark ? '#1f2937' : '#f5f3ff',
                                                        padding: '3px 7px',
                                                        borderRadius: 4,
                                                        color: isDark ? '#c4b5fd' : '#6d28d9',
                                                        border: `1px solid ${isDark ? '#374151' : '#e9d5ff'}`,
                                                        display: 'inline-block',
                                                        wordBreak: 'break-all',
                                                      }}>
                                                        {rule.BieuThuc}
                                                      </code>
                                                    </td>
                                                    <td style={{ padding: '6px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                      <Tag color={scoreTagColor(rule.Diem_Si)} style={{ margin: 0, fontWeight: 600 }}>
                                                        {rule.Diem_Si}/10
                                                      </Tag>
                                                    </td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        ),
                                      }]}
                                    />
                                  )}
                                </div>
                              </Col>
                            );
                          }

                          /* ── Chỉ tiêu loại Ngưỡng (Nguong) — giá trị đơn ── */
                          const val          = values[ct.ID_ChiTieu];
                          const previewScore = val !== undefined ? calcNguongScore(val, ct.nguongs) : null;

                          // Màu border thay đổi theo điểm dự kiến
                          let activeBorder = panelBorder;
                          if (previewScore !== null) {
                            if (previewScore >= 8) activeBorder = isDark ? '#166534' : '#86efac';
                            else if (previewScore >= 6) activeBorder = isDark ? '#1e40af' : '#93c5fd';
                            else if (previewScore >= 4) activeBorder = isDark ? '#92400e' : '#fcd34d';
                            else activeBorder = isDark ? '#7f1d1d' : '#fca5a5';
                          }

                          return (
                            <Col xs={24} sm={12} key={ct.ID_ChiTieu}>
                              <div style={{
                                padding: '12px 14px',
                                background: itemBg,
                                borderRadius: 8,
                                border: `1px solid ${activeBorder}`,
                                transition: 'border-color 0.25s',
                              }}>
                                {/* Header chỉ tiêu */}
                                <Flex align="center" gap={6} wrap="wrap" style={{ marginBottom: 8 }}>
                                  <div style={{ width: 3, height: 16, borderRadius: 2, background: '#3b82f6', flexShrink: 0 }} />
                                  <Text style={{ color: titleColor, fontSize: 13, flex: 1 }}>{ct.TenChiTieu}</Text>
                                  <Tag style={{ fontSize: 10, margin: 0, color: textColor }}>
                                    Trọng số: {ct.TrongSo_Wi}
                                  </Tag>
                                </Flex>

                                {/* InputNumber + badge điểm dự kiến */}
                                <Flex align="center" gap={8}>
                                  <InputNumber
                                    style={{
                                      flex: 1,
                                      background: panelBg,
                                      borderColor: isDark ? '#374151' : '#d1d5db',
                                    }}
                                    value={val}
                                    onChange={v => setValues(prev => v !== null && v !== undefined
                                      ? { ...prev, [ct.ID_ChiTieu]: v }
                                      : Object.fromEntries(Object.entries(prev).filter(([k]) => k !== String(ct.ID_ChiTieu)))
                                    )}
                                    step={0.01}
                                    placeholder="Nhập giá trị đo..."
                                  />
                                  {previewScore !== null && (
                                    <Tag
                                      color={scoreTagColor(previewScore)}
                                      style={{ margin: 0, fontWeight: 700, fontSize: 13, padding: '0 10px', lineHeight: '22px' }}
                                    >
                                      {previewScore}/10
                                    </Tag>
                                  )}
                                </Flex>

                                {/* Bảng ngưỡng tham khảo (có thể thu/mở) */}
                                {ct.nguongs.length > 0 && (
                                  <Collapse
                                    ghost
                                    size="small"
                                    style={{ marginTop: 6 }}
                                    items={[{
                                      key: 'nguong',
                                      label: (
                                        <Text style={{ color: textColor, fontSize: 11 }}>
                                          Bảng ngưỡng tham khảo — {ct.nguongs.length} mức
                                        </Text>
                                      ),
                                      children: (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                          {[...ct.nguongs].sort((a, b) => b.Diem_Si - a.Diem_Si).map(ng => {
                                            const isActive = previewScore === ng.Diem_Si && val !== undefined && !ng.BieuThuc_Logic;
                                            return (
                                              <Flex key={ng.ID_Nguong} align="center" justify="space-between"
                                                style={{
                                                  padding: '4px 8px',
                                                  borderRadius: 5,
                                                  background: isActive
                                                    ? (isDark ? '#1e1b4b' : '#ede9fe')
                                                    : 'transparent',
                                                  border: isActive
                                                    ? `1px solid ${isDark ? '#4c1d95' : '#c4b5fd'}`
                                                    : '1px solid transparent',
                                                  transition: 'background 0.15s',
                                                }}>
                                                <Text style={{
                                                  fontSize: 12,
                                                  color: isActive ? (isDark ? '#c4b5fd' : '#6d28d9') : textColor,
                                                  fontFamily: 'monospace',
                                                  fontWeight: isActive ? 600 : 400,
                                                }}>
                                                  {formatNguongRange(ng)}
                                                  {ng.BieuThuc_Logic && (
                                                    <Tag style={{ marginLeft: 6, fontSize: 9 }} color="orange">logic</Tag>
                                                  )}
                                                </Text>
                                                <Tag
                                                  color={scoreTagColor(ng.Diem_Si)}
                                                  style={{ margin: 0, fontSize: 11, fontWeight: isActive ? 700 : 400 }}
                                                >
                                                  {ng.Diem_Si} điểm
                                                </Tag>
                                              </Flex>
                                            );
                                          })}
                                        </div>
                                      ),
                                    }]}
                                  />
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

          {/* ── Step 2: Xác nhận & Lưu ── */}
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

          {/* ── Nút điều hướng bước ── */}
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
