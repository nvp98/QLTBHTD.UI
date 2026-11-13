import { useEffect, useMemo, useState } from 'react';
import { Flex, Select, Typography, Empty, Spin, Tag, Segmented, Button, message } from 'antd';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts';
import dayjs from 'dayjs';
import { nhomChiTieuApi } from '../../api/nhomChiTieu';
import { lichSuApi } from '../../api/lichSu';
import type { NhomChiTieu, LichSuNhom } from '../../types/entities';

const { Text } = Typography;

const LINE_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6',
  '#f97316', '#6366f1', '#84cc16', '#ef4444', '#06b6d4', '#a855f7',
];

type CheDo = 'giaTri' | 'si';
type Dong = Record<string, number | string | null | undefined>;

interface Props {
  idThietBi: number;
  idLoaiTB: number;
  isDark: boolean;
}

/**
 * Line chart dữ liệu đo theo NHÓM chỉ tiêu: mỗi chỉ tiêu trong nhóm là 1 đường, trục ngang là các lần kiểm tra.
 * Lần đo hiện tại = điểm cuối (chấm to + vạch đứng). Bấm chú giải để bật/tắt đường.
 * "Điểm Sᵢ" đưa mọi chỉ tiêu về cùng thang 0–3 nên so sánh được khi các chỉ tiêu khác đơn vị.
 */
