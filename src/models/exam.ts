export type RecruitmentExamAttemptStatus = 0 | 1 | 2
export type RecruitmentExamSubmitReason = 0 | 1
export type RecruitmentQuestionType = 0 | 1

export interface ApiResult<T> {
  data?: T
  success: boolean
  message?: string
  errors?: Array<string>
}

export interface RecruitmentExamCandidateOption {
  sortOrder: number
  content: string
}

export interface RecruitmentExamCandidateQuestion {
  paperItemId: string
  sortOrder: number
  content: string
  questionType: RecruitmentQuestionType
  options: Array<RecruitmentExamCandidateOption>
  selectedOptionIndexes: Array<number>
  answered: boolean
}

export interface RecruitmentExamClock {
  serverNow: string
  sessionStartAt?: string | null
  sessionEndAt?: string | null
  startedAt?: string | null
  deadlineAt?: string | null
  remainingSeconds: number
  canStart: boolean
  canSubmit: boolean
  blockReason?: string | null
}

export interface RecruitmentExamCandidateSession {
  participantId: string
  attemptId?: string | null
  hospitalName: string
  hospitalAbbreviation?: string | null
  roundName: string
  batchName?: string | null
  candidateFullName: string
  examAccessCode: string
  positionTitle: string
  paperCode?: string | null
  paperName?: string | null
  questionCount: number
  durationMinutes: number
  sessionName: string
  roomName?: string | null
  candidateGuide?: string | null
  attemptStatus?: RecruitmentExamAttemptStatus | null
  submitReason?: RecruitmentExamSubmitReason | null
  submitted: boolean
  clock: RecruitmentExamClock
  questions: Array<RecruitmentExamCandidateQuestion>
  answeredCount: number
  unansweredCount: number
  flaggedCount: number
}

export interface RecruitmentExamLoginResult {
  accessToken: string
  session: RecruitmentExamCandidateSession
}
