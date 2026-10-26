import { FlagOutlined } from '@ant-design/icons'
import { useNavigate } from '@tanstack/react-router'
import { Alert, Button, Card, Checkbox, Modal, Radio, Space, Typography } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  ExamApiError,
  examGet,
  examPost,
  examPut,
  getExamDeviceKey,
  getExamToken,
  setExamToken,
} from '@/api/client'
import type { RecruitmentExamCandidateSession } from '@/models/exam'

function formatRemaining(total: number) {
  const seconds = Math.max(0, total)
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

export function TakePage() {
  const navigate = useNavigate()
  const [session, setSession] = useState<RecruitmentExamCandidateSession | null>(null)
  const [index, setIndex] = useState(0)
  const [offline, setOffline] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [doneOpen, setDoneOpen] = useState(false)
  const [timeoutOpen, setTimeoutOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [flagged, setFlagged] = useState<Set<string>>(new Set())
  const remainingRef = useRef(0)
  const [remaining, setRemaining] = useState(0)
  const saveTimer = useRef<number | null>(null)

  const applySession = useCallback((data: RecruitmentExamCandidateSession) => {
    setSession(data)
    remainingRef.current = data.clock.remainingSeconds
    setRemaining(data.clock.remainingSeconds)
    if (data.submitted) {
      if (data.submitReason === 1) setTimeoutOpen(true)
      else setDoneOpen(true)
    }
  }, [])

  const load = useCallback(async () => {
    if (!getExamToken()) {
      await navigate({ to: '/' })
      return
    }
    try {
      const data = await examGet<RecruitmentExamCandidateSession>('/api/public/exam/session', {
        deviceKey: getExamDeviceKey(),
      })
      setOffline(false)
      applySession(data)
      if (!data.attemptId && !data.submitted) {
        await navigate({ to: '/lobby' })
      }
    } catch (err) {
      if (err instanceof ExamApiError && err.offline) {
        setOffline(true)
        return
      }
      if (err instanceof ExamApiError && err.status === 401) {
        setExamToken(null)
        await navigate({ to: '/' })
      }
    }
  }, [applySession, navigate])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const tick = window.setInterval(() => {
      remainingRef.current = Math.max(0, remainingRef.current - 1)
      setRemaining(remainingRef.current)
    }, 1000)
    const sync = window.setInterval(() => void load(), 20000)
    return () => {
      window.clearInterval(tick)
      window.clearInterval(sync)
    }
  }, [load])

  const question = session?.questions[index]
  const answeredCount = session?.questions.filter((q) => q.answered).length ?? 0
  const unansweredCount = (session?.questions.length ?? 0) - answeredCount

  const saveAnswer = useCallback(
    async (paperItemId: string, selected: Array<number>) => {
      if (!session || session.submitted) return
      setSession((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          questions: prev.questions.map((q) =>
            q.paperItemId === paperItemId
              ? { ...q, selectedOptionIndexes: selected, answered: selected.length > 0 }
              : q,
          ),
        }
      })
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(() => {
        void (async () => {
          try {
            const data = await examPut<RecruitmentExamCandidateSession>('/api/public/exam/answers', {
              answers: [{ paperItemId, selectedOptionIndexes: selected }],
            })
            setOffline(false)
            applySession(data)
          } catch (err) {
            if (err instanceof ExamApiError && err.offline) setOffline(true)
          }
        })()
      }, 400)
    },
    [applySession, session],
  )

  const submit = async () => {
    setSubmitting(true)
    try {
      const data = await examPost<RecruitmentExamCandidateSession>('/api/public/exam/submit', {
        confirmed: true,
      })
      applySession(data)
      setConfirmOpen(false)
      if (data.submitReason === 1) setTimeoutOpen(true)
      else setDoneOpen(true)
    } catch (err) {
      if (err instanceof ExamApiError && err.offline) setOffline(true)
      setConfirmOpen(false)
    } finally {
      setSubmitting(false)
    }
  }

  const logout = () => {
    setExamToken(null)
    void navigate({ to: '/' })
  }

  const legend = useMemo(
    () => [
      { label: 'Đã trả lời', className: 'exam-qcell answered' },
      { label: 'Chưa trả lời', className: 'exam-qcell' },
      { label: 'Đánh dấu', className: 'exam-qcell flagged' },
    ],
    [],
  )

  if (!session) return <div className="exam-body">Đang tải bài thi…</div>

  return (
    <div>
      <header className="exam-header">
        <strong>
          {session.hospitalAbbreviation || session.hospitalName} · Thi tuyển trực tuyến
        </strong>
        <Space wrap>
          <span>Mã dự thi: {session.examAccessCode}</span>
          <span>Họ tên: {session.candidateFullName}</span>
          <span>Ca thi: {session.sessionName}</span>
          <Button danger type="primary" onClick={() => setConfirmOpen(true)} disabled={session.submitted}>
            Nộp bài
          </Button>
        </Space>
      </header>
      {offline ? (
        <Alert
          className="exam-offline"
          type="warning"
          showIcon
          banner
          message="Mất kết nối. Đồng hồ vẫn chạy theo máy chủ. Khi có mạng, hệ thống sẽ đồng bộ câu trả lời đã lưu."
        />
      ) : null}
      <div className="exam-body exam-grid-main">
        <Card title={`Danh sách câu hỏi (${session.questionCount})`} size="small">
          <div className="exam-legend">
            {legend.map((item) => (
              <span key={item.label} className="exam-legend-item">
                <button type="button" className={item.className} style={{ width: 22, height: 22 }} />
                {item.label}
              </span>
            ))}
          </div>
          <div className="exam-qgrid">
            {session.questions.map((q, i) => {
              const classes = [
                'exam-qcell',
                i === index ? 'current' : '',
                flagged.has(q.paperItemId) ? 'flagged' : q.answered ? 'answered' : '',
              ]
                .filter(Boolean)
                .join(' ')
              return (
                <button key={q.paperItemId} type="button" className={classes} onClick={() => setIndex(i)}>
                  {i + 1}
                </button>
              )
            })}
          </div>
        </Card>

        <Card
          title={
            <div className="exam-qtitle">
              <span>
                Câu {index + 1} / {session.questionCount}
              </span>
              <Button
                type="link"
                icon={<FlagOutlined />}
                onClick={() => {
                  if (!question) return
                  setFlagged((prev) => {
                    const next = new Set(prev)
                    if (next.has(question.paperItemId)) next.delete(question.paperItemId)
                    else next.add(question.paperItemId)
                    return next
                  })
                }}
              >
                Đánh dấu câu này
              </Button>
            </div>
          }
        >
          {question ? (
            <>
              <Typography.Title level={5}>{question.content}</Typography.Title>
              {question.questionType === 1 ? (
                <Checkbox.Group
                  className="exam-options"
                  value={question.selectedOptionIndexes}
                  disabled={session.submitted}
                  onChange={(values) =>
                    void saveAnswer(
                      question.paperItemId,
                      (values as Array<number>).map((v) => Number(v)),
                    )
                  }
                >
                  {question.options.map((opt, optIndex) => (
                    <Checkbox key={opt.sortOrder} value={opt.sortOrder}>
                      {String.fromCharCode(65 + optIndex)}. {opt.content}
                    </Checkbox>
                  ))}
                </Checkbox.Group>
              ) : (
                <Radio.Group
                  className="exam-options"
                  value={question.selectedOptionIndexes[0]}
                  disabled={session.submitted}
                  onChange={(e) =>
                    void saveAnswer(question.paperItemId, [Number(e.target.value)])
                  }
                >
                  {question.options.map((opt, optIndex) => (
                    <Radio key={opt.sortOrder} value={opt.sortOrder}>
                      {String.fromCharCode(65 + optIndex)}. {opt.content}
                    </Radio>
                  ))}
                </Radio.Group>
              )}
              <div className="exam-nav">
                <Button disabled={index === 0} onClick={() => setIndex((i) => Math.max(0, i - 1))}>
                  Câu trước
                </Button>
                <Button
                  type="primary"
                  disabled={index >= session.questions.length - 1}
                  onClick={() => setIndex((i) => Math.min(session.questions.length - 1, i + 1))}
                >
                  Câu tiếp theo
                </Button>
              </div>
            </>
          ) : (
            <Alert type="info" message="Không có câu hỏi." />
          )}
        </Card>

        <div className="exam-stack">
          <Card size="small" title="Thời gian còn lại">
            <div className="exam-timer">{formatRemaining(remaining)}</div>
          </Card>
          <Card size="small" title="Thông tin bài thi">
            <p>Số câu hỏi: {session.questionCount}</p>
            <p>Đã trả lời: {answeredCount}</p>
            <p>Chưa trả lời: {unansweredCount}</p>
            <p>
              <FlagOutlined /> Đánh dấu: {flagged.size}
            </p>
          </Card>
        </div>
      </div>

      <Modal
        open={confirmOpen}
        title="Xác nhận nộp bài"
        onCancel={() => setConfirmOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setConfirmOpen(false)}>
            Hủy
          </Button>,
          <Button key="ok" type="primary" loading={submitting} onClick={() => void submit()}>
            Nộp bài
          </Button>,
        ]}
      >
        <p>Bạn có chắc chắn muốn nộp bài thi?</p>
        <p>Sau khi nộp bài, bạn sẽ không thể thay đổi câu trả lời.</p>
        {unansweredCount > 0 ? (
          <Alert type="warning" showIcon message={`Còn ${unansweredCount} câu chưa trả lời.`} />
        ) : null}
      </Modal>

      <Modal open={doneOpen} footer={null} closable={false} centered>
        <div className="exam-modal-center">
          <div className="exam-modal-icon success">✓</div>
          <Typography.Title level={4}>Đã nộp bài thành công</Typography.Title>
          <p>Hệ thống đã ghi nhận bài thi của bạn.</p>
          <p>Vui lòng đăng xuất và bàn giao máy cho TCCB.</p>
          <Button type="primary" onClick={logout}>
            Đăng xuất
          </Button>
        </div>
      </Modal>

      <Modal open={timeoutOpen} footer={null} closable={false} centered>
        <div className="exam-modal-center">
          <div className="exam-modal-icon info">i</div>
          <Typography.Title level={4}>Hết thời gian làm bài</Typography.Title>
          <p>Thời gian làm bài đã kết thúc. Hệ thống đã tự động nộp bài và ghi nhận kết quả của bạn.</p>
          <Button type="primary" onClick={() => setTimeoutOpen(false)}>
            Đóng
          </Button>
        </div>
      </Modal>
    </div>
  )
}
