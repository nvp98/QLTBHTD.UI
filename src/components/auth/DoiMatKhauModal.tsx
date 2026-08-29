import { useState } from 'react';
import { Form, Input, Modal, message } from 'antd';
import { authApi } from '../../api/auth';

interface DoiMatKhauFormValues {
  matKhauCu: string;
  matKhauMoi: string;
  xacNhan: string;
}

export default function DoiMatKhauModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form] = Form.useForm<DoiMatKhauFormValues>();
  const [submitting, setSubmitting] = useState(false);

  const handleOk = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      await authApi.doiMatKhau({ MatKhauCu: values.matKhauCu, MatKhauMoi: values.matKhauMoi });
      message.success('Đã đổi mật khẩu thành công');
      form.resetFields();
      onClose();
    } catch {
      message.error('Mật khẩu cũ không đúng');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Đổi mật khẩu"
      open={open}
      onCancel={() => { form.resetFields(); onClose(); }}
      onOk={handleOk}
      confirmLoading={submitting}
      okText="Đổi mật khẩu"
      cancelText="Hủy"
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          name="matKhauCu"
          label="Mật khẩu cũ"
          rules={[{ required: true, message: 'Vui lòng nhập mật khẩu cũ' }]}
        >
          <Input.Password autoFocus />
        </Form.Item>
        <Form.Item
          name="matKhauMoi"
          label="Mật khẩu mới"
          rules={[
            { required: true, message: 'Vui lòng nhập mật khẩu mới' },
            { min: 6, message: 'Mật khẩu mới phải có ít nhất 6 ký tự' },
          ]}
        >
          <Input.Password />
        </Form.Item>
        <Form.Item
          name="xacNhan"
          label="Xác nhận mật khẩu mới"
          dependencies={['matKhauMoi']}
          rules={[
            { required: true, message: 'Vui lòng xác nhận mật khẩu mới' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('matKhauMoi') === value) return Promise.resolve();
                return Promise.reject(new Error('Xác nhận mật khẩu không khớp'));
              },
            }),
          ]}
        >
          <Input.Password />
        </Form.Item>
      </Form>
    </Modal>
  );
}
