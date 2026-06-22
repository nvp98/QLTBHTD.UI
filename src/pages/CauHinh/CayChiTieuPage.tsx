import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, Col, Row, Select, Space, Spin, Tag, Tree, Typography, message,
} from 'antd';
import type { DataNode } from 'antd/es/tree';
import { ApartmentOutlined, FileTextOutlined, PlusOutlined } from '@ant-design/icons';
import { nhomChiTieuApi } from '../../api/nhomChiTieu';
import { loaiThietBiApi } from '../../api/loaiThietBi';
import type { NhomChiTieuCay, LoaiThietBi } from '../../types/entities';

const { Title, Text } = Typography;

function cayToTreeData(nodes: NhomChiTieuCay[]): DataNode[] {
  return nodes.map(n => ({
    key: n.ID_NhomChiTieu,
    title: (
      <Space>
        <Text>{n.TenNhom}</Text>
        <Tag color={n.LoaiNhom === 'COMPOSITE' ? 'blue' : 'green'}>
          {n.LoaiNhom}
        </Tag>
        {n.LoaiNhom === 'COMPOSITE' && (
          <Tag color={n.CoCongThuc ? 'success' : 'warning'}>
            {n.CoCongThuc ? 'Có CT' : 'Chưa có CT'}
          </Tag>
        )}
        <Tag>{`Cấp ${n.CapDo}`}</Tag>
      </Space>
    ),
    icon: n.LoaiNhom === 'COMPOSITE' ? <ApartmentOutlined /> : <FileTextOutlined />,
    children: cayToTreeData(n.NhomCon ?? []),
  }));
}

export default function CayChiTieuPage() {
  const [loais, setLoais]           = useState<LoaiThietBi[]>([]);
  const [selectedLoai, setSelectedLoai] = useState<number | null>(null);
  const [cay, setCay]               = useState<NhomChiTieuCay[]>([]);
  const [loading, setLoading]       = useState(false);
  const [selectedNode, setSelectedNode] = useState<NhomChiTieuCay | null>(null);

  useEffect(() => {
    loaiThietBiApi.getActive().then(setLoais).catch(() => message.error('Lỗi tải loại thiết bị'));
  }, []);

  const loadCay = useCallback(async (idLoai: number) => {
    setLoading(true);
    try {
      const data = await nhomChiTieuApi.getCay(idLoai);
      setCay(data);
    } catch {
      message.error('Lỗi tải cây chỉ tiêu');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelectLoai = (id: number) => {
    setSelectedLoai(id);
    setSelectedNode(null);
    loadCay(id);
  };

  const flattenCay = (nodes: NhomChiTieuCay[]): NhomChiTieuCay[] =>
    nodes.flatMap(n => [n, ...flattenCay(n.NhomCon ?? [])]);

  const handleSelectNode = (keys: React.Key[]) => {
    if (keys.length === 0) { setSelectedNode(null); return; }
    const id = Number(keys[0]);
    const flat = flattenCay(cay);
    setSelectedNode(flat.find(n => n.ID_NhomChiTieu === id) ?? null);
  };

  const treeData = cayToTreeData(cay);

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>Cây chỉ tiêu đánh giá</Title>

      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Text strong>Loại thiết bị:</Text>
          <Select
            style={{ width: 240 }}
            placeholder="Chọn loại thiết bị"
            onChange={handleSelectLoai}
            options={loais.map(l => ({ value: l.ID_LoaiThietBi, label: l.TenLoaiTB }))}
          />
          {selectedLoai && (
            <Button
              icon={<PlusOutlined />}
              onClick={() => message.info('Tính năng thêm nhóm đang phát triển')}
            >
              Thêm nhóm
            </Button>
          )}
        </Space>
      </Card>

      <Row gutter={16}>
        <Col span={selectedNode ? 14 : 24}>
          <Card title="Cây phân cấp nhóm chỉ tiêu" loading={loading}>
            {cay.length === 0 && !loading && (
              <Text type="secondary">
                {selectedLoai ? 'Chưa có nhóm chỉ tiêu nào.' : 'Chọn loại thiết bị để xem cây.'}
              </Text>
            )}
            {cay.length > 0 && (
              <Tree
                showIcon
                defaultExpandAll
                treeData={treeData}
                onSelect={handleSelectNode}
                style={{ minHeight: 300 }}
              />
            )}
          </Card>
        </Col>

        {selectedNode && (
          <Col span={10}>
            <Card
              title={`Chi tiết: ${selectedNode.TenNhom}`}
              extra={
                selectedNode.LoaiNhom === 'COMPOSITE' && (
                  <Button
                    size="small"
                    type="primary"
                    onClick={() =>
                      message.info(`Cấu hình công thức cho nhóm ${selectedNode.ID_NhomChiTieu}`)
                    }
                  >
                    Cấu hình công thức
                  </Button>
                )
              }
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <div><Text strong>ID: </Text><Text>{selectedNode.ID_NhomChiTieu}</Text></div>
                <div>
                  <Text strong>Loại nhóm: </Text>
                  <Tag color={selectedNode.LoaiNhom === 'COMPOSITE' ? 'blue' : 'green'}>
                    {selectedNode.LoaiNhom}
                  </Tag>
                </div>
                <div><Text strong>Cấp độ: </Text><Text>{selectedNode.CapDo}</Text></div>
                <div>
                  <Text strong>Nhóm cha: </Text>
                  <Text>{selectedNode.ID_NhomCha ?? '(gốc)'}</Text>
                </div>
                {selectedNode.LoaiNhom === 'COMPOSITE' && (
                  <div>
                    <Text strong>Công thức: </Text>
                    <Tag color={selectedNode.CoCongThuc ? 'success' : 'error'}>
                      {selectedNode.CoCongThuc ? 'Đã cấu hình' : 'Chưa có công thức'}
                    </Tag>
                  </div>
                )}
              </Space>
            </Card>
          </Col>
        )}
      </Row>
    </div>
  );
}
