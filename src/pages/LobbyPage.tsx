import { useNavigate } from '@tanstack/react-router'
import { Alert, Button, Card, Descriptions, Typography } from 'antd'
import { useCallback, useEffect, useState } from 'react'

import {
  ExamApiError,
  examGet,
  examPost,
  getExamDeviceKey,
  getExamToken,
  setExamToken,
} from '@/api/client'
import type { RecruitmentExamCandidateSession } from '@/models/exam'
import { formatDisplayDateTime, formatDisplayTime } from '@/utils/datetime'

export function LobbyPage() {
  const navigate = useNavigate()
  const [session, setSession] = useState<RecruitmentExamCandidateSession | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!getExamToken()) {
      await navigate({ to: '/' })
      return
    }
    try {
      const data = await examGet<RecruitmentExamCandidateSession>('/api/public/exam/session', {
        deviceKey: getExamDeviceKey(),
      })
      setSession(data)
      if (data.attemptId || data.submitted) {
        await navigate({ to: '/take' })
      }
    } catch (err) {
      if (err instanceof ExamApiError && err.status === 401) {
        setExamToken(null)
        await navigate({ to: '/' })
        return
      }
      setError(err instanceof Error ? err.message : 'Không tải được thông tin kỳ thi.')
    }
  }, [navigate])

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => void load(), 15000)
    return () => window.clearInterval(timer)
  }, [load])

  if (!session) {
    return (
      <div className="exam-body">
        {error ? <Alert type="error" showIcon message={error} /> : <Typography.Text>Đang tải…</Typography.Text>}
      </div>
    )
  }

  const startTime = formatDisplayTime(session.clock.sessionStartAt)
  const startLabel = session.clock.canStart
    ? 'Bắt đầu làm bài'
    : `Nút bắt đầu được mở từ ${startTime || 'giờ thi'}`

  return (
    <div>
      <header className="exam-header">
        <strong>
          {session.hospitalAbbreviation || session.hospitalName} · Thi tuyển trực tuyến
        </strong>
        <div>
          {session.examAccessCode} · {session.candidateFullName}
          <Button
            type="link"
            style={{ color: '#fff' }}
            onClick={() => {
              setExamToken(null)
              void navigate({ to: '/' })
            }}
          >
            Đăng xuất
          </Button>
        </div>
      </header>
      <div className="exam-body exam-lobby-grid">
        <Card title="Thông tin bài thi">
          <Descriptions column={1} size="small">
            <Descriptions.Item label="Kỳ tuyển dụng">{session.batchName || session.roundName}</Descriptions.Item>
            <Descriptions.Item label="Vị trí việc làm">{session.positionTitle}</Descriptions.Item>
            <Descriptions.Item label="Số câu hỏi">{session.questionCount} câu</Descriptions.Item>
            <Descriptions.Item label="Ca thi">{session.sessionName}</Descriptions.Item>
            <Descriptions.Item label="Mã đề thi">{session.paperCode || '—'}</Descriptions.Item>
            <Descriptions.Item label="Thời gian làm bài">{session.durationMinutes} phút</Descriptions.Item>
            <Descriptions.Item label="Thời gian bắt đầu">
              {formatDisplayDateTime(session.clock.sessionStartAt)}
            </Descriptions.Item>
            <Descriptions.Item label="Địa điểm">{session.roomName || '—'}</Descriptions.Item>
          </Descriptions>
          {session.clock.blockReason ? (
            <Alert className="exam-spacer" type="warning" showIcon message={session.clock.blockReason} />
          ) : (
            <Alert
              className="exam-spacer"
              type="warning"
              showIcon
              message="Bạn có thể kiểm tra thông tin và hệ thống trước giờ thi."
            />
          )}
        </Card>
        <Card title="Quy định khi làm bài">
          <ol>
            <li>Chỉ được làm bài trên thiết bị đã được giám thị phân công.</li>
            <li>Không được mở tab khác hoặc sử dụng phần mềm hỗ trợ.</li>
            <li>Thời gian làm bài được tính theo hệ thống.</li>
            <li>Bài thi sẽ tự động nộp khi hết thời gian.</li>
            <li>Nếu gặp sự cố, báo ngay giám thị.</li>
          </ol>
          {session.candidateGuide ? (
            <Typography.Paragraph className="exam-spacer" style={{ whiteSpace: 'pre-wrap' }}>
              {session.candidateGuide}
            </Typography.Paragraph>
          ) : null}
          <Button
            type="primary"
            size="large"
            block
            className="exam-start-btn"
            disabled={!session.clock.canStart}
            loading={loading}
            onClick={async () => {
              setLoading(true)
              setError(null)
              try {
                await examPost('/api/public/exam/start', { deviceKey: getExamDeviceKey() })
                await navigate({ to: '/take' })
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Không bắt đầu được bài thi.')
              } finally {
                setLoading(false)
              }
            }}
          >
            {startLabel}
          </Button>
          {error ? <Alert className="exam-spacer" type="error" showIcon message={error} /> : null}
        </Card>
      </div>
    </div>
  )
}
