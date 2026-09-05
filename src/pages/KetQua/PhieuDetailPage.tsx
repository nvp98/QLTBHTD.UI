import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Row, Col, Typography, Flex, Tag, Button, Spin, Progress,
  Table, Divider, message, Modal, Space, Tooltip, Collapse,
} from 'antd';
import { ArrowLeftOutlined, FileTextOutlined, HistoryOutlined, ReloadOutlined } from '@ant-design/icons';
import { phieuKiemTraApi } from '../../api/phieuKiemTra';
import { tinhDiemApi } from '../../api/tinhDiem';
import type { PhieuKiemTraDetailDto, ChiTietKiemTra, LichSuChiTieu } from '../../types/entities';
import { useThemeMode } from '../../theme/ThemeModeContext';
import { getCapDoSucKhoe, capDoKeyOf } from '../../theme/capDoSucKhoe';

const { Title, Text } = Typography;

/** Hiển thị ngày theo giờ địa phương, tránh lệch UTC */
const fmtDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const RANK_LETTER: Record<ReturnType<typeof capDoKeyOf>, string> = {
  tot: 'A', kha: 'B', trungBinh: 'C', canhBao: 'D', nguyHiem: 'E',
};

function rankInfo(hi: number, isDark: boolean) {
  const info = getCapDoSucKhoe(hi, isDark);
  return { rank: RANK_LETTER[capDoKeyOf(hi)], color: info.color, label: info.label, bg: info.bg, border: info.border };
}

