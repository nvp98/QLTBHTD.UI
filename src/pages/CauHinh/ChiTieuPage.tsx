import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AutoComplete, Button, Card, Col, Divider, Flex, Form, Input,
  InputNumber, Modal, Popconfirm, Radio, Row, Select, Space,
  Switch, Table, Tag, Tooltip, Typography, message,
} from 'antd';
import {
  CalendarOutlined, DeleteOutlined, EditOutlined, FunctionOutlined, PlusOutlined,
  ReloadOutlined, SettingOutlined, UnorderedListOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { InputRef } from 'antd';
import { chiTieuApi }      from '../../api/chiTieu';
import { nguongApi }       from '../../api/nguong';
import { nhomChiTieuApi }  from '../../api/nhomChiTieu';
import { loaiThietBiApi }  from '../../api/loaiThietBi';
import { chiTieuInputApi } from '../../api/chiTieuInput';
import { chiTieuRuleApi }  from '../../api/chiTieuRule';
import { chiTieuPhanLoaiApi } from '../../api/chiTieuPhanLoai';
import type {
  ChiTieu, ChiTieuInput, ChiTieuRule, ChiTieuPhanLoaiNguong,
  Nguong, NhomChiTieu, LoaiThietBi,
} from '../../types/entities';
import { useThemeMode } from '../../theme/ThemeModeContext';

const { Text, Title } = Typography;

// ─── Logic-builder types ─────────────────────────────────────────────────────
interface CondLine {
  id: string;
  lhs: string;
  op: string;
  rhsType: 'var' | 'num';
  coef: number;
  rhsVar: string;
  rhsNum: number;
}
interface CondGroup { id: string; lines: CondLine[] }
type LogicTree = CondGroup[];

let _uid = 0;
const uid = () => `u${++_uid}`;

const OPS = [
  { label: '≤', value: '<=' },
  { label: '<',  value: '<'  },
  { label: '≥', value: '>=' },
  { label: '>',  value: '>'  },
  { label: '=',  value: '==' },
  { label: '≠', value: '!=' },
];

const RHS_TYPE_OPTS = [
  { label: '= Số',    value: 'num' },
  { label: '× Biến',  value: 'var' },
];

const newLine = (): CondLine => ({
  id: uid(), lhs: '', op: '<=', rhsType: 'num', coef: 1, rhsVar: '', rhsNum: 0,
});
const newGroup = (): CondGroup => ({ id: uid(), lines: [newLine()] });

// ─── NCalc generation ────────────────────────────────────────────────────────
function treeToNCalc(groups: LogicTree): string {
  const valid = groups.filter(g => g.lines.some(l => l.lhs.trim()));
  if (!valid.length) return '';
  return valid
    .map(g => {
      const parts = g.lines
        .filter(l => l.lhs.trim())
        .map(l => {
          const rhs = l.rhsType === 'var' ? `${l.coef} * ${l.rhsVar}` : String(l.rhsNum);
          return `${l.lhs} ${l.op} ${rhs}`;
        });
      return parts.length === 1 ? parts[0] : `(${parts.join(' && ')})`;
    })
    .join(' || ');
}

// ─── NCalc parsing back to tree ──────────────────────────────────────────────
function splitTopLevel(expr: string, sep: string): string[] {
  const res: string[] = [];
  let depth = 0, cur = '', i = 0;
  while (i < expr.length) {
    if (expr[i] === '(')                         { depth++; cur += expr[i++]; }
    else if (expr[i] === ')')                    { depth--; cur += expr[i++]; }
    else if (!depth && expr.startsWith(sep, i)) { res.push(cur.trim()); cur = ''; i += sep.length; }
    else                                         { cur += expr[i++]; }
  }
  if (cur.trim()) res.push(cur.trim());
  return res;
}

function parseLine(s: string): CondLine {
  for (const op of ['<=', '>=', '<', '>', '==', '!=']) {
    const idx = s.indexOf(op);
    if (idx < 0) continue;
    const lhs = s.slice(0, idx).trim();
    const rhs = s.slice(idx + op.length).trim();
    const m = rhs.match(/^([\d.]+)\s*\*\s*(\w+)$/);
    if (m) return { id: uid(), lhs, op, rhsType: 'var', coef: +m[1], rhsVar: m[2], rhsNum: 0 };
    return   { id: uid(), lhs, op, rhsType: 'num', coef: 1, rhsVar: '', rhsNum: +rhs || 0 };
  }
  throw new Error(`Cannot parse: ${s}`);
}

function parseToTree(expr: string): LogicTree | null {
  if (!expr?.trim()) return null;
  try {
    return splitTopLevel(expr, '||').map(gs => {
      const inner = gs.trim().replace(/^\(/, '').replace(/\)$/, '').trim();
      return { id: uid(), lines: splitTopLevel(inner, '&&').map(ls => parseLine(ls.trim())) };
    });
  } catch { return null; }
}

// ─── Expression Builder ───────────────────────────────────────────────────────
interface ExprBuilderProps {
  tree: LogicTree;
  varOpts: { value: string; label: string }[];
  isDark: boolean;
  onChange: (t: LogicTree) => void;
}

function ExprBuilder({ tree, varOpts, isDark, onChange }: ExprBuilderProps) {
  const groupBg     = isDark ? '#0d1117' : '#f8f4ff';
  const groupBorder = isDark ? '#312e81' : '#d1c4e9';
  const previewBg   = isDark ? '#060810' : '#f3f0ff';
  const previewBd   = isDark ? '#4c1d95' : '#c4b5fd';

  const hasVars = varOpts.length > 0;

  const addGroup = ()                            => onChange([...tree, newGroup()]);
  const rmGroup  = (gid: string)                 => onChange(tree.filter(g => g.id !== gid));
  const addLine  = (gid: string)                 => onChange(tree.map(g =>
    g.id === gid ? { ...g, lines: [...g.lines, newLine()] } : g));
  const rmLine   = (gid: string, lid: string)    => onChange(tree.map(g =>
    g.id === gid ? { ...g, lines: g.lines.filter(l => l.id !== lid) } : g));
  const updLine  = (gid: string, lid: string, patch: Partial<CondLine>) =>
    onChange(tree.map(g =>
      g.id === gid
        ? { ...g, lines: g.lines.map(l => l.id === lid ? { ...l, ...patch } : l) }
        : g));

  const preview = treeToNCalc(tree);

  // Check for undeclared variables
  const usedVars = new Set(
    tree.flatMap(g => g.lines.flatMap(l => {
      const res: string[] = [];
      if (l.lhs.trim()) res.push(l.lhs.trim());
      if (l.rhsType === 'var' && l.rhsVar.trim()) res.push(l.rhsVar.trim());
      return res;
    }))
  );
  const knownVarCodes = new Set(varOpts.map(v => v.value));
  const undeclared = hasVars
    ? [...usedVars].filter(v => !knownVarCodes.has(v))
    : [];

  return (
    <div>
      {/* ── Hint row ─────────────────────────────────────────────────── */}
      <Flex align="center" gap={6} style={{ marginBottom: 10, flexWrap: 'wrap' }}>
        <Text style={{ color: '#6b7280', fontSize: 11, flexShrink: 0 }}>Nhóm nối nhau bằng</Text>
        <Tag color="purple" style={{ fontSize: 10, margin: 0 }}>|| HOẶC</Tag>
        <Text style={{ color: '#6b7280', fontSize: 11 }}>· điều kiện trong nhóm nối bằng</Text>
        <Tag color="geekblue" style={{ fontSize: 10, margin: 0 }}>&amp;&amp; VÀ</Tag>
      </Flex>

      {/* ── Warning undeclared vars ───────────────────────────────────── */}
      {undeclared.length > 0 && (
        <div style={{ marginBottom: 8, padding: '5px 10px', background: isDark ? '#1c0f00' : '#fffbeb', borderRadius: 6, border: `1px solid ${isDark ? '#78350f' : '#fde68a'}`, fontSize: 11 }}>
          <Text style={{ color: '#d97706' }}>
            ⚠ Biến chưa khai báo: {undeclared.map(v => <code key={v} style={{ marginLeft: 4 }}>{v}</code>)}
            &nbsp;— hãy thêm vào danh sách biến bên trên.
          </Text>
        </div>
      )}

      {/* ── Groups ───────────────────────────────────────────────────── */}
      {tree.map((group, gi) => (
        <div key={group.id}>
          {gi > 0 && (
            <Flex justify="center" style={{ margin: '6px 0' }}>
              <Tag color="purple" style={{ fontSize: 11, padding: '1px 14px' }}>HOẶC (||)</Tag>
            </Flex>
          )}

          <div style={{
            border: `1px solid ${groupBorder}`, borderRadius: 8,
            padding: '10px 12px', background: groupBg, marginBottom: 4,
          }}>
            {/* Group header */}
            <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
              <Text style={{ color: '#7c3aed', fontSize: 11, fontWeight: 600 }}>
                Nhóm {gi + 1}
                {group.lines.length > 1 && (
                  <Text style={{ color: '#6b7280', fontWeight: 400, marginLeft: 6 }}>
                    ({group.lines.length} điều kiện VÀ)
                  </Text>
                )}
              </Text>
              {tree.length > 1 && (
                <Tooltip title="Xóa nhóm này">
                  <Button size="small" type="text" danger icon={<DeleteOutlined />}
                    onClick={() => rmGroup(group.id)} />
                </Tooltip>
              )}
            </Flex>

            {/* Condition lines */}
            {group.lines.map((line, li) => (
              <div key={line.id}>
                {li > 0 && (
                  <Flex justify="flex-start" style={{ margin: '2px 0 6px', paddingLeft: 4 }}>
                    <Tag style={{ fontSize: 10, color: '#3730a3', borderColor: '#a5b4fc', background: isDark ? '#1e1b4b' : '#eef2ff' }}>
                      VÀ (&amp;&amp;)
                    </Tag>
                  </Flex>
                )}

                {/* ── Condition row ── */}
                <Flex gap={6} align="center" wrap="nowrap" style={{ marginBottom: 6 }}>

                  {/* LHS variable */}
                  <AutoComplete
                    value={line.lhs}
                    options={varOpts}
                    onChange={v => updLine(group.id, line.id, { lhs: v })}
                    filterOption={(input, opt) =>
                      (opt?.value as string ?? '').toLowerCase().includes(input.toLowerCase()) ||
                      (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    style={{ minWidth: 130, flex: '1 1 130px' }}
                  >
                    <Input
                      placeholder={hasVars ? 'Chọn / nhập biến' : 'Tên biến'}
                      style={{ fontFamily: 'monospace', fontSize: 12 }}
                      status={line.lhs && hasVars && !knownVarCodes.has(line.lhs) ? 'warning' : undefined}
                    />
                  </AutoComplete>

                  {/* Operator */}
                  <Select
                    value={line.op}
                    onChange={v => updLine(group.id, line.id, { op: v })}
                    options={OPS}
                    style={{ width: 70, flexShrink: 0 }}
                  />

                  {/* RHS type picker */}
                  <Select
                    value={line.rhsType}
                    onChange={v => updLine(group.id, line.id, { rhsType: v as 'num' | 'var' })}
                    options={RHS_TYPE_OPTS}
                    style={{ width: 88, flexShrink: 0 }}
                    size="small"
                  />

                  {/* RHS value */}
                  {line.rhsType === 'num' ? (
                    <InputNumber
                      value={line.rhsNum}
                      onChange={v => updLine(group.id, line.id, { rhsNum: v ?? 0 })}
                      style={{ width: 110, flexShrink: 0 }}
                      step={0.01}
                      placeholder="Giá trị"
                    />
                  ) : (
                    <Flex gap={4} align="center" style={{ flexShrink: 0 }}>
                      <InputNumber
                        value={line.coef}
                        onChange={v => updLine(group.id, line.id, { coef: v ?? 1 })}
                        style={{ width: 68 }}
                        step={0.1} precision={2}
                        placeholder="1.0"
                      />
                      <Text style={{ color: '#6b7280', flexShrink: 0 }}>×</Text>
                      <AutoComplete
                        value={line.rhsVar}
                        options={varOpts}
                        onChange={v => updLine(group.id, line.id, { rhsVar: v })}
                        filterOption={(input, opt) =>
                          (opt?.value as string ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                        style={{ width: 110 }}
                      >
                        <Input
                          placeholder={hasVars ? 'Chọn biến' : 'Tên biến'}
                          style={{ fontFamily: 'monospace', fontSize: 12 }}
                          status={line.rhsVar && hasVars && !knownVarCodes.has(line.rhsVar) ? 'warning' : undefined}
                        />
                      </AutoComplete>
                    </Flex>
                  )}

                  {/* Delete line */}
                  {group.lines.length > 1 && (
                    <Button size="small" type="text" danger icon={<DeleteOutlined />}
                      onClick={() => rmLine(group.id, line.id)} style={{ flexShrink: 0 }} />
                  )}
                </Flex>
              </div>
            ))}

            {/* Add condition */}
            <Button
              size="small" type="dashed" icon={<PlusOutlined />}
              onClick={() => addLine(group.id)}
              style={{ width: '100%', marginTop: 4, borderColor: '#818cf8', color: '#818cf8' }}
            >
              + Thêm điều kiện VÀ
            </Button>
          </div>
        </div>
      ))}

      {/* Add group */}
      <Button
        type="dashed" icon={<PlusOutlined />} onClick={addGroup}
        style={{ width: '100%', marginTop: 8, borderColor: '#7c3aed', color: '#7c3aed' }}
      >
        + Thêm nhóm HOẶC
      </Button>

      {/* NCalc preview */}
      {preview && (
        <div style={{ marginTop: 10, padding: '8px 12px', background: previewBg, borderRadius: 6, border: `1px solid ${previewBd}` }}>
          <Text style={{ color: '#6b7280', fontSize: 10, display: 'block', marginBottom: 2 }}>
            Biểu thức NCalc được lưu:
          </Text>
          <Text code style={{ fontSize: 11, color: '#a78bfa', wordBreak: 'break-all' }}>
            {preview}
          </Text>
        </div>
      )}
    </div>
  );
}

// ─── Compact inline variable manager ─────────────────────────────────────────
interface VarManagerProps {
  chiTieuId: number;
  inputs: ChiTieuInput[];
  isDark: boolean;
  onRefresh: () => void;
}

function VarManager({ chiTieuId, inputs, isDark, onRefresh }: VarManagerProps) {
  const [maInput, setMaInput]   = useState('');
  const [tenInput, setTenInput] = useState('');
  const [adding, setAdding]     = useState(false);
  const maRef = useRef<InputRef>(null);

  const handleAdd = async () => {
    const ma  = maInput.trim();
    const ten = tenInput.trim();
    if (!ma || !ten) { message.warning('Nhập mã biến và tên hiển thị'); return; }
    if (!/^\w+$/.test(ma)) { message.error('Mã biến chỉ dùng chữ/số/_'); return; }
    if (inputs.some(i => i.MaInput === ma)) { message.error(`Biến "${ma}" đã tồn tại`); return; }
    setAdding(true);
    try {
      await chiTieuInputApi.create({ ID_ChiTieu: chiTieuId, MaInput: ma, TenInput: ten });
      setMaInput(''); setTenInput('');
      onRefresh();
    } catch { message.error('Lỗi thêm biến'); }
    finally { setAdding(false); }
  };

  const handleDelete = async (id: number) => {
    try { await chiTieuInputApi.delete(id); onRefresh(); }
    catch { message.error('Lỗi xóa biến'); }
  };

  const panelBg  = isDark ? '#0d1117' : '#f0fdf4';
  const panelBd  = isDark ? '#14532d' : '#86efac';

  return (
    <div style={{ padding: '10px 12px', background: panelBg, borderRadius: 8, border: `1px solid ${panelBd}`, marginBottom: 14 }}>
      <Text style={{ color: '#22c55e', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 8 }}>
        Biến đầu vào
        <Text style={{ color: '#6b7280', fontWeight: 400, marginLeft: 6 }}>
          — dùng làm tên biến trong biểu thức NCalc
        </Text>
      </Text>

      {/* Existing variables */}
      {inputs.length > 0 ? (
        <Flex wrap gap={6} style={{ marginBottom: 8 }}>
          {inputs.map(inp => (
            <Tag
              key={inp.ID_Input}
              color="green"
              closable
              onClose={e => { e.preventDefault(); handleDelete(inp.ID_Input); }}
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            >
              <strong>{inp.MaInput}</strong>
              <Text style={{ color: '#6b7280', marginLeft: 5, fontFamily: 'sans-serif', fontSize: 11 }}>
                {inp.TenInput}
              </Text>
            </Tag>
          ))}
        </Flex>
      ) : (
        <Text style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 8 }}>
          Chưa có biến — thêm biến để chọn trong dropdown bên dưới.
        </Text>
      )}

      {/* Quick-add form */}
      <Flex gap={6} align="center" wrap="nowrap">
        <Input
          ref={maRef}
          size="small"
          placeholder="Mã biến (VD: Imotor)"
          value={maInput}
          onChange={e => setMaInput(e.target.value)}
          onPressEnter={() => maRef.current?.blur()}
          style={{ width: 140, fontFamily: 'monospace', fontSize: 12 }}
        />
        <Input
          size="small"
          placeholder="Tên hiển thị (VD: Dòng đ/c)"
          value={tenInput}
          onChange={e => setTenInput(e.target.value)}
          onPressEnter={handleAdd}
          style={{ flex: 1, minWidth: 120 }}
        />
        <Button
          size="small" type="primary" icon={<PlusOutlined />}
          loading={adding}
          disabled={!maInput.trim() || !tenInput.trim()}
          onClick={handleAdd}
          style={{ background: '#16a34a', borderColor: '#16a34a', flexShrink: 0 }}
        >
          Thêm biến
        </Button>
      </Flex>
    </div>
  );
}

// ─── NguongPanel ─────────────────────────────────────────────────────────────
function NguongPanel({ chiTieuId, chiTieuName }: { chiTieuId: number; chiTieuName: string }) {
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';

  const [data, setData]         = useState<Nguong[]>([]);
  const [inputs, setInputs]     = useState<ChiTieuInput[]>([]);
  const [loading, setLoading]   = useState(false);
  const [modalOpen, setModal]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [editing, setEditing]   = useState<Nguong | null>(null);
  const [condMode, setCondMode] = useState<'range' | 'logic'>('range');
  const [logicTree, setTree]    = useState<LogicTree>([newGroup()]);
  const [form]                  = Form.useForm();

  const varOpts = inputs.map(i => ({ value: i.MaInput, label: `${i.MaInput} — ${i.TenInput}` }));

  const loadNguongs = useCallback(async () => {
    setLoading(true);
    try { setData(await nguongApi.getByChiTieu(chiTieuId)); }
    catch { message.error('Không thể tải ngưỡng'); }
    finally { setLoading(false); }
  }, [chiTieuId]);

  const loadInputs = useCallback(async () => {
    try { setInputs(await chiTieuInputApi.getByChiTieu(chiTieuId)); }
    catch { /* non-critical */ }
  }, [chiTieuId]);

  useEffect(() => { loadNguongs(); loadInputs(); }, [loadNguongs, loadInputs]);

  useEffect(() => {
    if (!modalOpen) return;
    if (editing) {
      form.setFieldsValue({
        ID_ChiTieu:     editing.ID_ChiTieu,
        Diem_Si:        editing.Diem_Si,
        CanDuoi:        editing.CanDuoi,
        CanTren:        editing.CanTren,
        CanDuoi_BaoGom: editing.CanDuoi_BaoGom,
        CanTren_BaoGom: editing.CanTren_BaoGom,
      });
    } else {
      form.setFieldsValue({ ID_ChiTieu: chiTieuId, CanDuoi_BaoGom: true, CanTren_BaoGom: false });
    }
    // Refresh inputs whenever modal opens (user may have added vars via another panel)
    loadInputs();
  }, [modalOpen, editing, chiTieuId, form, loadInputs]);

  const openCreate = () => { setEditing(null); setCondMode('range'); setTree([newGroup()]); setModal(true); };
  const openEdit   = (r: Nguong) => {
    setEditing(r);
    if (r.BieuThuc_Logic) { setCondMode('logic'); setTree(parseToTree(r.BieuThuc_Logic) ?? [newGroup()]); }
    else                  { setCondMode('range');  setTree([newGroup()]); }
    setModal(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const v = await form.validateFields();
      if (condMode === 'logic') {
        const expr = treeToNCalc(logicTree);
        if (!expr) { message.warning('Biểu thức trống — thêm ít nhất 1 điều kiện'); setSaving(false); return; }
        v.BieuThuc_Logic = expr; v.CanDuoi = null; v.CanTren = null;
      } else {
        v.BieuThuc_Logic = null;
      }
      if (editing) await nguongApi.update(editing.ID_Nguong, v);
      else         await nguongApi.create(v);
      message.success(editing ? 'Đã cập nhật ngưỡng' : 'Đã thêm ngưỡng');
      setModal(false); loadNguongs();
    } catch (e: unknown) {
      if (e instanceof Error && 'errorFields' in (e as object)) return;
      message.error('Lỗi lưu ngưỡng');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    try { await nguongApi.delete(id); message.success('Đã xóa ngưỡng'); loadNguongs(); }
    catch { message.error('Lỗi xóa ngưỡng'); }
  };

  const borderColor = isDark ? '#1f2937' : '#e5e7eb';

  const cols: ColumnsType<Nguong> = [
    {
      title: 'Kiểu', key: 'type', width: 72, align: 'center',
      render: (_, r) => r.BieuThuc_Logic
        ? <Tag color="purple" style={{ fontSize: 10, margin: 0 }}>Biểu thức</Tag>
        : <Tag color="blue"   style={{ fontSize: 10, margin: 0 }}>Khoảng</Tag>,
    },
    {
      title: 'Điều kiện', key: 'cond',
      render: (_, r) => {
        if (r.BieuThuc_Logic) {
          const expr = r.BieuThuc_Logic;
          return (
            <Tooltip title={<code style={{ fontSize: 11, whiteSpace: 'pre-wrap' }}>{expr}</code>}>
              <Text code style={{ fontSize: 11, color: '#a78bfa', cursor: 'help' }}>
                {expr.length > 68 ? expr.slice(0, 68) + '…' : expr}
              </Text>
            </Tooltip>
          );
        }
        const lo  = r.CanDuoi != null ? String(r.CanDuoi) : '−∞';
        const hi  = r.CanTren != null ? String(r.CanTren) : '+∞';
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
              {r.CanDuoi != null ? `${lo} ${lOp} x` : 'x'}
              {r.CanTren != null ? ` ${rOp} ${hi}` : ''}
            </Text>
          </Flex>
        );
      },
    },
    {
      title: 'Điểm Sᵢ', dataIndex: 'Diem_Si', key: 'diem', width: 88, align: 'center',
      render: v => (
        <Tag color={v >= 8 ? 'success' : v >= 5 ? 'processing' : v >= 2 ? 'warning' : 'error'}
             style={{ fontFamily: 'monospace', fontWeight: 700 }}>{v}</Tag>
      ),
      sorter: (a, b) => (a.Diem_Si ?? 0) - (b.Diem_Si ?? 0),
    },
    {
      title: '', key: 'actions', width: 76, align: 'center',
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
    <div style={{ padding: '12px 16px', background: isDark ? '#060c14' : '#f9fafb', borderRadius: 8, border: `1px solid ${borderColor}` }}>
      <Flex align="center" justify="space-between" style={{ marginBottom: 12 }}>
        <Text style={{ color: '#8b5cf6', fontSize: 12, fontWeight: 600 }}>
          <SettingOutlined style={{ marginRight: 6 }} />Ngưỡng điểm · {chiTieuName}
        </Text>
        <Button size="small" icon={<PlusOutlined />} onClick={openCreate} type="dashed">Thêm ngưỡng</Button>
      </Flex>

      <Table<Nguong>
        dataSource={data} columns={cols} rowKey="ID_Nguong"
        loading={loading} size="small" pagination={false}
        locale={{ emptyText: 'Chưa có ngưỡng — nhấn "Thêm ngưỡng" để tạo' }}
      />

      {/* ── Modal ── */}
      <Modal
        title={
          <Space>
            <SettingOutlined style={{ color: '#8b5cf6' }} />
            {editing ? 'Cập nhật ngưỡng điểm' : 'Thêm ngưỡng điểm'}
            <Tag color="purple" style={{ fontSize: 11 }}>{chiTieuName}</Tag>
          </Space>
        }
        open={modalOpen}
        onOk={handleSubmit} onCancel={() => { form.resetFields(); setModal(false); }}
        okText={editing ? 'Cập nhật' : 'Thêm'} cancelText="Hủy"
        confirmLoading={saving} destroyOnHidden width={760}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="ID_ChiTieu" hidden><InputNumber /></Form.Item>

          {/* ── Mode toggle ── */}
          <Form.Item label="Kiểu điều kiện ngưỡng">
            <Radio.Group
              value={condMode}
              onChange={e => { setCondMode(e.target.value); setTree([newGroup()]); }}
              buttonStyle="solid"
            >
              <Radio.Button value="range">Khoảng giá trị (≤ x ≤)</Radio.Button>
              <Radio.Button value="logic">Biểu thức logic (AND / OR)</Radio.Button>
            </Radio.Group>
          </Form.Item>

          {/* ── Range mode ── */}
          {condMode === 'range' && (
            <>
              <Row gutter={12} align="bottom">
                <Col span={14}>
                  <Form.Item name="CanDuoi" label="Cận dưới" tooltip="Để trống = −∞">
                    <InputNumber style={{ width: '100%' }} step={0.01} placeholder="−∞ (bỏ trống)" />
                  </Form.Item>
                </Col>
                <Col span={10}>
                  <Form.Item name="CanDuoi_BaoGom" label="Bao gồm =" valuePropName="checked">
                    <Switch checkedChildren="≥ (có =)" unCheckedChildren="> (không =)" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12} align="bottom">
                <Col span={14}>
                  <Form.Item name="CanTren" label="Cận trên" tooltip="Để trống = +∞">
                    <InputNumber style={{ width: '100%' }} step={0.01} placeholder="+∞ (bỏ trống)" />
                  </Form.Item>
                </Col>
                <Col span={10}>
                  <Form.Item name="CanTren_BaoGom" label="Bao gồm =" valuePropName="checked">
                    <Switch checkedChildren="≤ (có =)" unCheckedChildren="< (không =)" />
                  </Form.Item>
                </Col>
              </Row>
              {/* Live preview */}
              <Form.Item noStyle shouldUpdate>
                {({ getFieldValue }) => {
                  const cd = getFieldValue('CanDuoi'), ct = getFieldValue('CanTren');
                  const cdBG = getFieldValue('CanDuoi_BaoGom'), ctBG = getFieldValue('CanTren_BaoGom');
                  const lo = cd != null ? cd : '−∞', hi = ct != null ? ct : '+∞';
                  const lOp = cd != null ? (cdBG ? '≥' : '>') : '', rOp = ct != null ? (ctBG ? '≤' : '<') : '';
                  const expr = [lOp && `x ${lOp} ${lo}`, rOp && `x ${rOp} ${hi}`].filter(Boolean).join(' và ');
                  return (
                    <div style={{ padding: '7px 12px', background: isDark ? '#0d1117' : '#eff6ff', borderRadius: 6, border: `1px solid ${isDark ? '#1e3a5f' : '#bfdbfe'}`, marginBottom: 8 }}>
                      <Text style={{ color: '#6b7280', fontSize: 11 }}>Điều kiện: </Text>
                      <Text code style={{ color: '#93c5fd', fontSize: 12 }}>{expr || '(chưa nhập)'}</Text>
                    </div>
                  );
                }}
              </Form.Item>
            </>
          )}

          {/* ── Logic (expression) mode ── */}
          {condMode === 'logic' && (
            <>
              {/* Variable manager inline */}
              <VarManager
                chiTieuId={chiTieuId}
                inputs={inputs}
                isDark={isDark}
                onRefresh={loadInputs}
              />

              {/* Expression builder */}
              <ExprBuilder
                tree={logicTree}
                varOpts={varOpts}
                isDark={isDark}
                onChange={setTree}
              />
            </>
          )}

          <Divider style={{ margin: '14px 0 10px', borderColor: borderColor }} />

          <Form.Item name="Diem_Si" label="Điểm Sᵢ đạt được"
            rules={[{ required: true, message: 'Nhập điểm' }]}
            tooltip="Điểm 0 – 10 khi giá trị thỏa mãn điều kiện trên">
            <InputNumber style={{ width: '100%' }} min={0} max={10} step={0.5} placeholder="0 – 10" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ─── InputPanel ───────────────────────────────────────────────────────────────
function InputPanel({
  chiTieuId, chiTieuName, onInputsChange,
}: { chiTieuId: number; chiTieuName: string; onInputsChange: (inputs: ChiTieuInput[]) => void }) {
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';

  const [data, setData]       = useState<ChiTieuInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModal] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [editing, setEditing] = useState<ChiTieuInput | null>(null);
  const [form]                = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const items = await chiTieuInputApi.getByChiTieu(chiTieuId);
      setData(items);
      onInputsChange(items);
    } catch { message.error('Không thể tải biến đầu vào'); }
    finally { setLoading(false); }
  }, [chiTieuId, onInputsChange]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!modalOpen) return;
    if (editing) form.setFieldsValue(editing);
    else         form.setFieldsValue({ ID_ChiTieu: chiTieuId });
  }, [modalOpen, editing, chiTieuId, form]);

  const openCreate = () => { setEditing(null); setModal(true); };
  const openEdit   = (r: ChiTieuInput) => { setEditing(r); setModal(true); };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const v = await form.validateFields();
      if (editing) await chiTieuInputApi.update(editing.ID_Input, v);
      else         await chiTieuInputApi.create(v);
      message.success(editing ? 'Đã cập nhật biến' : 'Đã thêm biến');
      setModal(false); load();
    } catch (e: unknown) {
      if (e instanceof Error && 'errorFields' in (e as object)) return;
      message.error('Lỗi lưu biến');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    try { await chiTieuInputApi.delete(id); message.success('Đã xóa biến'); load(); }
    catch { message.error('Lỗi xóa biến'); }
  };

  const cols: ColumnsType<ChiTieuInput> = [
    { title: 'Mã biến (NCalc)', dataIndex: 'MaInput', key: 'ma', width: 160,
      render: v => <Text code style={{ color: '#34d399', fontSize: 12 }}>{v}</Text> },
    { title: 'Tên hiển thị', dataIndex: 'TenInput', key: 'ten' },
    { title: '', key: 'actions', width: 76, align: 'center',
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title="Xóa biến này?" okText="Xóa" cancelText="Hủy"
            okButtonProps={{ danger: true }} onConfirm={() => handleDelete(r.ID_Input)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ) },
  ];

  return (
    <div style={{ padding: '12px 16px', background: isDark ? '#060c14' : '#f0fdf4', borderRadius: 8, border: `1px solid ${isDark ? '#14532d' : '#86efac'}`, marginBottom: 12 }}>
      <Flex align="center" justify="space-between" style={{ marginBottom: 12 }}>
        <Text style={{ color: '#22c55e', fontSize: 12, fontWeight: 600 }}>
          <FunctionOutlined style={{ marginRight: 6 }} />Biến đầu vào · {chiTieuName}
        </Text>
        <Button size="small" icon={<PlusOutlined />} onClick={openCreate} type="dashed"
          style={{ borderColor: '#22c55e', color: '#22c55e' }}>
          Thêm biến
        </Button>
      </Flex>
      <Table<ChiTieuInput>
        dataSource={data} columns={cols} rowKey="ID_Input"
        loading={loading} size="small" pagination={false}
        locale={{ emptyText: 'Chưa có biến — các biến này dùng làm tên biến trong biểu thức NCalc' }}
      />
      <Modal
        title={<Space><FunctionOutlined style={{ color: '#22c55e' }} />
          {editing ? 'Cập nhật biến' : 'Thêm biến đầu vào'}
          <Tag color="green" style={{ fontSize: 11 }}>{chiTieuName}</Tag></Space>}
        open={modalOpen}
        onOk={handleSubmit} onCancel={() => { form.resetFields(); setModal(false); }}
        okText={editing ? 'Cập nhật' : 'Thêm'} cancelText="Hủy"
        confirmLoading={saving} destroyOnHidden width={460}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="ID_ChiTieu" hidden><InputNumber /></Form.Item>
          <Form.Item name="MaInput" label="Mã biến"
            rules={[{ required: true }, { pattern: /^\w+$/, message: 'Chỉ dùng chữ/số/_' }]}
            tooltip="Tên biến dùng trong biểu thức NCalc. VD: Imotor, R, U">
            <Input placeholder="VD: Imotor" style={{ fontFamily: 'monospace' }} />
          </Form.Item>
          <Form.Item name="TenInput" label="Tên hiển thị"
            rules={[{ required: true }]}>
            <Input placeholder="VD: Dòng điện động cơ (A)" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ─── RulePanel ────────────────────────────────────────────────────────────────
function RulePanel({
  chiTieuId, chiTieuName, inputs,
}: { chiTieuId: number; chiTieuName: string; inputs: ChiTieuInput[] }) {
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';

  const [data, setData]       = useState<ChiTieuRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModal] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [editing, setEditing] = useState<ChiTieuRule | null>(null);
  const [logicTree, setTree]  = useState<LogicTree>([newGroup()]);
  const [form]                = Form.useForm();

  const varOpts = inputs.map(i => ({ value: i.MaInput, label: `${i.MaInput} — ${i.TenInput}` }));

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await chiTieuRuleApi.getByChiTieu(chiTieuId)); }
    catch { message.error('Không thể tải quy tắc'); }
    finally { setLoading(false); }
  }, [chiTieuId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!modalOpen) return;
    if (editing) {
      form.setFieldsValue({ ID_ChiTieu: editing.ID_ChiTieu, TenMuc: editing.TenMuc, Diem_Si: editing.Diem_Si });
      setTree(parseToTree(editing.BieuThuc) ?? [newGroup()]);
    } else {
      form.setFieldsValue({ ID_ChiTieu: chiTieuId });
      setTree([newGroup()]);
    }
  }, [modalOpen, editing, chiTieuId, form]);

  const openCreate = () => { setEditing(null); setModal(true); };
  const openEdit   = (r: ChiTieuRule) => { setEditing(r); setModal(true); };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const v = await form.validateFields();
      const expr = treeToNCalc(logicTree);
      if (!expr) { message.warning('Biểu thức trống'); setSaving(false); return; }
      v.BieuThuc = expr;
      if (editing) await chiTieuRuleApi.update(editing.ID_Rule, v);
      else         await chiTieuRuleApi.create(v);
      message.success(editing ? 'Đã cập nhật quy tắc' : 'Đã thêm quy tắc');
      setModal(false); load();
    } catch (e: unknown) {
      if (e instanceof Error && 'errorFields' in (e as object)) return;
      message.error('Lỗi lưu quy tắc');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    try { await chiTieuRuleApi.delete(id); message.success('Đã xóa quy tắc'); load(); }
    catch { message.error('Lỗi xóa quy tắc'); }
  };

  const borderColor = isDark ? '#1f2937' : '#e5e7eb';

  const cols: ColumnsType<ChiTieuRule> = [
    { title: 'Tên mức', dataIndex: 'TenMuc', key: 'ten',
      render: v => <Text strong style={{ color: isDark ? '#e5e7eb' : '#111827' }}>{v}</Text> },
    { title: 'Biểu thức', dataIndex: 'BieuThuc', key: 'bt',
      render: (v: string) => (
        <Tooltip title={<code style={{ fontSize: 11, whiteSpace: 'pre-wrap' }}>{v}</code>}>
          <Text code style={{ fontSize: 11, color: '#a78bfa', cursor: 'help' }}>
            {v.length > 72 ? v.slice(0, 72) + '…' : v}
          </Text>
        </Tooltip>
      ) },
    { title: 'Điểm Sᵢ', dataIndex: 'Diem_Si', key: 'diem', width: 88, align: 'center',
      render: (v: number) => (
        <Tag color={v >= 8 ? 'success' : v >= 5 ? 'processing' : v >= 2 ? 'warning' : 'error'}
             style={{ fontFamily: 'monospace', fontWeight: 700 }}>{v}</Tag>
      ), sorter: (a, b) => a.Diem_Si - b.Diem_Si },
    { title: '', key: 'actions', width: 76, align: 'center',
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title="Xóa quy tắc này?" okText="Xóa" cancelText="Hủy"
            okButtonProps={{ danger: true }} onConfirm={() => handleDelete(r.ID_Rule)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ) },
  ];

  return (
    <div style={{ padding: '12px 16px', background: isDark ? '#060c14' : '#f9fafb', borderRadius: 8, border: `1px solid ${borderColor}` }}>
      <Flex align="center" justify="space-between" style={{ marginBottom: 12 }}>
        <Text style={{ color: '#8b5cf6', fontSize: 12, fontWeight: 600 }}>
          <FunctionOutlined style={{ marginRight: 6 }} />Quy tắc biểu thức · {chiTieuName}
        </Text>
        <Space>
          {!inputs.length && (
            <Text style={{ color: '#f59e0b', fontSize: 11 }}>
              ⚠ Chưa có biến — định nghĩa biến bên trên trước
            </Text>
          )}
          <Button size="small" icon={<PlusOutlined />} onClick={openCreate} type="dashed">Thêm quy tắc</Button>
        </Space>
      </Flex>

      <Table<ChiTieuRule>
        dataSource={data} columns={cols} rowKey="ID_Rule"
        loading={loading} size="small" pagination={false}
        locale={{ emptyText: 'Chưa có quy tắc — nhấn "Thêm quy tắc"' }}
      />

      <Modal
        title={<Space><FunctionOutlined style={{ color: '#8b5cf6' }} />
          {editing ? 'Cập nhật quy tắc' : 'Thêm quy tắc biểu thức'}
          <Tag color="purple" style={{ fontSize: 11 }}>{chiTieuName}</Tag></Space>}
        open={modalOpen}
        onOk={handleSubmit} onCancel={() => { form.resetFields(); setModal(false); }}
        okText={editing ? 'Cập nhật' : 'Thêm'} cancelText="Hủy"
        confirmLoading={saving} destroyOnHidden width={780}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="ID_ChiTieu" hidden><InputNumber /></Form.Item>
          <Row gutter={12}>
            <Col span={10}>
              <Form.Item name="Diem_Si" label="Điểm Sᵢ"
                rules={[{ required: true, message: 'Nhập điểm' }]}>
                <InputNumber style={{ width: '100%' }} min={0} max={10} step={0.5} placeholder="0 – 10" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Biểu thức điều kiện" required>
            {inputs.length > 0 && (
              <Flex wrap gap={4} style={{ marginBottom: 8 }}>
                <Text style={{ color: '#6b7280', fontSize: 11, alignSelf: 'center' }}>Biến: </Text>
                {inputs.map(i => (
                  <Tag key={i.ID_Input} color="green" style={{ fontSize: 10 }}>
                    <code>{i.MaInput}</code>
                    <span style={{ marginLeft: 4, color: '#6b7280' }}>{i.TenInput}</span>
                  </Tag>
                ))}
              </Flex>
            )}
            <ExprBuilder tree={logicTree} varOpts={varOpts} isDark={isDark} onChange={setTree} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ─── PhanLoaiPanel — mức phân loại N0..N4 cho chỉ tiêu kiểu LF ──────────────────
function PhanLoaiPanel({ chiTieuId, chiTieuName }: { chiTieuId: number; chiTieuName: string }) {
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';

  const [data, setData]       = useState<ChiTieuPhanLoaiNguong[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModal] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [editing, setEditing] = useState<ChiTieuPhanLoaiNguong | null>(null);
  const [form]                = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await chiTieuPhanLoaiApi.getByChiTieu(chiTieuId)); }
    catch { message.error('Không thể tải mức phân loại'); }
    finally { setLoading(false); }
  }, [chiTieuId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!modalOpen) return;
    if (editing) {
      form.setFieldsValue(editing);
    } else {
      const thuTuGoiY = data.length;
      form.setFieldsValue({
        MaMuc: `N${thuTuGoiY}`, GiaTriTu_BaoGom: true, GiaTriDen_BaoGom: false,
        TrongSo: 0, ThuTu: thuTuGoiY,
      });
    }
  }, [modalOpen, editing, data.length, form]);

  const openCreate = () => { setEditing(null); setModal(true); };
  const openEdit   = (r: ChiTieuPhanLoaiNguong) => { setEditing(r); setModal(true); };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const v = await form.validateFields();
      if (editing) await chiTieuPhanLoaiApi.update(editing.ID_PhanLoai, v);
      else         await chiTieuPhanLoaiApi.create({ ID_ChiTieu: chiTieuId, ...v });
      message.success(editing ? 'Đã cập nhật mức' : 'Đã thêm mức');
      setModal(false); load();
    } catch (e: unknown) {
      if (e instanceof Error && 'errorFields' in (e as object)) return;
      message.error('Lỗi lưu mức phân loại');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    try { await chiTieuPhanLoaiApi.delete(id); message.success('Đã xóa mức'); load(); }
    catch { message.error('Lỗi xóa mức'); }
  };

  const borderColor = isDark ? '#1f2937' : '#e5e7eb';

  const cols: ColumnsType<ChiTieuPhanLoaiNguong> = [
    { title: 'Mã mức', dataIndex: 'MaMuc', key: 'ma', width: 90,
      render: v => <Text code style={{ color: '#34d399' }}>{v}</Text> },
    {
      title: 'Khoảng giá trị', key: 'khoang',
      render: (_, r) => {
        const lo = r.GiaTriTu != null ? String(r.GiaTriTu) : '−∞';
        const hi = r.GiaTriDen != null ? String(r.GiaTriDen) : '+∞';
        const lBr = r.GiaTriTu_BaoGom ? '[' : '(';
        const rBr = r.GiaTriDen_BaoGom ? ']' : ')';
        return <Text style={{ fontFamily: 'monospace', fontSize: 13 }}>{lBr}{lo} ; {hi}{rBr}</Text>;
      },
    },
    { title: 'Trọng số', dataIndex: 'TrongSo', key: 'trongso', width: 90, align: 'center',
      render: v => <Tag color="purple" style={{ fontFamily: 'monospace', fontWeight: 700 }}>{v}</Tag> },
    { title: 'Thứ tự', dataIndex: 'ThuTu', key: 'thutu', width: 80, align: 'center' },
    { title: '', key: 'actions', width: 76, align: 'center',
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title="Xóa mức này?" okText="Xóa" cancelText="Hủy"
            okButtonProps={{ danger: true }} onConfirm={() => handleDelete(r.ID_PhanLoai)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ) },
  ];

  return (
    <div style={{ padding: '12px 16px', background: isDark ? '#060c14' : '#fdf4ff', borderRadius: 8, border: `1px solid ${isDark ? '#4c1d95' : '#e9d5ff'}`, marginBottom: 12 }}>
      <Flex align="center" justify="space-between" style={{ marginBottom: 12 }}>
        <Text style={{ color: '#a855f7', fontSize: 12, fontWeight: 600 }}>
          <CalendarOutlined style={{ marginRight: 6 }} />Mức phân loại theo tháng (N0..N4) · {chiTieuName}
        </Text>
        <Button size="small" icon={<PlusOutlined />} onClick={openCreate} type="dashed"
          style={{ borderColor: '#a855f7', color: '#a855f7' }}>
          Thêm mức
        </Button>
      </Flex>
      <Text style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 10 }}>
        LF = Σ Trọng số các tháng khớp mức / Số tháng đo được. Kết quả LF sau đó được tra trong bảng "Ngưỡng điểm" bên dưới để ra Điểm Sᵢ cuối cùng.
      </Text>
      <Table<ChiTieuPhanLoaiNguong>
        dataSource={data} columns={cols} rowKey="ID_PhanLoai"
        loading={loading} size="small" pagination={false}
        locale={{ emptyText: 'Chưa có mức nào — nhấn "Thêm mức" (VD: N0..N4)' }}
      />
      <Modal
        title={<Space><CalendarOutlined style={{ color: '#a855f7' }} />
          {editing ? 'Sửa mức phân loại' : 'Thêm mức phân loại'}
          <Tag color="purple" style={{ fontSize: 11 }}>{chiTieuName}</Tag></Space>}
        open={modalOpen}
        onOk={handleSubmit} onCancel={() => { form.resetFields(); setModal(false); }}
        okText={editing ? 'Cập nhật' : 'Thêm'} cancelText="Hủy"
        confirmLoading={saving} destroyOnHidden width={520}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="MaMuc" label="Mã mức" rules={[{ required: true }]}
                tooltip="VD: N0, N1, N2, N3, N4">
                <Input placeholder="N0" style={{ fontFamily: 'monospace' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="ThuTu" label="Thứ tự kiểm tra" rules={[{ required: true }]}
                tooltip="Mức nào khớp trước sẽ được dùng — nên xếp theo khoảng tăng dần">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12} align="bottom">
            <Col span={14}>
              <Form.Item name="GiaTriTu" label="Cận dưới" tooltip="Để trống = −∞">
                <InputNumber style={{ width: '100%' }} step={0.01} placeholder="−∞" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="GiaTriTu_BaoGom" label="Bao gồm =" valuePropName="checked">
                <Switch checkedChildren="≥" unCheckedChildren=">" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12} align="bottom">
            <Col span={14}>
              <Form.Item name="GiaTriDen" label="Cận trên" tooltip="Để trống = +∞">
                <InputNumber style={{ width: '100%' }} step={0.01} placeholder="+∞" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="GiaTriDen_BaoGom" label="Bao gồm =" valuePropName="checked">
                <Switch checkedChildren="≤" unCheckedChildren="<" />
              </Form.Item>
            </Col>
          </Row>
          <Divider style={{ margin: '4px 0 10px', borderColor: borderColor }} />
          <Form.Item name="TrongSo" label="Trọng số (áp dụng khi 1 tháng rơi vào mức này)"
            rules={[{ required: true }]} tooltip="VD theo công thức LF=Σ(4-i)·Ni/ΣNi: N0→4, N1→3, N2→2, N3→1, N4→0">
            <InputNumber style={{ width: '100%' }} step={0.5} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ─── Expanded row ─────────────────────────────────────────────────────────────
