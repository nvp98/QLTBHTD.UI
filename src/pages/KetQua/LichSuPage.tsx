import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Col, Empty, Flex, Row, Select, Space, Spin, Table, Tag, Tooltip, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { HistoryOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { thietBiApi } from '../../api/thietBi';
import { loaiThietBiApi } from '../../api/loaiThietBi';
import { nhomChiTieuApi } from '../../api/nhomChiTieu';
import { lichSuApi } from '../../api/lichSu';
import { phieuKiemTraApi } from '../../api/phieuKiemTra';
import type { ThietBi, LoaiThietBi, NhomChiTieu, LichSuNhom, ChiTietKiemTra } from '../../types/entities';
import LichSuThietBiChart from '../../components/charts/LichSuThietBiChart';
import { useThemeMode } from '../../theme/ThemeModeContext';
import { getCapDoByKey } from '../../theme/capDoSucKhoe';
import { keyOfTinhTrang } from '../../components/charts/csskBands';

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

/** 1 dòng của bảng = 1 phiếu × 1 nhóm chỉ tiêu (phiếu có 2 nhóm → 2 dòng). */
type LichSuDong = {
  rowKey: string;
  ID_Phieu: number;
  NgayKiemTra: string;
  SoPhieu?: string | null;
  DiemNhom?: number | null;
  ID_NhomChiTieu: number;
  TenNhom: string;
};

/** Chiều cao cố định của mỗi chỉ tiêu: 3 cột Chi tiết đo · Tình trạng · Khuyến cáo xếp chồng độc lập
 * trong cùng 1 dòng nên mỗi chỉ tiêu phải cao bằng nhau ở cả 3 cột thì mới thẳng hàng. */
const ITEM_H = 48;
const itemStyle = (isDark: boolean, last: boolean): React.CSSProperties => ({
  height: ITEM_H, display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden',
  borderBottom: last ? 'none' : `1px dashed ${isDark ? '#1e4a72' : '#e5e7eb'}`,
});

/** Bảng lịch sử: mỗi dòng 1 phiếu × 1 nhóm; trong dòng, các chỉ tiêu của nhóm xếp chồng ở 3 cột
 * Chi tiết đo · Tình trạng · Khuyến cáo. Cột cuối mở phiếu. */
function LichSuBang({ lichSuList, isDark }: { lichSuList: LichSuNhom[]; isDark: boolean }) {
  const navigate = useNavigate();
  const [chiTiets, setChiTiets] = useState<Record<number, ChiTietKiemTra[]>>({});
  const [loading, setLoading] = useState(false);

  // Tải chi tiết của từng phiếu (mỗi phiếu 1 lần, dùng chung cho các nhóm trong phiếu đó).
  useEffect(() => {
    const ids = [...new Set(lichSuList.flatMap(l => l.Hang.map(h => h.ID_Phieu)))];
    if (ids.length === 0) { setChiTiets({}); return; }
    let alive = true;
    setLoading(true);
    Promise.allSettled(ids.map(id => phieuKiemTraApi.getDetail(id).then(d => [id, d.ChiTiets ?? []] as const)))
      .then(rs => {
        if (!alive) return;
        const m: Record<number, ChiTietKiemTra[]> = {};
        let loi = 0;
        for (const r of rs) { if (r.status === 'fulfilled') m[r.value[0]] = r.value[1]; else loi++; }
        setChiTiets(m);
        if (loi > 0) message.warning(`Không tải được chi tiết của ${loi} phiếu`);
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [lichSuList]);

  const rows = useMemo<LichSuDong[]>(
    () => lichSuList.flatMap(l => l.Hang.map(h => ({
      rowKey: `${l.ID_NhomChiTieu}-${h.ID_Phieu}`,
      ID_Phieu: h.ID_Phieu, NgayKiemTra: h.NgayKiemTra, SoPhieu: h.SoPhieu, DiemNhom: h.DiemNhom,
      ID_NhomChiTieu: l.ID_NhomChiTieu, TenNhom: l.TenNhom,
    }))),
    [lichSuList],
  );

  /** Chỉ tiêu của đúng nhóm trong phiếu. null = chưa tải xong. */
  const itemsOf = (r: LichSuDong): ChiTietKiemTra[] | null => {
    const all = chiTiets[r.ID_Phieu];
    return all ? all.filter(ct => ct.ID_NhomChiTieu === r.ID_NhomChiTieu) : null;
  };
  const trong = (items: ChiTietKiemTra[] | null) =>
    items == null ? (loading ? <Spin size="small" /> : <Text style={{ color: '#9ca3af' }}>—</Text>)
      : items.length === 0 ? <Text style={{ color: '#9ca3af' }}>Không có chỉ tiêu</Text> : null;

  const columns: ColumnsType<LichSuDong> = useMemo(() => [
    {
      title: 'Ngày kiểm tra', dataIndex: 'NgayKiemTra', key: 'ngay', width: 115,
      render: v => new Date(v).toLocaleDateString('vi-VN'),
      sorter: (a, b) => new Date(a.NgayKiemTra).getTime() - new Date(b.NgayKiemTra).getTime(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Số phiếu', dataIndex: 'SoPhieu', key: 'sophieu', width: 150,
      render: (v, r) => v ?? `#${r.ID_Phieu}`,
    },
    {
      title: 'Nhóm chỉ tiêu', dataIndex: 'TenNhom', key: 'nhom', width: 170,
      filters: lichSuList.filter(l => l.Hang.length > 0).map(l => ({ text: l.TenNhom, value: l.ID_NhomChiTieu })),
      onFilter: (v, r) => r.ID_NhomChiTieu === v,
      render: v => <Text strong>{v}</Text>,
    },
    {
      title: 'Chi tiết đo', key: 'chitiet', width: 300,
      render: (_, r) => {
        const items = itemsOf(r);
        const t = trong(items);
        if (t) return t;
        return items!.map((ct, i) => (
          <div key={ct.ID_ChiTiet} style={itemStyle(isDark, i === items!.length - 1)}>
            <Text strong style={{ fontSize: 13 }} ellipsis>{ct.TenChiTieu}</Text>
            <Flex align="center" gap={8} style={{ overflow: 'hidden' }}>
              {renderGiaTriDo(ct)}
              {ct.GiaTriNhap_Chu && <Tag style={{ margin: 0 }}>{ct.GiaTriNhap_Chu}</Tag>}
              {ct.Diem_Si_DatDuoc != null && (
                <Tag color={mauTheoSi(ct.Diem_Si_DatDuoc)} style={{ margin: 0, fontFamily: 'monospace' }}>Sᵢ {ct.Diem_Si_DatDuoc}</Tag>
              )}
            </Flex>
          </div>
        ));
      },
    },
    {
      title: 'Tình trạng', key: 'tinhtrang', width: 120, align: 'center',
      render: (_, r) => {
        const items = itemsOf(r);
        if (items == null || items.length === 0) return null;
        return items.map((ct, i) => {
          const key = keyOfTinhTrang(ct.TinhTrang);
          const tt = key ? getCapDoByKey(key, isDark) : null;
          return (
            <div key={ct.ID_ChiTiet} style={{ ...itemStyle(isDark, i === items.length - 1), alignItems: 'center' }}>
              {ct.TinhTrang
                ? <Tag style={{ margin: 0, color: tt?.color, background: tt?.bg, borderColor: tt?.border }}>{ct.TinhTrang}</Tag>
                : <Text style={{ color: '#9ca3af' }}>—</Text>}
            </div>
          );
        });
      },
    },
    {
      title: 'Khuyến cáo', key: 'khuyencao', width: 280,
      render: (_, r) => {
        const items = itemsOf(r);
        if (items == null || items.length === 0) return null;
        return items.map((ct, i) => (
          <div key={ct.ID_ChiTiet} style={itemStyle(isDark, i === items.length - 1)}>
            {ct.HanhDongKhuyenCao ? (
              <Tooltip title={ct.HanhDongKhuyenCao}>
                <Text style={{
                  color: isDark ? '#fbbf24' : '#b45309', fontSize: 12, lineHeight: '16px',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {ct.HanhDongKhuyenCao}
                </Text>
              </Tooltip>
            ) : <Text style={{ color: '#9ca3af' }}>—</Text>}
          </div>
        ));
      },
    },
    {
      title: 'Điểm nhóm', dataIndex: 'DiemNhom', key: 'diemnhom', width: 100, align: 'center',
      sorter: (a, b) => (a.DiemNhom ?? -1) - (b.DiemNhom ?? -1),
      render: v => v == null
        ? <Text style={{ color: '#6b7280' }}>Chưa tính</Text>
        : <Tag color={mauTheoSi(v)} style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, margin: 0 }}>{v}</Tag>,
    },
    {
      title: '', key: 'xem', width: 110, align: 'center', fixed: 'right',
      render: (_, r) => (
        <Button type="link" icon={<EyeOutlined />} onClick={() => navigate(`/ket-qua/${r.ID_Phieu}`)}>
          Xem phiếu
        </Button>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [lichSuList, chiTiets, loading, isDark, navigate]);

  return (
    <Table<LichSuDong>
      rowKey="rowKey"
      dataSource={rows}
      columns={columns}
      size="small"
      loading={loading}
      scroll={{ x: 'max-content' }}
      pagination={{ pageSize: 15, hideOnSinglePage: true, showTotal: t => `${t} lần kiểm tra` }}
      locale={{ emptyText: 'Chưa có phiếu kiểm tra nào' }}
    />
  );
}

export default function LichSuPage() {
  const { mode } = useThemeMode();
  const [loais, setLoais] = useState<LoaiThietBi[]>([]);
  const [thietBis, setThietBis] = useState<ThietBi[]>([]);
  const [nhoms, setNhoms] = useState<NhomChiTieu[]>([]);

  // Bộ lọc nằm trên URL (?loai=&thietBi=&nhom=): bấm "Xem phiếu" rồi Back, hoặc F5 / gửi link, vẫn giữ nguyên lựa chọn.
  const [searchParams, setSearchParams] = useSearchParams();
  const readId = (key: string): number | null => {
    const n = Number(searchParams.get(key));
    return Number.isInteger(n) && n > 0 ? n : null;
  };
  const selectedLoai = readId('loai');
  const selectedThietBi = readId('thietBi');
  const selectedNhom = readId('nhom');
  const updateParams = (changes: Record<string, number | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([k, v]) => { if (v == null) next.delete(k); else next.set(k, String(v)); });
    setSearchParams(next, { replace: true }); // replace: không đẩy thêm mục vào lịch sử, Back vẫn quay về đúng trang trước
  };
  // Đổi loại thiết bị thì thiết bị / nhóm cũ không còn hợp lệ → bỏ chọn.
  const setSelectedLoai = (id: number | null) => updateParams({ loai: id, thietBi: null, nhom: null });
  const setSelectedThietBi = (id: number | null) => updateParams({ thietBi: id });
  const setSelectedNhom = (id: number | null) => updateParams({ nhom: id });

  const [lichSuList, setLichSuList] = useState<LichSuNhom[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loaiThietBiApi.getActive().then(setLoais).catch(() => message.error('Lỗi tải loại thiết bị'));
  }, []);

  useEffect(() => {
    if (!selectedLoai) { setThietBis([]); setNhoms([]); return; }
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
    <div>
      <Title level={3}><HistoryOutlined style={{ marginRight: 8 }} />Lịch sử đo & kết quả tính toán</Title>
      <Text style={{ color: '#6b7280', display: 'block', marginBottom: 16 }}>
        Xem chi tiết lịch sử dữ liệu đo và điểm số đã tính của từng nhóm chỉ tiêu, theo từng loại thiết bị và từng thiết bị, qua các lần kiểm tra trước đây.
      </Text>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={7}>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>Loại thiết bị</Text>
            <Select
              style={{ width: '100%' }}
              placeholder="Chọn loại thiết bị"
              value={selectedLoai ?? undefined}
              onChange={v => setSelectedLoai(v ?? null)}
              options={loais.map(l => ({ value: l.ID_LoaiThietBi, label: l.TenLoaiTB }))}
            />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>Thiết bị</Text>
            <Select
              style={{ width: '100%' }}
              placeholder="Chọn thiết bị"
              disabled={!selectedLoai}
              value={selectedThietBi ?? undefined}
              onChange={v => setSelectedThietBi(v ?? null)}
              showSearch
              optionFilterProp="label"
              options={thietBis.map(t => ({ value: t.ID_ThietBi, label: t.TenThietBi }))}
              notFoundContent={selectedLoai ? 'Chưa có thiết bị nào' : undefined}
            />
          </Col>
          <Col xs={24} lg={9}>
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
        <>
        <Card
          title={`${tenThietBi ?? ''} — diễn biến theo thời gian`}
          style={{ marginBottom: 16 }}
          loading={loading}
        >
          <LichSuThietBiChart idThietBi={selectedThietBi} lichSuList={lichSuList} isDark={mode === 'dark'} />
        </Card>
        <Card
          title={`${tenThietBi ?? ''} — chi tiết theo từng nhóm chỉ tiêu`}
          styles={{ body: { padding: 12 } }}
          loading={loading}
        >
          {lichSuList.every(l => l.Hang.length === 0) && !loading ? (
            <Empty description="Chưa có phiếu kiểm tra nào cho thiết bị này" />
          ) : (
            <LichSuBang lichSuList={lichSuList} isDark={mode === 'dark'} />
          )}
        </Card>
        </>
      )}
    </div>
  );
}