export default function DuLieuDoNhomChart({ idThietBi, idLoaiTB, isDark }: Props) {
  const grid = isDark ? '#1e4a72' : '#e5e7eb';
  const dim = isDark ? '#9ca3af' : '#6b7280';
  const text = isDark ? '#f9fafb' : '#111827';

  const [nhoms, setNhoms] = useState<NhomChiTieu[]>([]);
  const [idNhom, setIdNhom] = useState<number | null>(null);
  const [lichSu, setLichSu] = useState<LichSuNhom | null>(null);
  const [loading, setLoading] = useState(false);
  const [cheDo, setCheDo] = useState<CheDo>('giaTri');
  const [an, setAn] = useState<Set<string>>(new Set());

  useEffect(() => {
    setIdNhom(null); setLichSu(null); setNhoms([]);
    let alive = true;
    nhomChiTieuApi.getByLoai(idLoaiTB)
      .then(d => { if (alive) { setNhoms(d); if (d.length > 0) setIdNhom(d[0].ID_NhomChiTieu); } })
      .catch(() => { if (alive) message.error('Lỗi tải nhóm chỉ tiêu'); });
    return () => { alive = false; };
  }, [idThietBi, idLoaiTB]);

  useEffect(() => {
    setAn(new Set());
    if (idNhom == null) { setLichSu(null); return; }
    let alive = true;
    setLoading(true);
    lichSuApi.get(idThietBi, idNhom)
      .then(d => { if (alive) setLichSu(d); })
      .catch(() => { if (alive) { setLichSu(null); message.error('Không thể tải dữ liệu đo của nhóm'); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [idThietBi, idNhom]);

  const { rows, series, lastIdx } = useMemo(() => {
    const hang = [...(lichSu?.Hang ?? [])].sort((a, b) => new Date(a.NgayKiemTra).getTime() - new Date(b.NgayKiemTra).getTime());
    const seen = new Map<string, number>();
    const data: Dong[] = hang.map(h => {
      const base = dayjs(h.NgayKiemTra).format('DD/MM/YYYY');
      const n = (seen.get(base) ?? 0) + 1;
      seen.set(base, n);
      const row: Dong = { nhan: n > 1 ? `${base} (${n})` : base, soPhieu: h.SoPhieu ?? `#${h.ID_Phieu}`, diemNhom: h.DiemNhom ?? null };
      for (const c of lichSu?.ChiTieus ?? []) {
        const gt = h.GiaTriTheoChiTieu[String(c.ID_ChiTieu)];
        const v = cheDo === 'si' ? gt?.Si : gt?.GiaTri;
        row[`c${c.ID_ChiTieu}`] = v != null ? Number(v) : null;
      }
      return row;
    });
    // Chỉ vẽ chỉ tiêu có ít nhất 1 giá trị số.
    const sr = (lichSu?.ChiTieus ?? [])
      .filter(c => data.some(r => typeof r[`c${c.ID_ChiTieu}`] === 'number'))
      .map(c => ({ id: `c${c.ID_ChiTieu}`, name: c.TenChiTieu }));
    const last: Record<string, number> = {};
    for (const s of sr) for (let i = data.length - 1; i >= 0; i--) if (typeof data[i][s.id] === 'number') { last[s.id] = i; break; }
    return { rows: data, series: sr, lastIdx: last };
  }, [lichSu, cheDo]);

  const hienThi = series.filter(s => !an.has(s.id));
  const tooltipStyle = {
    background: isDark ? '#0e2c4a' : '#ffffff', border: `1px solid ${grid}`, borderRadius: 6, fontSize: 12, color: text,
  };
  const toggle = (sid: string) => setAn(prev => {
    const n = new Set(prev);
    if (n.has(sid)) n.delete(sid); else n.add(sid);
    return n;
  });

  return (
    <Flex vertical gap={12}>
      <Flex gap={12} wrap="wrap" align="center">
        <Select
          style={{ minWidth: 280 }} placeholder="Chọn nhóm chỉ tiêu" showSearch optionFilterProp="label"
          value={idNhom ?? undefined} onChange={v => setIdNhom(v ?? null)}
          options={nhoms.map(n => ({ value: n.ID_NhomChiTieu, label: n.TenNhom }))}
          notFoundContent="Loại thiết bị này chưa có nhóm chỉ tiêu"
        />
        <Segmented
          value={cheDo} onChange={v => setCheDo(v as CheDo)}
          options={[{ label: 'Giá trị đo', value: 'giaTri' }, { label: 'Điểm Sᵢ (cùng thang 0–3)', value: 'si' }]}
        />
        {series.length > 1 && (
          <Flex gap={4}>
            <Button size="small" onClick={() => setAn(new Set())}>Hiện tất cả</Button>
            <Button size="small" onClick={() => setAn(new Set(series.map(s => s.id)))}>Ẩn tất cả</Button>
          </Flex>
        )}
      </Flex>

      {idNhom == null ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chọn nhóm chỉ tiêu để xem dữ liệu đo qua các lần kiểm tra" />
      ) : loading ? (
        <Spin />
      ) : rows.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nhóm chỉ tiêu này chưa có lần đo nào" />
      ) : series.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={cheDo === 'si' ? 'Chưa có điểm Sᵢ để vẽ' : 'Các chỉ tiêu trong nhóm không có giá trị số (nhập dạng chữ) — thử xem theo Điểm Sᵢ'} />
      ) : (
        <>
          <Flex gap={6} wrap="wrap" align="center">
            <Text style={{ color: dim, fontSize: 12 }}>
              Lần đo hiện tại ({String(rows[rows.length - 1].nhan)}{rows.length > 1 ? `, ${rows.length} lần đo` : ''}):
            </Text>
            {hienThi.map(s => {
              const i = lastIdx[s.id];
              const cur = rows[i][s.id] as number;
              let prev: number | undefined;
              for (let j = i - 1; j >= 0; j--) if (typeof rows[j][s.id] === 'number') { prev = rows[j][s.id] as number; break; }
              const d = prev != null ? cur - prev : null;
              const idx = series.findIndex(x => x.id === s.id);
              return (
                <Tag key={s.id} style={{ margin: 0, fontFamily: 'monospace', borderColor: LINE_COLORS[idx % LINE_COLORS.length] }}>
                  {s.name}: {cur}
                  {d != null && d !== 0 && <> {d > 0 ? '▲' : '▼'} {Math.abs(Number(d.toFixed(4)))}</>}
                </Tag>
              );
            })}
          </Flex>

          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={rows} margin={{ left: -4, right: 24, top: 12, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
              <XAxis dataKey="nhan" tick={{ fill: dim, fontSize: 11 }} />
              <YAxis domain={cheDo === 'si' ? [0, 3] : ['auto', 'auto']} ticks={cheDo === 'si' ? [0, 1, 2, 3] : undefined}
                tick={{ fill: dim, fontSize: 11 }} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={(label, p) => {
                  const pl = p?.[0]?.payload as Dong | undefined;
                  return `${label} — phiếu ${pl?.soPhieu ?? ''}${pl?.diemNhom != null ? ` · điểm nhóm ${pl.diemNhom}` : ''}`;
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, cursor: 'pointer' }}
                onClick={e => toggle(String(e.dataKey))}
                formatter={(value, e) => (
                  <span style={{ color: an.has(String(e.dataKey)) ? dim : text, textDecoration: an.has(String(e.dataKey)) ? 'line-through' : 'none' }}>
                    {value}
                  </span>
                )}
              />
              {rows.length > 1 && (
                <ReferenceLine x={String(rows[rows.length - 1].nhan)} stroke={dim} strokeDasharray="4 4"
                  label={{ value: 'Hiện tại', fill: dim, fontSize: 11, position: 'insideTopRight' }} />
              )}
              {series.map((s, i) => {
                const color = LINE_COLORS[i % LINE_COLORS.length];
                return (
                  <Line key={s.id} dataKey={s.id} name={s.name} type="monotone" stroke={color} strokeWidth={2}
                    connectNulls hide={an.has(s.id)}
                    dot={(p: { cx?: number; cy?: number; index?: number; payload?: Dong }) => {
                      if (p.cx == null || p.cy == null || typeof p.payload?.[s.id] !== 'number')
                        return <g key={`${s.id}-${p.index}`} />;
                      const last = p.index === lastIdx[s.id];
                      return (
                        <circle key={`${s.id}-${p.index}`} cx={p.cx} cy={p.cy} r={last ? 7 : 3.5} fill={color}
                          stroke={last ? text : (isDark ? '#0e2c4a' : '#fff')} strokeWidth={last ? 2.5 : 1} />
                      );
                    }}
                    activeDot={{ r: 8 }} />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
          <Text style={{ color: dim, fontSize: 11 }}>
            Bấm vào tên đường ở chú giải để ẩn/hiện. Chấm to viền đậm là lần đo hiện tại; các chấm nhỏ phía trước là những lần đo trước.
            {cheDo === 'giaTri' && ' Nếu các chỉ tiêu khác đơn vị làm đường bị dồn, chuyển sang "Điểm Sᵢ" hoặc ẩn bớt đường.'}
          </Text>
        </>
      )}
    </Flex>
  );
}
