import axios, { AxiosError } from 'axios'

import type { ApiResult } from '@/models/exam'

const baseURL = (import.meta.env.VITE_API_BASE_URL ?? '').trim()
const TOKEN_KEY = 'carehr.exam.token'
const DEVICE_KEY = 'carehr.exam.deviceKey'

export function getExamDeviceKey(): string {
  let key = localStorage.getItem(DEVICE_KEY)
  if (!key) {
    key = crypto.randomUUID()
    localStorage.setItem(DEVICE_KEY, key)
  }
  return key
}

export function getExamToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function setExamToken(token: string | null) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token)
  else sessionStorage.removeItem(TOKEN_KEY)
}

export class ExamApiError extends Error {
  errors: Array<string>
  offline: boolean
  status?: number

  constructor(message: string, errors: Array<string> = [], offline = false, status?: number) {
    super(message)
    this.name = 'ExamApiError'
    this.errors = errors
    this.offline = offline
    this.status = status
  }
}

export const apiClient = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = getExamToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

function toError(error: unknown, fallback: string): ExamApiError {
  if (error instanceof ExamApiError) return error
  if (error instanceof AxiosError) {
    if (!error.response) {
      return new ExamApiError(
        'Mất kết nối với máy chủ. Thời gian làm bài vẫn tiếp tục.',
        [],
        true,
      )
    }
    const payload = error.response.data as ApiResult<unknown> | undefined
    const message = payload?.errors?.[0] || payload?.message || fallback
    return new ExamApiError(message, payload?.errors ?? [message], false, error.response.status)
  }
  return new ExamApiError(fallback)
}

export async function examPost<T>(url: string, body?: unknown): Promise<T> {
  try {
    const res = await apiClient.post<ApiResult<T>>(url, body)
    if (!res.data?.success || res.data.data == null) {
      throw new ExamApiError(
        res.data?.errors?.[0] || res.data?.message || 'Không thực hiện được yêu cầu.',
        res.data?.errors,
      )
    }
    return res.data.data
  } catch (error) {
    throw toError(error, 'Không thực hiện được yêu cầu.')
  }
}

export async function examPut<T>(url: string, body?: unknown): Promise<T> {
  try {
    const res = await apiClient.put<ApiResult<T>>(url, body)
    if (!res.data?.success || res.data.data == null) {
      throw new ExamApiError(
        res.data?.errors?.[0] || res.data?.message || 'Không lưu được dữ liệu.',
        res.data?.errors,
      )
    }
    return res.data.data
  } catch (error) {
    throw toError(error, 'Không lưu được dữ liệu.')
  }
}

export async function examGet<T>(url: string, params?: Record<string, string>): Promise<T> {
  try {
    const res = await apiClient.get<ApiResult<T>>(url, { params })
    if (!res.data?.success || res.data.data == null) {
      throw new ExamApiError(
        res.data?.errors?.[0] || res.data?.message || 'Không tải được dữ liệu.',
        res.data?.errors,
      )
    }
    return res.data.data
  } catch (error) {
    throw toError(error, 'Không tải được dữ liệu.')
  }
}

export async function examGetPublicHospitalName(): Promise<string> {
  try {
    const res = await apiClient.get<ApiResult<{ hospital?: { name?: string } }>>(
      '/api/public/recruitment/notices',
    )
    return res.data?.data?.hospital?.name?.trim() || 'BỆNH VIỆN ĐA KHOA TỈNH'
  } catch {
    return 'BỆNH VIỆN ĐA KHOA TỈNH'
  }
}
