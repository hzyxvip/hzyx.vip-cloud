export const PLATFORM_DEFAULT_LICENSE_WARNING_MONTHS = 3
export const MIN_LICENSE_WARNING_MONTHS = 1
export const MAX_LICENSE_WARNING_MONTHS = 6

export const LICENSE_WARNING_MONTH_OPTIONS = Array.from(
  { length: MAX_LICENSE_WARNING_MONTHS },
  (_, index) => {
    const months = index + 1
    return {
      value: months,
      label: `${months}个月`
    }
  }
)

const ENTERPRISE_WARNING_MONTHS_KEY = 'partner-license-warning-months'

export function clampLicenseWarningMonths(months: number): number {
  const value = Number(months)
  if (Number.isNaN(value)) return PLATFORM_DEFAULT_LICENSE_WARNING_MONTHS
  return Math.min(MAX_LICENSE_WARNING_MONTHS, Math.max(MIN_LICENSE_WARNING_MONTHS, Math.round(value)))
}

export function getPartnerLicenseWarningMonths(): number {
  const stored = localStorage.getItem(ENTERPRISE_WARNING_MONTHS_KEY)
  if (!stored) return PLATFORM_DEFAULT_LICENSE_WARNING_MONTHS
  const parsed = Number(stored)
  if (Number.isNaN(parsed)) return PLATFORM_DEFAULT_LICENSE_WARNING_MONTHS
  return clampLicenseWarningMonths(parsed)
}

export function setPartnerLicenseWarningMonths(months: number): number {
  const normalized = clampLicenseWarningMonths(months)
  localStorage.setItem(ENTERPRISE_WARNING_MONTHS_KEY, String(normalized))
  return normalized
}

export function resetPartnerLicenseWarningMonths(): number {
  localStorage.removeItem(ENTERPRISE_WARNING_MONTHS_KEY)
  return PLATFORM_DEFAULT_LICENSE_WARNING_MONTHS
}

export function getWarningDeadlineDate(warningMonths: number, baseDate = new Date()): Date {
  const deadline = new Date(baseDate)
  deadline.setHours(0, 0, 0, 0)
  deadline.setMonth(deadline.getMonth() + clampLicenseWarningMonths(warningMonths))
  return deadline
}

export function getDaysUntilExpire(expireDate: string, baseDate = new Date()): number | null {
  if (!expireDate) return null
  const expire = new Date(expireDate)
  if (Number.isNaN(expire.getTime())) return null
  const today = new Date(baseDate)
  today.setHours(0, 0, 0, 0)
  expire.setHours(0, 0, 0, 0)
  return Math.ceil((expire.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}
