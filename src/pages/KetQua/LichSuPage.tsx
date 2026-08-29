import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Col, Collapse, Empty, Row, Select, Space, Spin, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { HistoryOutlined } from '@ant-design/icons';
import { thietBiApi } from '../../api/thietBi';
import { loaiThietBiApi } from '../../api/loaiThietBi';
import { nhomChiTieuApi } from '../../api/nhomChiTieu';
import { lichSuApi } from '../../api/lichSu';
import { phieuKiemTraApi } from '../../api/phieuKiemTra';
import type { ThietBi, LoaiThietBi, NhomChiTieu, LichSuNhom, LichSuHang, ChiTietKiemTra } from '../../types/entities';

const { Title, Text } = Typography;

/** Màu Tag theo thang điểm Sᵢ 0-3 (giống quy ước Ngưỡng ở ChiTieuPage). */
function mauTheoSi(si?: number | null) {
  if (si == null) return undefined;
  if (si >= 3) return 'success';
  if (si >= 2) return 'processing';
  if (si >= 1) return 'warning';
  return 'error';
}

/** Cột "Giá trị đo" theo đúng cách hiển thị trong trang Chi tiết phiếu. */
function renderGiaTriDo(r: ChiTietKiemTra) {
  if (r.GiaTriNhap_So !== undefined && r.GiaTriNhap_So !== null)
    return <Text style={{ fontFamily: 'monospace' }}>{r.GiaTriNhap_So}</Text>;
  if (r.DanhSachInput && r.DanhSachInput.length > 0)
    return (
      <Space size={4} wrap>
        {r.DanhSachInput.map(iv => (
          <Tag key={iv.MaInput} style={{ fontFamily: 'monospace', fontSize: 11, margin: 0 }}>
            {iv.MaInput}={iv.GiaTriSo}
          </Tag>
        ))}
      </Space>
    );
  return <Text style={{ color: '#9ca3af' }}>—</Text>;
}

/** Bảng chi tiết từng chỉ tiêu bên trong 1 phiếu — giống hệt trang Chi tiết phiếu (PhieuDetailPage). */
const CHI_TIET_COLUMNS: ColumnsType<ChiTietKiemTra> = [
  { title: 'Chỉ tiêu', dataIndex: 'TenChiTieu', key: 'ten' },
  { title: 'Giá trị đo', key: 'gtso', width: 200, render: (_, r) => renderGiaTriDo(r) },
  {
    title: 'Giá trị chữ', dataIndex: 'GiaTriNhap_Chu', key: 'gtchu', width: 130,
    render: v => v || <Text style={{ color: '#9ca3af' }}>—</Text>,
  },
  {
    title: 'Điểm Sᵢ', dataIndex: 'Diem_Si_DatDuoc', key: 'diem', width: 90, align: 'center',
    render: v => v == null
      ? <Text style={{ color: '#9ca3af' }}>—</Text>
      : <Tag color={mauTheoSi(v)} style={{ fontFamily: 'monospace', margin: 0 }}>{v}</Tag>,
  },
  {
    title: 'Khuyến cáo hành động', dataIndex: 'HanhDongKhuyenCao', key: 'khuyencao',
    render: v => v
      ? <Text style={{ color: '#b45309', fontSize: 12 }}>{v}</Text>
      : <Text style={{ color: '#9ca3af', fontSize: 12 }}>—</Text>,
  },
  {
    title: 'Ghi chú', dataIndex: 'GhiChu', key: 'ghichu',
    render: v => <Text style={{ color: '#6b7280', fontSize: 12 }}>{v || '—'}</Text>,
  },
];

/** Nội dung "chi tiết trong phiếu" hiển thị khi mở 1 dòng (lazy-load theo ID_Phieu),
 * CHỈ lấy các chỉ tiêu thuộc đúng nhóm chỉ tiêu đang xem (lọc theo ID_NhomChiTieu). */
