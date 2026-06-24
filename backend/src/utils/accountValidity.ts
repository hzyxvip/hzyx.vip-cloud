export function formatDateYmd(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayYmd(baseDate = new Date()): string {
  return formatDateYmd(baseDate)
}

export function calculateExpiresAt(enabledAt: string, validityYears: number): string {
  const base = new Date(enabledAt)
  if (Number.isNaN(base.getTime()) || !Number.isFinite(validityYears) || validityYears <= 0) {
    return ''
  }
  const next = new Date(base)
  next.setFullYear(next.getFullYear() + Math.floor(validityYears))
  return formatDateYmd(next)
}

export function isAccountExpired(expiresAt?: string, baseDate = new Date()): boolean {
  if (!expiresAt) return false
  const expire = new Date(expiresAt)
  if (Number.isNaN(expire.getTime())) return false
  const today = new Date(baseDate)
  today.setHours(0, 0, 0, 0)
  expire.setHours(0, 0, 0, 0)
  return expire.getTime() < today.getTime()
}

export function normalizeDateInput(value: unknown): string | undefined {
  if (value == null || value === '') return undefined
  const text = String(value).slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : undefined
}

export function normalizeValidityYears(value: unknown): number | undefined {
  const years = Number(value)
  if (!Number.isFinite(years) || years <= 0) return undefined
  return Math.floor(years)
}

export function resolveAccountValidity(input: {
  enabledAt?: unknown
  validityYears?: unknown
  expiresAt?: unknown
}) {
  const enabledAt = normalizeDateInput(input.enabledAt)
  const validityYears = normalizeValidityYears(input.validityYears)
  const manualExpiresAt = normalizeDateInput(input.expiresAt)
  const expiresAt = manualExpiresAt
    || (enabledAt && validityYears ? calculateExpiresAt(enabledAt, validityYears) : undefined)

  return { enabledAt, validityYears, expiresAt }
}
