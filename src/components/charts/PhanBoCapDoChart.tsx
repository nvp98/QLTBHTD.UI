import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { getCapDoByKey } from '../../theme/capDoSucKhoe';

export interface PhanBoCapDoRow {
  ten: string;
  tot: number;
  kha: number;
  trungBinh: number;
  canhBao: number;
  nguyHiem: number;
  chuaDo: number;
}

const SERIES = [
  { dataKey: 'nguyHiem',  name: 'Nguy hiểm',     key: 'nguyHiem' },
  { dataKey: 'canhBao',   name: 'Cảnh báo',      key: 'canhBao' },
  { dataKey: 'trungBinh', name: 'Trung bình',    key: 'trungBinh' },
  { dataKey: 'kha',       name: 'Khá',           key: 'kha' },
  { dataKey: 'tot',       name: 'Tốt',           key: 'tot' },
] as const;

interface Props {
  rows: PhanBoCapDoRow[];
  isDark: boolean;
  isMobile?: boolean;
  /** Đơn vị trong tooltip, mặc định "thiết bị". */
  donVi?: string;
}

/** Stacked bar ngang: mỗi hàng (trạm / loại thiết bị) là số thiết bị theo từng cấp CSSK — xấu nằm sát trục trái. */
export default function PhanBoCapDoChart({ rows, isDark, isMobile, donVi = 'thiết bị' }: Props) {
  const grid = isDark ? '#1e4a72' : '#e5e7eb';
  const dim = isDark ? '#9ca3af' : '#6b7280';
  const text = isDark ? '#f9fafb' : '#111827';
  const chuaDoColor = isDark ? '#374151' : '#d1d5db';

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, rows.length * 36 + 50)}>
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={grid} horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fill: dim, fontSize: 11 }} />
        <YAxis type="category" dataKey="ten" width={isMobile ? 105 : 160} tick={{ fill: text, fontSize: isMobile ? 10 : 12 }} />
        <Tooltip
          cursor={{ fill: isDark ? '#ffffff10' : '#00000008' }}
          formatter={(v, name) => [`${v} ${donVi}`, name]}
          contentStyle={{ background: isDark ? '#0e2c4a' : '#ffffff', border: `1px solid ${grid}`, borderRadius: 6, fontSize: 12, color: text }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {SERIES.map(s => (
          <Bar key={s.key} dataKey={s.dataKey} name={s.name} stackId="cap" barSize={18}
            fill={getCapDoByKey(s.key, isDark).color} />
        ))}
        <Bar dataKey="chuaDo" name="Chưa kiểm tra" stackId="cap" barSize={18} fill={chuaDoColor} />
      </BarChart>
    </ResponsiveContainer>
  );
}
