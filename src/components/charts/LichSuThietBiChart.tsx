import { useEffect, useMemo, useState } from 'react';
import { Row, Col, Typography, Empty, Spin } from 'antd';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import dayjs from 'dayjs';
import type { LichSuNhom } from '../../types/entities';
import { thongKeApi, type LichSuCSSKDto } from '../../api/thongKe';
import { getCapDoByKey } from '../../theme/capDoSucKhoe';
import { csskBands } from './csskBands';

const { Text } = Typography;

const LINE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];

interface Props {
  idThietBi: number;
  lichSuList: LichSuNhom[];
  isDark: boolean;
}

/** Diễn biến theo thời gian của 1 thiết bị: (1) CSSK tổng 0–10 có nền dải cấp độ; (2) điểm từng nhóm chỉ tiêu qua các lần kiểm tra. */
export default function LichSuThietBiChart({ idThietBi, lichSuList, isDark }: Props) {
  const grid = isDark ? '#1e4a72' : '#e5e7eb';
  const dim = isDark ? '#9ca3af' : '#6b7280';
  const text = isDark ? '#f9fafb' : '#111827';
  const tooltipStyle = {
    background: isDark ? '#0e2c4a' : '#ffffff', border: `1px solid ${grid}`, borderRadius: 6, fontSize: 12, color: text,
  };

  const [cssk, setCssk] = useState<LichSuCSSKDto[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    thongKeApi.getLichSuThietBi(idThietBi)
      .then(d => { if (alive) setCssk(d); })
      .catch(() => { if (alive) setCssk([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [idThietBi]);

  const csskData = useMemo(
    () => [...cssk]
      .filter(x => x.tongDiem_Soqt != null)
      .sort((a, b) => new Date(a.ngayKiemTra).getTime() - new Date(b.ngayKiemTra).getTime())
      .map(x => ({
        ngay: dayjs(x.ngayKiemTra).format('DD/MM/YYYY'),
        diem: Number(x.tongDiem_Soqt),
        capDo: x.capDo,
        capDoLabel: x.capDoLabel,
      })),
    [cssk],
  );

  /** Pivot: mỗi lần kiểm tra là 1 dòng, mỗi nhóm chỉ tiêu là 1 cột điểm. */
  const nhomData = useMemo(() => {
    const nhoms = lichSuList.filter(l => l.Hang.some(h => h.DiemNhom != null));
    const byPhieu = new Map<number, Record<string, number | string | null>>();
    for (const l of nhoms) {
      for (const h of l.Hang) {
        const row = byPhieu.get(h.ID_Phieu) ?? { ngayTs: new Date(h.NgayKiemTra).getTime(), ngay: dayjs(h.NgayKiemTra).format('DD/MM/YYYY') };
        row[`n${l.ID_NhomChiTieu}`] = h.DiemNhom ?? null;
        byPhieu.set(h.ID_Phieu, row);
      }
    }
    const rows = [...byPhieu.values()].sort((a, b) => Number(a.ngayTs) - Number(b.ngayTs));
    return { nhoms, rows };
  }, [lichSuList]);

  const coCssk = csskData.length > 0;
  const coNhom = nhomData.rows.length > 0 && nhomData.nhoms.length > 0;

  if (loading) return <Spin />;
  if (!coCssk && !coNhom) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa đủ dữ liệu để vẽ biểu đồ" />;

  return (
    <Row gutter={[16, 16]}>
      {coCssk && (
        <Col xs={24} lg={coNhom ? 12 : 24}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>CSSK tổng qua các lần kiểm tra (thang 0–10)</Text>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={csskData} margin={{ left: -8, right: 16, top: 8, bottom: 4 }}>
              {csskBands(isDark)}
              <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
              <XAxis dataKey="ngay" tick={{ fill: dim, fontSize: 11 }} />
              <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fill: dim, fontSize: 11 }} />
              <Tooltip
                formatter={(v, _n, p) => [`${v} / 10 — ${p?.payload?.capDoLabel ?? ''}`, 'CSSK']}
                contentStyle={tooltipStyle}
              />
              <Line type="monotone" dataKey="diem" stroke={isDark ? '#e5e7eb' : '#111827'} strokeWidth={2}
                dot={(p: { cx?: number; cy?: number; index?: number; payload?: { capDo?: string } }) => (
                  <circle key={p.index} cx={p.cx} cy={p.cy} r={5}
                    fill={getCapDoByKey(p.payload?.capDo, isDark).color} stroke={isDark ? '#0e2c4a' : '#fff'} strokeWidth={1.5} />
                )}
                activeDot={{ r: 7 }} />
            </LineChart>
          </ResponsiveContainer>
        </Col>
      )}
      {coNhom && (
        <Col xs={24} lg={coCssk ? 12 : 24}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>Điểm từng nhóm chỉ tiêu qua các lần kiểm tra</Text>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={nhomData.rows} margin={{ left: -8, right: 16, top: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
              <XAxis dataKey="ngay" tick={{ fill: dim, fontSize: 11 }} />
              <YAxis domain={[0, 'auto']} tick={{ fill: dim, fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {nhomData.nhoms.map((n, i) => (
                <Line key={n.ID_NhomChiTieu} type="monotone" dataKey={`n${n.ID_NhomChiTieu}`} name={n.TenNhom}
                  stroke={LINE_COLORS[i % LINE_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Col>
      )}
    </Row>
  );
}