export default function PhieuDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  const [phieu, setPhieu] = useState<PhieuKiemTraDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);
  const [recomputingSi, setRecomputingSi] = useState(false);

  // Modal "Lịch sử đo" — tất cả các lần đo trước đây của 1 chỉ tiêu trên cùng thiết bị,
  // KHÔNG liên quan tới fallback "lấy Si gần nhất" dùng khi tính điểm nhóm (chỉ dùng để xem xu hướng).
  const [lichSuOpen, setLichSuOpen] = useState(false);
  const [lichSuLoading, setLichSuLoading] = useState(false);
  const [lichSuChiTieu, setLichSuChiTieu] = useState<{ ten: string; data: LichSuChiTieu[] } | null>(null);

  const openLichSu = async (ct: ChiTietKiemTra) => {
    if (!phieu) return;
    setLichSuOpen(true);
    setLichSuLoading(true);
    try {
      const data = await phieuKiemTraApi.getLichSuChiTieu(phieu.ID_ThietBi, ct.ID_ChiTieu);
      setLichSuChiTieu({ ten: ct.TenChiTieu ?? '', data });
    } catch {
      message.error('Không thể tải lịch sử đo');
    } finally {
      setLichSuLoading(false);
    }
  };

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await phieuKiemTraApi.getDetail(Number(id));
      setPhieu(data);
    } catch {
      message.error('Không thể tải chi tiết phiếu kiểm tra');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleRecompute = async () => {
    if (!id) return;
    setRecomputing(true);
    try {
      const res = await tinhDiemApi.tinhTongDiem(Number(id));
      if (res.TongDiem_Soqt != null) {
        message.success(`Đã tính lại CSSK: ${res.TongDiem_Soqt.toFixed(2)}/10`);
      } else {
        message.warning('Chưa tính được — cây chỉ tiêu của loại thiết bị này còn thiếu công thức/dữ liệu.');
      }
      load();
    } catch (e: any) {
      message.error(e?.response?.data?.Error ?? e?.message ?? 'Lỗi khi tính lại CSSK');
    } finally {
      setRecomputing(false);
    }
  };

  const handleRecomputeSi = async () => {
    if (!id) return;
    setRecomputingSi(true);
    try {
      const res = await tinhDiemApi.tinhLaiSi(Number(id));
      message.success(
        res.TongDiem_Soqt != null
          ? `Đã tính lại Sᵢ, khuyến cáo & CSSK: ${res.TongDiem_Soqt.toFixed(2)}/10`
          : 'Đã tính lại Sᵢ & khuyến cáo cho từng chỉ tiêu.'
      );
      load();
    } catch (e: any) {
      message.error(e?.response?.data?.Error ?? e?.message ?? 'Lỗi khi tính lại Sᵢ');
    } finally {
      setRecomputingSi(false);
    }
  };

  const columns = [
    {
      title: 'Chỉ tiêu',
      dataIndex: 'TenChiTieu',
      key: 'ten',
      render: (v: string) => <Text style={{ color: isDark ? '#e5e7eb' : '#111827' }}>{v}</Text>,
    },
    {
      title: 'Giá trị đo',
      key: 'gtso',
      width: 220,
      render: (_: unknown, r: ChiTietKiemTra) => {
        if (r.GiaTriNhap_So !== undefined && r.GiaTriNhap_So !== null)
          return (
            <Text style={{ color: isDark ? '#9ca3af' : '#4b5563', fontFamily: 'monospace' }}>
              {r.GiaTriNhap_So}
            </Text>
          );
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
        return <span style={{ color: isDark ? '#4b5563' : '#9ca3af' }}>—</span>;
      },
    },
    {
      title: 'Giá trị chữ',
      dataIndex: 'GiaTriNhap_Chu',
      key: 'gtchu',
      width: 140,
      render: (v?: string) => (
        <Text style={{ color: isDark ? '#9ca3af' : '#4b5563' }}>{v || <span style={{ color: isDark ? '#4b5563' : '#9ca3af' }}>—</span>}</Text>
      ),
    },
    {
      title: 'Điểm Sᵢ',
      dataIndex: 'Diem_Si_DatDuoc',
      key: 'diem',
      width: 160,
      render: (v?: number) => {
        if (v === undefined || v === null)
          return <Text style={{ color: isDark ? '#4b5563' : '#9ca3af' }}>Chưa chấm</Text>;
        const c = getCapDoSucKhoe(v, isDark).color;
        return (
          <Flex align="center" gap={8}>
            <Progress
              percent={v * 10}
              size="small"
              showInfo={false}
              strokeColor={c}
              railColor={isDark ? '#1e4a72' : '#e5e7eb'}
              style={{ width: 70 }}
            />
            <Text style={{ color: c, fontFamily: 'monospace', fontSize: 12 }}>
              {v}/10
            </Text>
          </Flex>
        );
      },
    },
    {
      title: 'Khuyến cáo hành động',
      dataIndex: 'HanhDongKhuyenCao',
      key: 'khuyencao',
      width: 260,
      render: (v?: string | null) => v ? (
        <Tooltip title={v}>
          <Text style={{ color: isDark ? '#fbbf24' : '#b45309', fontSize: 12, cursor: 'help' }}>
            {v.length > 60 ? v.slice(0, 60) + '…' : v}
          </Text>
        </Tooltip>
      ) : (
        <Text style={{ color: isDark ? '#4b5563' : '#9ca3af', fontSize: 12 }}>—</Text>
      ),
    },
    {
      title: 'Ghi chú',
      dataIndex: 'GhiChu',
      key: 'ghichu',
      render: (v?: string) => (
        <Text style={{ color: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }}>{v || '—'}</Text>
      ),
    },
    {
      title: '',
      key: 'lichsu',
      width: 48,
      render: (_: unknown, r: ChiTietKiemTra) => (
        <Tooltip title="Xem lịch sử đo (tất cả các phiếu trước)">
          <Button size="small" type="text" icon={<HistoryOutlined />} onClick={() => openLichSu(r)} />
        </Tooltip>
      ),
    },
  ];

  const nhomGroups = useMemo(() => {
    const chiTiets = phieu?.ChiTiets ?? [];
    const map = new Map<string, ChiTietKiemTra[]>();
    for (const ct of chiTiets) {
      const key = ct.TenNhom || 'Khác';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ct);
    }
    return Array.from(map.entries()).map(([tenNhom, items]) => ({ tenNhom, items }));
  }, [phieu]);

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ height: 300 }}>
        <Spin size="large" />
      </Flex>
    );
  }

  if (!phieu) {
    return (
      <Flex vertical align="center" gap={12} style={{ padding: '60px 0' }}>
        <FileTextOutlined style={{ fontSize: 48, color: '#374151' }} />
        <Text style={{ color: '#6b7280' }}>Không tìm thấy phiếu kiểm tra</Text>
        <Button onClick={() => navigate('/ket-qua')}>← Quay lại</Button>
      </Flex>
    );
  }

  const ri = phieu.TongDiem_Soqt !== undefined && phieu.TongDiem_Soqt !== null
    ? rankInfo(phieu.TongDiem_Soqt, isDark)
    : null;

  return (
    <div style={{ color: isDark ? '#f9fafb' : '#111827' }}>
      {/* Breadcrumb */}
      <Flex align="center" gap={12} style={{ marginBottom: 20 }}>
        <Button icon={<ArrowLeftOutlined />} type="text" style={{ color: isDark ? '#9ca3af' : '#4b5563' }}
          onClick={() => navigate('/ket-qua')}>
          Kết quả
        </Button>
        <Text style={{ color: '#4b5563' }}>/</Text>
        <Text style={{ color: isDark ? '#f9fafb' : '#111827' }}>Chi tiết phiếu #{phieu.ID_Phieu}</Text>
      </Flex>

      <Row gutter={[16, 16]}>
        {/* Thông tin phiếu */}
        <Col xs={24} lg={6}>
          <Card style={{ background: isDark ? '#0e2c4a' : '#ffffff', border: `1px solid ${isDark ? '#1e4a72' : '#e5e7eb'}` }}
            styles={{ body: { padding: 20 } }}>
            <Title level={5} style={{ color: isDark ? '#f9fafb' : '#111827', marginTop: 0, marginBottom: 16 }}>
              Thông tin phiếu
            </Title>

            {[
              { label: 'Thiết bị',    value: phieu.TenThietBi },
              { label: 'Ngày kiểm tra', value: fmtDate(phieu.NgayKiemTra) },
              { label: 'Kỹ thuật viên', value: phieu.NguoiKiemTra ?? '—' },
              { label: 'Ghi chú',    value: phieu.GhiChuChung ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ marginBottom: 12 }}>
                <Text style={{ color: '#6b7280', fontSize: 11, display: 'block' }}>{label}</Text>
                <Text style={{ color: isDark ? '#e5e7eb' : '#111827' }}>{value}</Text>
              </div>
            ))}

            <Divider style={{ borderColor: isDark ? '#1e4a72' : '#e5e7eb', margin: '16px 0' }} />

            {/* CSSK */}
            {ri && phieu.TongDiem_Soqt !== undefined && phieu.TongDiem_Soqt !== null ? (
              <div style={{
                padding: 16, borderRadius: 8, textAlign: 'center',
                background: ri.bg, border: `1px solid ${ri.border}`,
              }}>
                <Text style={{ color: ri.color, fontSize: 40, fontWeight: 700,
                  fontFamily: 'monospace', lineHeight: 1, display: 'block' }}>
                  {Number(phieu.TongDiem_Soqt).toFixed(3)}
                </Text>
                <Text style={{ color: '#6b7280', fontSize: 12, display: 'block', marginTop: 4 }}>
                  / 10 — CSSK
                </Text>
                <Tag style={{
                  marginTop: 10, fontSize: 13, padding: '2px 12px',
                  background: `${ri.color}22`, border: `1px solid ${ri.border}`, color: ri.color,
                }}>
                  Hạng {ri.rank} · {ri.label}
                </Tag>
              </div>
            ) : (
              <Text style={{ color: '#4b5563' }}>Chưa tính điểm</Text>
            )}

            <Tooltip title="Chỉ gộp lại CSSK từ Sᵢ đã lưu — KHÔNG tính lại Sᵢ. Nếu vừa sửa Rule/Formula/Ngưỡng, dùng nút 'Tính lại Sᵢ' bên dưới thay vì nút này.">
              <Button
                icon={<ReloadOutlined />}
                loading={recomputing}
                onClick={handleRecompute}
                block
                style={{ marginTop: 12 }}
              >
                Tính lại CSSK
              </Button>
            </Tooltip>
            <Tooltip title="Tính lại Sᵢ + khuyến cáo hành động cho TẤT CẢ chỉ tiêu">
              <Button
                icon={<ReloadOutlined />}
                loading={recomputingSi}
                onClick={handleRecomputeSi}
                block
                style={{ marginTop: 8 }}
              >
                Tính lại Sᵢ & khuyến cáo
              </Button>
            </Tooltip>
          </Card>
        </Col>

        {/* Bảng chi tiết chỉ tiêu */}
        <Col xs={24} lg={18}>
          <Card
            title={
              <Flex align="center" gap={8}>
                <FileTextOutlined style={{ color: '#3b82f6' }} />
                <span>Chi tiết từng chỉ tiêu</span>
                <Tag style={{ marginLeft: 4 }}>{phieu.ChiTiets?.length ?? 0} chỉ tiêu</Tag>
              </Flex>
            }
            style={{ background: isDark ? '#0e2c4a' : '#ffffff', border: `1px solid ${isDark ? '#1e4a72' : '#e5e7eb'}` }}
            styles={{ header: { color: isDark ? '#f9fafb' : '#111827', borderBottom: `1px solid ${isDark ? '#1e4a72' : '#e5e7eb'}` }, body: { padding: 0 } }}
          >
            <Collapse
              defaultActiveKey={nhomGroups.map(g => g.tenNhom)}
              ghost
              items={nhomGroups.map(g => ({
                key: g.tenNhom,
                label: (
                  <Flex align="center" gap={8}>
                    <Text strong style={{ color: isDark ? '#e5e7eb' : '#111827' }}>{g.tenNhom}</Text>
                    <Tag style={{ fontSize: 11 }}>{g.items.length} chỉ tiêu</Tag>
                  </Flex>
                ),
                children: (
                  <Table<ChiTietKiemTra>
                    scroll={{ x: 'max-content' }}
                    dataSource={g.items}
                    columns={columns}
                    rowKey="ID_ChiTiet"
                    size="small"
                    pagination={false}
                    style={{ background: 'transparent' }}
                  />
                ),
              }))}
            />
          </Card>
        </Col>
      </Row>

      {/* Modal Lịch sử đo — toàn bộ các lần đo trước đây của chỉ tiêu này trên cùng thiết bị */}
      <Modal
        title={`Lịch sử đo — ${lichSuChiTieu?.ten ?? ''}`}
        open={lichSuOpen}
        onCancel={() => setLichSuOpen(false)}
        footer={<Button onClick={() => setLichSuOpen(false)}>Đóng</Button>}
        width={720}
      >
        <Spin spinning={lichSuLoading}>
          <Table
            scroll={{ x: 'max-content' }}
            dataSource={lichSuChiTieu?.data ?? []}
            rowKey="ID_Phieu"
            size="small"
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: 'Chưa có lần đo nào trước đây' }}
            columns={[
              { title: 'Ngày kiểm tra', dataIndex: 'NgayKiemTra', width: 110, render: fmtDate },
              {
                title: 'Giá trị đo',
                key: 'gt',
                render: (_: unknown, r: LichSuChiTieu) => {
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
                },
              },
              {
                title: 'Điểm Sᵢ',
                dataIndex: 'Diem_Si_DatDuoc',
                width: 90,
                render: (v?: number) =>
                  v !== undefined && v !== null
                    ? <Text style={{ color: getCapDoSucKhoe(v, isDark).color, fontFamily: 'monospace' }}>{v}</Text>
                    : <Text style={{ color: '#9ca3af' }}>—</Text>,
              },
              {
                title: 'Khuyến cáo hành động (tại thời điểm đo)',
                dataIndex: 'HanhDongKhuyenCao',
                render: (v?: string | null) => v
                  ? <Text style={{ color: isDark ? '#fbbf24' : '#b45309', fontSize: 12 }}>{v}</Text>
                  : <Text style={{ color: '#9ca3af' }}>—</Text>,
              },
            ]}
          />
        </Spin>
      </Modal>
    </div>
  );
}