function ExpandedRow({ record }: { record: ChiTieu }) {
  const [inputs, setInputs] = useState<ChiTieuInput[]>([]);
  const isRule = record.LoaiTinhDiem === 'Rule';
  const isLF   = record.LoaiTinhDiem === 'LF';
  const handleInputsChange = useCallback((items: ChiTieuInput[]) => setInputs(items), []);

  return (
    <div style={{ padding: '8px 0' }}>
      {isLF ? (
        <>
          <PhanLoaiPanel
            chiTieuId={record.ID_ChiTieu}
            chiTieuName={record.TenChiTieu}
          />
          <NguongPanel
            chiTieuId={record.ID_ChiTieu}
            chiTieuName={record.TenChiTieu}
          />
        </>
      ) : isRule ? (
        <>
          <InputPanel
            chiTieuId={record.ID_ChiTieu}
            chiTieuName={record.TenChiTieu}
            onInputsChange={handleInputsChange}
          />
          <RulePanel
            chiTieuId={record.ID_ChiTieu}
            chiTieuName={record.TenChiTieu}
            inputs={inputs}
          />
        </>
      ) : (
        <NguongPanel
          chiTieuId={record.ID_ChiTieu}
          chiTieuName={record.TenChiTieu}
        />
      )}
    </div>
  );
}

