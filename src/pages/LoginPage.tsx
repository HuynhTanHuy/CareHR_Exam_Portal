import { EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons'
import { useNavigate } from '@tanstack/react-router'
import { Alert, Button, Form, Input, Modal, Typography } from 'antd'
import { useEffect, useState } from 'react'

import {
  ExamApiError,
  examGetPublicHospitalName,
  examPost,
  getExamDeviceKey,
  setExamToken,
} from '@/api/client'
import type { RecruitmentExamLoginResult } from '@/models/exam'

export function LoginPage() {
  const navigate = useNavigate()
  const [hospitalName, setHospitalName] = useState('BỆNH VIỆN ĐA KHOA TỈNH')
  const [loading, setLoading] = useState(false)
  const [errorOpen, setErrorOpen] = useState(false)
  const [errorText, setErrorText] = useState('Mã dự thi hoặc mật khẩu không đúng.')

  useEffect(() => {
    void examGetPublicHospitalName().then(setHospitalName)
  }, [])

  return (
    <div className="exam-login">
      <section className="exam-login-hero">
        <div>
          <Typography.Text style={{ color: '#dbeafe' }}>{hospitalName}</Typography.Text>
          <Typography.Title level={4} style={{ color: '#fff', margin: '4px 0 0' }}>
            HỆ THỐNG TUYỂN DỤNG
          </Typography.Title>
          <h1>Thi tuyển trực tuyến</h1>
          <p>Vui lòng đăng nhập bằng mã dự thi và mật khẩu được cấp.</p>
        </div>
      </section>
      <section className="exam-login-panel">
        <div className="exam-login-card">
          <Typography.Title level={4}>Đăng nhập phòng thi</Typography.Title>
          <Form
            layout="vertical"
            onFinish={async (values: { examAccessCode: string; password: string }) => {
              setLoading(true)
              try {
                const result = await examPost<RecruitmentExamLoginResult>(
                  '/api/public/exam/login',
                  {
                    examAccessCode: values.examAccessCode.trim(),
                    password: values.password,
                    deviceKey: getExamDeviceKey(),
                  },
                )
                setExamToken(result.accessToken)
                if (result.session.submitted || result.session.attemptId) {
                  await navigate({ to: '/take' })
                } else {
                  await navigate({ to: '/lobby' })
                }
              } catch (error) {
                const err = error instanceof ExamApiError ? error : null
                setErrorText(err?.message || 'Không thể đăng nhập.')
                setErrorOpen(true)
              } finally {
                setLoading(false)
              }
            }}
          >
            <Form.Item
              label="Mã dự thi"
              name="examAccessCode"
              rules={[{ required: true, message: 'Nhập mã dự thi' }]}
            >
              <Input size="large" placeholder="VD: DT2026-001" autoComplete="username" />
            </Form.Item>
            <Form.Item
              label="Mật khẩu"
              name="password"
              rules={[{ required: true, message: 'Nhập mật khẩu' }]}
            >
              <Input.Password
                size="large"
                iconRender={(visible) =>
                  visible ? <EyeOutlined /> : <EyeInvisibleOutlined />
                }
              />
            </Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={loading}>
              Đăng nhập
            </Button>
          </Form>
          <Alert
            className="exam-login-notes"
            type="info"
            showIcon
            message="Lưu ý"
            description={
              <ul>
                <li>Sử dụng mã dự thi và mật khẩu do TCCB cấp.</li>
                <li>Chỉ được đăng nhập trước giờ thi 15 phút.</li>
                <li>Không được chia sẻ thông tin đăng nhập.</li>
                <li>Nếu gặp sự cố, liên hệ giám thị.</li>
              </ul>
            }
          />
        </div>
      </section>
      <Modal open={errorOpen} footer={null} onCancel={() => setErrorOpen(false)} centered>
        <div className="exam-modal-center">
          <div className="exam-modal-icon error">✕</div>
          <Typography.Title level={4}>Không thể đăng nhập</Typography.Title>
          <p>{errorText}</p>
          <Button type="primary" onClick={() => setErrorOpen(false)}>
            Thử lại
          </Button>
        </div>
      </Modal>
    </div>
  )
}
