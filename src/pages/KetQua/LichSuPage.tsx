import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Col, Row, Select, Space, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { HistoryOutlined } from '@ant-design/icons';
import { thietBiApi } from '../../api/thietBi';
import { loaiThietBiApi } from '../../api/loaiThietBi';
import { nhomChiTieuApi } from '../../api/nhomChiTieu';
import { lichSuApi } from '../../api/lichSu';
import type { ThietBi, LoaiThietBi, NhomChiTieu, LichSuNhom, LichSuHang } from '../../types/entities';

const { Title, Text } = Typography;

/** Màu Tag theo thang điểm Sᵢ 0-3 (giống quy ước Ngưỡng ở ChiTieuPage). */
function mauTheoSi(si?: number | null) {
  if (si == null) return undefined;
  if (si >= 3) return 'success';
  if (si >= 2) return 'processing';
  if (si >= 1) return 'warning';
  return 'error';
}

export default function LichSuPage() {
  const navigate = useNavigate();

  const [loais, setLoais] = useState<LoaiThietBi[]>([]);
  const [thietBis, setThietBis] = useState<ThietBi[]>([]);
  const [nhoms, setNhoms] = useState<NhomChiTieu[]>([]);

  const [selectedLoai, setSelectedLoai] = useState<number | null>(null);
  const [selectedThietBi, setSelectedThietBi] = useState<number | null>(null);
  const [selectedNhom, setSelectedNhom] = useState<number | null>(null);

  const [lichSu, setLichSu] = useState<LichSuNhom | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loaiThietBiApi.getActive().then(setLoais).catch(() => message.error('Lỗi tải loại thiết bị'));
  }, []);

  useEffect(() => {
    if (!selectedLoai) { setThietBis([]); setNhoms([]); return; }
    setSelectedThietBi(null); setSelectedNhom(null); setLichSu(null);
    Promise.all([
      thietBiApi.getByLoai(selectedLoai),
      nhomChiTieuApi.getByLoai(selectedLoai),
    ]).then(([tbs, nh]) => { setThietBis(tbs); setNhoms(nh); })
      .catch(() => message.error('Lỗi tải thiết bị / nhóm chỉ tiêu'));
  }, [selectedLoai]);

  const load = useCallback(async () => {
    if (!selectedThietBi || !selectedNhom) return;
    setLoading(true);
    try {
      setLichSu(await lichSuApi.get(selectedThietBi, selectedNhom));
    } catch {
      message.error('Không thể tải lịch sử');
      setLichSu(null);
    } finally { setLoading(false); }
  }, [selectedThietBi, selectedNhom]);

  useEffect(() => { load(); }, [load]);

  const columns: ColumnsType<LichSuHang> = useMemo(() => {
    if (!lichSu) return [];
    const cols: ColumnsType<LichSuHang> = [
      {
        title: 'Ngày kiểm tra', dataIndex: 'NgayKiemTra', key: 'ngay', width: 130, fixed: 'left',
        render: v => new Date(v).toLocaleDateString('vi-VN'),
        sorter: (a, b) => new Date(a.NgayKiemTra).getTime() - new Date(b.NgayKiemTra).getTime(),
        defaultSortOrder: 'ascend',
      },
      {
        title: 'Số phiếu', dataIndex: 'SoPhieu', key: 'sophieu', width: 110,
        render: (v, r) => (
          <a onClick={() => navigate(`/ket-qua/${r.ID_Phieu}`)}>{v ?? `#${r.ID_Phieu}`}</a>
        ),
      },
    ];

    for (const ct of lichSu.ChiTieus) {
      cols.push({
        title: ct.TenChiTieu,
        key: `ct-${ct.ID_ChiTieu}`,
        width: 130,
        align: 'center',
        render: (_, r) => {
          const gt = r.GiaTriTheoChiTieu[String(ct.ID_ChiTieu)];
          if (!gt || (gt.GiaTri == null && gt.Si == null)) return <Text style={{ color: '#6b7280' }}>—</Text>;
          return (
            <Space size={4}>
              <Text style={{ fontFamily: 'monospace' }}>{gt.GiaTri ?? '—'}</Text>
              {gt.Si != null && <Tag color={mauTheoSi(gt.Si)} style={{ margin: 0, fontSize: 10 }}>Sᵢ={gt.Si}</Tag>}
            </Space>
          );
        },
      });
    }

    cols.push({
      title: `Điểm nhóm "${lichSu.TenNhom}"`,
      dataIndex: 'DiemNhom', key: 'diemnhom', width: 140, align: 'center', fixed: 'right',
      render: v => v == null
        ? <Text style={{ color: '#6b7280' }}>Chưa tính</Text>
        : <Tag color={mauTheoSi(v)} style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>{v}</Tag>,
    });

    return cols;
  }, [lichSu, navigate]);

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}><HistoryOutlined style={{ marginRight: 8 }} />Lịch sử đo & kết quả tính toán</Title>
      <Text style={{ color: '#6b7280', display: 'block', marginBottom: 16 }}>
        Xem toàn bộ lịch sử dữ liệu đo và điểm số đã tính, theo từng thiết bị + từng nhóm chỉ tiêu, qua các lần kiểm tra trước đây.
      </Text>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={7}>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>Loại thiết bị</Text>
            <Select
              style={{ width: '100%' }}
              placeholder="Chọn loại thiết bị"
              value={selectedLoai ?? undefined}
              onChange={setSelectedLoai}
              options={loais.map(l => ({ value: l.ID_LoaiThietBi, label: l.TenLoaiTB }))}
            />
          </Col>
          <Col span={8}>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>Thiết bị</Text>
            <Select
              style={{ width: '100%' }}
              placeholder="Chọn thiết bị"
              disabled={!selectedLoai}
              value={selectedThietBi ?? undefined}
              onChange={setSelectedThietBi}
              showSearch
              optionFilterProp="label"
              options={thietBis.map(t => ({ value: t.ID_ThietBi, label: t.TenThietBi }))}
              notFoundContent={selectedLoai ? 'Chưa có thiết bị nào' : undefined}
            />
          </Col>
          <Col span={9}>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>Nhóm chỉ tiêu</Text>
            <Select
              style={{ width: '100%' }}
              placeholder="Chọn nhóm chỉ tiêu"
              disabled={!selectedLoai}
              value={selectedNhom ?? undefined}
              onChange={setSelectedNhom}
              showSearch
              optionFilterProp="label"
              options={nhoms.map(n => ({ value: n.ID_NhomChiTieu, label: n.TenNhom }))}
              notFoundContent={selectedLoai ? 'Chưa có nhóm chỉ tiêu nào' : undefined}
            />
          </Col>
        </Row>
      </Card>

      <Card
        title={lichSu ? `${lichSu.TenThietBi} — ${lichSu.TenNhom}` : 'Chọn thiết bị + nhóm chỉ tiêu để xem lịch sử'}
        styles={{ body: { padding: 0 } }}
      >
        <Table<LichSuHang>
          rowKey="ID_Phieu"
          dataSource={lichSu?.Hang ?? []}
          columns={columns}
          loading={loading}
          size="small"
          scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 20, hideOnSinglePage: true }}
          locale={{ emptyText: selectedThietBi && selectedNhom ? 'Chưa có phiếu kiểm tra nào cho thiết bị + nhóm này' : 'Chọn thiết bị và nhóm chỉ tiêu ở trên' }}
        />
      </Card>
    </div>
  );
}