function ChiTietPhieuExpand({ idPhieu, idNhom }: { idPhieu: number; idNhom: number }) {
  const [loading, setLoading] = useState(true);
  const [chiTiets, setChiTiets] = useState<ChiTietKiemTra[]>([]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    phieuKiemTraApi.getDetail(idPhieu)
      .then(d => {
        if (!alive) return;
        setChiTiets((d.ChiTiets ?? []).filter(ct => ct.ID_NhomChiTieu === idNhom));
      })
      .catch(() => { if (alive) message.error('Không thể tải chi tiết phiếu'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [idPhieu, idNhom]);

  return (
    <Spin spinning={loading}>
      <Table<ChiTietKiemTra>
        rowKey="ID_ChiTiet"
        dataSource={chiTiets}
        columns={CHI_TIET_COLUMNS}
        size="small"
        pagination={false}
        locale={{ emptyText: 'Không có chỉ tiêu' }}
      />
    </Spin>
  );
}

function buildColumns(lichSu: LichSuNhom): ColumnsType<LichSuHang> {
  const cols: ColumnsType<LichSuHang> = [
    {
      title: 'Ngày kiểm tra', dataIndex: 'NgayKiemTra', key: 'ngay', width: 130, fixed: 'left',
      render: v => new Date(v).toLocaleDateString('vi-VN'),
      sorter: (a, b) => new Date(a.NgayKiemTra).getTime() - new Date(b.NgayKiemTra).getTime(),
      defaultSortOrder: 'ascend',
    },
    {
      title: 'Số phiếu', dataIndex: 'SoPhieu', key: 'sophieu', width: 110,
      render: (v, r) => v ?? `#${r.ID_Phieu}`,
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
}

function LichSuNhomTable({ lichSu }: { lichSu: LichSuNhom }) {
  const columns = useMemo(() => buildColumns(lichSu), [lichSu]);
  return (
    <Table<LichSuHang>
      rowKey="ID_Phieu"
      dataSource={lichSu.Hang}
      columns={columns}
      size="small"
      scroll={{ x: 'max-content' }}
      pagination={{ pageSize: 20, hideOnSinglePage: true }}
      locale={{ emptyText: 'Chưa có phiếu kiểm tra nào cho nhóm này' }}
      expandable={{
        expandedRowRender: r => <ChiTietPhieuExpand idPhieu={r.ID_Phieu} idNhom={lichSu.ID_NhomChiTieu} />,
      }}
    />
  );
}

export default function LichSuPage() {
  const [loais, setLoais] = useState<LoaiThietBi[]>([]);
  const [thietBis, setThietBis] = useState<ThietBi[]>([]);
  const [nhoms, setNhoms] = useState<NhomChiTieu[]>([]);

  const [selectedLoai, setSelectedLoai] = useState<number | null>(null);
  const [selectedThietBi, setSelectedThietBi] = useState<number | null>(null);
  const [selectedNhom, setSelectedNhom] = useState<number | null>(null);

  const [lichSuList, setLichSuList] = useState<LichSuNhom[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loaiThietBiApi.getActive().then(setLoais).catch(() => message.error('Lỗi tải loại thiết bị'));
  }, []);

  useEffect(() => {
    if (!selectedLoai) { setThietBis([]); setNhoms([]); return; }
    setSelectedThietBi(null); setSelectedNhom(null); setLichSuList([]);
    Promise.all([
      thietBiApi.getByLoai(selectedLoai),
      nhomChiTieuApi.getByLoai(selectedLoai),
    ]).then(([tbs, nh]) => { setThietBis(tbs); setNhoms(nh); })
      .catch(() => message.error('Lỗi tải thiết bị / nhóm chỉ tiêu'));
  }, [selectedLoai]);

  const load = useCallback(async () => {
    if (!selectedThietBi) { setLichSuList([]); return; }
    const idsNhom = selectedNhom ? [selectedNhom] : nhoms.map(n => n.ID_NhomChiTieu);
    if (idsNhom.length === 0) { setLichSuList([]); return; }
    setLoading(true);
    try {
      const results = await Promise.all(
        idsNhom.map(idNhom => lichSuApi.get(selectedThietBi, idNhom)),
      );
      setLichSuList(results);
    } catch {
      message.error('Không thể tải lịch sử');
      setLichSuList([]);
    } finally { setLoading(false); }
  }, [selectedThietBi, selectedNhom, nhoms]);

  useEffect(() => { load(); }, [load]);

  const tenThietBi = thietBis.find(t => t.ID_ThietBi === selectedThietBi)?.TenThietBi;

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}><HistoryOutlined style={{ marginRight: 8 }} />Lịch sử đo & kết quả tính toán</Title>
      <Text style={{ color: '#6b7280', display: 'block', marginBottom: 16 }}>
        Xem chi tiết lịch sử dữ liệu đo và điểm số đã tính của từng nhóm chỉ tiêu, theo từng loại thiết bị và từng thiết bị, qua các lần kiểm tra trước đây.
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
            <Text strong style={{ display: 'block', marginBottom: 6 }}>Nhóm chỉ tiêu (tùy chọn)</Text>
            <Select
              style={{ width: '100%' }}
              placeholder="Tất cả nhóm chỉ tiêu"
              allowClear
              disabled={!selectedLoai}
              value={selectedNhom ?? undefined}
              onChange={v => setSelectedNhom(v ?? null)}
              showSearch
              optionFilterProp="label"
              options={nhoms.map(n => ({ value: n.ID_NhomChiTieu, label: n.TenNhom }))}
              notFoundContent={selectedLoai ? 'Chưa có nhóm chỉ tiêu nào' : undefined}
            />
          </Col>
        </Row>
      </Card>

      {!selectedThietBi ? (
        <Card>
          <Empty description="Chọn loại thiết bị và thiết bị để xem lịch sử" />
        </Card>
      ) : (
        <Card
          title={`${tenThietBi ?? ''} — chi tiết theo từng nhóm chỉ tiêu`}
          styles={{ body: { padding: 12 } }}
          loading={loading}
        >
          {lichSuList.length === 0 && !loading ? (
            <Empty description="Chưa có nhóm chỉ tiêu hoặc phiếu kiểm tra nào cho thiết bị này" />
          ) : (
            <Collapse
              defaultActiveKey={lichSuList.map(l => l.ID_NhomChiTieu)}
              items={lichSuList.map(l => ({
                key: l.ID_NhomChiTieu,
                label: (
                  <Space>
                    <Text strong>{l.TenNhom}</Text>
                    <Text style={{ color: '#6b7280', fontSize: 12 }}>({l.Hang.length} lần kiểm tra)</Text>
                  </Space>
                ),
                children: <LichSuNhomTable lichSu={l} />,
              }))}
            />
          )}
        </Card>
      )}
    </div>
  );
}