// ─── Main ChiTieuPage ─────────────────────────────────────────────────────────
export default function ChiTieuPage() {
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  const [rows, setRows]               = useState<ChiTieu[]>([]);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [pageSize, setPageSize]       = useState(15);
  const [nhoms, setNhoms]             = useState<NhomChiTieu[]>([]);
  const [loais, setLoais]             = useState<LoaiThietBi[]>([]);
  const [loading, setLoading]         = useState(false);
  const [modalOpen, setModalOpen]     = useState(false);
  const [saving, setSaving]           = useState(false);
  const [editing, setEditing]         = useState<ChiTieu | null>(null);
  const [search, setSearch]           = useState('');
  const [filterNhom, setFilterNhom]   = useState<number | undefined>(undefined);
  const [filterLoai, setFilterLoai]   = useState<number | undefined>(undefined);
  const [expandedKeys, setExpandedKeys] = useState<number[]>([]);
  const [form]                        = Form.useForm();

  useEffect(() => {
    Promise.all([nhomChiTieuApi.getActive(), loaiThietBiApi.getActive()])
      .then(([ns, ls]) => { setNhoms(ns); setLoais(ls); })
      .catch(() => message.error('Không thể tải danh mục'));
  }, []);

  const load = useCallback(async (p = page, ps = pageSize) => {
    setLoading(true);
    try {
      const result = await chiTieuApi.getPaged({
        search: search || undefined, idNhom: filterNhom, idLoai: filterLoai, page: p, pageSize: ps,
      });
      setRows(result.items); setTotal(result.total);
    } catch { message.error('Không thể tải chỉ tiêu CBM'); }
    finally { setLoading(false); }
  }, [search, filterNhom, filterLoai, page, pageSize]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!modalOpen) return;
    if (editing) form.setFieldsValue(editing);
    else         form.setFieldsValue({ TrangThai: 1, LoaiTinhDiem: 'Nguong' });
  }, [modalOpen, editing, form]);

  const openCreate = () => { setEditing(null);   setModalOpen(true); };
  const openEdit   = (r: ChiTieu) => { setEditing(r); setModalOpen(true); };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const values = await form.validateFields();
      if (editing) { await chiTieuApi.update(editing.ID_ChiTieu, values); message.success('Cập nhật thành công'); }
      else         { await chiTieuApi.create(values);                      message.success('Thêm thành công'); }
      setModalOpen(false); load();
    } catch (e: unknown) {
      if (e instanceof Error && 'errorFields' in (e as object)) return;
      message.error('Lỗi khi lưu');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    try { await chiTieuApi.delete(id); message.success('Đã xóa chỉ tiêu'); load(); }
    catch { message.error('Không thể xóa — còn dữ liệu liên quan'); }
  };

  const filteredNhoms = filterLoai != null
    ? nhoms.filter(n => n.ID_LoaiThietBi === filterLoai)
    : nhoms;

  const loaiForNhom = (nhomId: number) => {
    const nhom = nhoms.find(n => n.ID_NhomChiTieu === nhomId);
    return nhom ? loais.find(l => l.ID_LoaiThietBi === nhom.ID_LoaiThietBi) : null;
  };

  const toggleExpand = (id: number) =>
    setExpandedKeys(prev => prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id]);

  const columns: ColumnsType<ChiTieu> = [
    { title: 'STT', key: 'stt', width: 50, align: 'center',
      render: (_, __, i) => <Text style={{ color: '#6b7280' }}>{i + 1}</Text> },
    { title: 'Mã', dataIndex: 'ID_ChiTieu', key: 'id', width: 60,
      render: v => <Text style={{ color: '#93c5fd', fontFamily: 'monospace' }}>{v}</Text> },
    { title: 'Tên chỉ tiêu', dataIndex: 'TenChiTieu', key: 'name', width: 280,
      render: v => <Text strong style={{ color: isDark ? '#e5e7eb' : '#111827' }}>{v ?? '—'}</Text>,
      sorter: (a, b) => (a.TenChiTieu ?? '').localeCompare(b.TenChiTieu ?? '') },
    { title: 'Nhóm', dataIndex: 'ID_NhomChiTieu', key: 'nhom', width: 220,
      render: (v, r) => {
        const loai = loaiForNhom(v);
        return (
          <div>
            <Text style={{ color: isDark ? '#9ca3af' : '#4b5563', fontSize: 12, display: 'block' }}>
              {r.TenNhom ?? nhoms.find(n => n.ID_NhomChiTieu === v)?.TenNhom ?? 'N/A'}
            </Text>
            {loai && <Tag color="blue" style={{ fontSize: 10 }}>{loai.KyHieu}</Tag>}
          </div>
        );
      },
      filters: filteredNhoms.map(n => ({ text: n.TenNhom, value: n.ID_NhomChiTieu })),
      onFilter: (val, r) => r.ID_NhomChiTieu === val },
    { title: 'Trọng số Wᵢ', dataIndex: 'TrongSo_Wi', key: 'w', width: 100, align: 'center',
      render: v => <Tag style={{ fontWeight: 500, fontSize: 14 }}>{Number(v)}</Tag>,
      sorter: (a, b) => a.TrongSo_Wi - b.TrongSo_Wi },
    { title: 'Kiểu tính điểm', dataIndex: 'LoaiTinhDiem', key: 'loai', width: 120, align: 'center',
      render: v => v === 'Rule'
        ? <Tag color="purple" icon={<FunctionOutlined />} style={{ fontSize: 11 }}>Biểu thức</Tag>
        : v === 'LF'
        ? <Tag color="magenta" icon={<CalendarOutlined />} style={{ fontSize: 11 }}>Mang tải (LF)</Tag>
        : <Tag color="blue"   icon={<SettingOutlined  />} style={{ fontSize: 11 }}>Ngưỡng</Tag> },
    { title: 'Trạng thái', dataIndex: 'TrangThai', key: 'status', width: 105,
      render: v => <Tag color={v === 1 ? 'success' : 'default'}>{v === 1 ? 'Hoạt động' : 'Ngừng'}</Tag>,
      filters: [{ text: 'Hoạt động', value: 1 }, { text: 'Ngừng', value: 0 }],
      onFilter: (val, r) => r.TrangThai === val },
    { title: 'Thao tác', key: 'actions', width: 140, align: 'center',
      render: (_, record) => (
        <Space>
          <Tooltip title={expandedKeys.includes(record.ID_ChiTieu) ? 'Ẩn' : 'Cấu hình ngưỡng / biểu thức'}>
            <Button
              size="small" icon={<UnorderedListOutlined />}
              type={expandedKeys.includes(record.ID_ChiTieu) ? 'primary' : 'default'}
              onClick={() => toggleExpand(record.ID_ChiTieu)}
            />
          </Tooltip>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm title="Xóa chỉ tiêu này?" okText="Xóa" cancelText="Hủy"
            okButtonProps={{ danger: true }} onConfirm={() => handleDelete(record.ID_ChiTieu)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ) },
  ];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ color: isDark ? '#f9fafb' : '#111827', margin: 0 }}>
          Chỉ tiêu & Ngưỡng điểm CBM
        </Title>
        <Text style={{ color: '#6b7280', fontSize: 13 }}>
          Cấu hình chỉ tiêu đánh giá và ngưỡng chấm điểm · {total} chỉ tiêu
        </Text>
      </div>

      <Card
        style={{ background: isDark ? '#0d1117' : '#fff', border: `1px solid ${isDark ? '#1f2937' : '#e5e7eb'}` }}
        styles={{ body: { padding: '16px 20px' } }}
      >
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }} wrap>
          <Space wrap>
            <Input.Search
              placeholder="Tìm tên chỉ tiêu..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: 240 }} allowClear
            />
            <Select<number | 0>
              value={filterLoai ?? 0}
              onChange={v => { setFilterLoai(v === 0 ? undefined : v); setFilterNhom(undefined); setPage(1); }}
              style={{ width: 170 }}
              options={[{ label: 'Tất cả loại TB', value: 0 }, ...loais.map(l => ({ label: `${l.TenLoaiTB} (${l.KyHieu})`, value: l.ID_LoaiThietBi }))]}
            />
            <Select<number | 0>
              value={filterNhom ?? 0}
              onChange={v => { setFilterNhom(v === 0 ? undefined : v); setPage(1); }}
              style={{ width: 230 }} showSearch
              options={[{ label: 'Tất cả nhóm', value: 0 }, ...filteredNhoms.map(n => ({ label: n.TenNhom, value: n.ID_NhomChiTieu }))]}
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
            expandedRowRender: record => <ExpandedRow record={record} />,
          }}
        />
      </Card>

      {/* ── Create / Edit ChiTieu modal ── */}
      <Modal
        title={editing ? `Cập nhật — ${editing.TenChiTieu}` : 'Thêm chỉ tiêu mới'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => { form.resetFields(); setModalOpen(false); }}
        okText={editing ? 'Cập nhật' : 'Thêm mới'} cancelText="Hủy"
        confirmLoading={saving} width={520} destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="ID_NhomChiTieu" label="Nhóm chỉ tiêu"
            rules={[{ required: true, message: 'Chọn nhóm' }]}>
            <Select placeholder="Chọn nhóm..." showSearch optionFilterProp="label"
              options={nhoms.map(n => ({ label: n.TenNhom, value: n.ID_NhomChiTieu }))} />
          </Form.Item>
          <Form.Item name="TenChiTieu" label="Tên chỉ tiêu"
            rules={[{ required: true, message: 'Nhập tên' }]}>
            <Input placeholder="VD: Điện áp đánh thủng (BDV)" />
          </Form.Item>
          <Form.Item name="TrongSo_Wi" label="Trọng số Wᵢ"
            tooltip="0 < Wᵢ ≤ 1. Tổng Wᵢ trong nhóm = 1.0">
            <InputNumber style={{ width: '100%' }} min={0} max={1} step={0.001} precision={3} placeholder="VD: 0.250" />
          </Form.Item>
          <Form.Item name="LoaiTinhDiem" label="Kiểu tính điểm"
            rules={[{ required: true }]}
            tooltip="Ngưỡng: so với khoảng số hoặc biểu thức đơn giản. Biểu thức: quy tắc phức tạp với nhiều biến. LF: chỉ tiêu đo theo tháng (VD: mang tải MBA), phân loại N0..N4 rồi tra ngưỡng.">
            <Radio.Group buttonStyle="solid">
              <Radio.Button value="Nguong"><SettingOutlined /> Ngưỡng</Radio.Button>
              <Radio.Button value="Rule"><FunctionOutlined /> Biểu thức (Rule)</Radio.Button>
              <Radio.Button value="LF"><CalendarOutlined /> Mang tải (LF)</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Divider style={{ borderColor: isDark ? '#1f2937' : '#e5e7eb', margin: '8px 0' }} />
          <Form.Item name="TrangThai" label="Trạng thái" rules={[{ required: true }]}>
            <Select options={[{ label: 'Hoạt động', value: 1 }, { label: 'Ngừng', value: 0 }]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
